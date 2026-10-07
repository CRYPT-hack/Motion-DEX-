/**
 * Uiverse — https://uiverse.io
 * Handshake: scrape. Category pages are server-rendered enough to expose real
 * element deep-links (/author/element-slug). We index the categories plus the
 * first page of elements from each.
 */
import { httpGet } from '../lib/http.mjs';

export const id = 'uiverse';

export const site = {
  id: 'uiverse',
  name: 'Uiverse',
  url: 'https://uiverse.io',
  tagline: 'Thousands of community-made animated UI elements — free to copy-paste',
  types: ['css'],
  license: 'Free (open-source elements)',
  accent: '#60a5fa',
  handshake: 'scrape',
  handshakeNote: 'parses category pages for element deep-links',
};

const CATEGORIES = [
  ['buttons', 'ui', ['button', 'hover', 'click', 'cta']],
  ['cards', 'ui', ['card', 'hover', 'profile']],
  ['checkboxes', 'ui', ['checkbox', 'check', 'form']],
  ['switches', 'ui', ['toggle', 'switch', 'checkbox']],
  ['inputs', 'ui', ['input', 'form', 'field', 'text']],
  ['loaders', 'loader', ['loader', 'spinner', 'loading']],
  ['tooltips', 'ui', ['tooltip', 'hover', 'hint']],
  ['forms', 'ui', ['form', 'login', 'signup']],
];

const PER_CATEGORY = 12;

const title = s =>
  s
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export function parseCategory(slug, html) {
  const def = CATEGORIES.find(([c]) => c === slug);
  const [, category, extraTags] = def ?? [slug, 'ui', []];

  const entries = [
    {
      id: `uiverse:cat-${slug}`,
      name: `${title(slug)} collection`,
      site: 'uiverse',
      category,
      type: 'css',
      tags: [...new Set([slug.replace(/s$/, ''), ...extraTags, 'css', 'tailwind-friendly', 'copy paste'])],
      url: `https://uiverse.io/${slug}`,
      meta: { note: 'browse the full collection' },
    },
  ];

  const seen = new Set();
  for (const m of html.matchAll(/href="\/([A-Za-z0-9_.-]+)\/([a-z]+)-([a-z]+)-(\d+)"/g)) {
    const [, author, adj, animal, num] = m;
    const key = `${author}/${adj}-${animal}-${num}`;
    if (seen.has(key) || seen.size >= PER_CATEGORY) continue;
    seen.add(key);
    entries.push({
      id: `uiverse:${key.toLowerCase()}`,
      name: `${title(adj)} ${title(animal)}`,
      site: 'uiverse',
      category,
      type: 'css',
      tags: [...new Set([...extraTags, adj, animal, 'css', author.toLowerCase()])],
      url: `https://uiverse.io/${key}`,
      meta: { author, note: 'copy-paste element' },
    });
  }
  return entries;
}

export async function handshake() {
  const pages = await Promise.all(
    CATEGORIES.map(async ([slug]) => [slug, await httpGet(`https://uiverse.io/${slug}`)]),
  );
  return { sites: [site], entries: pages.flatMap(([slug, html]) => parseCategory(slug, html)) };
}
