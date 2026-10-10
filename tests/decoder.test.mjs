import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const routerRequire = createRequire(require.resolve('expo-router/package.json'));
const query = routerRequire('query-string');

test('the router consumes the attributed patched decoder', () => {
  const queryRequire = createRequire(routerRequire.resolve('query-string'));
  const packagePath = queryRequire.resolve('decode-uri-component/package.json');
  assert.equal(JSON.parse(readFileSync(packagePath, 'utf8')).version, '0.5.0-compat.1');
});

test('router query decoder preserves fixed routes and Unicode', () => {
  const params = query.parse('demo=1&week=2&date=2026-10-09&code=DEMO%2026&name=%E2%9C%93');
  assert.deepEqual({ ...params }, { demo: '1', week: '2', date: '2026-10-09', code: 'DEMO 26', name: '✓' });
  assert.equal(query.stringify({ week: '2', demo: '1' }), 'demo=1&week=2');
});

test('malformed route sequences are decoded without recursive exhaustion', { timeout: 3000 }, () => {
  const malformed = '%FF'.repeat(16000);
  assert.equal(query.parse(`value=${malformed}`).value, malformed);
  assert.equal(query.parse('value=%E0%A4%A').value, '%E0%A4%A');
  assert.equal(query.parse('value=%C2').value, '�');
});
