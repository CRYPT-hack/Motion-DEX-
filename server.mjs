// MotionDex dev server — serves public/ plus the generated data/ under /data.
// Zero dependencies. Usage: node server.mjs  (PORT=… to override)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');
const DATA_DIR = join(ROOT, 'data');
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';

    // /data/* is served from the generated data directory (CLI output).
    const isData = pathname.startsWith('/data/');
    const base = isData ? DATA_DIR : PUBLIC_DIR;
    const rel = isData ? pathname.slice('/data'.length) : pathname;
    const file = normalize(join(base, rel));
    if (!file.startsWith(base)) throw Object.assign(new Error('forbidden'), { code: 'EACCES' });

    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': MIME[extname(file)] || 'application/octet-stream',
      'cache-control': pathname.startsWith('/data/') ? 'no-store' : 'no-cache',
    });
    res.end(body);
  } catch (err) {
    res.writeHead(err.code === 'EACCES' ? 403 : 404, { 'content-type': 'text/plain' });
    res.end(`404 — ${req.url}`);
  }
}).listen(PORT, () => {
  console.log(`\n  ⚡ MotionDex running at http://localhost:${PORT}\n`);
});
