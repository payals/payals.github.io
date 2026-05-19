# Autopilot Implementation Plan — payals.github.io terminal landing

Source: `.omc/specs/deep-interview-ghpages-terminal-landing.md` + `.supplement.md` + `.omc/design/*.md`

## Sequential pre-step

1. **Strip Jekyll** — delete `_config.yml`, `_layouts/`, `_posts/`, `Gemfile`, `blog.md`, `about.md`, `index.md`, `assets/css/main.scss`, `404.md`, `assets/css/` (recursive if empty). Keep `README.md` (will be overwritten) and `.gitignore`. Single commit-worthy unit.

## Parallel execution (3 agents)

### Agent A — Shell (HTML + CSS + 404 + README)
Files:
- `index.html` — single-page entry. Header (identity + portrait slot), main (terminal block + chip row + panel area), footer. Loads `assets/css/terminal.css` and `assets/js/*.js` (modules in dep order). Hash routing entrypoint. Respects `prefers-reduced-motion`.
- `assets/css/terminal.css` — implement palette from `.omc/design/palette.md`, type scale from `typography.md`, layout grid from `layout.md`, motion timings from `motion.md`. Mobile-first.
- `404.html` — terminal-styled, single `home` link.
- `README.md` — rewrite: explain new architecture (static terminal page, no Jekyll), how to edit `data/*.json`, link to spec.

### Agent B — Logic (JS modules)
Files (vanilla ES modules, no bundler):
- `assets/js/main.js` — entrypoint. Wire everything: boot sequence, portrait, terminal, chips, panels, now widget, hash router. Respect `prefers-reduced-motion`.
- `assets/js/terminal.js` — prompt, input handling, history (Up/Down), tab-complete (Tab), command registry, render output line. Exports `Terminal` class.
- `assets/js/boot.js` — boot sequence runner (~0.8s, 5 lines), skippable on any keystroke/click, no-op under reduced motion. Coordinates with portrait draw.
- `assets/js/portrait.js` — line-by-line ASCII portrait reveal. Reads `assets/img/portrait.txt`.
- `assets/js/panels.js` — cat-as-canvas: opens panel below terminal for `cat about|talks|resume|now`. Closes prior panel. Updates hash. Tiny inline markdown renderer (headings, lists, links, bold, code spans, hr).
- `assets/js/now.js` — fetches `data/now.json` (static), GitHub `events/public` for latest push, makeworld.dev `feed.xml` for latest post. Graceful fallback to "(live signals unavailable)" on error/rate-limit. Render to panel.
- `assets/js/commands.js` — command registry mapping `help`, `about`, `now`, `talks`, `resume`, `github`, `linkedin`, `medium`, `blog`, `older`, `email`, `clear`, `whoami`, `sudo *`. URLs from supplement.

### Agent C — Content (data files + portrait)
Files:
- `data/now.json` — schema per supplement (`reading`, `shipping`, `city`, `updated`).
- `data/talks.json` — empty array `[]` with friendly comment in header file; panel shows "no talks listed yet" when empty.
- `data/about.md` — short bio panel content. Based on existing about.md text but trimmed + terminal-friendly.
- `data/resume.md` — placeholder "coming soon" per supplement.
- `assets/img/portrait.txt` — copy the recommended ASCII motif (Candidate A: coffee + laptop with `cat about` on the screen) from `.omc/design/ascii-motif.md`.

## Acceptance criteria (verify after parallel phase)

Per spec. Smoke test served locally via `python3 -m http.server` then curl + manual browser check.

## Constraints (apply to every agent)

- Pure static. No bundler. No frameworks (no React, no Tailwind, no shadcn). No web fonts.
- Page weight target < 100KB gzipped.
- AA contrast.
- `prefers-reduced-motion: reduce` MUST short-circuit all non-essential motion (boot animation, portrait draw, hover transitions remain instant).
- All outbound links: `target="_blank" rel="noopener"`.
- No tracking scripts.
- `mailto:` for email — no JS obfuscation.
- Email address from supplement: `psinghpayal@outlook.com`.

## Phase 3 — QA

Serve locally, curl pages, manual a11y pass: keyboard-only walk-through, screen reader read-through, `prefers-reduced-motion` check.

## Phase 4 — Validation

Parallel reviewers: code-reviewer (quality) + verifier (acceptance criteria). Skip security-reviewer (no auth, no input handling beyond keystrokes to a sandboxed terminal, no third-party scripts).

## Phase 5 — Cleanup

`git status`, prep commit (do NOT commit without user approval). Leave state files in `.omc/` for traceability.
