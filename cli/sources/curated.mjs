/**
 * Curated sources — sites with no machine-readable catalog (bot walls, SPA-only
 * search, or tool-style sites). We index curated entries that deep-link into
 * each site's own search or documentation URLs, all verified by hand.
 *
 * Handshake mode: search-link / curated.
 */
export const id = 'curated';
export const isStatic = true;

const sites = [
  {
    id: 'swishy', name: 'Swishy AI', url: 'https://swishy.ai',
    tagline: 'AI motion designer — describe an animation, get production-ready motion',
    types: ['ai'], license: 'Freemium', accent: '#fda4af',
    handshake: 'curated', handshakeNote: 'verified by hand',
  },
  {
    id: 'lottiefiles', name: 'LottieFiles', url: 'https://lottiefiles.com',
    tagline: 'The largest library of free Lottie animations — JSON, dotLottie, GIF & MP4',
    types: ['lottie', 'icon'], license: 'Free tier + paid', accent: '#2dd4bf',
    handshake: 'search-link', handshakeNote: 'deep-links into lottiefiles.com/search',
  },
  {
    id: 'lordicon', name: 'Lordicon', url: 'https://lordicon.com',
    tagline: 'Thousands of powerful animated icons with a free tier',
    types: ['icon', 'lottie'], license: 'Free tier + paid', accent: '#f59e0b',
    handshake: 'search-link', handshakeNote: 'deep-links into lordicon.com/icons?query=',
  },
  {
    id: 'codepen', name: 'CodePen', url: 'https://codepen.io',
    tagline: 'Millions of community pens — the biggest animation playground on the web',
    types: ['js', 'css'], license: 'Free (community)', accent: '#94a3b8',
    handshake: 'search-link', handshakeNote: 'deep-links into codepen.io/search/pens',
  },
  {
    id: 'codrops', name: 'Codrops', url: 'https://tympanus.net/codrops/',
    tagline: 'Cutting-edge effect demos with full source code and tutorials',
    types: ['js', 'css', 'svg'], license: 'Free (tutorial source)', accent: '#f87171',
    handshake: 'curated', handshakeNote: 'links to the demos hub',
  },
  {
    id: 'hover', name: 'Hover.css', url: 'https://ianlunn.github.io/Hover/',
    tagline: '100+ hover effects for buttons and links — transitions, borders, shadows, curls',
    types: ['css'], license: 'Free for personal · paid commercial', accent: '#fb923c',
    handshake: 'curated', handshakeNote: 'effect names from the official docs',
  },
  {
    id: 'easings', name: 'Easings.net', url: 'https://easings.net',
    tagline: '31 cubic-bezier easing functions with live curves and copyable values',
    types: ['css'], license: 'Free', accent: '#4ade80',
    handshake: 'curated', handshakeNote: 'function list from easings.net',
  },
  {
    id: 'cubicbezier', name: 'cubic-bezier.com', url: 'https://cubic-bezier.com',
    tagline: 'Interactive cubic-bezier builder — drag, compare and copy easing curves',
    types: ['css'], license: 'Free', accent: '#22d3ee',
    handshake: 'curated', handshakeNote: 'verified by hand',
  },
  {
    id: 'aos', name: 'AOS — Animate On Scroll', url: 'https://michalsnik.github.io/aos/',
    tagline: 'Scroll-triggered reveal animations as simple HTML attributes',
    types: ['js', 'css'], license: 'MIT (free)', accent: '#818cf8',
    handshake: 'curated', handshakeNote: 'attribute list from the official demo',
  },
  {
    id: 'tailwind', name: 'Tailwind CSS Animations', url: 'https://tailwindcss.com/docs/animation',
    tagline: 'Built-in animation utilities — spin, ping, pulse, bounce + custom keyframes',
    types: ['css'], license: 'Free', accent: '#38bdf8',
    handshake: 'curated', handshakeNote: 'utility list from the official docs',
  },
  {
    id: 'animxyz', name: 'AnimXYZ', url: 'https://animxyz.com',
    tagline: 'Composable animation utilities for Vue & React — combine xyz variables',
    types: ['css'], license: 'MIT (free)', accent: '#f0abfc',
    handshake: 'curated', handshakeNote: 'utility list from the official docs',
  },
  {
    id: 'gsap', name: 'GSAP', url: 'https://gsap.com/docs/v3/Eases/',
    tagline: 'Industrial-strength JavaScript animation platform + ease visualizer',
    types: ['js'], license: 'Free core · Club plugins paid', accent: '#a3e635',
    handshake: 'curated', handshakeNote: 'ease list from the official docs',
  },
  {
    id: 'motion', name: 'Motion', url: 'https://motion.dev',
    tagline: 'The modern vanilla-JS animation engine (formerly Motion One)',
    types: ['js'], license: 'MIT (free)', accent: '#e879f9',
    handshake: 'curated', handshakeNote: 'verified by hand',
  },
  {
    id: 'svgartista', name: 'SVG Artista', url: 'https://svgartista.net',
    tagline: 'Turn any SVG into a stroke-draw and fill animation — generate CSS instantly',
    types: ['svg'], license: 'Free', accent: '#fcd34d',
    handshake: 'curated', handshakeNote: 'verified by hand',
  },
  {
    id: 'useanimations', name: 'UseAnimations', url: 'https://useanimations.com',
    tagline: 'Animated icons rendered from After Effects — perfect for micro-interactions',
    types: ['icon', 'svg'], license: 'Free with attribution', accent: '#fca5a5',
    handshake: 'curated', handshakeNote: 'verified by hand',
  },
];

