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

/* ------------------------------ 3D tilt + magnetic cursor + spotlight on cards ------------------------------ */

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Magnetic card attraction state
const magnetic = { cards: new Map(), raf: false };

function updateMagneticCards() {
  magnetic.raf = false;
  magnetic.cards.forEach((state, card) => {
    // Spring physics: smoothly interpolate toward target
    state.cx += (state.tx - state.cx) * 0.12;
    state.cy += (state.ty - state.cy) * 0.12;
    state.rx += (state.trx - state.rx) * 0.1;
    state.ry += (state.try_ - state.ry) * 0.1;

    card.style.setProperty('--rx', `${state.rx.toFixed(2)}deg`);
    card.style.setProperty('--ry', `${state.ry.toFixed(2)}deg`);
    card.style.setProperty('--mx', `${state.mlx.toFixed(0)}px`);
    card.style.setProperty('--my', `${state.mly.toFixed(0)}px`);
    card.style.transform = `perspective(760px) rotateX(${state.rx.toFixed(2)}deg) rotateY(${state.ry.toFixed(2)}deg) translate(${state.cx.toFixed(1)}px, ${state.cy.toFixed(1)}px)`;

    // Keep animating if not settled
    const settled = Math.abs(state.tx - state.cx) < 0.1 && Math.abs(state.ty - state.cy) < 0.1;
    if (!settled && !magnetic.raf) {
      magnetic.raf = true;
      requestAnimationFrame(updateMagneticCards);
    }
  });
}

els.grid.addEventListener('pointermove', ev => {
  if (ev.pointerType === 'touch' || reduceMotion()) return;
  const card = ev.target.closest('.card');
  if (!card) return;

  const r = card.getBoundingClientRect();
  const centerX = r.left + r.width / 2;
  const centerY = r.top + r.height / 2;

  // Tilt angles
  const tiltX = ((ev.clientY - r.top) / r.height - 0.5) * -10;
  const tiltY = ((ev.clientX - r.left) / r.width - 0.5) * 12;

  // Magnetic pull (card center moves slightly toward cursor)
  const pullX = (ev.clientX - centerX) * 0.06;
  const pullY = (ev.clientY - centerY) * 0.06;

  let state = magnetic.cards.get(card);
  if (!state) {
    state = { cx: 0, cy: 0, tx: 0, ty: 0, rx: 0, ry: 0, trx: 0, try_: 0, mlx: 0, mly: 0 };
    magnetic.cards.set(card, state);
  }

  state.tx = pullX;
  state.ty = pullY;
  state.trx = tiltX;
  state.try_ = tiltY;
  state.mlx = ev.clientX - r.left;
  state.mly = ev.clientY - r.top;

  if (!magnetic.raf) {
    magnetic.raf = true;
    requestAnimationFrame(updateMagneticCards);
  }
});

els.grid.addEventListener('pointerout', ev => {
  const card = ev.target.closest('.card');
  if (card && !card.contains(ev.relatedTarget)) {
    const state = magnetic.cards.get(card);
    if (state) {
      state.tx = 0; state.ty = 0; state.trx = 0; state.try_ = 0;
      if (!magnetic.raf) {
        magnetic.raf = true;
        requestAnimationFrame(updateMagneticCards);
      }
    }
    // Reset after spring settles
    setTimeout(() => {
      card.style.transform = '';
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    }, 400);
  }
});

/* ------------------------------ card entrance observer ------------------------------ */

const cardRevealIO = new IntersectionObserver(
  entries => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return;
      const card = entry.target;
      // Stagger from the batch
      const delay = (Array.from(card.parentElement.children).indexOf(card) % 6) * 60;
      card.style.animationDelay = `${delay}ms`;
      card.classList.add('card-visible');
      cardRevealIO.unobserve(card);
    });
  },
  { threshold: 0.08, rootMargin: '50px' },
);

// Re-observe cards after each render
const origRenderMore = renderMore;
renderMore = function() {
  const prevCount = els.grid.children.length;
  origRenderMore();
  // Observe newly added cards
  for (let i = prevCount; i < els.grid.children.length; i++) {
    const card = els.grid.children[i];
    card.classList.remove('card-visible');
    cardRevealIO.observe(card);
  }
};

/* ------------------------------ infinite scroll ------------------------------ */

