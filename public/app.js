/* ==========================================================================
   MotionDex front-end — search 1,000+ animations across 20 free-animation
   sites and route straight to the page that hosts each one.
   ========================================================================== */
'use strict';

const CATEGORY_LABELS = {
  all: 'All',
  loader: 'Loaders',
  entrance: 'Entrances',
  exit: 'Exits',
  attention: 'Attention',
  text: 'Text',
  background: 'Backgrounds',
  hover: 'Hover',
  easing: 'Easing',
  icon: 'Icons',
  scroll: 'Scroll',
  ui: 'UI',
  '3d': '3D',
  particle: 'Particles',
  basics: 'Basics',
  generator: 'Generators',
  tool: 'Tools',
};

const HANDSHAKE_BADGE = {
  api: '🤝 live api',
  scrape: '🤝 live scrape',
  'raw-css': '🤝 live css',
  'search-link': '🔗 search-link',
  curated: '✏️ curated',
};

const PAGE = 60;

const $ = id => document.getElementById(id);
const els = {
  grid: $('grid'), chips: $('chips'), siteSel: $('siteSel'), q: $('q'),
  count: $('count'), suggest: $('suggest'), clearBtn: $('clearBtn'),
  empty: $('empty'), emptyQ: $('emptyQ'), emptyActions: $('emptyActions'),
  statPill: $('statPill'), liveCount: $('liveCount'), totalAnims: $('totalAnims'),
  sourceGrid: $('sourceGrid'), tickerTrack: $('tickerTrack'),
  toast: $('toast'), dice: $('dice'), shareSearch: $('shareSearch'), sentinel: $('sentinel'),
};

const state = { q: '', cat: 'all', site: 'all' };
let entries = [];
let sitesById = new Map();
let filtered = [];
let rendered = 0;
let suggestIdx = -1;
let toastTimer;

/* ------------------------------ boot ------------------------------ */

async function boot() {
  const [anims, sites, meta] = await Promise.all([
    fetch('/data/animations.json').then(r => r.json()),
    fetch('/data/sites.json').then(r => r.json()),
    fetch('/data/meta.json').then(r => r.json()),
  ]);

  entries = anims.map(e => ({ ...e, nameL: e.name.toLowerCase() }));
  sitesById = new Map(sites.map(s => [s.id, s]));

  // Prebuild search haystacks once.
  for (const e of entries) {
    e.siteName = sitesById.get(e.site)?.name ?? e.site;
    e.hay = `${e.name} ${e.tags.join(' ')} ${e.siteName} ${CATEGORY_LABELS[e.category] ?? e.category}`.toLowerCase();
  }

  // Header / hero stats.
  els.statPill.innerHTML = `<b>${entries.length.toLocaleString()}</b> animations · <b>${sites.length}</b> sources`;
  els.liveCount.textContent = meta.liveSources.length;
  els.totalAnims.textContent = entries.length.toLocaleString();
  document.getElementById('q').placeholder =
    `Search ${entries.length.toLocaleString()} animations… (fade, loader, glitch, heart)`;

  // stat counters — targets are read by the count-up observer
  const statTargets = {
    totalAnimsStat: entries.length,
    sitesStat: sites.length,
    catsStat: Object.keys(meta.countsByCategory).length,
    liveStat: meta.liveSources.length,
  };
  for (const el of document.querySelectorAll('[data-count]')) {
    el.dataset.target = statTargets[el.dataset.count] ?? 0;
  }

  restoreHash();

  buildTicker(sites);
  buildSources(sites);
  buildChips();
  buildSiteSelect(sites);

  apply(true);
}

/* ------------------------------ scoring ------------------------------ */

function scoreEntry(e, terms) {
  let s = 0;
  for (const t of terms) {
    let termScore = 0;
    if (e.nameL.startsWith(t)) termScore = 130;
    else if (e.nameL.includes(t)) termScore = 90;
    for (const tag of e.tags) {
      if (tag === t) termScore = Math.max(termScore, 70);
      else if (tag.startsWith(t)) termScore = Math.max(termScore, 34);
      else if (tag.includes(t)) termScore = Math.max(termScore, 22);
    }
    if (e.siteName.toLowerCase().includes(t)) termScore = Math.max(termScore, 46);
    if ((CATEGORY_LABELS[e.category] ?? e.category).toLowerCase().startsWith(t)) termScore = Math.max(termScore, 40);
    if (termScore === 0 && e.hay.includes(t)) termScore = 8;
    if (termScore === 0) return 0; // every term must match somewhere (AND)
    s += termScore;
  }
  return s;
}

