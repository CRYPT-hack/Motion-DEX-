#!/usr/bin/env node
/**
 * MotionDex refresh CLI
 * ---------------------
 * "Handshakes" with websites that publish free frontend animations and
 * rebuilds the search index consumed by the site.
 *
 * Handshake strategy per source:
 *   - api        → the site exposes a machine-readable catalog (Animista's animista.json)
 *   - raw-css    → parse the library's shipped stylesheet for class names (Animate.css)
 *   - scrape     → parse public HTML / repo manifests (Loading.io, CSS Loaders, Uiverse)
 *   - search-link→ no public catalog; we index curated deep-links into the site's
 *                  own search URLs (LottieFiles, Lordicon, CodePen)
 *
 * If a handshake fails (site down, bot wall, no network) the CLI falls back to the
 * last successful snapshot in cli/seeds/ so the site always has data.
 *
 * Usage:
 *   node cli/refresh.mjs                 # live handshake, refresh all sources
 *   node cli/refresh.mjs --offline       # use seeds only (no network)
 *   node cli/refresh.mjs --site=animista # refresh a single source
 *   node cli/refresh.mjs --no-seeds      # don't persist snapshots
 *   node cli/refresh.mjs -v              # verbose errors
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'data');
const SEED_DIR = join(ROOT, 'cli', 'seeds');

const args = process.argv.slice(2);
const flags = {
  offline: args.includes('--offline'),
  saveSeeds: !args.includes('--no-seeds'),
  verbose: args.includes('-v') || args.includes('--verbose'),
  only: args.find(a => a.startsWith('--site='))?.split('=')[1] ?? null,
};

const sources = [
  await import('./sources/animista.mjs'),
  await import('./sources/animatecss.mjs'),
  await import('./sources/loadingio.mjs'),
  await import('./sources/cssloaders.mjs'),
  await import('./sources/uiverse.mjs'),
  await import('./sources/curated.mjs'),
];

async function loadSeed(id) {
  try {
    return JSON.parse(await readFile(join(SEED_DIR, `${id}.json`), 'utf8'));
  } catch {
    return null;
  }
}

const sites = new Map();
const entries = [];
const report = [];

for (const src of sources) {
  if (flags.only && src.id !== flags.only && src.id !== 'curated') continue;

  let payload = null;
  let mode = src.isStatic ? 'static' : 'live';

  if (flags.offline && !src.isStatic) mode = 'seed';
  if (mode === 'live') {
    try {
      payload = await src.handshake();
      if (!payload?.entries?.length) throw new Error('handshake returned no entries');
    } catch (err) {
      mode = 'seed';
      if (flags.verbose) console.error(`  ! ${src.id}: ${err.message}`);
    }
  } else if (mode === 'static') {
    payload = src.handshake(); // curated data, no I/O
  }

  if (!payload) {
    payload = await loadSeed(src.id);
    if (!payload) {
      report.push([src.id, 'failed', 0, 'no seed available']);
      continue;
    }
  } else if (flags.saveSeeds && mode !== 'static') {
    await mkdir(SEED_DIR, { recursive: true });
    await writeFile(join(SEED_DIR, `${src.id}.json`), JSON.stringify(payload));
  }

  for (const s of payload.sites ?? []) sites.set(s.id, { ...s, live: mode === 'live' });
  entries.push(...payload.entries);
  report.push([src.id, mode, payload.entries.length, (payload.sites ?? []).map(s => s.id).join(', ')]);
}

// Dedupe + index stats.
const seen = new Set();
const finalEntries = entries.filter(e => e?.id && e.url && !seen.has(e.id) && seen.add(e.id));
const countsBySite = {};
const countsByCategory = {};
for (const e of finalEntries) {
  countsBySite[e.site] = (countsBySite[e.site] ?? 0) + 1;
  countsByCategory[e.category] = (countsByCategory[e.category] ?? 0) + 1;
}
for (const s of sites.values()) s.count = countsBySite[s.id] ?? 0;
const siteList = [...sites.values()].sort((a, b) => b.count - a.count);

await mkdir(DATA_DIR, { recursive: true });
await writeFile(join(DATA_DIR, 'animations.json'), JSON.stringify(finalEntries));
await writeFile(join(DATA_DIR, 'sites.json'), JSON.stringify(siteList, null, 2));
await writeFile(
  join(DATA_DIR, 'meta.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      totalAnimations: finalEntries.length,
      totalSites: siteList.length,
      liveSources: siteList.filter(s => s.live).map(s => s.id),
      offlineMode: flags.offline,
      countsBySite,
      countsByCategory,
    },
    null,
    2,
  ),
);

const MODE = {
  live: n => `\x1b[32m🤝 live  \x1b[0m ${n}`,
  seed: n => `\x1b[33m🌱 seed  \x1b[0m ${n}`,
  static: n => `\x1b[36m✏️  curated\x1b[0m ${n}`,
  failed: n => `\x1b[31m✖ failed \x1b[0m ${n}`,
};

console.log('\n  MotionDex refresh — handshaking with animation sites\n');
for (const [id, mode, n, note] of report) {
  console.log(`  ${MODE[mode](String(n).padStart(4))}  entries from \x1b[1m${id}\x1b[0m${note ? `  (${note})` : ''}`);
}
console.log(`\n  → ${finalEntries.length} animations · ${siteList.length} sites · ${Object.keys(countsByCategory).length} categories`);
console.log(`  → written to ${DATA_DIR.replaceAll('\\', '/')}/{animations,sites,meta}.json\n`);
if (flags.offline) console.log('  (offline mode: used snapshots in cli/seeds — run without --offline to re-handshake)\n');
