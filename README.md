# ⚡ MotionDex

**A search engine for free web animations.** One search across Animista, Animate.css,
Loading.io, Uiverse, LottieFiles, Swishy AI, CodePen, Hover.css, Easings.net and 11 more
sites — click a result and land on the exact page that hosts the animation.

**1,197 animations · 20 sources · 16 categories**, indexed by a handshake CLI that talks
to each site's real catalog.

![stack](https://img.shields.io/badge/runtime-node%20%3E%3D18-339933) ![deps](https://img.shields.io/badge/dependencies-0-brightgreen)

---

## Quick start

```bash
npm start                # serve the site at http://localhost:4173
npm run refresh          # re-handshake with all animation sites, rebuild the index
npm run refresh:offline  # rebuild from the last successful snapshots (no network)
node cli/refresh.mjs --site=animista -v   # refresh one source, verbose
```

## How the handshake works

Every site is probed for the richest machine-readable interface it exposes. MotionDex
never hard-codes an index — the CLI earns it at build time:

| Mode | Sites | How |
|---|---|---|
| 🤝 **api** | Animista (662) | fetches the official `animista.net/animista.json` catalog — categories, groups, every variation with default duration/easing |
| 🤝 **raw-css** | Animate.css (102) | parses `animate.min.css` from the GitHub repo and maps every class to its docs anchor |
| 🤝 **scrape** | Loading.io (123), Uiverse (104), CSS Loaders (9) | parses public HTML / repo manifests with browser headers |
| 🔗 **search-link** | LottieFiles (20), Lordicon (10), CodePen (25) | no public catalog (bot walls / SPA-only) — indexes curated entries that deep-link into each site's own search |
| ✏️ **curated** | Swishy AI, Codrops, Hover.css, Easings.net, AOS, Tailwind, AnimXYZ, GSAP, Motion, SVG Artista, UseAnimations, cubic-bezier.com | hand-verified entries into docs, demos and tools |

### The way out when sites refuse

Loading.io and Uiverse reject Node's default HTTP fingerprint but accept browser-ish
requests — so `cli/lib/http.mjs` tries native `fetch` first, then falls back to shelling
out to `curl`. Every successful handshake is snapshotted to `cli/seeds/`, and any source
that still fails (site down, no network) falls back to its last snapshot. The CLI always
comes home with data.

## The site itself

Built with the very animations it indexes:

- **aurora blob backdrop** + fading grid overlay
- **animated gradient headline**, ping-dot live badge
- **source ticker** marquee (pauses on hover)
- **3D tilt cards** with per-site accent colors and live CSS demo glyphs per category (spinning loader, shimmer text, orbiting particles, easing dot…)
- **instant search** with relevance scoring, `<mark>` highlighting, keyboard-navigable suggestions (`/` to focus, `↑↓` + `↵` to open)
- category chips, source filter, **🎲 surprise-me**, shareable `#q=…&cat=…&site=…` URLs
- infinite scroll, empty-state rescue links (routes your failed search to LottieFiles / CodePen / Lordicon / Swishy)
- `prefers-reduced-motion` respected — every animation can be switched off

## Layout

```
cli/
  refresh.mjs         orchestrator: handshakes, seeds, dedupes, writes data/
  lib/http.mjs        fetch → curl fallback transport
  sources/*.mjs       one module per source: exports handshake() → {sites, entries}
  seeds/*.json        last successful snapshots per source
data/                 generated index (animations / sites / meta)
public/               the website (vanilla HTML/CSS/JS, no build step)
server.mjs            zero-dep static server (public/ + /data)
```

### Adding a source

Drop `cli/sources/yoursite.mjs` exporting `id`, `site`, and an async `handshake()` that
returns `{ sites: [site], entries: [{ id, name, site, category, type, tags, url, meta? }] }`,
register it in `cli/refresh.mjs`, and re-run. If a handshake can fail, the seed fallback
just works.

## Licensing note

All indexed animations belong to their creators and sites — check each source's license
before shipping (badges are shown on every source card).
