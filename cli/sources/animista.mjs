/**
 * Animista — https://animista.net
 * Handshake: api. The site ships its entire catalog as a public JSON file
 * (animista.json), including default duration/easing per variation.
 * Deep-link pattern: https://animista.net/play/<category>/<variation>
 */
export const id = 'animista';

export const site = {
  id: 'animista',
  name: 'Animista',
  url: 'https://animista.net',
  tagline: 'A huge playground of ready-made CSS animations with live parameter tweaking',
  types: ['css'],
  license: 'Free',
  accent: '#a78bfa',
  handshake: 'api',
  handshakeNote: 'fetches animista.net/animista.json (official catalog)',
};

const CATEGORY_MAP = {
  basic: 'basics',
  entrances: 'entrance',
  exits: 'exit',
  text: 'text',
  attention: 'attention',
  background: 'background',
};

const STOP = new Set(['in', 'out', 'up', 'down', 'the', 'of', 'and', 'to', 'a', 'diagonal']);

const words = s => s.split('-').filter(w => w && !STOP.has(w));
const title = s =>
  s
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export function parse(data) {
  const entries = [];
  for (const [cat, catDef] of Object.entries(data.categories ?? {})) {
    const category = CATEGORY_MAP[cat] ?? 'basics';
    for (const [group, groupDef] of Object.entries(catDef.groups ?? {})) {
      for (const [variation, params] of Object.entries(groupDef.variations ?? {})) {
        entries.push({
          id: `animista:${cat}/${variation}`,
          name: title(variation),
          site: 'animista',
          category,
          type: 'css',
          tags: [...new Set([...words(group), ...words(variation), category, 'css'])],
          url: `https://animista.net/play/${cat}/${variation}`,
          meta: {
            duration: params.duration,
            easing: params.easing,
            iterations: params.iterationCount,
          },
        });
      }
    }
  }
  return entries;
}

export async function handshake() {
  const res = await fetch('https://animista.net/animista.json', {
    headers: { 'User-Agent': 'MotionDex/1.0 (+https://localhost)' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const entries = parse(await res.json());
  return { sites: [site], entries };
}
