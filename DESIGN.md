---
version: alpha
name: payalsingh.me console
description: A warm dark ops console. One mono face for chrome, one sans face for reading, one state colour (amber), one kind key (now, talk, post, cv, link, command) and one time scale (candle 2013 to daylight 2026).
colors:
  primary: "#e9e4dd"
  bg: "#100e0c"
  surface: "#181411"
  surface-2: "#201b17"
  ink: "#e9e4dd"
  ink-2: "#a69e95"
  ink-3: "#8e857b"
  accent: "#d9a441"
  warn: "#d9a441"
  ok: "#8fbf8f"
  err: "#d76c6c"
  kind-now: "#8fbf8f"
  kind-talk: "#6fd3c4"
  kind-post: "#8ab4f8"
  kind-cv: "#f0a3b8"
  kind-link: "#c4a2f5"
  kind-cmd: "#d9a441"
  year-2013: "#e89a6a"
  year-2018: "#f1d9a6"
  year-2022: "#e9e4dd"
  year-2026: "#8ab4f8"
  line: "#2b2520"
  line-strong: "#3d352d"
  selection: "#3a3128"
typography:
  console:
    fontFamily: ui-monospace, "SF Mono", Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  console-xs:
    fontFamily: ui-monospace, "SF Mono", Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.5
  pane-title:
    fontFamily: ui-monospace, "SF Mono", Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
    fontSize: 1.0625rem
    fontWeight: 400
    lineHeight: 1.65
  h1:
    fontFamily: ui-monospace, "SF Mono", Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  h2:
    fontFamily: ui-monospace, "SF Mono", Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  h3:
    fontFamily: ui-monospace, "SF Mono", Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace
    fontSize: 1.0625rem
    fontWeight: 600
    lineHeight: 1.25
  page-title:
    fontFamily: ui-monospace, "SF Mono", Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace
    fontSize: 1.875rem
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
rounded:
  sm: 2px
  md: 3px
  lg: 4px
spacing:
  "1": 4px
  "2": 8px
  "3": 12px
  "4": 16px
  "5": 24px
  "6": 32px
  "8": 48px
components:
  topbar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.console}"
    height: 48px
    padding: 8px 16px
  pane:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.console}"
    rounded: "{rounded.md}"
    padding: 12px
  pane-title:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.pane-title}"
    padding: 8px 12px
  statusbar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    typography: "{typography.console-xs}"
    height: 36px
    padding: 0 12px
  statusbar-key:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.console-xs}"
    rounded: "{rounded.sm}"
  statusbar-key-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.bg}"
    typography: "{typography.console-xs}"
    rounded: "{rounded.sm}"
  prompt:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.console}"
  cursor:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.bg}"
    width: 0.6em
    height: 1.2em
  kbd:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.console-xs}"
    rounded: "{rounded.sm}"
    padding: 0 0.4em
  badge:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    typography: "{typography.console-xs}"
    rounded: "{rounded.sm}"
    padding: 0 0.4em
  btn:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.console}"
    rounded: "{rounded.md}"
    padding: 4px 12px
  btn-hover:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
  code-block:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.console}"
    rounded: "{rounded.md}"
    padding: 16px
  footer:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink-3}"
    typography: "{typography.console-xs}"
    padding: 16px
  skip-link:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.console}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  pane-key:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.kind-talk}"
    typography: "{typography.console-xs}"
    rounded: "{rounded.sm}"
    padding: 0 0.3em
  pane-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.console}"
    rounded: "{rounded.md}"
    padding: 12px
  palette-result:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.console}"
    padding: 4px 12px
  palette-result-selected:
    backgroundColor: "{colors.kind-post}"
    textColor: "{colors.bg}"
    typography: "{typography.console}"
    padding: 4px 12px
  keytray:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    typography: "{typography.console-xs}"
    padding: 8px 12px
  top-strip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    typography: "{typography.console-xs}"
    padding: 4px 0
  scrubber:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    typography: "{typography.console-xs}"
    padding: 0 8px
  zoomtabs:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    typography: "{typography.console-xs}"
    rounded: "{rounded.md}"
    padding: 4px 12px
  reader:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: 12px
---

## Overview

payalsingh.me is an ops console. The landing is a tmux-style grid of five panes (now, talks, writing, cv, links) plus a working terminal pane and a status bar; the blog is a reading column under the same top bar. Everything a visitor needs to judge the site owner is on screen at first paint, in one typeface, on one dark ground. The chrome is monospace because the chrome is a terminal. Long prose is a system sans because sans is easier to read at 700px than mono. Colour has three jobs and no others: one state colour (amber) for focus, hover, the active key, the cursor and the active pane border; one kind key (six hues, one per kind of thing: now, talk, post, cv, link, command) on chips, badges and prefixes; one time scale (candle 2013 to daylight 2026) on date columns. Headings, body text, borders at rest and backgrounds never carry a hue. Two things glow, the cursor and the active pane border, one low-opacity layer each. Nothing scans, nothing loops except the cursor.

Files: `assets/css/tokens.css` (custom properties, reduced-motion block), `assets/css/console.css` (components; sections 1 to 8 shared, 9 landing only, 10 blog only), `_includes/head.html` and `_includes/navbar.html` (the one head and the one topbar, used by the landing and by every layout), `scripts/check-contrast.py` (contrast gate), `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`. Motion timing lives in `.omc/design/motion.md`, which remains authoritative. The older `.omc/design/{palette,typography,layout,panel-mockups,aesthetic-rationale,ascii-motif}.md` and the `.omc/design/INDEX.md` file list are superseded by this file as of 2026-09-01; each carries a superseded marker on its first line. The portrait slot that `ascii-motif.md` describes no longer exists (`assets/js/portrait.js` was removed in this redesign).

Both heads load the two stylesheets in this order and nothing else:

```html
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/console.css">
```

## Colors

