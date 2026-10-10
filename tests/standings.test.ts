import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateStandings } from '../src/domain/standings.ts';

test('standings use win percentage, total score, then fewer missing days', () => {
  const rows = calculateStandings(['a', 'b', 'c'], [
    { userId: 'a', outcome: 'win', score: 90, unreportedDays: 1 },
    { userId: 'b', outcome: 'win', score: 95, unreportedDays: 2 },
    { userId: 'c', outcome: 'bye', score: 120, unreportedDays: 0 }
  ]);
  assert.deepEqual(rows.map((row) => row.userId), ['b', 'a', 'c']);
  assert.equal(rows[2]?.games, 0);
});

test('a tie is half a win and a bye is excluded', () => {
  const [row] = calculateStandings(['a'], [
    { userId: 'a', outcome: 'tie', score: 100, unreportedDays: 0 },
    { userId: 'a', outcome: 'bye', score: 80, unreportedDays: 1 }
  ]);
  assert.equal(row?.winPercentage, 0.5);
  assert.equal(row?.games, 1);
  assert.equal(row?.totalScore, 180);
});
