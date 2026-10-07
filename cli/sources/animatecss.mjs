/**
 * Animate.css — https://animate.style
 * Handshake: raw-css. Fetch the stylesheet from the official repo and extract
 * every animation class, then map each class to its documentation section.
 */
export const id = 'animatecss';

export const site = {
  id: 'animatecss',
  name: 'Animate.css',
  url: 'https://animate.style',
  tagline: 'The classic cross-browser library of plug-and-play CSS animations',
  types: ['css'],
  license: 'MIT (free)',
  accent: '#facc15',
  handshake: 'raw-css',
  handshakeNote: 'parses animate.min.css from the animate-css GitHub repo',
};

const RAW_CSS =
  'https://raw.githubusercontent.com/animate-css/animate.css/main/animate.min.css';

const UTILITIES = /^(animated|infinite|slow|slower|fast|faster|delay-\d|repeat-\d)$/;

const ATTENTION = new Set([
  'bounce', 'flash', 'pulse', 'rubberBand', 'shakeX', 'shakeY', 'headShake',
  'swing', 'tada', 'wobble', 'jello', 'heartBeat', 'hinge', 'jackInTheBox',
]);
const SPECIALS = new Set(['hinge', 'jackInTheBox', 'rollIn', 'rollOut']);
const FAMILY_ANCHORS = {
  bounce: 'bouncing',
  fade: 'fading',
  back: 'back',
  rotate: 'rotating',
  slide: 'sliding',
  zoom: 'zooming',
  lightspeed: 'lightspeed',
};

function classify(cls) {
  if (SPECIALS.has(cls)) return { anchor: 'specials' };
  if (cls.startsWith('flip')) return { anchor: 'flippers' };
  if (ATTENTION.has(cls)) return { anchor: 'attention_seekers', category: 'attention' };

  const fam = Object.keys(FAMILY_ANCHORS).find(f => cls.toLowerCase().startsWith(f));
  if (!fam) return { anchor: 'attention_seekers', category: 'attention' };

  const isIn = /In/.test(cls);
  const anchor =
    fam === 'lightspeed' ? 'lightspeed' : `${FAMILY_ANCHORS[fam]}_${isIn ? 'entrances' : 'exits'}`;
  return { anchor, category: isIn ? 'entrance' : 'exit' };
}

const pretty = cls =>
  cls
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bX\b/, 'X')
    .replace(/\bY\b/, 'Y');

export function parse(css) {
  const classes = new Set();
  for (const m of css.matchAll(/\.animate__([a-zA-Z0-9-]+)/g)) {
    const cls = m[1];
    if (!UTILITIES.test(cls)) classes.add(cls);
  }
  return [...classes].map(cls => {
    const { anchor, category } = classify(cls);
    const words = cls.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(' ');
    return {
      id: `animatecss:${cls.toLowerCase()}`,
      name: pretty(cls),
      site: 'animatecss',
      category: category ?? 'entrance',
      type: 'css',
      tags: [...new Set([...words, 'css', 'animate.css'])],
      url: `https://animate.style/#${anchor}`,
    };
  });
}

export async function handshake() {
  const res = await fetch(RAW_CSS, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const entries = parse(await res.text());
  return { sites: [site], entries };
}
