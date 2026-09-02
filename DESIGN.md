---
version: alpha
name: payalsingh.me console
description: A dark, quiet ops console. One mono face for chrome, one sans face for reading, one amber accent that only ever means state.
colors:
  primary: "#e6e8eb"
  bg: "#0b0d10"
  surface: "#12151a"
  surface-2: "#171b21"
  ink: "#e6e8eb"
  ink-2: "#9aa3ad"
  ink-3: "#7a8590"
  accent: "#d9a441"
  ok: "#8fbf8f"
  err: "#d76c6c"
  line: "#232830"
  line-strong: "#343b46"
  selection: "#2b3644"
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
---

## Overview

payalsingh.me is an ops console. The landing is a tmux-style grid of five panes (now, talks, writing, cv, links) plus a working terminal pane and a status bar; the blog is a reading column under the same top bar. Everything a visitor needs to judge the site owner is on screen at first paint, in one typeface, on one dark ground. The chrome is monospace because the chrome is a terminal. Long prose is a system sans because sans is easier to read at 700px than mono. There is exactly one accent, amber, and it appears only when something has state: focus, hover, the active key, the cursor. Nothing glows, nothing scans, nothing loops except the cursor.

Files: `assets/css/tokens.css` (custom properties, reduced-motion block), `assets/css/console.css` (components; sections 1 to 8 shared, 9 landing only, 10 blog only), `_includes/head.html` and `_includes/navbar.html` (the one head and the one topbar, used by the landing and by every layout), `scripts/check-contrast.py` (contrast gate), `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`. Motion timing lives in `.omc/design/motion.md`, which remains authoritative. The older `.omc/design/{palette,typography,layout,panel-mockups,aesthetic-rationale,ascii-motif}.md` and the `.omc/design/INDEX.md` file list are superseded by this file as of 2026-09-01; each carries a superseded marker on its first line. The portrait slot that `ascii-motif.md` describes no longer exists (`assets/js/portrait.js` was removed in this redesign).

Both heads load the two stylesheets in this order and nothing else:

```html
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/console.css">
```

## Colors

Dark only. No green primary. Surfaces are three steps of the same blue-black; text is three steps of grey-white; state is one amber. Every text token is at or above 4.5:1 on every surface it is used on. `scripts/check-contrast.py` asserts this and fails the build otherwise; the ratios below are its output.

| Token | Hex | Role | on `--bg` | on `--surface` | on `--surface-2` |
|---|---|---|---|---|---|
| `--bg` | `#0b0d10` | page ground | | | |
| `--surface` | `#12151a` | pane, code block, topbar, statusbar | | | |
| `--surface-2` | `#171b21` | kbd, inline code, button, hovered row | | | |
| `--ink` | `#e6e8eb` | primary text | 15.85:1 | 14.90:1 | 14.08:1 |
| `--ink-2` | `#9aa3ad` | secondary text, metadata, nav at rest | 7.61:1 | 7.16:1 | 6.76:1 |
| `--ink-3` | `#7a8590` | tertiary text, placeholder, footer, hints | 5.17:1 | 4.87:1 | 4.60:1 |
| `--accent` | `#d9a441` | focus ring, hover, active key, cursor | 8.65:1 | 8.13:1 | 7.68:1 |
| `--ok` | `#8fbf8f` | ok status, upcoming badge | 9.28:1 | 8.73:1 | 8.24:1 |
| `--err` | `#d76c6c` | error lines, error badge | 5.79:1 | 5.45:1 | 5.14:1 |
| `--line` | `#232830` | pane borders, rules (decorative) | | | |
| `--line-strong` | `#343b46` | pane title rule, kbd border, table head rule (decorative) | | | |
| `--selection` | `#2b3644` | `::selection` ground; `--ink` on it is 9.98:1 | | | |

Extra pairs the script checks: `--bg` on `--accent` (text inside the block cursor and the active statusbar key) 8.65:1.

Rules:

