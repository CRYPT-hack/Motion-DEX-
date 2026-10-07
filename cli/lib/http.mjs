/**
 * Resilient HTTP GET for handshakes.
 * Some animation sites (loading.io, uiverse.io) sit behind bot walls that
 * reject Node's undici fetch fingerprint while accepting curl. So: try
 * native fetch first (proper headers), then fall back to shelling out to
 * curl — the CLI "way out" when the polite handshake is refused.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

export const BROWSER_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const BROWSER_HEADERS = {
  'User-Agent': BROWSER_UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export async function httpGet(url, { headers = BROWSER_HEADERS, timeout = 20_000 } = {}) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeout) });
    if (res.ok) return await res.text();
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    const { stdout } = await execFileP(
      'curl',
      [
        '-sL', '--compressed', '--max-time', String(Math.ceil(timeout / 1000)),
        '-A', BROWSER_UA,
        '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        url,
      ],
      { maxBuffer: 20 * 1024 * 1024 },
    );
    if (!stdout) throw new Error(`empty response (fetch failed with: ${err.message})`);
    return stdout;
  }
}
