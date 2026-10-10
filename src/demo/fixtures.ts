import { addDays, toLocalDate } from '../domain/dates.ts';
import { buildRecap } from '../domain/recap.ts';
import { resolveWinner, scoreReportedDay, scoreWeek } from '../domain/scoring.ts';
import { calculateStandings } from '../domain/standings.ts';
import type { AppSnapshot, Consequence, Matchup, Member, ScreenTimeEntry, WeekSummary, WeeklyResult } from '../domain/types.ts';

const ids = {
  atlas: '00000000-0000-4000-8000-000000000001',
  birch: '00000000-0000-4000-8000-000000000002',
  cedar: '00000000-0000-4000-8000-000000000003',
  dune: '00000000-0000-4000-8000-000000000004'
};

function entry(userId: string, localDate: string, minutes: number): ScreenTimeEntry {
  return { id: `${userId}-${localDate}`, userId, localDate, minutes, source: 'manual', evidenceRef: null };
}

// Invented identities and usage only. Every result is computed from these entries.
export function getDemoSnapshot(now = new Date()): AppSnapshot {
  const today = toLocalDate(now, 'America/Denver');
  const week3Start = addDays(today, -2);
  const starts = [addDays(week3Start, -14), addDays(week3Start, -7), week3Start];
  const consequences: Consequence[] = [
    { id: 'stake-1', title: 'Use a flip-phone wallpaper for a day', description: 'Optional, playful, and free.', status: 'approved' },
    { id: 'stake-2', title: 'Take a five-minute screen break', description: 'Honor system. Choose what works for you.', status: 'approved' },
    { id: 'stake-3', title: 'Use a flip-phone wallpaper for a week', description: 'Honor system. No purchase required.', status: 'approved' },
    { id: 'stake-4', title: 'Pick a new league color theme', description: 'A fictional example suggestion.', status: 'suggested' }
  ];
  const weeks: WeekSummary[] = starts.map((startDate, index) => ({
    id: `demo-week-${index + 1}`, number: index + 1, startDate, endDate: addDays(startDate, 6),
    status: index < 2 ? 'finalized' : 'active', stake: consequences[index]!, recap: null
  }));
  const baseMembers: Omit<Member, 'rank' | 'record' | 'score' | 'unreportedDays'>[] = [
    { id: ids.atlas, displayName: 'Demo Atlas', avatarUrl: null, targetMinutes: 120, nextTargetMinutes: null, eligibleFromWeek: 1, isCommissioner: true },
    { id: ids.birch, displayName: 'Demo Birch', avatarUrl: null, targetMinutes: 105, nextTargetMinutes: null, eligibleFromWeek: 1 },
    { id: ids.cedar, displayName: 'Demo Cedar', avatarUrl: null, targetMinutes: 90, nextTargetMinutes: null, eligibleFromWeek: 1 },
    { id: ids.dune, displayName: 'Demo Dune', avatarUrl: null, targetMinutes: 135, nextTargetMinutes: null, eligibleFromWeek: 1 }
  ];
  // null is an unreported day; numeric 0 is an explicitly reported day.
  const patterns: [string, number, (number | null)[]][] = [
    [ids.atlas, 0, [95, 110, 72, 88, 65, 122, 104]],
    [ids.birch, 0, [70, 88, 45, 102, 41, 96, 84]],
    [ids.cedar, 0, [64, 80, 71, 94, 55, 88, 76]],
    [ids.dune, 0, [180, 164, null, 149, 210, null, 172]],
    [ids.atlas, 1, [54, 70, 0, 81, 62, 75, 68]],
    [ids.birch, 1, [140, null, 121, 98, 152, 130, 118]],
    [ids.cedar, 1, [73, 69, 82, 91, 64, 78, 86]],
    [ids.dune, 1, [109, 128, 96, 121, 138, 105, 117]],
    [ids.atlas, 2, [82, 104, 68]], [ids.birch, 2, [130, 94, 116]],
    [ids.cedar, 2, [61, null, 76]], [ids.dune, 2, [174, 151, 205]]
  ];
  const entries = patterns.flatMap(([userId, weekIndex, values]) => values.flatMap((minutes, day) =>
    minutes === null ? [] : [entry(userId, addDays(starts[weekIndex]!, day), minutes)]
  ));
  const weekParticipants = weeks.flatMap((week) => baseMembers.map((person) => ({
    weekId: week.id, userId: person.id, targetMinutes: person.targetMinutes, hasBye: false
  })));
  const pairings = [
    [[ids.atlas, ids.birch], [ids.cedar, ids.dune]],
    [[ids.atlas, ids.dune], [ids.birch, ids.cedar]],
    [[ids.atlas, ids.cedar], [ids.birch, ids.dune]]
  ];
  const matchups: Matchup[] = [];
  const weeklyResults: WeeklyResult[] = [];
  for (const week of weeks) {
    const performances = baseMembers.map((person) => scoreWeek({
      userId: person.id,
      targetMinutes: weekParticipants.find((p) => p.weekId === week.id && p.userId === person.id)!.targetMinutes,
      startDate: week.startDate, today, isFinal: week.status === 'finalized',
      entries: entries.filter((item) => item.userId === person.id)
    }));
    const weekMatchups = pairings[week.number - 1]!.map(([memberAId, memberBId], index): Matchup => {
      const a = performances.find((p) => p.userId === memberAId)!;
      const b = performances.find((p) => p.userId === memberBId)!;
      const final = week.status === 'finalized';
      return {
        id: `w${week.number}-m${index + 1}`, weekNumber: week.number, memberAId: memberAId!, memberBId: memberBId!,
        memberAScore: final ? a.displayedScore : null, memberBScore: final ? b.displayedScore : null,
        ...(final ? resolveWinner(a, b) : { winnerId: null, isTie: false }), status: final ? 'final' : 'active'
      };
    });
    matchups.push(...weekMatchups);
    if (week.status !== 'finalized') continue;
    week.recap = buildRecap({ weekNumber: week.number, members: baseMembers, performances, matchups: weekMatchups, consequence: week.stake?.title ?? null });
    for (const performance of performances) {
      const matchup = weekMatchups.find((m) => m.memberAId === performance.userId || m.memberBId === performance.userId)!;
      const assignedConsequence = week.recap.lastPlace?.userId === performance.userId ? week.stake : null;
      weeklyResults.push({
        id: `${week.id}-${performance.userId}`, weekId: week.id, userId: performance.userId,
        outcome: matchup.isTie ? 'tie' : matchup.winnerId === performance.userId ? 'win' : 'loss',
        displayedScore: performance.displayedScore, unreportedDays: performance.unreportedDays,
        assignedConsequence, consequenceDone: Boolean(assignedConsequence)
      });
    }
  }
  const standings = calculateStandings(baseMembers.map((person) => person.id), weeklyResults.map((result) => ({
    userId: result.userId, outcome: result.outcome, score: result.displayedScore, unreportedDays: result.unreportedDays
  })));
  const members: Member[] = baseMembers.map((person) => {
    const row = standings.find((item) => item.userId === person.id)!;
    return { ...person, rank: row.rank, record: `${row.wins}-${row.losses}${row.ties ? `-${row.ties}` : ''}`, score: row.totalScore, unreportedDays: row.unreportedDays };
  });
  return {
    profile: { id: ids.atlas, displayName: 'Demo Atlas', avatarUrl: null },
    league: { id: 'demo-league', name: 'Daybreak Demo', timezone: 'America/Denver', commissionerId: ids.atlas,
      consequenceRules: 'Keep it optional, playful, safe, and free. No humiliation, money, or coercion.', inviteCode: 'DEMO24' },
    members, season: { id: 'demo-season', number: 1, status: 'active' }, currentWeek: weeks[2]!,
    weeks, weekParticipants, entries, matchups, consequences, weeklyResults, standings,
    activity: [
      { id: 'a1', type: 'entry', text: `Demo Cedar logged 76 min · ${scoreReportedDay(90, 76).roundedScore} pts`, createdAt: `${today}T18:04:00Z` },
      { id: 'a2', type: 'entry', text: `Demo Atlas logged 68 min · ${scoreReportedDay(120, 68).roundedScore} pts`, createdAt: `${today}T17:32:00Z` },
      { id: 'a3', type: 'consequence', text: 'Week 3 stake locked: flip-phone wallpaper', createdAt: `${addDays(today, -1)}T20:10:00Z` },
      { id: 'a4', type: 'result', text: `Week 2 final: ${weeks[1]!.recap!.champion!.displayName} took the top score`, createdAt: `${addDays(today, -2)}T07:05:00Z` }
    ]
  };
}

export const demoIds = ids;