- `--accent` is a state colour. It is allowed on: `:focus-visible` outline, link hover, nav hover and `aria-current`, the active statusbar key, the block cursor, a button border on hover. It is not allowed on headings, rules, borders at rest, icons, backgrounds, or any text that is not a state change.
- `--ok` and `--err` are the only other chromatic tokens and they carry meaning (a status, a badge, an error line). Do not use them to colour headings or links.
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

Line heights: `--leading-tight` 1.25 (headings, pane titles), `--leading-console` 1.5 (mono), `--leading-prose` 1.65 (sans). Measure: `--measure` 33rem (528px). Spec B4 asks for a 65 to 75ch column and this file reads that as characters per line, the typographic measure, not the CSS `ch` unit: `ch` is the width of "0", which in a proportional face is about 1.35 average glyphs, so a `66ch` column carried 94 characters per line. Measured on a post at 1440 by 900, 17px system-ui: average glyph 7.52px, column 528px, 70.2 characters per line (51.4 CSS ch). The two readings cannot both hold (65 CSS ch is 668px, 75 characters is 564px), so the characters-per-line reading wins and the `ch` reading is recorded as failed on purpose. The value is in rem so it does not move with the platform's "0" width. `.page__header` is not capped by the measure; a post title runs to the 48rem page width above the narrower body column. Headings are mono, weight 600, tracking -0.01em. Links are always underlined (1px, offset 0.15em) so they are distinguishable without colour.

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

Height budget at 1440 by 900 with the shipped three-column composition: topbar 48 + console padding 24 + two gaps 24 + links strip 39 + statusbar 36 = 171px of chrome; the remaining 729px splits into two rows of 365px. Measured in the built site (headless Chromium, 2026-09-02): now and talks at top 60, writing and cv at top 437, each 464 by 365; terminal at top 60, 464 by 741; links at top 813, 1416 by 39; `document.scrollHeight` 900, so nothing scrolls. Between 1024px and 1279px the same chrome minus the third gap splits into three rows over two columns, with the terminal spanning row 3.

Page composition, landing versus blog:

- Landing: `.skip-link`, `.shell` > `.topbar` (id + tagline + nav, `home` current) > `main.console` with the panes > `nav.statusbar` (keys 0 to 4 for the panes, `?` for help, sticky on small screens, static row at 1024px and up). No footer; the statusbar is the footer.
- Blog pages (`/blog/`, posts, topics, evidence, 404): `.skip-link`, `.shell` > `.topbar` (same component, `writing` current on blog surfaces) > `main.page` > `.page__header` + `article.prose` > `footer.footer` (one line: copyright, source, licence, rss). No statusbar, no pane grid. The topbar is static on both; it is never sticky, so it never costs layout stability.

Deep links: `#now`, `#talks`, `#writing`, `#cv`, `#links`, `#terminal` target panes with `tabindex="-1"`; browsers focus them on fragment navigation and the pane draws its focus ring (`panes.js` accepts the same six ids plus `about`). `#about` targets the topbar. `html { scroll-padding-bottom }` keeps the sticky statusbar from covering a pane title on mobile.

## Elevation & Depth

None. There are no shadows and no layered translucency. Depth is expressed as surface steps (`--bg` under `--surface` under `--surface-2`) and 1px lines. The only overlapping elements are the skip link and the sticky statusbar, ordered by `--z-skip` 100, `--z-statusbar` 20, `--z-topbar` 10.

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

`.pane__title` renders `[0] now ──────── meta`: the key in brackets, the lowercase name, a rule to the right edge, optional meta in `--ink-3`. `.pane__key` and `.pane__meta` are optional; the terminal pane has no key because it is reached by `?`, by clicking, or by `#terminal`. `.pane--terminal .pane__body` is a column flex so the scrollback takes the space and the prompt stays at the bottom.

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

Key map, shared by this markup and `KEY_TO_PANE` in `assets/js/panes.js`: `0` now, `1` talks, `2` writing, `3` cv, `4` links; `?` focuses the terminal and runs `help`. Keys act only while no input has focus; `Escape` inside the prompt returns focus to the terminal pane so they work again. `aria-current` follows whichever pane holds focus (`data-pane` is the pane id). Sticky at the bottom below 1024px, a static row at 1024px and up. The active item's key is amber on `--bg`. The hint is hidden below 768px.

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

