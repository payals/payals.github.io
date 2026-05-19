# Deep Interview Spec: payals.github.io — living terminal calling-card

## Metadata
- Interview ID: ghpages-terminal-landing-2026-05-19
- Rounds: 5
- Final Ambiguity Score: ~15%
- Type: brownfield (existing Jekyll repo, full content replacement)
- Generated: 2026-05-19
- Threshold: 0.20
- Status: PASSED

## Clarity Breakdown

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.95 | 0.35 | 0.333 |
| Constraint Clarity | 0.70 | 0.25 | 0.175 |
| Success Criteria | 0.85 | 0.25 | 0.213 |
| Context Clarity | 0.85 | 0.15 | 0.128 |
| **Total Clarity** | | | **0.848** |
| **Ambiguity** | | | **~15%** |

## Goal

Replace the current Jekyll blog at `payals.github.io` with a single-page **living terminal calling-card**: a static page that uses a fake-but-functional terminal as its navigation metaphor, with rich styled content rendered below.

Four anchors:

1. **Boot sequence** (~0.8s, skippable) — a short BIOS-style scroll on first load: "PayalOS v1.0 / loading bio / loading talks / fetching now.json / ready", before the prompt is handed over.
2. **ASCII portrait** — a stylised line-art portrait that draws itself line-by-line during boot, then persists as a small static avatar in the header/corner.
3. **Hybrid terminal** — visitor can type commands (with tab-complete + history) OR click chips (always visible). Both paths run the same command set.
4. **`now` widget** — a `now` command reveals a hand-edited mini-feed of "what's true about me this month" combined with live signals (last commit, latest blog post) fetched at page load.

Rich content (`cat about`, `cat talks`, `cat resume`, `cat now`) renders as **styled panels below the terminal** — the terminal stays compact at the top; content opens like a museum exhibit below.

## Constraints

- **Hosting**: GitHub Pages from `payals/payals.github.io` master branch.
- **Repo**: existing Jekyll content (`index.md`, `blog.md`, `about.md`, `_posts/`, `_layouts/`, `assets/css/main.scss`, `Gemfile`) gets **removed**. The blog now lives at `makeworld.dev`; the GH Pages site no longer needs Jekyll.
- **Tech stack**: pure static HTML + vanilla JS + CSS. No build step. No frameworks. (Reason: single-page; GH Pages serves static directly; minimal dependencies.)
- **Routing**: client-side hash routing for shareable links (`/#talks`, `/#resume`, `/#now`). The page loads in any state via the hash.
- **Accessibility**:
  - Hybrid input means keyboard-only AND pointer-only AND screen-reader users all get full access.
  - Boot animation must be skippable (any keystroke or click) AND respect `prefers-reduced-motion`.
  - Chips for every command always visible — no "discoverability via typing only".
  - Color contrast meets WCAG AA on the dark terminal palette.
- **No tracking** scripts, no analytics, no third-party JS beyond optional GitHub API fetch.
- **`now.json`** lives in repo root; editing the file = updating the widget. Hand-edited fields + 2 auto-fetched fields (latest commit + latest blog post).
- **External APIs**: only GitHub REST API (unauthenticated, public). Falls back gracefully if rate-limited or offline.
- **ASCII portrait**: Pi to supply EITHER a source photo (jp2a / ascii-art-generator conversion) OR a hand-drawn ASCII string. If neither is ready by build time, ship with a tasteful placeholder (e.g. a coffee/laptop motif) and swap later — does NOT block ship.
- **Performance**: total page weight < 100KB gzipped, including portrait + CSS + JS. No web fonts unless they truly serve the aesthetic (preferred: system monospace stack).
- **Compatibility**: latest 2 versions of Chrome, Safari, Firefox; iOS Safari + Android Chrome.

## Non-Goals

- Multi-page architecture / SSR / SSG (Jekyll/Astro/11ty).
- Real shell semantics (filesystem, pipes, redirects). Just a fixed command set.
- Authentication, comments, search beyond command tab-complete.
- Replacing `makeworld.dev` content — that's the canonical blog.
- A "real" CRT effect (scanlines, curve, glow) — explicitly vetoed in Round 5.
- Heavy animation libraries (anime.js, GSAP). CSS + small vanilla JS only.
- Resume builder — resume is either inline markdown rendered in a panel, or a PDF Pi provides.
- Talks scraper — talks list is hand-edited JSON.

