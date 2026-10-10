import assert from 'node:assert/strict';
import test from 'node:test';
import { demoIds, getDemoSnapshot } from '../src/demo/fixtures.ts';
import { addDays, isIsoDate } from '../src/domain/dates.ts';
import { scoreWeek, resolveWinner } from '../src/domain/scoring.ts';

test('fixture results and recaps agree with reported entries and frozen targets', () => {
  const snapshot = getDemoSnapshot(new Date('2026-10-09T18:00:00Z'));
  for (const week of snapshot.weeks.filter((w) => w.status === 'finalized')) {
    const performances = snapshot.members.map((person) => scoreWeek({
      userId: person.id, startDate: week.startDate, today: week.endDate, isFinal: true,
      targetMinutes: snapshot.weekParticipants.find((p) => p.weekId === week.id && p.userId === person.id)!.targetMinutes,
      entries: snapshot.entries.filter((e) => e.userId === person.id)
    }));
    for (const performance of performances) {
      const saved = snapshot.weeklyResults.find((r) => r.weekId === week.id && r.userId === performance.userId)!;
      assert.equal(saved.displayedScore, performance.displayedScore);
      assert.equal(saved.unreportedDays, performance.unreportedDays);
    }
    for (const matchup of snapshot.matchups.filter((m) => m.weekNumber === week.number)) {
      const a = performances.find((p) => p.userId === matchup.memberAId)!;
      const b = performances.find((p) => p.userId === matchup.memberBId)!;
      assert.equal(matchup.memberAScore, a.displayedScore);
      assert.equal(matchup.memberBScore, b.displayedScore);
      assert.deepEqual({ winnerId: matchup.winnerId, isTie: matchup.isTie }, resolveWinner(a, b));
    }
    const champion = [...performances].sort((a, b) => b.displayedScore - a.displayedScore || b.unroundedAverage - a.unroundedAverage)[0]!;
    assert.equal(week.recap!.champion!.userId, champion.userId);
    assert.equal(week.recap!.champion!.score, champion.displayedScore);
  }
  for (const row of snapshot.standings) {
    const results = snapshot.weeklyResults.filter((r) => r.userId === row.userId);
    assert.equal(row.totalScore, results.reduce((sum, r) => sum + r.displayedScore, 0));
    assert.equal(row.wins, results.filter((r) => r.outcome === 'win').length);
    assert.equal(row.losses, results.filter((r) => r.outcome === 'loss').length);
  }
});

test('demo preserves explicit zero and missing days and follows the league timezone', () => {
  const snapshot = getDemoSnapshot(new Date('2026-10-09T01:00:00Z'));
  assert.equal(snapshot.currentWeek!.startDate, '2026-10-06');
  const second = snapshot.weeks[1]!;
  assert.equal(snapshot.entries.find((e) => e.userId === demoIds.atlas && e.localDate === addDays(second.startDate, 2))?.minutes, 0);
  assert.equal(snapshot.entries.find((e) => e.userId === demoIds.birch && e.localDate === addDays(second.startDate, 1)), undefined);
  assert.ok(snapshot.members.every((m) => m.displayName.startsWith('Demo ') && m.avatarUrl === null));
});

test('calendar validation rejects impossible dates before score previews run', () => {
  for (const date of ['2026-99-99', '2026-02-30', '2026-02-29', '']) assert.equal(isIsoDate(date), false);
  for (const date of ['2028-02-29', '2026-10-09']) assert.equal(isIsoDate(date), true);
});
