import type { Standing, StandingResult } from './types.ts';

export function calculateStandings(userIds: string[], results: StandingResult[]): Standing[] {
  const rows = new Map<string, Omit<Standing, 'rank'>>();
  for (const userId of userIds) {
    rows.set(userId, {
      userId,
      wins: 0,
      losses: 0,
      ties: 0,
      games: 0,
      winPercentage: 0,
      totalScore: 0,
      unreportedDays: 0
    });
  }

  for (const result of results) {
    const row = rows.get(result.userId);
    if (!row) continue;
    row.totalScore += result.score;
    row.unreportedDays += result.unreportedDays;
    if (result.outcome === 'bye') continue;
    row.games += 1;
    if (result.outcome === 'win') row.wins += 1;
    if (result.outcome === 'loss') row.losses += 1;
    if (result.outcome === 'tie') row.ties += 1;
    row.winPercentage = (row.wins + row.ties * 0.5) / row.games;
  }

  return [...rows.values()]
    .sort(
      (a, b) =>
        b.winPercentage - a.winPercentage ||
        b.totalScore - a.totalScore ||
        a.unreportedDays - b.unreportedDays ||
        a.userId.localeCompare(b.userId)
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
