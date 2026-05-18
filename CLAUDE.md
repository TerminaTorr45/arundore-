# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static multi-page website for **Arundo Re** — Paris-based reinsurer (slogan "Always around"). French-language content. No build system, no package manager, no tests — pure HTML/CSS/JS served as files.

## Running locally

No build step. Serve root with any static server:

```powershell
# Python
python -m http.server 8000

# Node
npx serve .
```

Static server preferred over `file://` because `<video>`, Barba history API, CORS behave better over HTTP.

## Pages

| File | Purpose | Barba namespace | Body class |
|------|---------|-----------------|------------|
| `index.html` | Homepage with hero, video, story-scroll, KPIs | `home` | (none) |
| `experts.html` | Full experts directory (~39 cards grid) | `experts` | `page-profile page-experts` |
| `presse.html` | Press releases archive (19 CP cards, view + download) | `presse` | `page-profile page-presse` |
| `elizabeth-adams.html`, `vaibhavi-mehta.html`, `francois-cahu.html`, `emmanuel-jacquemin.html`, `john-conan.html`, `herve-nessi.html` | Individual director profiles | `profile` | `page-profile` |

All pages share same nav, side-menu, footer. Profile/experts/presse pages all have `body.page-profile` (nav stuck + gold).

## Architecture

### Single shared `js/main.js` + single shared `css/style.css`
Every page links the same CSS + JS. Barba SPA-style swaps `<main data-barba="container">` contents on navigation.

### Cache busting
CSS and JS use `?v=N` query strings. Bump version on edit. Current versions drift independently:
- `style.css?v=112`
- `main.js?v=37`

When editing either, increment respective version and update via:
```bash
for f in *.html; do sed -i 's|style\.css?v=[0-9]*|style.css?v=NEW|' "$f"; done
```

