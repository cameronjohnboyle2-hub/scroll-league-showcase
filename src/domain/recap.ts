import type { Matchup, Profile, RecapPayload, WeeklyPerformance } from './types.ts';

export function buildRecap(input: {
  weekNumber: number;
  members: Profile[];
  performances: WeeklyPerformance[];
  matchups: Matchup[];
  consequence: string | null;
}): RecapPayload {
  const names = new Map(input.members.map((member) => [member.id, member.displayName]));
  const ranked = [...input.performances].sort(
    (a, b) => b.displayedScore - a.displayedScore || b.unroundedAverage - a.unroundedAverage || a.userId.localeCompare(b.userId)
  );
  const champion = ranked[0];
  const lastRanked = [...input.performances].sort(
    (a, b) => a.roundedDailyAverage - b.roundedDailyAverage || a.userId.localeCompare(b.userId)
  );
  const last = lastRanked[0];
  const lastTied = last && lastRanked.filter((item) => Math.abs(item.roundedDailyAverage - last.roundedDailyAverage) < 0.000001).length > 1;
  const bestDay = input.performances
    .flatMap((performance) =>
      performance.days
        .filter((day) => day.status === 'reported')
        .map((day) => ({ userId: performance.userId, day }))
    )
    .sort((a, b) => b.day.unroundedScore - a.day.unroundedScore || a.userId.localeCompare(b.userId))[0];
  const closest = input.matchups
    .filter((matchup) => matchup.memberBId && matchup.memberAScore !== null && matchup.memberBScore !== null)
    .map((matchup) => ({ matchupId: matchup.id, margin: Math.abs(matchup.memberAScore! - matchup.memberBScore!) }))
    .sort((a, b) => a.margin - b.margin || a.matchupId.localeCompare(b.matchupId))[0];

  const championName = champion ? names.get(champion.userId) ?? 'Someone' : null;
  return {
    version: 1,
    weekNumber: input.weekNumber,
    headline: championName ? `${championName} won the scroll battle.` : 'The week is in the books.',
    champion: champion
      ? { userId: champion.userId, displayName: championName!, score: champion.displayedScore }
      : null,
    closestMatchup: closest ?? null,
    bestDay: bestDay
      ? {
          userId: bestDay.userId,
          displayName: names.get(bestDay.userId) ?? 'Unknown',
          localDate: bestDay.day.localDate,
          score: bestDay.day.roundedScore
        }
      : null,
    lastPlace:
      last && !lastTied
        ? {
            userId: last.userId,
            displayName: names.get(last.userId) ?? 'Unknown',
            score: last.displayedScore,
            consequence: input.consequence
          }
        : null,
    lines: [
      closest ? `Closest matchup: ${closest.margin.toFixed(0)} points.` : 'No head-to-head result this week.',
      bestDay ? `${names.get(bestDay.userId) ?? 'Someone'} posted the week's best day.` : 'Nobody reported a day.',
      lastTied ? 'Last place was an exact tie, so the consequence is off.' : input.consequence ?? 'No stake was selected.'
    ]
  };
}