Dark only, warm. Surfaces are three steps of one red-brown black (the Rose Pine and Catppuccin Mocha spirit, own values); text is three steps of neutral off-white with a hair of warmth so it does not read blue on the warm ground. Every hue on the site means one of three things and nothing else: a state (amber), a kind of thing (six kind hues), or a year (the time scale). Every text token is at or above 4.5:1 on every surface it is used on, and every hue that carries `--bg` text on a solid fill is checked too. `scripts/check-contrast.py` asserts all of it, plus the token identities and the year interpolation, and fails otherwise; the ratios below are its output (2026-09-02).

### Base

| Token | Hex | Role | on `--bg` | on `--surface` | on `--surface-2` |
|---|---|---|---|---|---|
| `--bg` | `#100e0c` | page ground | | | |
| `--surface` | `#181411` | pane, code block, topbar, statusbar, palette box | | | |
| `--surface-2` | `#201b17` | hovered row, kbd, inline code, button, selected chip | | | |
| `--ink` | `#e9e4dd` | primary text, pane titles, row titles | 15.23:1 | 14.48:1 | 13.49:1 |
| `--ink-2` | `#a69e95` | secondary text, metadata, nav at rest, `[info]` | 7.29:1 | 6.93:1 | 6.46:1 |
| `--ink-3` | `#8e857b` | tertiary text, placeholder, footer, hints, undated dates; 12px and up only | 5.31:1 | 5.05:1 | 4.71:1 |
| `--line` | `#2b2520` | pane borders at rest, rules (decorative) | | | |
| `--line-strong` | `#3d352d` | pane title rule, kbd border, table head rule, scrubber track (decorative) | | | |
| `--selection` | `#3a3128` | `::selection` ground; `--ink` on it is 10.07:1 | | | |

The floor is `--ink-3` on `--surface-2` at 4.71:1; it is used only at 12px and up.

### State: one colour

| Token | Hex | Meaning | on `--bg` | on `--surface` | on `--surface-2` | `--bg` text on it |
|---|---|---|---|---|---|---|
| `--accent` | `#d9a441` | state: focus ring, hover, active statusbar key, cursor, active and zoomed pane border, scrubber thumb, the "as of" banner | 8.56:1 | 8.14:1 | 7.59:1 | 8.56:1 |
| `--warn` | `#d9a441` | attention: boot `[warn]` lines, archive leads under reconstruction. Equals `--accent` | 8.56:1 | 8.14:1 | 7.59:1 | |
| `--ok` | `#8fbf8f` | ok state: `[ ok ]` level, upcoming badge, "done" | 9.19:1 | 8.73:1 | 8.14:1 | 9.19:1 |
| `--err` | `#d76c6c` | error lines, error badge, `command not found` | 5.73:1 | 5.45:1 | 5.08:1 | 5.73:1 |

Amber is the only state colour. It is also the command kind (below), as in the winning concept prototype: a command is the thing the visitor acts with, so it shares the colour of action.

### Kind key: six hues, one per kind of thing

Applied at rest to the pane key chips `0` to `4`, the matching statusbar keys, palette result badges and the selected palette row, the `[talk]` `[post]` `[cv]` `[now]` and `$` prefixes in the boot log and terminal output, URLs printed in the terminal, constellation nodes (talks circles, posts squares) and blog tag chips. Never on headings, body text, borders at rest or backgrounds. Every use sits beside a text twin (the badge word, the prefix, the printed year), so colour never carries meaning alone.

| Token | Hex | Kind | on `--bg` | on `--surface` | on `--surface-2` | `--bg` text on it |
|---|---|---|---|---|---|---|
| `--kind-now` | `#8fbf8f` | now facts, the topbar role LED. Equals `--ok`: now is the ok state of the person | 9.19:1 | 8.73:1 | 8.14:1 | 9.19:1 |
| `--kind-talk` | `#6fd3c4` | talks | 10.82:1 | 10.28:1 | 9.58:1 | 10.82:1 |
| `--kind-post` | `#8ab4f8` | posts; also "this year" (the 2026 end of the time scale), the boot progress bar and blog tag chips | 9.14:1 | 8.69:1 | 8.10:1 | 9.14:1 |
| `--kind-cv` | `#f0a3b8` | cv lines and roles | 9.76:1 | 9.27:1 | 8.64:1 | 9.76:1 |
| `--kind-link` | `#c4a2f5` | links and printed URLs | 9.02:1 | 8.57:1 | 7.99:1 | 9.02:1 |
| `--kind-cmd` | `#d9a441` | commands, the `/` and `?` keys, the `$` prefix. Equals `--accent` | 8.56:1 | 8.14:1 | 7.59:1 | 8.56:1 |

Each kind has a 14 % alpha twin (`--kind-now-dim` ... `--kind-cmd-dim`, and `--accent-dim`) for the row tint behind the palette; text on a tinted row keeps its surface ratio.

How the hue reaches an element: any element with `data-kind` (`now talk post cv link cmd`) or a statusbar item with `data-pane` resolves the custom properties `--kind` and `--kind-dim` in `console.css` section 4, and its descendants inherit them. The chip, badge, prefix and tint rules read those two variables; nothing else does. A new component that needs its kind hue writes `color: var(--kind)` rather than naming a hue, so the mapping lives in one place.

### The two-tone signal pair

Where the inspiration used cyan against magenta, this system uses cool against warm, and both already have meanings above: `--kind-post` blue is the cool signal (progress bar fill, "this year", the daylight end of the time scale) and `--accent` amber is the warm signal (upcoming, attention, every state). No extra token.

### Year temperature: date columns only

One token per year from 2013 to 2026, linear in sRGB between four anchors: candle `#e89a6a` (2013), cream `#f1d9a6` (2018), white `#e9e4dd` (2022, equals `--ink`) and daylight `#8ab4f8` (2026, equals `--kind-post`, so "this year" and "posts" share one blue). Intermediate years are computed and the check script asserts each one against the interpolation. Applied through `data-year` on `.row__date`, the year spans in the now pane's `dd`, `.postlist__date`, `.page__meta time`, `.seg--year` in the terminal, palette result dates and the scrubber output; `[data-year]` sets the variable `--year` and only those date-column selectors read it, so the `data-year` that list rows also carry paints nothing. A date without a year (an archive lead's era) stays `--ink-3`.