function computeFiltered() {
  const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
  filtered = entries.filter(e => {
    if (state.cat !== 'all' && e.category !== state.cat) return false;
    if (state.site !== 'all' && e.site !== state.site) return false;
    return true;
  });
  if (terms.length) {
    filtered = filtered
      .map(e => [scoreEntry(e, terms), e])
      .filter(([s]) => s > 0)
      .sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name))
      .map(([, e]) => e);
  } else {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }
  rendered = 0;
}

/* ------------------------------ rendering ------------------------------ */

function renderMore() {
  const frag = document.createDocumentFragment();
  const end = Math.min(rendered + PAGE, filtered.length);
  for (let i = rendered; i < end; i++) frag.appendChild(buildCard(filtered[i], i));
  els.grid.appendChild(frag);
  rendered = end;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function highlight(name) {
  const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!terms.length) return escapeHtml(name);
  let html = escapeHtml(name);
  for (const t of terms) {
    if (!t) continue;
    const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
    html = html.replace(re, '\u0001$1\u0002');
  }
  return html.replace(/\u0001/g, '<mark>').replace(/\u0002/g, '</mark>');
}

function demoFor(category) {
  switch (category) {
    case 'loader': return '<span class="d d-loader"></span>';
    case 'entrance': return '<span class="d d-in"></span>';
    case 'exit': return '<span class="d d-out"></span>';
    case 'attention': return '<span class="d d-att">✦</span>';
    case 'text': return '<span class="d d-text">Aa</span>';
    case 'background': return '<span class="d d-orb"></span>';
    case 'hover': return '<span class="d d-hov"><b>hover</b></span>';
    case 'easing': return '<span class="d d-ease"><i></i></span>';
    case 'icon': return '<span class="d d-icon">🎯</span>';
    case 'scroll': return '<span class="d d-scroll">↓</span>';
    case 'ui': return '<span class="d d-toggle"><i></i></span>';
    case '3d': return '<span class="d d-cube"><i></i></span>';
    case 'particle': return '<span class="d d-part"><i></i><i></i><i></i></span>';
    case 'basics': return '<span class="d d-basics">⤢</span>';
    case 'generator': return '<span class="d d-gen">✨</span>';
    case 'tool': return '<span class="d d-tool">⚙</span>';
    default: return '<span class="d d-gen">✨</span>';
  }
}

function metaLine(e) {
  const bits = [];
  if (e.meta?.duration) bits.push(`${e.meta.duration}s`);
  if (e.meta?.easing) bits.push(e.meta.easing);
  if (e.meta?.variants) bits.push(`${e.meta.variants} variants`);
  if (e.meta?.author) bits.push(`by ${e.meta.author}`);
  if (e.meta?.format) bits.push(e.meta.format);
  if (e.meta?.note && !e.meta?.author) bits.push(e.meta.note);
  return bits.join(' · ');
}

function buildCard(e, i) {
  const site = sitesById.get(e.site);
  const card = document.createElement('article');
  card.className = 'card';
  card.style.setProperty('--i', i % 15);
  card.style.setProperty('--accent', site?.accent ?? 'var(--violet)');
  card.dataset.id = e.id;
  card.setAttribute('role', 'link');
  card.setAttribute('aria-label', `${e.name} on ${site?.name ?? e.site}`);
  card.tabIndex = 0;

  const tags = e.tags.filter(t => t.length > 2).slice(0, 3).map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('');
  card.innerHTML = `
    <div class="card-top">
      <div class="demo" aria-hidden="true">${demoFor(e.category)}</div>
      <div class="badges">
        <span class="badge badge--site"><i></i>${escapeHtml(site?.name ?? e.site)}</span>
        ${site?.live ? '<span class="badge badge--live">live</span>' : ''}
        <span class="badge badge--type">${escapeHtml(e.type)}</span>
      </div>
    </div>
    <h3>${highlight(e.name)}</h3>
    <p class="card-meta">${escapeHtml(metaLine(e) || (CATEGORY_LABELS[e.category] ?? e.category))}</p>
    <div class="tags">${tags}</div>
    <div class="card-actions">
      <span class="open-btn">Open on ${escapeHtml(site?.name ?? e.site)} <span class="arrow">→</span></span>
      <button class="copy-btn" data-copy="${escapeHtml(e.url)}" title="Copy link" aria-label="Copy link">⧉</button>
    </div>`;

  card.addEventListener('click', ev => {
    if (ev.target.closest('.copy-btn')) return;
    window.open(e.url, '_blank', 'noopener');
  });
  card.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') window.open(e.url, '_blank', 'noopener');
  });
  return card;
}

