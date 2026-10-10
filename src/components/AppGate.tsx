import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLeagueSnapshot } from '../hooks/useLeagueSnapshot';
import { api } from '../data/api';
import type { ActiveAppSnapshot } from '../domain/types';
import { colors, spacing } from '../theme';
import { AppShell } from './AppShell';
import { Avatar, Body, Button, Card, Eyebrow, H1, H2, InlineNotice } from './ui';

export function AppGate({
  demo,
  children
}: { demo: boolean; children: (state: ReturnType<typeof useLeagueSnapshot> & { snapshot: ActiveAppSnapshot }) => ReactNode }) {
  const state = useLeagueSnapshot(demo);
  if (state.loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.lime} size="large" />
        <Text style={styles.muted}>Loading league…</Text>
      </View>
    );
  }
  if (!demo && !state.configured) {
    return (
      <AppShell>
        <Card accent={colors.orange}>
          <H1>Backend setup needed.</H1>
          <InlineNotice tone="warning">Add the two EXPO_PUBLIC_SUPABASE values from `.env.example`, then restart Expo.</InlineNotice>
          <Link href="/demo" asChild><Button label="Open the demo instead" /></Link>
        </Card>
      </AppShell>
    );
  }
  if (!demo && !state.session) {
    return (
      <AppShell>
        <Card>
          <H1>Sign in to your league.</H1>
          <Link href="/onboarding" asChild><Button label="Continue" /></Link>
        </Card>
      </AppShell>
    );
  }
  if (state.error || !state.snapshot) {
    return (
      <AppShell demo={demo}>
        <Card accent={colors.red}>
          <H1>No active league yet.</H1>
          <InlineNotice tone="danger">{state.error ?? 'League data is unavailable.'}</InlineNotice>
          <Link href="/onboarding" asChild><Button label="Create or join a league" /></Link>
        </Card>
      </AppShell>
    );
  }
  if (!state.snapshot.season || !state.snapshot.currentWeek) {
    const commissioner = state.snapshot.league.commissionerId === state.snapshot.profile.id;
    return (
      <AppShell demo={demo}>
        <Card accent={colors.lime}>
          <Eyebrow>Preseason lobby</Eyebrow>
          <H1>{state.snapshot.league.name}</H1>
          <Body muted>Invite 2–10 friends, make sure everyone sets a target, then begin the eight-week season.</Body>
          {state.snapshot.league.inviteCode ? <InlineNotice>Invite code: {state.snapshot.league.inviteCode}</InlineNotice> : null}
        </Card>
        {state.snapshot.members.map((member) => <Card key={member.id}><View style={styles.member}><Avatar name={member.displayName} url={member.avatarUrl} /><View><H2>{member.displayName}</H2><Body muted>{member.targetMinutes} min daily target</Body></View></View></Card>)}
        {commissioner ? <Button label="Start eight-week season" disabled={state.snapshot.members.length < 2} onPress={async () => { await api.startSeason(); await state.refresh(); }} /> : <InlineNotice>Waiting for the commissioner to start the season.</InlineNotice>}
      </AppShell>
    );
  }
  return <>{children({ ...state, snapshot: state.snapshot as ActiveAppSnapshot })}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, minHeight: 400, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.background },
  muted: { color: colors.muted },
  member: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }
});
