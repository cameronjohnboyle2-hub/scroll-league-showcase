export type Pairing = { memberAId: string; memberBId: string | null };

export function roundRobinPairings(memberIds: string[], weekNumber: number): Pairing[] {
  if (memberIds.length < 2 || memberIds.length > 10) {
    throw new RangeError('A league must have 2–10 active members.');
  }
  if (!Number.isInteger(weekNumber) || weekNumber < 1) throw new RangeError('Week number must be positive.');

  const unique = [...new Set(memberIds)].sort();
  if (unique.length !== memberIds.length) throw new Error('Member IDs must be unique.');
  const players: (string | null)[] = unique.length % 2 === 1 ? [...unique, null] : unique;
  const fixed = players[0];
  const tail = players.slice(1);
  const rotation = (weekNumber - 1) % tail.length;
  const rotatedTail = [...tail.slice(rotation), ...tail.slice(0, rotation)];
  const round = [fixed, ...rotatedTail];
  const pairs: Pairing[] = [];

  for (let index = 0; index < round.length / 2; index += 1) {
    const left = round[index] ?? null;
    const right = round[round.length - 1 - index] ?? null;
    const active = left ?? right;
    if (!active) continue;
    pairs.push({ memberAId: active, memberBId: left && right ? right : null });
  }
  return pairs;
}
