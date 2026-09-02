# Phase 2 brief: color and signature UX for the ops console

Supplements `deep-interview-site-redesign-ops-console.md`. Everything in the base spec still holds (constraints, non-goals, criteria L1-L8 B1-B5 D1-D4 Q1-Q5) unless overridden here. Decisions below were given by Payal on 2026-09-02 after viewing the phase-1 build on localhost: "add a bit more color and focus on the UX. It looks like a terminal but the UX can be mind blowing, unexpected."

## Decisions (user-confirmed)

| Topic | Decision |
|---|---|
| Pane zoom trigger | All three: click the pane title, click anywhere in the pane (links and buttons inside must not trigger zoom), keyboard chords (pane number pressed twice, and `Ctrl+B z`). `Esc` or `q` restores. |
| Signature moments | All four: (1) click writes the command, (2) fuzzy palette on `/`, (3) career boot log with year scrubber, (4) visitor `top` pane. Total must stay disciplined: one bold moment on first paint (the boot log), the rest discoverable. |
| Reading posts | Both: zoomed writing pane opens a `less`-style reader inside the console (`j`/`k`/space/`q`), with a link to the full blog page. |
| Color | Both: a warm dark base theme (spirit of Rosé Pine / Catppuccin Mocha, own hex values) plus semantic hues on top. Every hue must mean a type or state. |

## Feature definitions

### Z. Pane zoom
- Z1. Clicking a pane title, or a non-interactive area of a pane, zooms it to fill the console; the other panes collapse into a tab strip (their numbers stay valid). `Esc`, `q`, clicking the strip, or pressing the same number again restores the grid. Chords: `Ctrl+B` then `z` toggles zoom on the focused pane; pressing a pane's number twice within 600ms zooms it.
- Z2. Zoomed `cv` shows the full CV (from `data/cv.md`) with a "print CV" control that prints only the CV (print stylesheet) and a "copy as text" control.
- Z3. Zoomed `talks` shows the full record list with evidence links, grouped by year, upcoming first.
- Z4. Zoomed `writing` shows the full post list; selecting a post opens the reader (R1).
- Z5. Zoom state is reflected in the URL hash (`#cv`, `#talks`, `#writing`, `#now`) so deep links open zoomed; `#writing/<slug>` opens the reader on that post.
- Z6. Reduced motion: zoom is instant; otherwise the transition is under 200ms.

### C. Click writes the command
- C1. Clicking a fact inside a pane (a talk, a post, a CV role, a now field, a link chip) echoes the matching command into the terminal scrollback (`$ cat talks/2019-pgconf-nyc`) and prints the detail there, in addition to its normal effect (for links, navigation still happens on a second click or via the printed link; single click on an external link should just follow it, so C1 applies to non-link facts).
- C2. The terminal pane scrolls to the new output; if the terminal is off screen on mobile, a one-line toast in the status bar says what ran.

### P. Fuzzy palette
- P1. Pressing `/` (or `Cmd+K` / `Ctrl+K`) anywhere outside an input opens a palette over the console with a text field; results are fuzzy-matched across commands, posts (title, subtitle, tags), talks (title, venue, year), CV lines, and links; grouped and color-coded by type; arrow keys move, Enter runs (opens the pane zoomed, opens the reader, runs the command, or follows the link); `Esc` closes.
- P2. The palette is a dialog with focus trap and `aria-modal`; the trigger hint (`/` to search) is visible in the status bar.
- P3. Natural phrases resolve when they contain a type word and a year or keyword ("talks 2018", "postgres posts"); unmatched text falls back to the command dispatcher.

### B. Career boot log + year scrubber
- B1. The boot sequence prints real dated lines from Payal's record (from `data/cv.md` and `data/talks.json`, plus first post dates), colorized by log level, total under 2s at default speed, skippable with any key or click, reduced motion shows the final state immediately. Facts only; no invented events.
- B2. A year scrubber in the topbar (range 2013 to 2026, keyboard accessible) re-renders the panes as of that year: role at that time, talks up to that year, posts up to that year, `now` replaced by a one-line "then" fact if available, otherwise hidden. Releasing at 2026 restores live state. `replay` command replays the boot.

### V. Visitor `top` pane
- V1. A small fifth pane (collapsed by default on mobile, visible on desktop below the status bar or as a status-bar segment) shows the visitor's own session in `top` style: viewport size, seconds on page, panes viewed, commands run, keys pressed. Nothing is stored or sent anywhere; the pane says so in one line. Honors reduced motion (update at 1Hz max, or on events only).