/* ------------------------------ chrome builders ------------------------------ */

function buildChips() {
  const counts = { all: entries.length };
  for (const e of entries) counts[e.category] = (counts[e.category] ?? 0) + 1;
  const cats = Object.keys(counts)
    .filter(c => c === 'all' || CATEGORY_LABELS[c])
    .sort((a, b) => (b === 'all' ? 1 : a === 'all' ? -1 : (counts[b] - counts[a]) || a.localeCompare(b)));

  els.chips.innerHTML = '';
  for (const c of cats) {
    const btn = document.createElement('button');
    btn.className = 'chip' + (state.cat === c ? ' active' : '');
    btn.dataset.cat = c;
    btn.innerHTML = `${CATEGORY_LABELS[c] ?? c}<span class="n">${counts[c].toLocaleString()}</span>`;
    btn.addEventListener('click', () => { state.cat = c; syncHash(); apply(); });
    els.chips.appendChild(btn);
  }
}

function buildSiteSelect(sites) {
  els.siteSel.innerHTML = '';
  const opts = [['all', `All ${sites.length} sources`], ...sites.map(s => [s.id, `${s.name} (${s.count})`])];
  for (const [v, label] of opts) {
    const o = document.createElement('option');
    o.value = v; o.textContent = label;
    if (state.site === v) o.selected = true;
    els.siteSel.appendChild(o);
  }
  els.siteSel.addEventListener('change', () => { state.site = els.siteSel.value; syncHash(); apply(); });
}

function buildTicker(sites) {
  const item = s => `<span class="ticker-item" style="--c:${s.accent}"><i></i><b>${escapeHtml(s.name)}</b><span>${s.count} indexed</span></span>`;
  const half = sites.map(item).join('<span style="width:6px"></span>');
  els.tickerTrack.innerHTML = half + half; // duplicated for the seamless loop
}

function buildSources(sites) {
  els.sourceGrid.innerHTML = '';
  sites.forEach((s, i) => {
    const card = document.createElement('article');
    card.className = 'source-card';
    card.style.setProperty('--i', i);
    card.style.setProperty('--accent', s.accent);
    card.innerHTML = `
      <div class="source-head">
        <span class="avatar" aria-hidden="true">${escapeHtml(s.name[0])}</span>
        <h3>${escapeHtml(s.name)}</h3>
        <span class="count">${s.count.toLocaleString()} indexed</span>
      </div>
      <p class="source-tagline">${escapeHtml(s.tagline)}</p>
      <div class="source-badges">
        <span class="badge">${HANDSHAKE_BADGE[s.handshake] ?? s.handshake}</span>
        <span class="badge">${escapeHtml(s.license)}</span>
        ${s.types.map(t => `<span class="badge badge--type">${escapeHtml(t)}</span>`).join('')}
      </div>
      <p class="source-note">${escapeHtml(s.handshakeNote ?? '')}</p>
      <a class="source-visit" href="${escapeHtml(s.url)}" target="_blank" rel="noopener">Visit ${escapeHtml(s.name)} ↗</a>`;
    els.sourceGrid.appendChild(card);
  });
}

/* ------------------------------ suggest ------------------------------ */

function buildSuggest(terms) {
  if (!terms.length) { hideSuggest(); return; }
  const top = filtered.slice(0, 7);
  if (!top.length) { hideSuggest(); return; }
  suggestIdx = -1;
  els.suggest.innerHTML =
    top
      .map((e, i) => {
        const s = sitesById.get(e.site);
        return `<button class="suggest-item" data-i="${i}" data-url="${escapeHtml(e.url)}">
          <span class="s-name">${highlight(e.name)}</span>
          <span class="s-site"><span class="s-dot" style="--c:${s?.accent ?? '#7c3aed'}"></span>${escapeHtml(s?.name ?? e.site)}</span>
        </button>`;
      })
      .join('') + '<div class="suggest-hint">↑↓ navigate · ↵ open on the source site · esc close</div>';
  els.suggest.hidden = false;
}

function hideSuggest() {
  els.suggest.hidden = true;
  suggestIdx = -1;
}

function moveSuggest(dir) {
  const items = els.suggest.querySelectorAll('.suggest-item');
  if (!items.length) return;
  suggestIdx = (suggestIdx + dir + items.length) % items.length;
  items.forEach((it, i) => it.classList.toggle('sel', i === suggestIdx));
  items[suggestIdx].scrollIntoView({ block: 'nearest' });
}

/* ------------------------------ apply / state ------------------------------ */