| Year | Hex | on `--surface` | Year | Hex | on `--surface` |
|---|---|---|---|---|---|
| 2013 | `#e89a6a` | 8.07:1 | 2020 | `#eddec2` | 13.80:1 |
| 2014 | `#eaa776` | 8.97:1 | 2021 | `#ebe1cf` | 14.13:1 |
| 2015 | `#ecb382` | 9.88:1 | 2022 | `#e9e4dd` | 14.48:1 |
| 2016 | `#edc08e` | 10.93:1 | 2023 | `#d1d8e4` | 12.78:1 |
| 2017 | `#efcc9a` | 12.01:1 | 2024 | `#baccea` | 11.26:1 |
| 2018 | `#f1d9a6` | 13.27:1 | 2025 | `#a2c0f1` | 9.89:1 |
| 2019 | `#efdcb4` | 13.57:1 | 2026 | `#8ab4f8` | 8.69:1 |

Lowest year pair: 2013 on `--surface-2` at 7.53:1.

### Glow: two things

`--glow-cursor` (`0 0 6px rgba(217,164,65,.35)`) on the cursor, blinking off with the block; `--glow-pane` (`0 0 0 1px rgba(217,164,65,.25)`) beside the amber border of `.pane.is-active` and `.pane.is-zoom`. One `box-shadow` layer each, low opacity, both amber because both mark state. Nothing else glows, and no `text-shadow` anywhere.

### Where each hue appears

| Surface | Rule |
|---|---|
| Pane border | `--line` at rest; `--accent` plus `--glow-pane` while active or zoomed. Never a kind hue |
| Pane title | `--ink`. The key chip beside it is the pane's kind hue (text and 1px border) |
| Statusbar keys | `--surface-2` ground, `--ink` text at rest; on hover and `aria-current` a solid chip in the pane's kind hue with `--bg` text; `/` and `?` use amber |
| List rows | title `--ink`, note `--ink-3`, aside `--ink-2`; `.row__date[data-year]` in the year token; `.badge--ok` green; `.row.is-hit` filled with `--kind-dim` |
| Now pane | labels `--ink-2`, values `--ink`, year spans in the year token, the role LED `--kind-now` |
| Terminal | lines `--ink`; `--ok` green, `--dim` `--ink-2`, `--err` red, `--warn` amber; `.seg--*` prefixes in their kind hue, URLs lilac, dates year-tinted, progress bar blue, "done" green |
| Palette | badge and `mark` in the kind hue, selected row solid kind hue with `--bg` text, dates year-tinted, the `/` glyph amber |
| Cursor | amber block with `--glow-cursor`, hollow amber outline while unfocused |
| Scrubber | track `--line-strong`, thumb `--accent`, output year-tinted |
| Constellation | talk nodes `--kind-talk`, post nodes `--kind-post`, edges `--line-strong` at rest and the shared kind hue on hover, tooltip `--ink` on `--surface` |
| Blog | tag chips `--kind-post` at rest and amber on hover; dates year-tinted; links `--ink` underlined, amber on hover; code in three inks with no hue |

Rules:

- `--accent` is a state colour. It is allowed on: `:focus-visible` outline, link hover, nav hover and `aria-current`, the active statusbar key, the block cursor, a button border on hover, the active or zoomed pane border, the scrubber thumb, warn lines and the "as of" banner. It is not allowed on headings, rules, borders at rest, icons, backgrounds, or any text that is not a state change.
- A kind hue is allowed only on a chip, badge, prefix, printed URL, constellation node or tag chip, always beside its text twin, never on a border at rest or a background above 14 % alpha.
- A year token is allowed only on a date column reached through `data-year`.
- Use `--ink-3` only at 12px and up. It passes 4.5:1 but it is the floor.

## Typography

System stacks only, no web fonts. This is a decision, not a fallback: it costs zero bytes, zero CLS, and the site's identity comes from layout and restraint, not from a licensed face.

