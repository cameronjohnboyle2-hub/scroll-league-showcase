import type { AppSnapshot, EntrySource } from '../domain/types';
import { requireSupabase } from './supabase';

async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await requireSupabase().rpc(name, args);
  if (error) throw error;
  return data as T;
}

export const api = {
  getSnapshot: () => rpc<AppSnapshot>('get_app_snapshot'),
  updateProfile: (displayName: string, avatarUrl: string | null) =>
    rpc<void>('update_profile', { p_display_name: displayName, p_avatar_url: avatarUrl }),
  createLeague: (input: { name: string; timezone: string; consequenceRules: string; targetMinutes: number }) =>
    rpc<{ leagueId: string; inviteCode: string }>('create_league', {
      p_name: input.name,
      p_timezone: input.timezone,
      p_consequence_rules: input.consequenceRules,
      p_target_minutes: input.targetMinutes
    }),
  joinLeague: (inviteCode: string, targetMinutes: number) =>
    rpc<{ leagueId: string }>('join_league', { p_invite_code: inviteCode.trim().toUpperCase(), p_target_minutes: targetMinutes }),
  previewLeague: (inviteCode: string) =>
    rpc<{ name: string; timezone: string; consequenceRules: string; memberCount: number }>('preview_league_by_code', { p_invite_code: inviteCode.trim().toUpperCase() }),
  startSeason: () => rpc<{ seasonId: string }>('start_season'),
  setTarget: (minutes: number) => rpc<void>('set_target', { p_minutes: minutes }),
  submitEntry: (localDate: string, minutes: number, source: EntrySource = 'manual', evidenceRef: string | null = null) =>
    rpc<void>('submit_screen_time_entry', {
      p_local_date: localDate,
      p_minutes: minutes,
      p_source: source,
      p_evidence_reference: evidenceRef
    }),
  suggestConsequence: (title: string, description: string | null) =>
    rpc<void>('suggest_consequence', { p_title: title, p_description: description }),
  moderateConsequence: (consequenceId: string, status: 'approved' | 'retired') =>
    rpc<void>('moderate_consequence', { p_consequence_id: consequenceId, p_status: status }),
  selectNextConsequence: (consequenceId: string | null) =>
    rpc<void>('select_next_consequence', { p_consequence_id: consequenceId }),
  markConsequenceDone: (resultId: string, done: boolean) =>
    rpc<void>('mark_consequence_done', { p_weekly_result_id: resultId, p_done: done }),
  trackEvent: (eventName: string, properties: Record<string, unknown> = {}) =>
    rpc<void>('track_analytics_event', { p_event_name: eventName, p_properties: properties })
};
