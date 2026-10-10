import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { demoCsp, demoEnvironment } from './demo-policy.mjs';

const environment = demoEnvironment();
const basePath = environment.PORTFOLIO_BASE_PATH ?? '/scroll-league-showcase';
const result = spawnSync(process.execPath, ['node_modules/expo/bin/cli', 'export', '--platform', 'web', '--output-dir', 'dist-demo'], {
  stdio: 'inherit', env: environment
});
if (result.status !== 0) process.exit(result.status ?? 1);

async function protect(directory) {
  for (const file of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, file.name);
    if (file.isDirectory()) await protect(path);
    else if (file.name.endsWith('.html')) {
      const html = await readFile(path, 'utf8');
      const policy = `<meta http-equiv="Content-Security-Policy" content="${demoCsp}"><meta name="referrer" content="no-referrer"><title>Scroll League · Fictional demo</title><meta name="description" content="An interactive screen-time competition prototype with invented players, scoring previews, standings, and weekly recaps.">`;
      await writeFile(path, html.replace(/<head>/i, `<head>${policy}`));
    }
  }
}
await protect('dist-demo');
await writeFile('dist-demo/demo-build.json', JSON.stringify({ mode: 'fictional-demo', basePath }) + '\n');
await writeFile('dist-demo/.nojekyll', '');
await mkdir('dist-demo/licenses', { recursive: true });
await copyFile('licenses/inter-OFL.txt', 'dist-demo/licenses/inter-OFL.txt');
await copyFile('licenses/barlow-condensed-OFL.txt', 'dist-demo/licenses/barlow-condensed-OFL.txt');
await copyFile('vendor/decode-uri-component/LICENSE', 'dist-demo/licenses/decoder-MIT.txt');
await copyFile('THIRD_PARTY_NOTICES.md', 'dist-demo/THIRD_PARTY_NOTICES.md');
await writeFile('dist-demo/_headers', `/*\n  Content-Security-Policy: ${demoCsp}\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n`);
console.log('Disconnected demo exported to dist-demo. Backend settings were excluded.');
