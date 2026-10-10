import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function evaluateModule(path: string, env: Record<string, string>, imports: Record<string, unknown>) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: Record<string, unknown> = {};
  runInNewContext(javascript, { exports, process: { env }, require: (name: string) => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  } });
  return exports;
}

test('portfolio mode never constructs an authentication client even with backend settings', () => {
  const env = { EXPO_PUBLIC_PORTFOLIO_DEMO: '1', EXPO_PUBLIC_SUPABASE_URL: 'https://fictional.example.test', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fictional-public-key' };
  const runtime = evaluateModule('../src/config/runtime.ts', env, {});
  let calls = 0;
  const client = evaluateModule('../src/data/supabase.ts', env, {
    '../config/runtime': runtime, '@react-native-async-storage/async-storage': {},
    '@supabase/supabase-js': { createClient: () => { calls++; return {}; } },
    'react-native': { Platform: { OS: 'web' } }, 'react-native-url-polyfill/auto': {}
  });
  assert.equal(runtime.isPortfolioDemo, true);
  assert.equal(client.isSupabaseConfigured, false);
  assert.equal(client.supabase, null);
  assert.equal(calls, 0);
  assert.throws(() => (client.requireSupabase as () => unknown)(), /not configured/);
});