// ---------------------------------------------------------------------------
// Entry builders
// ---------------------------------------------------------------------------
const entries = [];
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const E = (siteId, name, url, category, type, tags, meta) =>
  entries.push({ id: `${siteId}:${slug(name)}`, name, site: siteId, category, type, tags: [...new Set([...tags.map(t => t.toLowerCase())])], url, ...(meta ? { meta } : {}) });

// — Swishy (AI generator) —
E('swishy', 'AI Motion Designer', 'https://swishy.ai', 'generator', 'ai',
  ['ai', 'prompt', 'motion', 'generator', 'video', 'text animation', 'logo'], { note: 'type a prompt → animation' });
E('swishy', 'Template Gallery', 'https://swishy.ai/templates', 'generator', 'ai',
  ['ai', 'templates', 'text', 'logo', 'social', 'charts', 'ui'], { note: '500K+ community animations' });

// — LottieFiles (deep search-links) —
const lottiePacks = [
  ['Loading', 'loader', ['loading', 'spinner', 'progress']],
  ['Spinner', 'loader', ['spinner', 'loading', 'circle']],
  ['Success & checkmark', 'icon', ['success', 'checkmark', 'done', 'complete']],
  ['Error & warning', 'icon', ['error', 'warning', 'alert', 'fail']],
  ['Hearts & likes', 'icon', ['heart', 'like', 'love', 'favorite']],
  ['Stars & ratings', 'icon', ['star', 'rating', 'favorite']],
  ['Arrows', 'icon', ['arrow', 'direction', 'next', 'back']],
  ['Confetti & celebration', 'particle', ['confetti', 'celebration', 'party', 'birthday']],
  ['Emojis', 'icon', ['emoji', 'smile', 'face', 'reaction']],
  ['Notifications', 'icon', ['notification', 'bell', 'alert', 'badge']],
  ['Chat bubbles', 'icon', ['chat', 'message', 'bubble', 'typing']],
  ['Search', 'icon', ['search', 'magnifier', 'find']],
  ['Menus & hamburgers', 'icon', ['menu', 'hamburger', 'burger', 'nav']],
  ['Onboarding', 'ui', ['onboarding', 'walkthrough', 'intro']],
  ['Empty states', 'ui', ['empty', 'state', 'placeholder', '404']],
  ['Page transitions', 'entrance', ['transition', 'page', 'slide']],
  ['Toggle switches', 'ui', ['toggle', 'switch', 'on', 'off']],
  ['Buttons', 'ui', ['button', 'cta', 'hover']],
  ['Download & upload', 'icon', ['download', 'upload', 'transfer']],
  ['Walking characters', 'icon', ['walk', 'character', 'loop', 'person']],
];
for (const [name, category, tags] of lottiePacks) {
  E('lottiefiles', `${name} — LottieFiles search`, `https://lottiefiles.com/search?q=${encodeURIComponent(tags[0])}&category=animations`,
    category, 'lottie', [...tags, 'lottie', 'json', 'gif', 'free']);
}

// — Lordicon (deep search-links) —
for (const q of ['heart', 'menu', 'settings', 'play', 'search', 'arrow', 'home', 'star', 'user', 'trash']) {
  E('lordicon', `${q[0].toUpperCase()}${q.slice(1)} icons — Lordicon search`, `https://lordicon.com/icons?query=${q}`,
    'icon', 'lottie', [q, 'icon', 'animated', 'micro interaction']);
}