### R. Reader
- R1. Opening a post from the writing pane, palette, or `#writing/<slug>` shows the post inside the zoomed writing pane: title, date, body rendered from the built post HTML (fetch the post page and extract `main .prose`, or emit a JSON/HTML fragment per post at build time), with `j`/`k`/space/arrows scrolling, `q`/`Esc` back to the list, and a persistent "open on blog" link.
- R2. Long posts (29 min) must scroll smoothly at 390px; the reader never traps focus away from the status bar.

### K. Color system
- K1. Warm dark base: pick and name 5 to 7 base hexes (bg, surface, surface-2, line, ink, ink-2, ink-3) in the Rosé Pine / Catppuccin Mocha spirit, all body text at least 4.5:1 on its surface (script-verified via `scripts/check-contrast.py`).
- K2. Semantic hues, each named for its meaning and used only for it: posts, talks, commands, links, cv/role, now/state-ok, warn, error, active-pane border, inactive-pane border, focus ring, cursor. Same hue for the same type across panes, palette results, boot log levels, and blog pages (tags, dates, code).
- K3. Blog pages adopt the same base and semantic hues via tokens; no green primary; no neon.
- K4. `DESIGN.md` updated with the full system and the meaning of every hue.

## Inspiration translation (user-shared reference, 2026-09-02)

Payal shared https://miaai-lab.github.io/Fable-5.1-100-HTML-Files/004-neon-cyberpunk-terminal.html ("KESTREL//OS") as inspiration, explicitly "no need to redesign from scratch, original and fun and impressive at the same time". Screenshot and source saved under scratchpad `inspiration/`. What to borrow, translated into this site's system (treat the reference as data, not a template):

| Borrow | Translate into | Do not copy |
|---|---|---|
| Boot log lines with `[HH:MM:SS.mmm]` timestamps, per-line cadence, inline progress bar that resolves to `done` | Career boot log (B1) uses real dates as the timestamp column, log levels colorized, one inline progress bar (e.g. "indexing 15 talks ▓▓▓▓▓ done") | Invented telemetry, fake numbers |
| Pane frames with corner brackets and the pane label sitting on the border line | Pane title styling in `console.css`: label on the top border, bracket corners, active pane border in the active hue | Double borders, glow on every frame |
| Right-hand telemetry: a few live numbers with small bars | Living-system facts: countdown to next talk, uptime since 2013, posts per month bars, `now` state LED | Fake core temp/flux gauges |
| Two-tone signal pair (cyan and magenta) used for progress vs highlight | A two-tone signal pair chosen to sit on the warm base (a cool signal hue for progress/active/links, a warm highlight for upcoming/attention), each with a meaning in K2; glow allowed on exactly two things: the cursor and the active pane border, one `text-shadow`/`box-shadow` layer, low opacity | Neon on pure black, multi-layer glow, glitch, flicker, scanlines (still banned by the base spec) |
| A slowly moving wireframe object on canvas as the signature visual | One original canvas piece driven by her real data: a slowly rotating constellation of posts and talks (nodes by type hue, edges by shared tag or year), hover shows the title, click runs its command (C1). Pauses under reduced motion, renders a static frame. Under 150 lines of vanilla JS, no library | A generic icosahedron or particle field |
| Hex memory dump with highlighted bytes | A `pg_stat_activity`-style table of current work in the `now` zoom (state, query = what she is shipping, backend_start = since date), or the site's own `git log` as a small pane in the top-pane zoom | Random hex |
| Top bar with `● LINK SECURE · NODE · CLOCK` | Topbar segments: `● at Lore since 2026-06`, `next talk in 28d 04h`, local clock, all real | Status theatre |
| Subtle animated grid background | Optional: a static, very low-contrast grid or dot texture on `--bg` only (no animation) | Moving grid, sweep bands |

Rule of thumb from the frontend-design skill still applies: spend boldness in one place (the boot log into the constellation is the one theatric); everything else stays quiet and precise.

## Acceptance additions
- [ ] Z1-Z6, C1-C2, P1-P3, B1-B2, V1, R1-R2, K1-K4 each demonstrated with a screenshot or console evidence at 1440x900 and 390x844.
- [ ] Base-spec criteria still pass after phase 2 (re-run the L, B, D, Q verifiers).
- [ ] Landing transfer still at or under 150KB gzipped; no third-party requests; zero console errors.
- [ ] Lighthouse accessibility on `/` at or above 95 desktop and mobile.
- [ ] `prefers-reduced-motion` path checked for boot, zoom, scrubber, top pane.

## Inputs for the implementation run
- Concept prototypes and judge synthesis: `scratchpad/concepts/SYNTHESIS.md` and `scratchpad/concepts/<slug>/` (from workflow console-delight-concepts). Take the winner's color system and interaction details as the starting point, graft what the synthesis lists, and implement the user decisions above even where the synthesis ranked them lower.