function apply(initial = false) {
  computeFiltered();
  els.grid.innerHTML = '';
  renderMore();
  updateChrome();

  if (filtered.length) {
    els.empty.hidden = true;
    if (initial) { /* keep scroll position on first paint */ }
  } else {
    els.empty.hidden = false;
    els.emptyQ.textContent = state.q || 'this filter';
    els.emptyActions.innerHTML = '';
    for (const [label, url] of [
      ['Search on LottieFiles ↗', `https://lottiefiles.com/search?q=${encodeURIComponent(state.q)}&category=animations`],
      ['Search on CodePen ↗', `https://codepen.io/search/pens?q=${encodeURIComponent(state.q + ' animation')}`],
      ['Search on Lordicon ↗', `https://lordicon.com/icons?query=${encodeURIComponent(state.q)}`],
      ['Generate it with Swishy AI ↗', 'https://swishy.ai'],
    ]) {
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = label;
      els.emptyActions.appendChild(a);
    }
  }
}

function updateChrome() {
  for (const chip of els.chips.children) chip.classList.toggle('active', chip.dataset.cat === state.cat);
  els.count.innerHTML = state.q
    ? `<b>${filtered.length.toLocaleString()}</b> matches for “${escapeHtml(state.q)}”`
    : `<b>${filtered.length.toLocaleString()}</b> animations`;
  els.clearBtn.hidden = !state.q;
}

function syncHash() {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.cat !== 'all') p.set('cat', state.cat);
  if (state.site !== 'all') p.set('site', state.site);
  history.replaceState(null, '', p.size ? `#${p}` : '#');
}

function restoreHash() {
  const p = new URLSearchParams(location.hash.replace(/^#/, ''));
  state.q = p.get('q') ?? '';
  state.cat = p.get('cat') ?? 'all';
  state.site = p.get('site') ?? 'all';
  els.q.value = state.q;
}

/* ------------------------------ events ------------------------------ */

let debounceTimer;
els.q.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    state.q = els.q.value.trim();
    syncHash();
    apply();
    buildSuggest(state.q.toLowerCase().split(/\s+/).filter(Boolean));
  }, 90);
});

els.q.addEventListener('focus', () => buildSuggest(state.q.toLowerCase().split(/\s+/).filter(Boolean)));

els.q.addEventListener('keydown', ev => {
  if (ev.key === 'ArrowDown') { ev.preventDefault(); moveSuggest(1); }
  else if (ev.key === 'ArrowUp') { ev.preventDefault(); moveSuggest(-1); }
  else if (ev.key === 'Enter') {
    const sel = els.suggest.querySelector('.suggest-item.sel');
    if (sel) window.open(sel.dataset.url, '_blank', 'noopener');
    hideSuggest();
    els.q.blur();
  } else if (ev.key === 'Escape') {
    hideSuggest();
    els.q.blur();
  }
});

els.suggest.addEventListener('click', ev => {
  const item = ev.target.closest('.suggest-item');
  if (item) window.open(item.dataset.url, '_blank', 'noopener');
  hideSuggest();
});

document.addEventListener('click', ev => {
  if (!ev.target.closest('.searchwrap')) hideSuggest();
});

els.clearBtn.addEventListener('click', () => {
  els.q.value = '';
  state.q = '';
  syncHash(); apply();
  els.q.focus();
});

document.addEventListener('keydown', ev => {
  if (ev.key === '/' && document.activeElement !== els.q && !ev.metaKey && !ev.ctrlKey) {
    ev.preventDefault();
    els.q.focus();
    els.q.select();
  }
});