// — CodePen (deep search-links into pen search) —
const codepenPacks = [
  ['Page transitions', 'entrance', 'page transition animation'],
  ['Text animations', 'text', 'text animation css'],
  ['Glitch effects', 'text', 'glitch effect'],
  ['Typewriter effects', 'text', 'typewriter animation'],
  ['Neon glow', 'attention', 'neon glow css'],
  ['Animated gradient text', 'text', 'animated gradient text'],
  ['Particle backgrounds', 'particle', 'particle background'],
  ['Hover effects', 'hover', 'hover animation'],
  ['Button hovers', 'hover', 'button hover animation'],
  ['Card hover reveals', 'hover', 'card hover css'],
  ['3D flip cards', '3d', '3d flip card css'],
  ['Parallax scrolling', 'scroll', 'parallax scroll'],
  ['Scroll reveal', 'scroll', 'scroll reveal animation'],
  ['Infinite marquees', 'ui', 'infinite marquee css'],
  ['Loader spinners', 'loader', 'loader spinner css'],
  ['Skeleton shimmer', 'loader', 'skeleton loading shimmer'],
  ['Blob morphing', 'background', 'blob morphing animation'],
  ['Liquid buttons', 'hover', 'liquid button css'],
  ['Magnetic buttons', 'hover', 'magnetic button'],
  ['Explosion effects', 'attention', 'explosion animation css'],
  ['Fireworks', 'particle', 'fireworks css animation'],
  ['Rain & snow', 'particle', 'rain snow css animation'],
  ['Aurora backgrounds', 'background', 'aurora gradient animation'],
  ['Audio equalizers', 'icon', 'audio equalizer animation'],
  ['Ripple clicks', 'attention', 'ripple click effect'],
];
for (const [name, category, q] of codepenPacks) {
  E('codepen', `${name} — CodePen search`, `https://codepen.io/search/pens?q=${encodeURIComponent(q)}`,
    category, 'js', [...q.split(' '), 'codepen', 'community', 'source code']);
}

// — Codrops (demos hub) —
const codropsDemos = [
  ['Page transition effects', 'entrance', ['transition', 'page', 'css']],
  ['Text & typography effects', 'text', ['text', 'typography']],
  ['Hover & interaction effects', 'hover', ['hover', 'interaction']],
  ['SVG line drawing', 'icon', ['svg', 'stroke', 'draw']],
  ['Scroll interactions', 'scroll', ['scroll', 'reveal']],
  ['3D & WebGL scenes', '3d', ['3d', 'webgl', 'three']],
  ['Particles & backgrounds', 'particle', ['particle', 'background']],
  ['Loader concepts', 'loader', ['loader', 'loading']],
];
for (const [name, category, tags] of codropsDemos) {
  E('codrops', `${name} — Codrops demos`, 'https://tympanus.net/codrops/demos/', category, 'js',
    [...tags, 'codrops', 'tutorial', 'source']);
}

// — Hover.css (effect names from the docs) —
const hoverEffects = [
  'Grow', 'Shrink', 'Pulse', 'Pulse Grow', 'Pulse Shrink', 'Push', 'Pop', 'Rotate',
  'Grow Rotate', 'Float', 'Sink', 'Bob', 'Hang', 'Skew', 'Skew Forward', 'Skew Backward',
  'Wobble Horizontal', 'Wobble Vertical', 'Wobble To Bottom Right', 'Wobble To Top Right',
  'Wobble Top', 'Wobble Bottom', 'Wobble Skew', 'Buzz', 'Buzz Out',
  'Border Fade', 'Hollow', 'Trim', 'Ripple Out', 'Ripple In', 'Outline Out', 'Outline In',
  'Round Corners', 'Underline From Left', 'Underline From Center', 'Underline From Right',
  'Reveal', 'Underline Reveal', 'Overline Reveal',
  'Shadow', 'Grow Shadow', 'Float Shadow', 'Glow', 'Shadow Radial', 'Box Shadow Outset', 'Box Shadow Inset',
  'Bubble Float Bottom', 'Bubble Float Top', 'Curl Top Left', 'Curl Top Right', 'Curl Bottom Right', 'Curl Bottom Left',
];
for (const eff of hoverEffects) {
  E('hover', eff, 'https://ianlunn.github.io/Hover/', 'hover', 'css',
    [...eff.toLowerCase().split(' '), 'hover', 'button', 'link', 'transition']);
}