- `--font-mono`: `ui-monospace, "SF Mono", Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace`. All chrome, the terminal, pane titles, metadata, headings, code. `font-variant-ligatures: none` is set on `body` so `->` and `=>` stay literal.
- `--font-sans`: `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Prose bodies only (`.prose`).

| Token | rem | px | Used for |
|---|---|---|---|
| `--text-2xs` | 0.6875 | 11 | badges |
| `--text-xs` | 0.75 | 12 | metadata, kbd, statusbar, pane meta, row dates |
| `--text-sm` | 0.875 | 14 | console body, nav, pane titles, prompt, code blocks |
| `--text-md` | 1 | 16 | prose body below 768px, h4 |
| `--text-lg` | 1.0625 | 17 | prose body from 768px, h3 |
| `--text-xl` | 1.25 | 20 | h2 |
| `--text-2xl` | 1.5 | 24 | post h1, page title below 768px |
| `--text-3xl` | 1.875 | 30 | page title from 768px |

Line heights: `--leading-tight` 1.25 (headings, pane titles), `--leading-console` 1.5 (mono), `--leading-prose` 1.65 (sans). Measure: `--measure` 545px (34.0625rem). Spec B4 asks for a 65 to 75ch column and this file reads that as characters per line, the typographic measure, not the CSS `ch` unit: `ch` is the width of "0", which in a proportional face is about 1.35 average glyphs, so a `66ch` column carried 94 characters per line. An earlier value, 33rem (528px), was estimated at 70.2 characters per line (average glyph 7.52px on a post at 1440 by 900, 17px system-ui) but measured under 65 in the built site, so the measure was raised to 545px to clear the floor with margin; see the verify-B-1 evidence for the re-measured count. The two ch/characters readings cannot both hold (65 CSS ch is 668px, 75 characters is 564px), so the characters-per-line reading wins and the `ch` reading is recorded as failed on purpose. `.page__header` is not capped by the measure; a post title runs to the 48rem page width above the narrower body column. Headings are mono, weight 600, tracking -0.01em. Links are always underlined (1px, offset 0.15em) so they are distinguishable without colour.

## Layout

Spacing scale (rem): `--space-1` 0.25, `--space-2` 0.5, `--space-3` 0.75, `--space-4` 1, `--space-5` 1.5, `--space-6` 2, `--space-8` 3. Chrome heights: `--topbar-h` 3rem (48px), `--statusbar-h` 2.25rem (36px). `--console-gap` and `--pane-pad` are both `--space-3`.

Shell: `.shell` is a full-height grid, `auto 1fr auto`, with `grid-template-columns: minmax(0, 1fr)` and `min-width: 0` on its rows so a long `<pre>` line can never widen the page.

Console grid steps:

| Viewport | `.console` | pane body |
|---|---|---|
| below 768px | 1 column, auto rows | grows with content |
| 768px to 1023px | 2 columns, auto rows | grows with content |
| 1024px and up | 2 columns, `grid-auto-rows: minmax(0, 1fr)`, height `100dvh - topbar - statusbar` (min 36rem) | `overflow: auto`, scrolls inside the pane |

`.pane--span` spans both columns; `.pane--tall` spans two rows. Both apply from 768px.

The landing (`.shell--landing`, section 9 of `console.css`) composes six panes on that grid: now, talks, writing, cv, links, terminal. Below 768px they stack in that order, so the terminal prompt is the last thing above the sticky statusbar. From 1024px the shell is `100dvh` tall with rows `auto minmax(0, 1fr) auto`, the console has rows `1fr 1fr 1fr auto`, the terminal spans both columns on row 3 and the links pane is a one-row strip on row 4. From 1280px the console is three columns with rows `1fr 1fr auto`: now and talks on row 1, writing and cv on row 2, the terminal is the full-height right column, and the links strip spans all three columns on row 3.

Height budget at 1440 by 900 with the shipped three-column composition: topbar 70 (the id row 48 plus the 22px telemetry and scrubber row the landing reserves from 768px) + console padding 24 + two gaps 24 + links strip 39 + statusbar 36 = 193px of chrome; the remaining 707px splits into two rows of 354px. Measured in the built site (headless Chromium, 2026-09-03, phase 2): now and talks at top 82, writing and cv at top 448, each 464 by 354; terminal at top 82, 464 by 719; links at top 813, 1416 by 39; `document.scrollHeight` 900, so nothing scrolls. The topbar measures the same height with and without JavaScript at every width (1440, 1280 and 768: 70px; 1024 to 1279: 91px; 390: 113px) because the landing reserves the second row before the modules fill it, which is what keeps CLS at 0.002 on the desktop Lighthouse run. Between 1024px and 1279px the same chrome minus the third gap splits into three rows over two columns, with the terminal spanning row 3.

Page composition, landing versus blog:

- Landing: `.skip-link`, `.shell` > `.topbar` (id + tagline + nav, `home` current) > `main.console` with the panes > `nav.statusbar` (keys 0 to 4 for the panes, `?` for help, sticky on small screens, static row at 1024px and up). No footer; the statusbar is the footer.
- Blog pages (`/blog/`, posts, topics, evidence, 404): `.skip-link`, `.shell` > `.topbar` (same component, `writing` current on blog surfaces) > `main.page` > `.page__header` + `article.prose` > `footer.footer` (one line: copyright, source, licence, rss). No statusbar, no pane grid. The topbar is static on both; it is never sticky, so it never costs layout stability.

Deep links: `#now`, `#talks`, `#writing`, `#cv`, `#links`, `#terminal` target panes with `tabindex="-1"`; browsers focus them on fragment navigation and the pane draws its focus ring (`panes.js` accepts the same six ids plus `about`). `#about` targets the topbar. `html { scroll-padding-bottom }` keeps the sticky statusbar from covering a pane title on mobile.

## Elevation & Depth

Depth is expressed as surface steps (`--bg` under `--surface` under `--surface-2`) and 1px lines. There are no drop shadows and no layered translucency, with one exception on exactly two elements: the cursor carries `--glow-cursor` (`0 0 6px rgba(217,164,65,.35)`) and the active or zoomed pane carries `--glow-pane` (`0 0 0 1px rgba(217,164,65,.25)`) beside its amber border. One `box-shadow` layer each, low opacity, and both are amber because both mark state. Nothing else may use `box-shadow` or `text-shadow`. Overlapping elements are ordered by `--z-skip` 100, `--z-palette` 50, `--z-keytray` 30, `--z-statusbar` 20, `--z-topbar` 10.

## Shapes

Radii are small because this is a console: `--radius-sm` 2px (kbd, badge, statusbar key), `--radius` 3px (pane, button, code block, skip link), `--radius-md` 4px (reserved). Borders are 1px `--line`; the rule that follows a pane title is 1px `--line-strong`. The favicon is the only rounded shape larger than 4px.

## Components

All classes live in `assets/css/console.css`. Snippets are the minimum markup each component expects.

### Skip link

```html
<a class="skip-link" href="#main">Skip to content</a>
```

### Topbar

Prompt-style identity, one-line positioning, four nav links. Mark the current page with `aria-current="page"`. The markup lives once, in `_includes/navbar.html`, and every page (the landing included) renders it from there; the positioning line is `site.tagline` in `_config.yml`, shown after the name. On the landing the tagline is the page `h1` and the header carries `id="about" tabindex="-1"` so `#about` focuses it.

