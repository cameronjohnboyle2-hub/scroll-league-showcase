import type { ScreenTimeEntry } from '../domain/types';
import { api } from '../data/api';

export type DailyUsageInput = {
  localDate: string;
  minutes: number;
  source: ScreenTimeEntry['source'];
  evidenceRef: string | null;
};

export interface UsageDataProvider {
  read(localDate: string): Promise<ScreenTimeEntry | null>;
  submit(input: DailyUsageInput): Promise<void>;
}

export class ManualUsageDataProvider implements UsageDataProvider {
  constructor(private readonly getEntries: () => ScreenTimeEntry[]) {}

  async read(localDate: string) {
    return this.getEntries().find((entry) => entry.localDate === localDate) ?? null;
  }

  async submit(input: DailyUsageInput) {
    if (input.source !== 'manual') throw new Error('The manual provider only accepts manual entries.');
    await api.submitEntry(input.localDate, input.minutes, input.source, input.evidenceRef);
  }
}
