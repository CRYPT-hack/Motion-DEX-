/**
 * Loading.io — https://loading.io
 * Handshake: scrape. The public /spinner/ index lists every spinner category
 * with its own deep-link page; the href suffix encodes search tags.
 */
import { httpGet } from '../lib/http.mjs';

export const id = 'loadingio';

export const site = {
  id: 'loadingio',
  name: 'Loading.io',
  url: 'https://loading.io',
  tagline: 'Build and customize CSS/SVG/Lottie loaders — spinners, bars, progress, skeletons',
  types: ['css', 'svg'],
  license: 'Free tier + Pro',
  accent: '#38bdf8',
  handshake: 'scrape',
  handshakeNote: 'parses the /spinner/ index page',
};

const title = s =>
  s
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export function parse(html) {
  const seen = new Set();
  const entries = [];
  for (const m of html.matchAll(/href="\/spinner\/([a-z0-9-]+)\/(?:-([a-z0-9-]+))?"/g)) {
    const slug = m[1];
    if (seen.has(slug)) continue;
    seen.add(slug);
    const tagWords = (m[2] ?? '').split('-').filter(Boolean);
    entries.push({
      id: `loadingio:${slug}`,
      name: `${title(slug)} spinner`,
      site: 'loadingio',
      category: 'loader',
      type: 'css',
      tags: [...new Set([slug.replace(/-/g, ' '), ...tagWords, 'loader', 'loading', 'spinner'])],
      url: `https://loading.io/spinner/${slug}/`,
      meta: { format: 'CSS · SVG · Lottie' },
    });
  }
  return entries;
}

export async function handshake() {
  const html = await httpGet('https://loading.io/spinner/');
  const entries = parse(html);
  return { sites: [site], entries };
}