```html
<header class="topbar">
  <a class="topbar__id" href="/"><span class="topbar__user">payal</span><span class="topbar__at">@</span><span class="topbar__host">payalsingh.me</span></a>
  <p class="topbar__tagline"><span class="topbar__name">Payal Singh</span>, staff platform engineer. Postgres, data systems, DevOps, and AI-native systems.</p>
  <nav class="topbar__nav" aria-label="Site">
    <a href="/" aria-current="page">home</a>
    <a href="/blog/">writing</a>
    <a href="/#talks">talks</a>
    <a href="/#cv">cv</a>
  </nav>
</header>
```

Below 768px the tagline drops to its own line under the id and nav.

### Console and pane

```html
<main id="main" class="console" tabindex="-1">
  <section class="pane" id="now" tabindex="-1" aria-labelledby="now-title">
    <h2 class="pane__title" id="now-title"><span class="pane__key">0</span>now<span class="pane__meta">updated 2026-05-19</span></h2>
    <div class="pane__body">...</div>
  </section>
  <section class="pane pane--terminal pane--span" id="terminal" tabindex="-1" aria-labelledby="terminal-title">
    <h2 class="pane__title" id="terminal-title">terminal<span class="pane__meta">type help</span></h2>
    <div class="pane__body">
      <div class="scrollback" role="log" aria-live="polite" aria-label="Terminal output"></div>
      <!-- .prompt goes here -->
    </div>
  </section>
</main>
```

`.pane__title` renders `0 now ──────── meta`: the key as a small bordered chip, the lowercase name in `--ink`, a rule to the right edge, optional meta in `--ink-3`. Every pane carries `data-kind` (`now talk post cv link cmd`); the chip takes that kind's hue as text and border through the `--kind` variable (see Colors), the same shape and hue as the statusbar key it answers to. `.pane__key` and `.pane__meta` are optional; the terminal pane has no key because it is reached by `?`, by clicking, or by `#terminal`. A pane that holds focus gets `.is-active` from `panes.js` and a zoomed pane gets `.is-zoom` from `zoom.js`: both draw the border in `--accent` with `--glow-pane`, amber because a border shows state, never a kind hue. `.pane--terminal .pane__body` is a column flex so the scrollback takes the space and the prompt stays at the bottom.

### Statusbar

```html
<nav class="statusbar" aria-label="Panes" data-statusbar>
  <a class="statusbar__item" href="#now" data-pane="now" aria-current="true"><kbd class="statusbar__key">0</kbd>now</a>
  <a class="statusbar__item" href="#talks" data-pane="talks"><kbd class="statusbar__key">1</kbd>talks</a>
  <a class="statusbar__item" href="#writing" data-pane="writing"><kbd class="statusbar__key">2</kbd>writing</a>
  <a class="statusbar__item" href="#cv" data-pane="cv"><kbd class="statusbar__key">3</kbd>cv</a>
  <a class="statusbar__item" href="#links" data-pane="links"><kbd class="statusbar__key">4</kbd>links</a>
  <a class="statusbar__item" href="#terminal" data-pane="terminal" data-help><kbd class="statusbar__key">?</kbd>help</a>
  <span class="statusbar__hint">keys work while the prompt is not focused</span>
</nav>
```