Modifiers: `--echo` and `--dim` (`--ink-2`), `--ok`, `--err`. Lines are `white-space: pre-wrap`. No max-height; on desktop the scrollback scrolls inside the pane, on smaller screens it grows.

### Rows

List panes use a date column, a title, and an optional aside.

```html
<ul class="rows">
  <li class="row"><span class="row__date">2026-09-30</span><a class="row__title" href="...">Talk title</a><span class="row__aside"><span class="badge badge--ok">upcoming</span> Venue <a href="...">evidence</a></span></li>
</ul>
```

`.row__note` is an optional full-width line under a row in `--ink-3` at 12px (a talk's note, a role summary); `.row--current` sets the title to weight 600 for the upcoming talk or the current role. `.row__aside` may hold badges and evidence links separated by middle dots.

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

`.prose`: sans body at 16px (17px from 768px), 33rem measure (about 70 characters per line), mono headings, underlined links, inline code on `--surface-2`, code blocks on `--surface` with a `--line` border, tables in a `.table-wrap` for horizontal scroll, blockquotes with a 2px `--line-strong` left rule. `.prose--mono` keeps the same rhythm in the console face for the cv and about panes.

### Small parts

```html
<span class="kbd">4</span>
<span class="badge badge--ok">upcoming</span>
<button class="btn" type="button">show 10 more</button>
<p class="meta">metadata line</p>
<footer class="footer">&copy; Payal Singh · <a href="...">source</a> · CC-BY · <a href="/feed.xml">rss</a></footer>
```

Utilities: `.muted` (`--ink-2`), `.faint` (`--ink-3`), `.ok`, `.err`, `.mono`, `.sr-only`.

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

`.tag-chip` is a badge that links to a topic; it is `--ink-2` at rest and takes the accent only on hover. Rouge output is mapped to three shades of ink (comments `--ink-3`, strings and numbers `--ink-2`, keywords `--ink` weight 600) with no hue, because code at rest has no state.

### Focus

Global `:focus-visible` is a 2px `--accent` outline, offset 2px. Panes use offset -1px so the ring stays inside the grid. Mouse focus shows no ring.

## Do's and Don'ts

Do:

- Load `tokens.css` then `console.css` and nothing else in the head.
- Use `--accent` for focus, hover, the active key, and the cursor.
- Underline every in-text link.
- Keep pane titles lowercase and in the mono face.
- Put wide content (tables, code) inside a scrolling container.
- Run `python3 scripts/check-contrast.py` after any token change.

Don't:

- No green primary, no teal, no second accent.
- No accent on headings, rules, borders at rest, or backgrounds.
- No web fonts, no CDN, no analytics, no third-party requests.
- No CRT scanlines, glow, curvature, flicker, or animation libraries.
- No shadows or gradients.
- No looping animation other than the cursor blink.
- No radius above 4px.
- No `--ink-3` below 12px.

## Motion

Authoritative source: `.omc/design/motion.md`. Tokens: `--dur-press` 60ms, `--dur-hover` 120ms, `--dur-panel` 220ms with `--ease-out` `cubic-bezier(0.16, 1, 0.3, 1)`, `--dur-blink` 1100ms `step-end`. Boot is at most 800ms and any key or click skips it. `prefers-reduced-motion: reduce` sets the duration tokens to 0ms, forces every animation and transition to 0.001ms with one iteration, and sets `scroll-behavior: auto`; JS reads the same media query and skips the boot loop. Under reduced motion the cursor renders as a solid block.

## Favicon

`favicon.svg` is a 32 by 32 rounded square in `--bg` with a prompt chevron and a filled block cursor in `--ink`. `favicon.ico` holds PNG-encoded 16, 32 and 48px renders of the same SVG. `apple-touch-icon.png` is a 180px render of the square (unrounded) variant, since iOS masks its own corners. Both heads include:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

To regenerate after editing the SVG: `qlmanage -t -s <size> -o <dir> favicon.svg` for each size, then pack the PNGs into the ICO (a 6-byte header, one 16-byte directory entry per image, then the PNG bytes).
