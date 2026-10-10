import { compareDates, dateRange } from './dates.ts';
import type { DailyScore, ScreenTimeEntry, WeeklyPerformance } from './types.ts';

export function clamp(minimum: number, maximum: number, value: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function scoreReportedDay(targetMinutes: number, minutes: number) {
  if (!Number.isInteger(targetMinutes) || targetMinutes <= 0 || targetMinutes > 1440) {
    throw new RangeError('Target must be an integer from 1 to 1,440 minutes.');
  }
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) {
    throw new RangeError('Usage must be an integer from 0 to 1,440 minutes.');
  }

  const unroundedScore = clamp(0, 150, 100 + (100 * (targetMinutes - minutes)) / targetMinutes);
  return { unroundedScore, roundedScore: Math.round(unroundedScore) };
}

export function scoreWeek(input: {
  userId: string;
  targetMinutes: number;
  startDate: string;
  entries: ScreenTimeEntry[];
  today: string;
  isFinal: boolean;
}): WeeklyPerformance {
  const dates = dateRange(input.startDate, 7);
  const entries = new Map(input.entries.map((entry) => [entry.localDate, entry]));

  const days: DailyScore[] = dates.map((localDate) => {
    const entry = entries.get(localDate);
    const isFuture = !input.isFinal && compareDates(localDate, input.today) > 0;
    if (isFuture) {
      return {
        localDate,
        minutes: null,
        targetMinutes: input.targetMinutes,
        roundedScore: 0,
        unroundedScore: 0,
        status: 'future'
      };
    }
    if (!entry) {
      return {
        localDate,
        minutes: null,
        targetMinutes: input.targetMinutes,
        roundedScore: 0,
        unroundedScore: 0,
        status: 'unreported'
      };
    }
    const score = scoreReportedDay(input.targetMinutes, entry.minutes);
    return {
      localDate,
      minutes: entry.minutes,
      targetMinutes: input.targetMinutes,
      ...score,
      status: 'reported'
    };
  });

  const counted = input.isFinal ? days : days.filter((day) => day.status !== 'future');
  const denominator = input.isFinal ? 7 : Math.max(1, counted.length);
  const roundedDailyAverage = counted.reduce((sum, day) => sum + day.roundedScore, 0) / denominator;
  const unroundedAverage = counted.reduce((sum, day) => sum + day.unroundedScore, 0) / denominator;

  return {
    userId: input.userId,
    days,
    roundedDailyAverage,
    unroundedAverage,
    displayedScore: Math.round(roundedDailyAverage),
    unreportedDays: days.filter((day) => day.status === 'unreported').length,
    isFinal: input.isFinal
  };
}

export function resolveWinner(
  first: Pick<WeeklyPerformance, 'userId' | 'displayedScore' | 'unroundedAverage'>,
  second: Pick<WeeklyPerformance, 'userId' | 'displayedScore' | 'unroundedAverage'>
): { winnerId: string | null; isTie: boolean } {
  if (first.displayedScore !== second.displayedScore) {
    return { winnerId: first.displayedScore > second.displayedScore ? first.userId : second.userId, isTie: false };
  }
  const delta = first.unroundedAverage - second.unroundedAverage;
  if (Math.abs(delta) < 0.000001) return { winnerId: null, isTie: true };
  return { winnerId: delta > 0 ? first.userId : second.userId, isTie: false };
}
