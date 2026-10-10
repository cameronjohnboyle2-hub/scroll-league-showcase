import { Link, Redirect, router } from 'expo-router';
import { isPortfolioDemo } from '../src/config/runtime';
import { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../src/auth/AuthProvider';
import { AuthForm } from '../src/components/AuthForm';
import { AuthFrame } from '../src/components/AuthFrame';
import { Body, Button, Card, Eyebrow, Field, H1, H2, InlineNotice } from '../src/components/ui';
import { api } from '../src/data/api';
import { spacing } from '../src/theme';

const defaultRules = 'Keep it funny, cheap, safe, and finishable in one week. No humiliation, money, or coercion.';

export default function OnboardingRoute() {
  return isPortfolioDemo ? <Redirect href="/demo" /> : <OnboardingScreen />;
}

function OnboardingScreen() {
  const auth = useAuth();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [target, setTarget] = useState('120');
  const [leagueName, setLeagueName] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Denver');
  const [rules, setRules] = useState(defaultRules);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!auth.configured) return <AuthFrame><Card><Eyebrow>Setup required</Eyebrow><H1>Connect Supabase first.</H1><Body muted>Copy `.env.example` to `.env`, add the project URL and publishable key, apply the migrations, then restart Expo.</Body><Link href="/demo" asChild><Button label="Open the demo" /></Link></Card></AuthFrame>;
  if (!auth.session) return <AuthFrame><AuthForm /></AuthFrame>;
  async function create() {
    setBusy(true); setMessage(null);
    try {
      await api.updateProfile(name.trim(), avatar.trim() || null);
      await api.createLeague({ name: leagueName.trim(), timezone, consequenceRules: rules.trim(), targetMinutes: Number(target) });
      router.replace('/home');
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : 'Could not create the league.'); }
    finally { setBusy(false); }
  }
  return (
    <AuthFrame>
      <View style={{ gap: spacing.sm }}><Eyebrow>League setup</Eyebrow><H1>Build your home court.</H1><Body muted>Start a private league now, or join one from its code or invite link.</Body></View>
      <Card>
        <H2>Your profile</H2>
        <Field label="Display name" value={name} onChangeText={setName} maxLength={40} />
        <Field label="Avatar URL (optional)" value={avatar} onChangeText={setAvatar} keyboardType="url" autoCapitalize="none" />
        <Field label="Daily recreational target" value={target} onChangeText={setTarget} keyboardType="number-pad" hint="Minutes per day. League members can see this." />
      </Card>
      <Card>
        <H2>Create a league</H2>
        <Field label="League name" value={leagueName} onChangeText={setLeagueName} placeholder="Your league" maxLength={50} />
        <Field label="IANA time zone" value={timezone} onChangeText={setTimezone} autoCapitalize="none" hint="This controls local days and week rollover." />
        <Field label="Consequence rules" value={rules} onChangeText={setRules} multiline maxLength={500} />
        {message ? <InlineNotice tone="danger">{message}</InlineNotice> : null}
        <Button label="Create private league" onPress={create} loading={busy} disabled={!name.trim() || !leagueName.trim() || !rules.trim() || !Number.isInteger(Number(target)) || Number(target) < 1 || Number(target) > 1440} />
      </Card>
      <Link href="/join" asChild><Button label="Join with a code" variant="secondary" /></Link>
      <Button label="Sign out" variant="ghost" onPress={() => auth.signOut()} />
    </AuthFrame>
  );
}