## Acceptance Criteria

- [ ] `https://payals.github.io/` returns HTTP 200 and the new terminal landing page.
- [ ] On first load: boot sequence plays for ~0.8s, ASCII portrait draws itself, terminal becomes interactive.
- [ ] `prefers-reduced-motion: reduce` skips the boot animation and reveals the page instantly.
- [ ] Typing `help` and pressing Enter lists all commands.
- [ ] All commands work via typing AND via clicking the chip: `help`, `about`, `now`, `talks`, `resume`, `github`, `linkedin`, `medium`, `blog` (→ makeworld.dev), `older` (→ older blog), `email`, `clear`.
- [ ] Tab-complete works on partial commands.
- [ ] Up/Down arrow cycles command history.
- [ ] `cat about`, `cat talks`, `cat resume`, `cat now` each open a styled panel below the terminal.
- [ ] `now` reads `now.json` from the repo and renders both hand-edited fields and auto-fetched fields (latest commit + latest post from `makeworld.dev/feed.xml`).
- [ ] If the GitHub API call fails, the `now` widget still renders the hand-edited fields with a small "(live signals unavailable)" note.
- [ ] Direct-link URLs (`/#talks`, `/#resume`, `/#now`) open the page with that panel already expanded — first-load boot still plays but ends in that view.
- [ ] Page passes Lighthouse Accessibility ≥ 95.
- [ ] Page weight is < 100KB gzipped.
- [ ] No external scripts beyond an optional GitHub API fetch (verified via DevTools network tab on Chrome / Safari).
- [ ] Existing Jekyll files (`_config.yml`, `_layouts/`, `_posts/`, `Gemfile`, `blog.md`, `about.md`, the old `index.md`, `assets/css/main.scss`) are removed from the repo. A new `index.html` is the only entry point.
- [ ] `404.html` (renamed from `404.md`) matches the terminal aesthetic and offers a `home` link.
- [ ] On mobile (≤ 480px wide): terminal sizes down, chips wrap, content panels remain readable.

## Assumptions Exposed & Resolved

| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| Should stay on Jekyll | Single page doesn't need Jekyll | Replace with static HTML; remove Jekyll cruft |
| One signature moment | "I like all options" → user couldn't pick | Stacked plan: 4 anchors, vetoed nothing, ASCII portrait re-added |
| Resume is a PDF | Could be inline | Inline markdown panel for "in-line skim"; PDF link for recruiters (Pi to provide URL or download path) |
| Talks list source | Could scrape conferences | Hand-edited JSON; manual is fine for ≤ 20 talks/year |
| `now` widget data | Could be fully static OR fully live | Hybrid: hand-edited JSON + 2 live signals via GitHub/feed API, with graceful degradation |
| Browser support | Old IE/Edge? | Latest 2 versions of modern browsers — no IE compat |
| ASCII portrait | Could be auto-generated | Pi supplies source photo OR hand-drawn; placeholder otherwise; doesn't block ship |
| Augmented terminal vs pure-text | Pure text was too austere | Cat-as-canvas: terminal as nav, rich panels as content |

## Technical Context

### Repo state (to be replaced)

```
./_config.yml         ← Jekyll config (DELETE)
./_layouts/*.html     ← Jekyll layouts (DELETE)
./_posts/*.md         ← old welcome post (DELETE)
./about.md            ← becomes `cat about` content (port to JSON or inline HTML)
./blog.md             ← DELETE (blog moved to makeworld.dev)
./index.md            ← DELETE (replaced by index.html)
./assets/css/main.scss← DELETE (new CSS from scratch)
./Gemfile             ← DELETE
./404.md              ← convert to 404.html
./README.md           ← keep, update to reflect new architecture
```

### New repo shape

