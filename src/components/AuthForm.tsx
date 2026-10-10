import { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { spacing } from '../theme';
import { Button, Card, Field, H1, InlineNotice } from './ui';

export function AuthForm({ initialMode = 'signup', emailRedirectTo }: { initialMode?: 'signup' | 'signin'; emailRedirectTo?: string }) {
  const auth = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function submit() {
    setBusy(true); setMessage(null);
    try {
      if (mode === 'signup') {
        const result = await auth.signUp(email, password, emailRedirectTo);
        if (result.confirmationRequired) setMessage('Check your email to confirm the account, then return here to sign in.');
      } else await auth.signIn(email, password);
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : 'Authentication failed.'); }
    finally { setBusy(false); }
  }
  return (
    <Card>
      <H1>{mode === 'signup' ? 'Make an account.' : 'Welcome back.'}</H1>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} hint="Use at least eight characters." />
      {message ? <InlineNotice>{message}</InlineNotice> : null}
      <View style={{ gap: spacing.sm }}>
        <Button label={mode === 'signup' ? 'Create account' : 'Sign in'} onPress={submit} loading={busy} disabled={!email.includes('@') || password.length < 8} />
        <Button label={mode === 'signup' ? 'I already have an account' : 'Create a new account'} variant="ghost" onPress={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMessage(null); }} />
      </View>
    </Card>
  );
}
