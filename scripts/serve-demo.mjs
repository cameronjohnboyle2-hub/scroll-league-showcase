import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { demoCsp } from './demo-policy.mjs';

const root = resolve('dist-demo');
const { basePath } = JSON.parse(await readFile(resolve(root, 'demo-build.json'), 'utf8'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
createServer(async (request, response) => {
  try {
    const originalPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (basePath && originalPath !== basePath && !originalPath.startsWith(`${basePath}/`)) {
      response.writeHead(302, { Location: `${basePath}/demo` }); response.end(); return;
    }
    const pathname = originalPath.slice(basePath.length) || '/';
    let file = resolve(root, `.${pathname}`);
    const within = relative(root, file);
    if (within.startsWith('..') || isAbsolute(within)) throw new Error('Invalid path');
    if (pathname.endsWith('/')) file = resolve(file, 'index.html');
    else if (!extname(file)) file += '.html';
    if (!(await stat(file)).isFile()) throw new Error('Not found');
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Content-Security-Policy': demoCsp, 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store' });
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(4179, '127.0.0.1', () => console.log(`Scroll League fictional demo: http://127.0.0.1:4179${basePath}/demo`));