```
./index.html                    main entry — terminal + boot + chips
./404.html                      terminal-styled 404
./assets/
  ./css/terminal.css            scoped styles
  ./js/terminal.js              command parser + history + tab-complete
  ./js/panels.js                cat-as-canvas panel renderer
  ./js/now.js                   now widget (fetch + render)
  ./js/boot.js                  boot sequence + ASCII portrait animation
  ./img/portrait.txt            ASCII portrait source (or .svg if vector)
./data/
  ./now.json                    hand-edited "what's true about me now"
  ./talks.json                  hand-edited talks list
  ./about.md                    long-form bio (rendered by panels.js)
  ./resume.md                   inline resume content
  ./resume.pdf                  (optional) downloadable PDF
./README.md                     updated architecture notes
./LICENSE                       (optional)
./CNAME                         (optional, only if custom domain later)
```

### Color + type palette (proposed, refinable in design pass)

```
--bg:        #0a0c0d   /* deep slate */
--bg-panel:  #11161a
--text:      #e6e8e6
--muted:     #8a9aa0
--accent:    #7ad6a9   /* CRT-green but desaturated, no neon */
--accent-2:  #f0c674   /* warm amber for hover / focus */
--border:    #1f262b
--shadow:    0 24px 60px rgba(0,0,0,0.45)

font-mono: ui-monospace, "JetBrains Mono", "Cascadia Code",
           Menlo, Consolas, monospace;
font-display: same as mono (consistency).
font-prose: ui-sans-serif, system-ui, sans-serif; (used in panels only)
```

### Command set (v1)

| Command | Effect |
|---------|--------|
| `help` | Lists commands and chips. |
| `about` / `cat about` | Opens about panel (bio, photo/ASCII, social). |
| `now` / `cat now` | Opens `now` panel: hand-edited + live signals. |
| `talks` / `cat talks` | Opens talks panel: grid of cards w/ slide / video links. |
| `resume` / `cat resume` | Opens resume panel + PDF download button. |
| `github` | `window.open('https://github.com/payals', '_blank')`. |
| `linkedin` | Opens LinkedIn URL. |
| `medium` | Opens Medium URL. |
| `blog` | Opens `https://makeworld.dev`. |
| `older` | Opens older blog URL (Pi to supply). |
| `email` | `mailto:` link. |
| `clear` | Clears terminal scrollback (panel stays). |
| `whoami` | Easter egg: prints tagline. |
| `sudo *` | Easter egg: prints "nice try". |

Tab-complete + history + arrow-key navigation across all of the above.

### Open data points Pi must supply (does NOT block scaffolding)

1. **Tagline** — current candidate: "notes on data, AI, markets, research" (with a comma fix). Open to other phrasing.
2. **Links**:
   - GitHub: `https://github.com/payals`
   - LinkedIn URL (full).
   - Medium URL (full).
   - Older blog URL (full).
   - Email (the public-facing one, possibly an alias).
3. **Talks list** — array of `{title, venue, date, slides_url, video_url, image}`. Can ship with placeholder talks + Pi fills in.
4. **Resume content** — markdown for inline panel + (optional) PDF.
5. **ASCII portrait** — source photo OR hand-drawn ASCII OR opt for placeholder + swap later.

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| TerminalShell | core | prompt, history, current input, command registry | hosts Commands |
| Command | core | name, aliases, handler, panel-id (optional) | belongs to TerminalShell, opens Panel |
| Panel | core | id, title, content source, render-mode (md / json / live) | opened by Command, hosted in PanelStack |
| BootSequence | supporting | lines, duration, skip-on-key | runs once at page load |
| ASCIIPortrait | supporting | source, draw-rate | drawn during BootSequence, persists in Header |
| NowWidget | supporting | static fields (now.json) + live signals | rendered by `now` Command |
| ChipMenu | supporting | command names (visible) | mirrors Command registry |
| HashRouter | supporting | maps `/#X` → opens panel X | works alongside TerminalShell |
| GitHubAPI | external | endpoint, fallback behavior | feeds NowWidget last-commit |
| RSSFeed | external | makeworld.dev/feed.xml | feeds NowWidget last-post |

## Ontology Convergence

| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 5 (LandingPage, LinksList, Talks, Resume, AestheticChoice) | 5 | - | - | N/A |
| 2 | 6 (+ TerminalShell, replacing AestheticChoice) | 1 | 1 | 4 | 83% |
| 3 | 7 (+ Panel) | 1 | 0 | 6 | 86% |
| 4 | 9 (+ BootSequence, NowWidget) | 2 | 0 | 7 | 78% |
| 5 | 10 (+ ASCIIPortrait, fix ChipMenu) | 1 | 0 | 9 | 90% |
| Final | 10 (named, all fields settled) | 0 | 0 | 10 | **100%** |

Converged.

## Interview Transcript

<details>
<summary>Full Q&A (5 rounds)</summary>

### Round 1 — Aesthetic direction
**Q:** Bento grid / Editorial Swiss / Terminal monospace / Playful animated. Pick one.
**A:** No pick; "can we make the terminal interactive somehow?" + add makeworld.dev + tagline maybe different.

### Round 2 — Interactivity flavor
**Q:** Real-shell parser / click-driven chips / hybrid / typewriter-only.
**A:** Hybrid (type if you want, click if you don't, tab-complete, fallback).

### Round 3 — Talks/Resume structure
**Q:** Inline commands / separate routes / PDF-only resume / skip both v1.
**A:** No pick; "terminal look and feel but augmented with animation and style and images or widgets or something maybe."

### Round 4 — Signature moment
**Q:** ASCII portrait / `now` widget / boot sequence / cat-as-canvas.
**A:** No pick; "I like all these options... what will the live data widget show?"

### Round 5 — Stack commit
**Q:** Ship D+B+C-lite (with A deferred). Veto?
**A:** "Yes but ADD the ASCII portrait" — locked the stack with all four anchors.

</details>

## Implementation outline (for planning stage)

1. **Strip Jekyll** — remove `_config.yml`, `_layouts/`, `_posts/`, `Gemfile`, `blog.md`, `about.md`, `index.md`, `assets/css/main.scss`. Commit as separate change so `git log` is clean.
2. **Skeleton HTML** — single `index.html` with header (logo / portrait slot), main (terminal + chips), footer.
3. **Terminal JS** — vanilla module: prompt, input, history (Up/Down), tab-complete (Tab), command registry, render line.
4. **Boot sequence** — runs on `DOMContentLoaded`. ~5 lines, 0.8s total. Skippable by any keystroke or click. Respects `prefers-reduced-motion`.
5. **ASCII portrait** — draws line-by-line during boot. Source: text/SVG. Persists in header thereafter.
6. **Chip menu** — visible row of buttons below terminal. Clicking simulates typing the command + Enter.
7. **Panel renderer** — `cat X` opens a panel below the terminal. Markdown panels render via tiny markdown parser (or pre-render at "build" time — but there's no build, so render at runtime).
8. **`now` widget** — fetches `data/now.json` + GitHub API + RSS. Renders combined view. Falls back gracefully.
9. **Hash router** — listens for `hashchange`, opens matching panel.
10. **CSS** — terminal palette, prompt cursor blink, chip styles, panel cards.
11. **`404.html`** — terminal-styled, single `home →` link.
12. **README update** — explain new architecture.
13. **Lighthouse + manual a11y pass** — keyboard-only walk-through, screen reader read-through, prefers-reduced-motion check.

## Notes for the planner

- **Don't reach for a framework**. Single-file vanilla JS is the right primitive here. Importing React or Astro defeats the brief.
- **shadcn/ui / cult-ui from Pi's wiki** — useful conceptually (copy-paste pattern, motion-aware variants) but their React dependency makes them wrong for THIS project. Use them as a future option for any project served from makeworld.dev (e.g. an app subdomain) where React makes sense.
- **Cookie / consent banners are FORBIDDEN** — no tracking, no consent needed. Privacy by design.
- **Performance budget is a hard constraint** — under 100KB gzipped. If a feature pushes us over, it's vetoed.
- **The boot sequence is the WOW moment**. Get the timing right (0.8s, not 3s). Test on slow connection.
- **Mobile is first-class**. Test on a real iPhone, not just Chrome DevTools.