### Meta no-cache (dev)
Each HTML has:
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```
Forces revalidation in dev. Remove in prod for browser caching.

### Animation pipeline (`js/main.js`, 1216 LOC)
CDN libs loaded at bottom of every HTML:
1. **Lenis** — smooth scroll
2. **GSAP + ScrollTrigger** — animations + scroll triggers
3. **Barba.js** — page transitions

`main.js` defensively coded: `typeof X !== "undefined"` before use. Page degrades gracefully if CDN fails.

### `initPage()` flow (called by Barba on every nav)
```js
async function initPage() {
  // Kill stale ScrollTriggers from previous page (Barba accumulation fix)
  ScrollTrigger.getAll().forEach((st) => st.kill(true));
  // Clear stuck transforms on .story-inner
  document.querySelectorAll(".story-inner").forEach((el) => {
    gsap.set(el, { clearProps: "transform,rotation" });
  });

  stickyNav();              // toggle is-stuck/is-gold per page
  sectionReveals();
  initHeroMaskOpen();       // ouvre overflow:hidden après reveal (fix italic descender clip)
  counters();
  imageParallax();
  initTilt();
  initVideoPlayer();
  initStoryIntroReveal();   // adds is-gold to nav when scroll reaches story-intro
  initStoryScroll();        // rotation 14°→0° scrub on .story-inner
  initVideoScroll();        // 3D tilt rotateX 22°→0° + scale 0.78→1 on video on scroll
  initProfileSwitch();      // tabs + whisper text on profile pages (Parcours/Mission)
  restartCssAnimations();   // forces CSS keyframes to re-fire after Barba nav

  if (!__pageBooted) {
    await runIntro();       // preloader timeline
    heroIntro();
    __pageBooted = true;
  } else {
    // Barba nav: skip preloader, force final state
    forceAllReveals();
  }
  setupResponsiveRefresh(); // ScrollTrigger.refresh on resize/font-load/img-load
}
```

### Barba transitions
```js
barba.init({
  transitions: [{ name: "curtain-sweep", leave, enter, beforeEnter, before, after }],
  views: [
    { namespace: "home",    beforeEnter() { body.remove("page-profile","page-experts","page-presse"); } },
    { namespace: "profile", beforeEnter() { body.add("page-profile"); body.remove("page-experts","page-presse"); } },
    { namespace: "experts", beforeEnter() { body.add("page-profile","page-experts"); body.remove("page-presse"); } },
    { namespace: "presse",  beforeEnter() { body.add("page-profile","page-presse"); body.remove("page-experts"); } },
  ],
});
```
**Critical**: each new page namespace MUST be registered in `views` with its body classes — otherwise CSS rules like `body.page-experts` never fire on Barba nav, only hard refresh works.

### `stickyNav()`
- On `body.page-profile`: nav forced `is-stuck` permanently, no scroll toggle. No `is-gold` (that's CSS-gated via `body:not(.page-profile)`).
- On home: `is-stuck` toggles at scroll Y > 120px. `is-gold` toggled by `initStoryIntroReveal` ScrollTrigger.
- On `body.page-experts` / `body.page-presse`: CSS forces gold links via `body.page-experts .nav-sticky .nav-link { color: var(--accent) }`.

### Hero brand reveal (index.html)
Slide-up curtain style matching `.story-intro__reveal`:
- "Arundo" wrapped in `.hero__brand-word-wrap` with `overflow: hidden`, padding-bottom for descender room
- "Re" wrapped in `<span class="hero__brand-word--accent">` nested inside Arundo span, color gold italic
- Subtitle parts ("Qui sommes" + "nous ?") same slide-up + opacity
- After 1.5s OR `transitionend`, `initHeroMaskOpen()` adds `.is-mask-open` → `overflow: visible` so italic descender of "Re" displays fully

**Removed**: `scrambleHeroSubtitle()` (text scramble) — was redundant with slide-up reveal.

### Story scroll (index.html)
Six `[data-story]` sections with sticky stacking + GSAP scrub rotation. `invalidateOnRefresh: true` on each trigger + image-load refresh + resize debounce. Scroll-jacking code was deleted (dead code after `return;`).

### Video scroll (index.html)
`.video-section--scroll` wraps video in `.video-section__sticky` (200vh tall, sticky pin inside). GSAP scrubs:
- `rotateX: 22deg → 0deg`
- `scale: 0.78 → 1`
- `borderRadius: 56px → 0px`

`perspective: 1400px` on sticky parent for true 3D tilt. `transform-origin: center bottom` — pivot from bottom.

## Experts page (`experts.html`)
- Hero teal with eyebrow + Fraunces title + lead
- Filter card with 2 selects (Solutions / Zone)
- Grid 4-col (responsive 3/2/1) of 39 expert cards
- Photos from `assets/img/` (6 directors) + `assets/expert/` (33 underwriters)
- Filenames URL-encoded (`Fran%C3%A7ois%20Cahu%20(1).jpg`, `C%C3%A9dric%20Boureau.jpg`)
- 6 director cards link to profile pages; others are non-clickable info cards

## Presse page (`presse.html`)
- Hero with background image `assets/presse/bannière page presse (1).jpg` (opacity 0.65 + gradient overlay)
- Kit Presse card (links to `https://www.arundore.com/documents/d/arundore/kit-presse-arundo-re-fr`)
- Maya Tesson contact card (cream bg, dark teal text)
- 4 years (2026, 2025, 2024, 2023) of communiqués, 19 cards total
- Each `.cp-card`: thumbnail + badge + title + date + 2 actions (Voir + Télécharger) with eye/download SVG icons
- All PDF URLs point to real `arundore.com/documents/...` paths

## Experts finder section (profile pages)
Each director profile has `.experts-finder` section before footer:
- Filter card hero
- Aside "Découvrir aussi" + gold CTA "Découvrir tous nos experts" → `experts.html`
- Horizontal scroll of 5 expert cards (snap)

## Profile pages anatomy
1. Hero — photo + name + role + LinkedIn
2. `.profile-combo` — KPIs aside (text + outline + optional quote variant `.profile-kpi--quote`) + Parcours/Mission tabs (`.profile-switch`)
3. `.experts-finder` — discover more
4. Footer

### `.profile-switch` (tabs + whisper text)
Was originally inline `<script>` block duplicated across 6 profile pages (~280 LOC × 6 = waste). Extracted into `initProfileSwitch()` in `main.js`. Profile pages no longer have inline scripts. `data-bound` flag prevents double-bind on Barba re-init.

## CSS structure (`css/style.css`, 4958 LOC)
Major sections:
- Theme tokens (`:root` × 2, second overrides first to switch to light theme)
- Nav sticky (with `is-stuck`, `is-gold` variants, separate pills when stuck)
- Side menu
- Sections: hero, about, values, video, marquee, story-intro, story-section, intro, metrics, solutions, leadership, commit, cta
- Profile page sections (hero, combo, KPIs, switch, experts-finder)
- Experts page (`.experts-page__*`, `.expert-card`)
- Presse page (`.presse-page__*`, `.presse-kit`, `.presse-contact`, `.presse-cp`, `.cp-card`)
- Footer
- Page curtain + preloader