new IntersectionObserver(ents => {
  if (ents[0].isIntersecting && rendered < filtered.length) renderMore();
}, { rootMargin: '900px' }).observe(els.sentinel);

/* ------------------------------ scroll choreography & 3D transitions ------------------------------ */

// scroll progress bar + aurora parallax + toolbar wake + 3D scroll-linked transitions
const progressBar = document.getElementById('progress');
const aurora = document.getElementById('aurora');
const toolbar = document.getElementById('toolbar');
const hero = document.getElementById('hero');
const heroCanvasWrap = document.getElementById('heroCanvasWrap');
const heroH1 = document.querySelector('.hero h1');
const heroSub = document.querySelector('.hero-sub');
const statsSec = document.getElementById('statsSec');
const cliTerm = document.getElementById('cliTerm');
const sourceSection = document.getElementById('sources');

let scrollRaf = false;
function onScroll() {
  if (scrollRaf) return;
  scrollRaf = true;
  requestAnimationFrame(() => {
    const doc = document.documentElement;
    const sy = window.scrollY;
    const max = doc.scrollHeight - innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? (sy / max).toFixed(4) : 0})`;

    if (!reduceMotion()) {
      // 1. Aurora parallax
      aurora.style.transform = `translateY(${(sy * 0.16).toFixed(1)}px)`;

      // 2. Hero 3D recession: push hero back into depth as user scrolls down
      if (sy < innerHeight * 1.2) {
        const p = Math.min(sy / (innerHeight * 0.9), 1);
        const tz = -p * 80;
        const ty = p * 40;
        const rotX = p * 6;

        if (heroH1) heroH1.style.transform = `perspective(1000px) translate3d(0, ${ty.toFixed(1)}px, ${tz.toFixed(1)}px) rotateX(${rotX.toFixed(2)}deg)`;
        if (heroSub) heroSub.style.transform = `perspective(1000px) translate3d(0, ${(ty * 0.8).toFixed(1)}px, ${(tz * 0.7).toFixed(1)}px)`;
        if (heroCanvasWrap) {
          heroCanvasWrap.style.transform = `translate3d(0, ${(sy * 0.28).toFixed(1)}px, 0) scale(${Math.max(0.85, 1 - p * 0.15).toFixed(3)})`;
          heroCanvasWrap.style.opacity = `${(1 - p * 0.7).toFixed(3)}`;
        }
      }

      // 3. Stats section 3D morphing on scroll
      if (statsSec) {
        const r = statsSec.getBoundingClientRect();
        const vh = window.innerHeight;
        if (r.top < vh && r.bottom > 0) {
          const centerDist = (r.top + r.height * 0.5 - vh * 0.5) / vh;
          const rotX = Math.max(-10, Math.min(10, centerDist * 14));
          const tz = (1 - Math.abs(centerDist) * 1.5) * 12;
          statsSec.style.transform = `perspective(1200px) rotateX(${(-rotX).toFixed(2)}deg) translateZ(${Math.max(0, tz).toFixed(1)}px)`;
        }
      }

      // 4. Source cards 3D orbit wave on scroll
      if (sourceSection && els.sourceGrid) {
        const sRect = sourceSection.getBoundingClientRect();
        const vh = window.innerHeight;
        if (sRect.top < vh + 100 && sRect.bottom > -100) {
          const cards = els.sourceGrid.children;
          const len = cards.length;
          const sProgress = (vh - sRect.top) / (vh + sRect.height);
          for (let i = 0; i < len; i++) {
            const card = cards[i];
            if (!card.matches(':hover')) {
              const phase = (sProgress * 4.2) + (i * 0.45);
              const waveY = Math.sin(phase) * 3.2;
              const waveX = Math.cos(phase * 0.8) * 2;
              const waveZ = Math.sin(phase + 1) * 6;
              card.style.transform = `perspective(1000px) rotateY(${waveY.toFixed(2)}deg) rotateX(${waveX.toFixed(2)}deg) translateZ(${waveZ.toFixed(1)}px)`;
            }
          }
        }
      }

      // 5. CLI terminal 3D entrance tilt
      if (cliTerm && !cliTerm.matches(':hover')) {
        const tRect = cliTerm.getBoundingClientRect();
        const vh = window.innerHeight;
        if (tRect.top < vh && tRect.bottom > 0) {
          const dist = (tRect.top + tRect.height * 0.5 - vh * 0.5) / vh;
          const termTiltX = Math.max(-9, Math.min(9, dist * 12));
          cliTerm.style.transform = `perspective(1000px) rotateX(${(-termTiltX).toFixed(2)}deg)`;
        }
      }
    }

    toolbar.classList.toggle('armed', sy > innerHeight * 0.5);
    scrollRaf = false;
  });
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// hero cursor spotlight
if (hero) {
  hero.addEventListener('pointermove', ev => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--hx', `${(ev.clientX - r.left).toFixed(0)}px`);
    hero.style.setProperty('--hy', `${(ev.clientY - r.top).toFixed(0)}px`);
  });
}

/* ------------------------------ 3D card tilt & holographic physics ------------------------------ */

// 1. Stat cards 3D tilt
if (statsSec) {
  statsSec.addEventListener('pointermove', ev => {
    if (reduceMotion()) return;
    const card = ev.target.closest('.stat');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (ev.clientX - r.left) / r.width;
    const py = (ev.clientY - r.top) / r.height;
    const rx = (py - 0.5) * -14;
    const ry = (px - 0.5) * 14;
    card.style.setProperty('--srx', `${rx.toFixed(2)}deg`);
    card.style.setProperty('--sry', `${ry.toFixed(2)}deg`);
    card.style.setProperty('--smx', `${(px * 100).toFixed(1)}%`);
    card.style.setProperty('--smy', `${(py * 100).toFixed(1)}%`);
    card.style.transform = `translateY(-4px) perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(16px)`;
  });

  statsSec.addEventListener('pointerout', ev => {
    const card = ev.target.closest('.stat');
    if (card && !card.contains(ev.relatedTarget)) {
      card.style.setProperty('--srx', '0deg');
      card.style.setProperty('--sry', '0deg');
      card.style.transform = '';
    }
  });
}

// 2. Source cards 3D tilt
if (els.sourceGrid) {
  els.sourceGrid.addEventListener('pointermove', ev => {
    if (reduceMotion()) return;
    const card = ev.target.closest('.source-card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (ev.clientX - r.left) / r.width;
    const py = (ev.clientY - r.top) / r.height;
    const rx = (py - 0.5) * -12;
    const ry = (px - 0.5) * 12;
    card.style.setProperty('--srx', `${rx.toFixed(2)}deg`);
    card.style.setProperty('--sry', `${ry.toFixed(2)}deg`);
    card.style.setProperty('--smx', `${(px * 100).toFixed(1)}%`);
    card.style.setProperty('--smy', `${(py * 100).toFixed(1)}%`);
    card.style.transform = `translateY(-4px) perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(16px)`;
  });

  els.sourceGrid.addEventListener('pointerout', ev => {
    const card = ev.target.closest('.source-card');
    if (card && !card.contains(ev.relatedTarget)) {
      card.style.setProperty('--srx', '0deg');
      card.style.setProperty('--sry', '0deg');
      card.style.transform = '';
    }
  });
}

// 3. CLI Terminal 3D tilt & Holographic glitch pulse
if (cliTerm) {
  cliTerm.addEventListener('pointermove', ev => {
    if (reduceMotion()) return;
    const r = cliTerm.getBoundingClientRect();
    const px = (ev.clientX - r.left) / r.width;
    const py = (ev.clientY - r.top) / r.height;
    const rx = (py - 0.5) * -8;
    const ry = (px - 0.5) * 8;
    cliTerm.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`;
  });

  cliTerm.addEventListener('pointerleave', () => {
    cliTerm.style.transform = '';
  });

  // Random holographic glitch pulse
  setInterval(() => {
    if (reduceMotion()) return;
    const glitches = cliTerm.querySelectorAll('.glitch');
    glitches.forEach(g => g.classList.add('active'));
    setTimeout(() => {
      glitches.forEach(g => g.classList.remove('active'));
    }, 400);
  }, 5000);
}

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

// stat count-up — easeOutExpo, tabular numerals keep it steady + 3D pop on finish
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
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        const parent = el.closest('.stat');
        if (parent && !reduceMotion()) {
          parent.style.animation = 'statPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
        }
      }
    })(t0);
  }
}, { threshold: 0.4 });
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
