import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveWinner, scoreReportedDay, scoreWeek } from '../src/domain/scoring.ts';

test('daily score anchors and clamps', () => {
  assert.deepEqual(scoreReportedDay(120, 120), { roundedScore: 100, unroundedScore: 100 });
  assert.deepEqual(scoreReportedDay(120, 60), { roundedScore: 150, unroundedScore: 150 });
  assert.deepEqual(scoreReportedDay(120, 240), { roundedScore: 0, unroundedScore: 0 });
  assert.deepEqual(scoreReportedDay(120, 0), { roundedScore: 150, unroundedScore: 150 });
});

test('zero minutes is reported while a missing day remains unreported', () => {
  const result = scoreWeek({
    userId: 'demo-atlas',
    targetMinutes: 120,
    startDate: '2026-09-21',
    today: '2026-09-22',
    isFinal: false,
    entries: [{ userId: 'demo-atlas', localDate: '2026-09-21', minutes: 0, source: 'manual', evidenceRef: null }]
  });
  assert.equal(result.days[0]?.status, 'reported');
  assert.equal(result.days[0]?.roundedScore, 150);
  assert.equal(result.days[1]?.status, 'unreported');
  assert.equal(result.displayedScore, 75);
});

test('future days do not dilute provisional pace, but missing elapsed days do', () => {
  const result = scoreWeek({
    userId: 'demo-atlas',
    targetMinutes: 100,
    startDate: '2026-09-21',
    today: '2026-09-23',
    isFinal: false,
    entries: [
      { userId: 'demo-atlas', localDate: '2026-09-21', minutes: 100, source: 'manual', evidenceRef: null },
      { userId: 'demo-atlas', localDate: '2026-09-23', minutes: 50, source: 'manual', evidenceRef: null }
    ]
  });
  assert.equal(result.displayedScore, 83);
  assert.equal(result.days.filter((day) => day.status === 'future').length, 4);
});

test('rounded ties use the unrounded score and exact ties stay tied', () => {
  assert.deepEqual(
    resolveWinner(
      { userId: 'a', displayedScore: 101, unroundedAverage: 100.51 },
      { userId: 'b', displayedScore: 101, unroundedAverage: 100.49 }
    ),
    { winnerId: 'a', isTie: false }
  );
  assert.deepEqual(
    resolveWinner(
      { userId: 'a', displayedScore: 100, unroundedAverage: 100 },
      { userId: 'b', displayedScore: 100, unroundedAverage: 100 }
    ),
    { winnerId: null, isTie: true }
  );
});