### Brand colors
- `--bg: #ffffff` / `--bg-2: #f6f5ef` (light cream)
- `--bg-3: #0a3e3a` (deep teal)
- `--fg: #123f3b` (dark teal)
- `--accent: #e7b34a` (gold)
- `--f-serif: "Fraunces"` (used for italic titles, nav links)

## Assets

```
assets/
├── expert/   ← 33 underwriter portraits (Helena Amaral.jpg, Pierre Dionne.jpg, Vignette ludo couleur.png, etc.)
├── img/      ← Director portraits (Elizabeth Adams.jpg, Hervé Nessi.jpg, etc.) + logo + icons
├── LOGO/
├── presse/   ← bannière page presse (1).jpg, maya tesson (1).png, télécharger notre brochure_banniere 650x350 ARUNDO RE.png
└── video/    ← Git LFS-tracked mp4 (run `git lfs install` on clone)
```

Filenames with spaces/accents/parens — URL-encode in `src` (`%20`, `%C3%A9`, `%C3%A7`, `(1)`).

## Conventions

- **Language**: All UI strings in **French**.
- **Logging**: `[arundore]` prefix on `console.*`.
- **Function banners** in `main.js`: `/* ---------- NAME ---------- */`.
- **No frameworks, no npm**. CDN scripts only.
- **No `index.html`** — entry point is `index.html`.

## Things that look weird but are intentional

- **Two `:root` blocks** in `style.css` (lines 7–25 dark, 27–35 light). Second overrides first.
- **8s `safetyUnlock`** force-removes preloader if intro chain hangs.
- **Last `.story-section` uses `position: relative`** instead of sticky (sticky on last card glitches when parent ends).
- **`ScrollTrigger.getAll().forEach(kill)` at start of `initPage`** — kills stale triggers from previous Barba page (otherwise triggers accumulate, story rotation gets stuck mid-anim).
- **`initHeroMaskOpen()`** — removes `overflow:hidden` from hero brand wraps after reveal completes via `transitionend`, so italic Fraunces "Re" descender displays fully.
- **`.cp-card__thumb`** uses negative margin to escape parent padding (full-bleed thumbnail above content).
- **Body class management via Barba views** — each namespace MUST add/remove its body class in `beforeEnter`. Missing namespace registration = page CSS broken until hard refresh.
- **`scrambleHeroSubtitle` removed** — text scramble was visually conflicting with slide-up reveal.
- **`profile-next` section removed** from profile pages — replaced by `experts-finder` section linking to `experts.html`.
- **Dead `initStoryScroll` scroll-jacking branch deleted** (~110 LOC after `return;`).
- **Inline profile-switch script duplicated 6x** — extracted to `main.js` `initProfileSwitch()`.

## Key bugs fixed historically

| Bug | Cause | Fix |
|-----|-------|-----|
| Story cards stuck mid-rotation | ScrollTrigger positions cached before images loaded | `invalidateOnRefresh: true` + `ScrollTrigger.refresh()` on img load |
| Profile-switch broken on Barba 2nd visit | Inline script bound to DOMContentLoaded, never re-ran | Extracted to `initProfileSwitch()` in main.js, called via initPage |
| Nav resets color on every page load | `stickyNav` re-toggle on Barba nav lost state | Profile pages force `is-stuck` permanently; `is-gold` CSS-gated by `body:not(.page-profile)` |
| Page experts/presse looks wrong until hard refresh | Barba views didn't handle `experts`/`presse` namespaces, body class never updated | Added 2 views in `barba.init({views: [...]})` |
| Italic "Re" descender clipped | `overflow: hidden` on mask wrapper clipped Fraunces italic loop | `initHeroMaskOpen` adds `.is-mask-open { overflow: visible }` after reveal `transitionend` |
| Footer "ARUNDO RE" big text overflowed | `font-size: clamp(70px, 17vw, 260px)` too aggressive at narrow widths | Reduced to `clamp(50px, 13.5vw, 220px)` + `padding 0 4vw` + `box-sizing: border-box` |