for (const chip of document.querySelectorAll('.trending .chip')) {
  chip.addEventListener('click', () => {
    els.q.value = chip.dataset.q;
    state.q = chip.dataset.q;
    syncHash(); apply();
    $('directory').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

els.dice.addEventListener('click', () => {
  const pool = filtered.length ? filtered : entries;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  els.q.value = pick.name;
  state.q = pick.name;
  syncHash(); apply();
  requestAnimationFrame(() => {
    const card = els.grid.querySelector(`[data-id="${CSS.escape(pick.id)}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('flash');
      setTimeout(() => card.classList.remove('flash'), 1200);
    }
  });
});

els.shareSearch.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    showToast('🔗 Search link copied');
  } catch {
    showToast(location.href);
  }
});

document.addEventListener('click', async ev => {
  const btn = ev.target.closest('.copy-btn');
  if (!btn) return;
  ev.stopPropagation();
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    showToast('✓ Link copied');
  } catch {
    showToast(btn.dataset.copy);
  }
});

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

/* ------------------------------ 3D tilt + spotlight on cards ------------------------------ */

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const tiltRaf = { pending: false, card: null, x: 0, y: 0, mx: 0, my: 0 };
els.grid.addEventListener('pointermove', ev => {
  if (ev.pointerType === 'touch' || reduceMotion()) return;
  const card = ev.target.closest('.card');
  if (!card) return;
  const r = card.getBoundingClientRect();
  tiltRaf.card = card;
  tiltRaf.x = ((ev.clientY - r.top) / r.height - 0.5) * -7;
  tiltRaf.y = ((ev.clientX - r.left) / r.width - 0.5) * 9;
  tiltRaf.mx = ev.clientX - r.left;
  tiltRaf.my = ev.clientY - r.top;
  if (!tiltRaf.pending) {
    tiltRaf.pending = true;
    requestAnimationFrame(() => {
      const s = tiltRaf.card.style;
      s.setProperty('--rx', `${tiltRaf.x.toFixed(2)}deg`);
      s.setProperty('--ry', `${tiltRaf.y.toFixed(2)}deg`);
      s.setProperty('--mx', `${tiltRaf.mx.toFixed(0)}px`);
      s.setProperty('--my', `${tiltRaf.my.toFixed(0)}px`);
      tiltRaf.pending = false;
    });
  }
});
els.grid.addEventListener('pointerout', ev => {
  const card = ev.target.closest('.card');
  if (card && !card.contains(ev.relatedTarget)) {
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  }
});

/* ------------------------------ infinite scroll ------------------------------ */

new IntersectionObserver(ents => {
  if (ents[0].isIntersecting && rendered < filtered.length) renderMore();
}, { rootMargin: '900px' }).observe(els.sentinel);

/* ------------------------------ scroll choreography ------------------------------ */

// scroll progress bar + aurora parallax + toolbar wake, all on one rAF
const progressBar = document.getElementById('progress');
const aurora = document.getElementById('aurora');
const toolbar = document.getElementById('toolbar');
let scrollRaf = false;
function onScroll() {
  if (scrollRaf) return;
  scrollRaf = true;
  requestAnimationFrame(() => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? (scrollY / max).toFixed(4) : 0})`;
    if (!reduceMotion()) aurora.style.transform = `translateY(${(scrollY * 0.16).toFixed(1)}px)`;
    toolbar.classList.toggle('armed', scrollY > innerHeight * 0.5);
    scrollRaf = false;
  });
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// hero cursor spotlight
const hero = document.getElementById('hero');
hero.addEventListener('pointermove', ev => {
  const r = hero.getBoundingClientRect();
  hero.style.setProperty('--hx', `${(ev.clientX - r.left).toFixed(0)}px`);
  hero.style.setProperty('--hy', `${(ev.clientY - r.top).toFixed(0)}px`);
});

// reveal-on-scroll (our own AOS) + section title underline draws
const revealIO = new IntersectionObserver(
  ents => ents.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    revealIO.unobserve(e.target);
  }),
  { threshold: 0.15 },
);
document.querySelectorAll('[data-reveal]').forEach(el => revealIO.observe(el));

// stat count-up — easeOutExpo, tabular numerals keep it steady
const statsIO = new IntersectionObserver(ents => {
  if (!ents[0].isIntersecting) return;
  statsIO.disconnect();
  for (const el of document.querySelectorAll('[data-count]')) {
    const target = Number(el.dataset.target ?? 0);
    const t0 = performance.now();
    const dur = 1400;
    (function tick(now) {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(2, -10 * p);
      el.textContent = Math.round(target * (p === 1 ? 1 : eased)).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
}, { threshold: 0.4 });
const statsSec = document.querySelector('.stats');
if (statsSec) statsIO.observe(statsSec);

// terminal typewriter — lines cascade in when the CLI section scrolls into view
const termCode = document.querySelector('.term-body code');
if (termCode) {
  // wrap each line so it can be revealed one by one; colored spans stay intact
  const lines = termCode.innerHTML.split('\n');
  termCode.innerHTML = lines
    .map((l, i) => `<span class="t-line" style="display:block;opacity:0;transform:translateY(6px);transition:opacity .3s var(--ease-out, ease),transform .3s ease;transition-delay:${(i * 130)}ms">${l || ' '}</span>`)
    .join('');
  const termIO = new IntersectionObserver(ents => {
    if (!ents[0].isIntersecting) return;
    termIO.disconnect();
    requestAnimationFrame(() =>
      termCode.querySelectorAll('.t-line').forEach(l => {
        l.style.opacity = '1';
        l.style.transform = 'none';
      }),
    );
  }, { threshold: 0.35 });
  termIO.observe(termCode.closest('.term'));
}

boot();
