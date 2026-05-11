# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static single-page website for **Arundo Re** — a Paris-based reinsurer (slogan "Always around"). French-language content. No build system, no package manager, no tests — pure HTML/CSS/JS served as files.

## Running locally

There is no build step. Open `index.html` directly, or serve the root with any static server:

```powershell
# Python
python -m http.server 8000

# Node
npx serve .
```

A static server is preferred over `file://` because the `<video>` asset and some browser features (Barba's history API, CORS) behave better over HTTP.

## Architecture

### Single-page structure
Everything lives in `index.html` (~525 lines). Sections are delimited by `<!-- ============ SECTION ============ -->` banner comments. Each section has its own root class (`.hero`, `.about`, `.values`, `.video-section`, `.marquee`, `.intro`, `.metrics`, `.solutions`, `.leadership`, `.commit`, `.cta`) — keep that convention when adding sections.

### Animation pipeline (`js/main.js`)
Four CDN libraries cooperate, loaded in this order at the bottom of `index.html`:
1. **Lenis** — smooth scroll, wraps native scroll
2. **GSAP + ScrollTrigger** — all animations and scroll-driven reveals
3. **Barba.js** — page transitions (wired up but currently single-page; `data-barba="wrapper"` is on `<html>`)

`main.js` is defensively coded: every library is checked with `typeof X !== "undefined"` before use. If a CDN fails, the page degrades — animations are skipped but content remains visible. **Preserve this pattern** when adding code that touches GSAP/Lenis/Barba.

Key flow on page load (`initPage` → `bootstrap`):
1. `lockScroll()` runs immediately if `#preloader` exists; an **8s safety timeout** (`safetyUnlock`) force-removes the preloader and unlocks scroll if anything stalls.
2. `runIntro()` plays the preloader timeline, then resolves.
3. `heroIntro()` measures hero text and exposes computed widths as CSS custom properties (`--arundo-w`, `--arundo-mr`, `--sub-left-w`, etc.) — the actual reveal transition is CSS-driven via a `.is-revealed` class toggled by a `ScrollTrigger`.
4. `sectionReveals()`, `counters()`, `imageParallax()`, `initTilt()` wire up the rest.
5. `arrivalNudge()` does a small auto-scroll on arrival (skipped if `prefers-reduced-motion`).

### CSS/JS contract
Several animations are **class-toggle driven**, not tween-driven — JS adds `.is-revealed` / `.is-open` / `.is-visible` and CSS handles the transition. Examples:
- Hero brand reveal: `ScrollTrigger` → `brand.classList.add("is-revealed")` → CSS transitions width/margin to values set via custom properties.
- About card, values cards: same pattern.
- Side menu: `is-open` on `#sideMenu`, `is-active` on `#menuToggle`.

When adding animations, prefer this class-toggle approach over raw `gsap.to()` if the effect is one-shot — it keeps state inspectable in devtools and survives `ScrollTrigger.refresh()`.

### Side menu init
The side menu is initialized in a **separate early IIFE** (`setupMenuEarly`) that runs independently of GSAP/Lenis. This is intentional: the menu must work even if animation libs fail to load. Don't fold it into `initPage()`.

### Theme tokens
`css/style.css` defines CSS custom properties under `:root` at the top. There are **two `:root` blocks back-to-back** (lines 7–25 and 27–35) — the second overrides the first to switch from a dark teal theme to a light cream theme. The dark tokens are kept as reference/fallback. If you need to flip themes, edit the second block, not the first.

Brand colors:
- `--bg: #ffffff` / `--bg-2: #f6f5ef` (light cream)
- `--fg: #123f3b` (deep teal — Arundo brand green)
- `--accent: #e7b34a` (gold)

## Assets

- `assets/video/*.mp4` is tracked with **Git LFS** (see `.gitattributes`). When cloning, ensure `git lfs install` has run, or the file will be a pointer stub and the page video will 404.
- Images live in `assets/img/`. Filenames include spaces and accented characters (`téléchargement 1.png`, `stylo espace.png`) — quote paths when referencing them.

## Conventions

- **Language:** all user-facing strings, comments in HTML, and content are in **French**. Keep new copy in French unless asked otherwise.
- **Logging:** debug logs are prefixed `[arundore]` — match that prefix for any new `console.*` calls so they're greppable.
- **Comments in `main.js`:** functions are separated by `/* ---------- NAME ---------- */` banners. Keep that style for new top-level functions.
- **No frameworks, no build, no npm.** Do not introduce a bundler, TypeScript, or a package.json unless the user explicitly asks. New dependencies should be added as `<script src="https://cdn...">` tags in `index.html`.

## Things that look weird but are intentional

- `dev/null/` contains files named `pre-push`, `post-checkout`, etc. — these are placeholder/disabled git hooks, not a real `/dev/null` redirect. Leave them alone unless asked.
- The two consecutive `:root` blocks in `style.css` (see above).
- The 8-second `safetyUnlock` timeout — required because the preloader locks scroll; any failure in the intro chain would otherwise leave the page un-scrollable.
