import assert from 'node:assert/strict';
import test from 'node:test';
import { demoEnvironment, demoCsp } from '../scripts/demo-policy.mjs';

test('demo export excludes inherited public settings and dotenv loading', () => {
  const env = demoEnvironment({ PATH: 'local-tools', EXPO_PUBLIC_SUPABASE_URL: 'https://fictional.example.test', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fictional-key', EXPO_PUBLIC_ANALYTICS: 'fictional-tracker' });
  assert.equal(env.PATH, 'local-tools');
  assert.equal(env.EXPO_PUBLIC_PORTFOLIO_DEMO, '1');
  assert.equal(env.EXPO_NO_DOTENV, '1');
  assert.equal(env.EXPO_PUBLIC_SUPABASE_URL, undefined);
  assert.equal(env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, undefined);
  assert.equal(env.EXPO_PUBLIC_ANALYTICS, undefined);
  assert.ok(demoCsp.includes("connect-src 'none'"));
});
