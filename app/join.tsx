import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { isPortfolioDemo } from '../src/config/runtime';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { useAuth } from '../src/auth/AuthProvider';
import { AuthForm } from '../src/components/AuthForm';
import { AuthFrame } from '../src/components/AuthFrame';
import { Body, Button, Card, Eyebrow, Field, H1, H2, InlineNotice } from '../src/components/ui';
import { api } from '../src/data/api';

type Preview = Awaited<ReturnType<typeof api.previewLeague>>;
type Lookup = { code: string; preview: Preview | null; error: string | null };

export default function JoinRoute() {
  return isPortfolioDemo ? <Redirect href="/demo" /> : <JoinScreen />;
}

function JoinScreen() {
  const auth = useAuth();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState((params.code ?? '').toUpperCase());
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [target, setTarget] = useState('120');
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!auth.session || code.length < 4) return;
    let active = true;
    api.previewLeague(code)
      .then((preview) => { if (active) setLookup({ code, preview, error: null }); })
      .catch((error: Error) => { if (active) setLookup({ code, preview: null, error: error.message }); });
    return () => { active = false; };
  }, [auth.session, code]);
  const currentLookup = lookup?.code === code ? lookup : null;
  const preview = currentLookup?.preview ?? null;
  const lookupPending = Boolean(auth.session && code.length >= 4 && !currentLookup);
  if (!auth.configured) return <AuthFrame><Card><H1>Backend setup needed.</H1><Body muted>Add Supabase configuration before using an invite.</Body></Card></AuthFrame>;
  if (!auth.session) return <AuthFrame><InlineNotice>Sign in first. Your invite code will stay in this URL.</InlineNotice><AuthForm initialMode="signup" emailRedirectTo={Linking.createURL('/join', { queryParams: { code } })} /></AuthFrame>;
  async function join() {
    setBusy(true); setMessage(null);
    try { await api.updateProfile(name.trim(), avatar.trim() || null); await api.joinLeague(code, Number(target)); router.replace('/home'); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : 'Could not join the league.'); }
    finally { setBusy(false); }
  }
  return (
    <AuthFrame>
      <Eyebrow>Private invite</Eyebrow><H1>Join the league.</H1>
      <Card>
        <Field label="Invite code" value={code} onChangeText={(value) => { setCode(value.toUpperCase()); setMessage(null); }} autoCapitalize="characters" maxLength={10} />
        <Field label="Display name" value={name} onChangeText={setName} maxLength={40} />
        <Field label="Avatar URL (optional)" value={avatar} onChangeText={setAvatar} keyboardType="url" autoCapitalize="none" />
        <Field label="Daily target (minutes)" value={target} onChangeText={setTarget} keyboardType="number-pad" />
      </Card>
      {preview ? <Card accent="#FF9B52"><Eyebrow>Review before joining</Eyebrow><H2>{preview.name}</H2><Body muted>{preview.memberCount} members · {preview.timezone}</Body><InlineNotice tone="warning">{preview.consequenceRules}</InlineNotice><Body muted>By joining, you agree to these playful consequence rules.</Body>{message ? <InlineNotice tone="danger">{message}</InlineNotice> : null}<Button label={`Agree and join ${preview.name}`} onPress={join} loading={busy} disabled={!name.trim() || !Number.isInteger(Number(target)) || Number(target) < 1 || Number(target) > 1440} /></Card> : <InlineNotice>{lookupPending ? 'Looking up the league…' : currentLookup?.error ?? 'Enter a valid invite code to review its rules.'}</InlineNotice>}
    </AuthFrame>
  );
}
