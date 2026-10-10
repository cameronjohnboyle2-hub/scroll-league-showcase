import assert from 'node:assert/strict';
import test from 'node:test';
import { roundRobinPairings } from '../src/domain/pairing.ts';

test('four members meet each opponent once in three weeks', () => {
  const seen = new Set<string>();
  for (let week = 1; week <= 3; week += 1) {
    for (const pair of roundRobinPairings(['a', 'b', 'c', 'd'], week)) {
      assert.ok(pair.memberBId);
      seen.add([pair.memberAId, pair.memberBId].sort().join('-'));
    }
  }
  assert.equal(seen.size, 6);
});

test('five members receive one rotating bye per round', () => {
  const byes = new Map<string, number>();
  for (let week = 1; week <= 5; week += 1) {
    const pairs = roundRobinPairings(['a', 'b', 'c', 'd', 'e'], week);
    const bye = pairs.find((pair) => pair.memberBId === null);
    assert.ok(bye);
    byes.set(bye.memberAId, (byes.get(bye.memberAId) ?? 0) + 1);
  }
  assert.deepEqual([...byes.values()].sort(), [1, 1, 1, 1, 1]);
});