Key map, shared by this markup and `KEY_TO_PANE` in `assets/js/panes.js`: `0` now, `1` talks, `2` writing, `3` cv, `4` links; `?` focuses the terminal and runs `help`. Keys act only while no input has focus; `Escape` inside the prompt returns focus to the terminal pane so they work again (`terminal.js`'s own `Escape` handler, independent of the gate below). `aria-current` follows whichever pane holds focus (`data-pane` is the pane id). Sticky at the bottom below 1024px, a static row at 1024px and up. On hover and while current, an item's key becomes a solid chip in its pane's kind hue with `--bg` text (`data-pane` maps to `--kind`: now green, talks teal, writing blue, cv rose, links lilac); the `/` search and `?` help keys use amber, the command kind. Every hue-on-`--bg` pair is in the contrast check. The hint is hidden below 768px.

**Single-character shortcuts (WCAG 2.1.4).** `z`, `q`, `j`, `k`, `:`, the pane digits `0`-`4`, `/` and `?` are the site's bare, unmodified character-key shortcuts, bound at the document level in `zoom.js`, `panes.js` and `palette.js`. Every one of them goes through two gates in `assets/js/shortcuts.js`, shared by all three files:

- `isShortcutTarget(el)`: true only for the document body itself, or a non-interactive element inside a `.pane`. A link, button, input, textarea, select, summary, contenteditable element -- and the year scrubber's `<input type=range>` -- never has a key stolen from it, anywhere on the page, not only inside a form field. Nothing outside the body/pane surface (topbar, palette, key tray) responds either.
- `shortcutsEnabled()`: a visitor-level on/off switch, persisted under the single `console.keysEnabled` key in `localStorage` (the only localStorage this site writes). The terminal command `keys on` / `keys off` and a "single-key shortcuts: on/off" button injected into the `?` key tray both call `setShortcutsEnabled()`; every module reacts through `onShortcutsChange()`, including the statusbar hint, which reads "keys are off · use the search button or type "keys on"" while disabled. With keys off, the palette open button, the statusbar's own pane/help links, and `Escape` keep working -- they are clicks, real links, or a functional key, not character shortcuts -- so the switch itself is always reachable by Tab and click even with keys off.

`Escape` and `Enter` are functional keys, not character shortcuts, and are not run through this gate (`Enter` is already self-limited: it only acts when the event target is the pane element itself). `Ctrl+B z` is a modified chord, also outside 2.1.4's scope. `Escape` still steps aside for a focused form field so that field's own handling runs instead.

### Prompt and cursor

Decision: the cursor is a block element that trails a mirrored text span, not the native caret. The `<input>` stays real (focusable, labelled, receives every keystroke) but is transparent on top of the field. JS copies `input.value` into `.prompt__mirror` on every `input` event and adds `.prompt--typing` briefly so the block stays solid while keys are going in. Without JS the `.prompt--mirrored` class is absent, the input is visible with its native caret in `--accent`, and the block is hidden, so nothing breaks.

```html
<div class="prompt prompt--mirrored" data-prompt>
  <label class="prompt__ps1" for="terminal-input">payal@payalsingh.me:~$</label>
  <span class="prompt__field">
    <span class="prompt__mirror" data-mirror data-placeholder="type help" aria-hidden="true"></span><span class="cursor cursor--active" data-cursor aria-hidden="true"></span>
    <input class="prompt__input" id="terminal-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Enter a command">
  </span>
</div>
```

```js
const prompt = document.querySelector('[data-prompt]');
const input = prompt.querySelector('.prompt__input');
const mirror = prompt.querySelector('[data-mirror]');
let typingTimer;
input.addEventListener('input', () => {
  mirror.textContent = input.value;
  prompt.classList.add('prompt--typing');
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => prompt.classList.remove('prompt--typing'), 500);
});
// after boot: prompt.classList.add('prompt--mirrored'); cursor.classList.add('cursor--active');
```

The prompt is not focused after boot on any device. The ready line offers keys 0 to 4, which only work while the prompt is unfocused, so focusing it would make the first thing the page says untrue; the visitor who wants to type clicks the prompt or tabs to it, and `Escape` hands focus back to the terminal pane. Cursor states: hidden until `.cursor--active` (boot done); hollow amber outline while the field is unfocused (the terminal idiom for an inactive window, and a visible focus cue); filled and blinking while focused. `.prompt .cursor` is `display: none` until either `.prompt--mirrored` (JS on) or `.cursor--active` is present, so a static prompt with no input, as on the 404 page, still shows its block. The blink is `@keyframes cursor-blink` on `background-color`, `step-end`, `--dur-blink` 1100ms, the only infinite animation on the site. `.cursor--blink` forces the blink on a standalone cursor (the 404 page). Known limit: the block always sits at the end of the text; mid-string caret position is not drawn.

### Scrollback

```html
<div class="scrollback" role="log" aria-live="polite" aria-label="Terminal output">
  <p class="scrollback__line scrollback__line--echo">payal@payalsingh.me:~$ tlaks</p>
  <p class="scrollback__line scrollback__line--err">bash: tlaks: command not found</p>
  <p class="scrollback__line">did you mean: talks</p>
</div>
```

Line modifiers: `--echo` and `--dim` (`--ink-2`), `--ok`, `--err`, `--warn` (amber). Segment classes colour one word inside a line while the rest stays the line colour: `.seg--talk .seg--post .seg--cv .seg--now .seg--cmd` for the `[talk]` `[post]` `[cv]` `[now]` and `$` prefixes, `.seg--link` for a printed URL (lilac, also on an `<a>`), `.seg--ok .seg--info .seg--warn .seg--err` for level words, `.seg--bar` for the boot progress bar (blue, the cool progress signal) and `.seg--year` with `data-year` for a date column. Lines are `white-space: pre-wrap`. No max-height; on desktop the scrollback scrolls inside the pane, on smaller screens it grows.

```html
<p class="scrollback__line"><span class="seg--year" data-year="2018">2018-06-01</span> <span class="seg--ok">[ ok ]</span> <span class="seg--talk">[talk]</span> Securing Your Data On PostgreSQL · PGCon 2018</p>
```

### Rows

List panes use a date column, a title, and an optional aside.

```html
<ul class="rows">
  <li class="row"><span class="row__date">2026-09-30</span><a class="row__title" href="...">Talk title</a><span class="row__aside"><span class="badge badge--ok">upcoming</span> Venue <a href="...">evidence</a></span></li>
</ul>
```

`.row__note` is an optional full-width line under a row in `--ink-3` at 12px (a talk's note, a role summary); `.row--current` sets the title to weight 600 for the upcoming talk or the current role. `.row__aside` may hold badges and evidence links separated by middle dots. Rows carry `data-kind`, `data-year` and `data-cmd`; `.row__date[data-year]` takes the year token (candle to daylight) and `.row.is-hit` (set by `palette.js` for the row a palette result points at) fills the row with the kind hue at 14 % (`--kind-dim`). The title, aside and note keep their ink.

### Facts

Definition rows for the now pane: a label column in `--ink-2` at 12px and a value column. The label column is `max-content`, the value column takes the rest and wraps.

```html
<dl class="facts">
  <dt>role</dt><dd>Staff Data Engineer at Lore, since June 2026</dd>
  <dt>reading</dt><dd>The Elephant In The Brain</dd>
</dl>
```

### Links pane

`.pane--links` is a one-row pane: from 768px the title sits on the left with a rule to its right and the body runs beside it; below 768px it is an ordinary pane. `.links` is a wrapping row of anchors; `.links__host` is the path part of each handle in `--ink-3`. `data-link` names the command the terminal derives from each anchor.

```html
<section class="pane pane--links" id="links" tabindex="-1" aria-labelledby="links-title">
  <h2 class="pane__title" id="links-title"><span class="pane__key">4</span>links</h2>
  <div class="pane__body">
    <ul class="links">
      <li><a href="https://github.com/payals" data-link="github">github<span class="links__host">/payals</span></a></li>
      <li><a href="/feed.xml" data-link="rss">rss</a></li>
    </ul>
  </div>
</section>
```

### Disclosure

`.more` is a `<details>` whose summary is styled as a button. `panes.js` swaps the label between `data-closed-label` and `data-open-label` and, on open, moves focus to the first `tabindex="-1"` element inside `.more__body`, which is how the talks pane's long tail and the cv pane's full text keep the load-more focus management from the old panels.

```html
<details class="more" data-more>
  <summary class="btn more__summary" data-open-label="show fewer" data-closed-label="show 6 more">show 6 more</summary>
  <div class="more__body">...</div>
</details>
```

The full cv inside the cv pane is `data/cv.md` rendered with its leading h1 dropped and every other heading moved down one level, so the outline under the pane's h2 runs h3, h4 and the page keeps a single h1 (the topbar tagline).

### Actions and section labels

`.actions` is a wrapping row of buttons and links under pane content (`download pdf`, `all posts`, `rss`). `.pane__section` is a lowercase 12px label in `--ink-2` that opens a sub-list inside a pane body (archive leads under talks).

```html
<p class="actions"><a class="btn" href="/blog/">all posts</a> <a href="/feed.xml">rss</a></p>
<h3 class="pane__section" id="talks-leads-title">archive leads</h3>
```

### Prose

```html
<main id="main" class="page" tabindex="-1">
  <header class="page__header">
    <h1 class="page__title">Post title</h1>
    <p class="meta">2026-09-01 · 9 min read · <a href="/blog/topics/#agents">agents</a></p>
  </header>
  <article class="prose">...</article>
</main>
```

`.prose`: sans body at 16px (17px from 768px), 545px measure (at least 65 characters per line, measured), mono headings, underlined links, inline code on `--surface-2`, code blocks on `--surface` with a `--line` border, tables in a `.table-wrap` for horizontal scroll, blockquotes with a 2px `--line-strong` left rule. `.prose--mono` keeps the same rhythm in the console face for the cv and about panes.

### Small parts

```html
<span class="kbd">4</span>
<span class="badge badge--ok">upcoming</span>
<button class="btn" type="button">show 10 more</button>
<p class="meta">metadata line</p>
<footer class="footer">&copy; Payal Singh · <a href="...">source</a> · CC-BY · <a href="/feed.xml">rss</a></footer>
```

Utilities: `.muted` (`--ink-2`), `.faint` (`--ink-3`), `.ok`, `.err`, `.mono`, `.sr-only`.

### Console features

The eight phase-2 features are one folded stylesheet, `assets/css/features.css`, linked on the landing only, after `tokens.css` and `console.css`. It is the concatenation of the per-feature sheets in cascade order (zoom, reader, palette, clicks, bootlog, scrubber, topstats, constellation): the order matters because topstats reserves the second topbar row that the scrubber sits in, and constellation sizes the terminal body every other sheet leaves alone. The landing head therefore links three stylesheets and every other page links two.

```html
<nav class="zoomtabs" data-zoomtabs><button class="zoomtabs__tab"><kbd class="zoomtabs__key">1</kbd>talks</button></nav>
<div class="reader" data-reader role="region" tabindex="-1"><p class="reader__status"><span class="reader__slug">slug</span><span class="reader__pos">line 22 of 179 12%</span><span class="reader__keys">j k space scroll · q back</span></p></div>
<div class="palette" data-palette role="dialog" aria-modal="true"><ul class="palette__results" role="listbox"><li role="option" aria-selected="true"><span class="r__type" data-kind="talk">talk</span></li></ul></div>
<div class="keytray" data-keytray role="status"><ul class="keytray__list"><li><kbd class="kbd">/</kbd> search</li></ul></div>
<span class="statusbar__toast" data-toast role="status">$ cat talks/&lt;id&gt; <a href="#terminal">see terminal</a></span>
<div class="scrubber" data-scrubber><label class="scrubber__label" for="year-scrubber">as of</label><input class="scrubber__input" type="range" min="2013" max="2026"><output class="scrubber__out" data-year="2018">2018</output></div>
<p class="topbar__stats" data-topstats><span class="topbar__stat"><span class="topbar__led"></span>at Lore since 2026-06</span></p>
<section class="top" data-top><h3 class="top__title"><button class="top__toggle" aria-expanded="true">top</button></h3><dl class="top__fields"><dt>viewport</dt><dd>1440x900</dd></dl><p class="top__note">This session only. Nothing is stored or sent anywhere.</p></section>
<div class="constellation" data-constellation><canvas class="constellation__canvas" role="img"></canvas><p class="constellation__tip" role="status"></p></div>
```

| Component | Spec |
|---|---|
| `zoomtabs` | One row above the zoomed pane, `--surface` ground, one `.zoomtabs__tab` per collapsed pane with its `.zoomtabs__key` chip in the pane's kind hue plus an `esc grid` chip in the command amber. Shown only while `.console.is-zoomed`. |
| `reader` | 1px `--line` frame inside the zoomed writing pane, a `post` badge in `--kind-post`, the year-tinted date, and a `less`-style status line at the foot: the slug (truncates first), the position in `--ink` with tabular numerals, and the key hint in `--ink-3` (hidden below 480px). Below 1024px the status line sticks above the statusbar. |
| `palette-result` | Kind badge `.r__type[data-kind]` in the kind hue with a 1px border of the same hue, title in `--ink` with matched characters marked in the kind hue, date year-tinted, venue or subtitle in `--ink-2`. The selected row (`aria-selected="true"`) is a solid kind-hue ground with `--bg` text; the pane row behind the dialog takes a 14% tint of the same hue. |
| `keytray` | Fixed above the statusbar, `--surface` on `--line`, `--z-keytray` 30. Position fixed, so opening it never moves the page. Its last item is a `.btn.btn--small` "single-key shortcuts: on/off" toggle, injected by `palette.js` (`assets/js/shortcuts.js`'s `setShortcutsEnabled`); `--ink-2` while on, `--warn` text and border while off. |
| `toast` | One statusbar-height row fixed at the bottom of the viewport, shown when a clicked fact ran a command the visitor cannot see; clears itself after 4s. |
| `scrubber` | `as of` label in `--ink-2`, a 5rem range (7rem from 1024px) with a 2px `--line-strong` track and a 12px `--accent` thumb, and a year-tinted `output`. While a past year is selected the topbar shows the `as of <year>` banner in amber with a `back to now` button. |
| `topbar` telemetry | A second topbar row from 768px: the role LED (`--kind-now`), the countdown in days and hours, and the uptime. The uptime is not shown between 768px and 1023px, where the row is too narrow for three facts on any mono face. Below 768px the whole row is hidden and the scrubber moves to the id row. The landing topbar reserves that row's height before the modules fill it, so the measured height is identical with and without JavaScript. |
| `top-strip` | One row at the foot of the terminal pane from 1024px: `dt` labels are visually hidden because each `dd` names itself (`1440x900`, `up 4s`, `3 panes`, `1 cmd`, `16 keys`), values in `--ink` with tabular numerals, separated by middle dots in `--ink-3`, 11px from 1024px so it fits the 411px terminal column at 1280px, with the note in `--ink-2` at that size (`--ink-3` is only allowed at 12px and up). Below 1024px it is a collapsed disclosure at 12px with the note in `--ink-3`. |
| `constellation` | A canvas in the terminal pane's idle area between the scrollback and the prompt. Talk nodes are `--kind-talk` circles, post nodes `--kind-post` squares, ring guides `--line`, ring year labels `--ink-3` at 12px, edges `--line-strong` at rest and the hovered node's kind hue when lit. No shadow, no gradient, no hue on the ground. It is hidden below 768px, a 10rem block from 768px to 1023px, sized by whatever the scrollback leaves between 1024px and 1279px (usually nothing, so it hides), and a fixed 14rem block from 1280px so it is on screen at first paint and never resizes while the career log prints. |

### Blog parts

Section 10 of `console.css`, used only by the Jekyll layouts. Every colour, size and space is a token; nothing redefines a class from the sections above.

```html
<p class="page__subtitle">One-line subtitle in the sans face, --ink-2.</p>
<p class="meta page__meta"><time datetime="2026-09-01">2026-09-01</time> · 8 min read · <a class="tag-chip" href="/blog/topics/#agents">agents</a></p>
<ol class="postlist"><li class="postlist__item"><time class="postlist__date">2026-09-01</time><div class="postlist__main"><a class="postlist__title" href="...">Title</a><p class="postlist__sub">Subtitle</p><p class="postlist__tags"><a class="tag-chip" href="...">tag</a></p></div></li></ol>
<section class="topic" id="agents" tabindex="-1"><h2 class="topic__title">agents <span class="topic__count">3</span></h2><ul class="rows">...</ul></section>
<nav class="series-box" aria-label="Series navigation"><p class="series-box__label">Part 2 of the <strong>Series</strong> series</p><ol class="series-box__list"><li class="is-current" aria-current="page">Part 2: ...</li></ol></nav>
<nav class="pager" aria-label="Adjacent posts"><p class="pager__item"><span class="pager__label">newer</span> <a href="...">Title</a></p></nav>
```

`.tag-chip` is a post badge that links to a topic: `--kind-post` text and border at rest (the same blue as the writing pane key and the `[post]` prefix), amber on hover because hover is state. Dates on `/blog/` (`.postlist__date`), on a post (`.page__meta time`) and on `/blog/topics/` (`.row__date`) carry `data-year` and take the year token, so a 2026 date is the same daylight blue on every surface. In-text links stay `--ink` underlined, amber on hover. Rouge output is mapped to three shades of ink (comments `--ink-3`, strings and numbers `--ink-2`, keywords `--ink` weight 600) with no hue, because code at rest has no state; inline code sits on `--surface-2`, code blocks on `--surface`.

### Focus

Global `:focus-visible` is a 2px `--accent` outline, offset 2px. Panes use offset -1px so the ring stays inside the grid. Mouse focus shows no ring.

## Do's and Don'ts

Do:

- Load `tokens.css` then `console.css` (plus the landing's feature sheets) and nothing else in the head.
- Use `--accent` for focus, hover, the active key, the cursor, the active pane border and warn.
- Use a kind hue only on a chip, badge, prefix, printed URL, constellation node or tag chip, and always beside its text twin.
- Use a year token only on a date column, through `data-year`.
- Underline every in-text link.
- Keep pane titles lowercase, `--ink`, in the mono face.
- Put wide content (tables, code) inside a scrolling container.
- Run `python3 scripts/check-contrast.py` after any token change.

Don't:

- No green primary, no neon, no hue without a meaning in the Colors table.
- No hue on headings, body text, rules, borders at rest, or backgrounds; no kind hue on a border ever.
- No web fonts, no CDN, no analytics, no third-party requests.
- No CRT scanlines, curvature, flicker, glitch, or animation libraries.
- No shadow or glow beyond the two in Elevation & Depth; no gradients.
- No looping animation other than the cursor blink.
- No radius above 4px.
- No `--ink-3` below 12px.

## Motion

Authoritative source: `.omc/design/motion.md`. Tokens: `--dur-press` 60ms, `--dur-hover` 120ms, `--dur-panel` 220ms with `--ease-out` `cubic-bezier(0.16, 1, 0.3, 1)`, `--dur-blink` 1100ms `step-end`. Boot is at most 800ms and any key or click skips it. `prefers-reduced-motion: reduce` sets the duration tokens to 0ms, forces every animation and transition to 0.001ms with one iteration, and sets `scroll-behavior: auto`; JS reads the same media query and skips the boot loop. Under reduced motion the cursor renders as a solid block.

## Favicon

`favicon.svg` is a 32 by 32 rounded square in `--bg` (`#100e0c`) with a prompt chevron and a filled block cursor in `--ink` (`#e9e4dd`). `favicon.ico` holds PNG-encoded 16, 32 and 48px renders of the same SVG. `apple-touch-icon.png` is a 180px render of the square (unrounded) variant, since iOS masks its own corners. Both heads include:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

To regenerate after editing the SVG: rasterise it at 16, 32, 48 and 180px with headless Chromium (set the SVG's `width`/`height` to the target size in a blank page and screenshot the viewport with `omitBackground`; `qlmanage` keeps the SVG's intrinsic 32px inside a larger canvas, so it does not work for the bigger sizes), then pack the 16, 32 and 48px PNGs into the ICO (a 6-byte header, one 16-byte directory entry per image, then the PNG bytes).