// — Easings.net (all 31 functions) —
const easeFamilies = ['Sine', 'Quad', 'Cubic', 'Quart', 'Quint', 'Expo', 'Circ', 'Back', 'Elastic'];
const easeKinds = [['In', 'in'], ['Out', 'out'], ['In Out', 'inout']];
for (const fam of easeFamilies) {
  for (const [kind, slugKind] of easeKinds) {
    const name = `ease${kind.replace(' ', '')} ${fam}`; // e.g. easeInOut Cubic → display "Ease In Out Cubic"
    E('easings', `Ease ${kind} ${fam}`, `https://easings.net/en#ease${kind.replace(' ', '')}${fam}`,
      'easing', 'css', ['ease', fam.toLowerCase(), kind.toLowerCase(), 'cubic bezier', 'timing function', slugKind]);
  }
}
E('easings', 'Linear', 'https://easings.net/en#linear', 'easing', 'css', ['linear', 'constant', 'timing function']);

// — AOS (scroll reveal attributes) —
const aosEffects = [
  'fade-up', 'fade-down', 'fade-left', 'fade-right', 'fade-up-right', 'fade-up-left',
  'fade-down-right', 'fade-down-left', 'flip-left', 'flip-right', 'flip-up', 'flip-down',
  'zoom-in', 'zoom-in-up', 'zoom-in-down', 'zoom-in-left', 'zoom-in-right',
  'zoom-out', 'zoom-out-up', 'zoom-out-down', 'zoom-out-left', 'zoom-out-right',
];
for (const eff of aosEffects) {
  E('aos', eff.replace(/-/g, ' ').toUpperCase().toLowerCase().replace(/^\w/, c => c.toUpperCase()).replace(/\b\w/g, c => c.toUpperCase()),
    'https://michalsnik.github.io/aos/', 'scroll', 'js',
    [...eff.split('-'), 'scroll', 'reveal', 'on scroll']);
}

// — Tailwind CSS animation utilities —
const tw = [
  ['Spin', 'loader', ['spin', 'rotate', 'infinite']],
  ['Ping', 'attention', ['ping', 'radar', 'pulse', 'notification']],
  ['Pulse', 'attention', ['pulse', 'opacity', 'soft']],
  ['Bounce', 'attention', ['bounce', 'up', 'down', 'ball']],
];
for (const [name, category, tags] of tw) {
  E('tailwind', `animate-${name.toLowerCase()}`, 'https://tailwindcss.com/docs/animation', category, 'css',
    [...tags, 'tailwind', 'utility']);
}

// — AnimXYZ composable utilities —
const xyz = [
  ['Fade', ['fade', 'opacity']],
  ['Fade Up', ['fade', 'up', 'translate']],
  ['Fade Down', ['fade', 'down']],
  ['Fade Left', ['fade', 'left']],
  ['Fade Right', ['fade', 'right']],
  ['Slide', ['slide', 'translate', 'up']],
  ['Rotate', ['rotate', 'turn']],
  ['Scale', ['scale', 'grow']],
  ['Flip', ['flip', '3d', 'perspective']],
  ['Skew', ['skew', 'slant']],
];
for (const [name, tags] of xyz) {
  E('animxyz', name, 'https://animxyz.com/', 'entrance', 'css',
    [...tags, 'xyz', 'composable', 'vue', 'react', 'utility']);
}

// — GSAP eases —
const gsapEases = ['Power1', 'Power2', 'Power3', 'Power4', 'Back', 'Elastic', 'Bounce', 'Rough', 'SlowMo', 'Steps', 'Expo', 'Circ'];
for (const ease of gsapEases) {
  E('gsap', `${ease} ease`, 'https://gsap.com/docs/v3/Eases/', 'easing', 'js',
    [ease.toLowerCase(), 'ease', 'easing', 'gsap', 'javascript', 'timeline']);
}

// — Single-tool sites —
E('cubicbezier', 'Cubic-bezier builder', 'https://cubic-bezier.com', 'tool', 'css',
  ['bezier', 'curve', 'easing', 'timing', 'builder', 'tool', 'compare'], { note: 'drag two handles, copy the value' });
E('motion', 'Motion animation engine', 'https://motion.dev', 'tool', 'js',
  ['motion', 'animate', 'javascript', 'library', 'springs', 'timeline'], { note: 'vanilla-JS, 5kb' });
E('svgartista', 'SVG stroke & fill animator', 'https://svgartista.net', 'generator', 'svg',
  ['svg', 'stroke', 'draw', 'fill', 'generate', 'css', 'tool'], { note: 'paste any SVG → animated CSS' });
E('useanimations', 'Animated icon set', 'https://useanimations.com', 'icon', 'svg',
  ['icon', 'animated', 'after effects', 'micro interaction', 'svg'], { note: 'line-style animated icons' });

export function handshake() {
  return { sites, entries };
}
