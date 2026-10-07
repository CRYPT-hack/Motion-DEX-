/**
 * CSS Loaders — https://cssloaders.github.io
 * Handshake: scrape. The site is a client-rendered SPA, but its GitHub repo
 * manifest reveals every loader as a lazy chunk (circle01…circle77, bubble01…),
 * so we index per-family counts straight from the repo tree.
 */
export const id = 'cssloaders';

export const site = {
  id: 'cssloaders',
  name: 'CSS Loaders',
  url: 'https://cssloaders.github.io',
  tagline: '300+ pure-CSS loaders and spinners — copy the code, no dependencies',
  types: ['css'],
  license: 'MIT (free)',
  accent: '#34d399',
  handshake: 'scrape',
  handshakeNote: 'counts loader chunks in the cssloaders.github.io GitHub repo tree',
};

const TREE_API =
  'https://api.github.com/repos/cssloaders/cssloaders.github.io/git/trees/main?recursive=1';

export function parse(treeJson) {
  const families = new Map();
  for (const m of treeJson.matchAll(/assets\/([a-z]+?)(\d+)\.module/g)) {
    const [, family, num] = m;
    if (!families.has(family)) families.set(family, new Set());
    families.get(family).add(num);
  }
  return [...families.entries()].map(([family, nums]) => ({
    id: `cssloaders:${family}`,
    name: `${family.charAt(0).toUpperCase()}${family.slice(1)} loaders`,
    site: 'cssloaders',
    category: 'loader',
    type: 'css',
    tags: [...new Set([family, 'loader', 'spinner', 'loading', 'css', 'copy paste'])],
    url: 'https://cssloaders.github.io/',
    meta: { variants: nums.size, note: 'click any loader for its CSS' },
  }));
}

export async function handshake() {
  const res = await fetch(TREE_API, {
    headers: {
      'User-Agent': 'MotionDex/1.0',
      Accept: 'application/vnd.github+json',
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const entries = parse(await res.text());
  return { sites: [site], entries };
}
