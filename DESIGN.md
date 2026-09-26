---
version: alpha
name: payalsingh.me command-first
description: One design system for every page (redesign direction C, 2026-09). Indigo-dusk dark and lavender-dawn light themes, colour by section (talks cyan, writing violet, cv rose, now green), amber for state only, topics as neutral ink plus a shape, Onest for everything readable and Martian Mono for the terminal layer.
colors:
  primary: "#e6e4f0"
  bg: "#15141f"
  surface: "#1c1b29"
  raised: "#252436"
  line: "#302f45"
  ink: "#e6e4f0"
  ink-2: "#aba8c3"
  ink-3: "#908da8"
  accent: "#f5b963"
  ring: "#f5b963"
  talks: "#6fd0f0"
  writing: "#c3a6ff"
  cv: "#ff9ec4"
  now: "#9ad47a"
  on-hue: "#15141f"
  light-bg: "#f6f5fa"
  light-surface: "#ecebf3"
  light-raised: "#ffffff"
  light-line: "#dcdbe8"
  light-ink: "#1b1a26"
  light-ink-2: "#4b4860"
  light-ink-3: "#646179"
  light-accent: "#8a5200"
  light-talks: "#0a6a86"
  light-writing: "#6845d6"
  light-cv: "#a8336a"
  light-now: "#3b7420"
  light-on-hue: "#ffffff"
typography:
  body:
    fontFamily: Onest, "Onest Fallback", ui-sans-serif, system-ui, sans-serif
    fontSize: 1.0625rem
    fontWeight: 400
    lineHeight: 1.6
  prose:
    fontFamily: Onest, "Onest Fallback", ui-sans-serif, system-ui, sans-serif
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.7
  display:
    fontFamily: Onest, "Onest Fallback", ui-sans-serif, system-ui, sans-serif
    fontSize: clamp(2.25rem, 1.5rem + 3vw, 3.5rem)
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  post-title:
    fontFamily: Onest, "Onest Fallback", ui-sans-serif, system-ui, sans-serif
    fontSize: clamp(2rem, 1.5rem + 1.8vw, 2.75rem)
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  h2:
    fontFamily: Onest, "Onest Fallback", ui-sans-serif, system-ui, sans-serif
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.3
  mono:
    fontFamily: '"Martian Mono", "Martian Mono Fallback", ui-monospace, Menlo, monospace'
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0.01em"
rounded:
  sm: 10px
  md: 14px
  lg: 18px
  pill: 999px
spacing:
  sp-1: 4px
  sp-2: 8px
  sp-3: 12px
  sp-4: 16px
  sp-5: 24px
  sp-6: 32px
  sp-7: 48px
  sp-8: 64px
  sp-9: 96px
  measure: 37.5rem
  wide: 48rem
  wide-doc: 60rem
  container: 72rem
components:
  statusline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    typography: "{typography.mono}"
    height: 44px
  chip:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: 34px
  button:
    backgroundColor: "{colors.writing}"
    textColor: "{colors.on-hue}"
    rounded: 12px
    height: 44px
  listing:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  code-block:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.md}"
    padding: 16px 20px
---

## Overview

payalsingh.me is one product with one design system: redesign direction C, "command-first", from the September 2026 redesign brief (an internal working document; the rules it set are the ones this file records). The home page is the one loud moment: a hero with the key facts, a large prompt line and four door cards that open drawers. Every other page is quiet and shares one shell: a top nav with the prompt path, the page, a colophon, and the fixed mono status line with `/` search, `?` keys and the theme toggle.

Files:

- `_layouts/command.html`: the one base layout. `post.html`, `page.html` and `blog.html` sit on top of it and pass `c_section`, `c_kind` and `c_path` through their front matter (Jekyll 3.10 merges layout front matter up the chain; the page wins). `_config.yml` defaults set `c_kind: doc` for `evidence/` and `c_section: now` for `/reading/`, so neither the evidence bundles nor the reading page's front matter change.
- `assets/css/command.css`: every token, both themes and every component. Budget: 13,000 bytes gzipped.
- `assets/js/command.js`: theme, palette, keys sheet, digit keys, topic filters, the home prompt and drawers, the contents highlight on posts, the 404 path.
- `_includes/command/`: partials (top nav, status line, dialogs, search index, sprite, post list, colophon, topic lookup, talk rows, CV data). `_includes/head-meta.html` holds the head meta every page shares (https fallback, title, description, icons, canonical, feed).
- `assets/fonts/`: Onest (variable weight) and Martian Mono (variable width), self-hosted woff2 subsets, SIL OFL, with metric-matched fallbacks so the swap does not move text.
- `scripts/check-contrast.py`: the contrast gate over both themes.

The standalone deck under `talks/pgsummit-2026/` is static files with its own styles and never loads any of this.

## Colors

Two token sets, dark "dusk" (default, `:root`) and light "dawn" (`:root[data-theme="light"]`, repeated under `prefers-color-scheme: light` for visitors who never chose). The toggle stores `ps-theme` in `localStorage` (in a try/catch), and a script before the stylesheet applies it before paint, so every page honours a choice made on any page.

- Surfaces: `--bg`, `--surface` (listings, code, cards), `--raised` (chips, hover, current rows), `--line` (hairlines).
- Ink: `--ink` (text), `--ink-2` (secondary, meta), `--ink-3` (tertiary, dates in lists, labels). Every ink is at least 4.5:1 on every surface in both themes.
- Section hues, one per section, the only hue dimension: `--talks` cyan, `--writing` violet, `--cv` rose, `--now` green. A page sets `--hue` from its section on `<main>`; the page-title square, the listing top rule, the nav underline, link underlines in prose, the prompt path and `.btn` read `--hue`. The blog, posts, tags page and evidence pages are Writing; `/reading/` is Now.
- State: amber `--accent` / `--ring` means state only: focus ring, the caret, the current palette row, a flashed or targeted row, the current part in a series card, the section in view in a post's contents. Hover is not state and never turns amber.
- Topics (ai, postgres, security, platform, reliability, other) are neutral ink plus the shape glyph from `data/topics.json` (`_includes/command/sprite.html`). The `token` fields in `topics.json` name hues from the retired system and have no consumer.
- Code: three shades of ink and no hue (comments `--ink-3`, strings and numbers `--ink-2`, keywords `--ink` at 600).

Run `python3 scripts/check-contrast.py` after changing any colour. It fails under 4.5:1 and prints the named pairs the blog-side pages paint.

## Typography

- Onest for everything readable: titles, body, lists, navigation. Martian Mono (at 87.5% width, 13px minimum, +0.01em) only for the terminal layer: the status line, the prompt path, kbd hints, dates in lists and in the post meta, counts, and code.
- Scale (minor third): `--fs-xs` 13px, `--fs-sm` 15px, `--fs-base` 17px, `--fs-md` 20px, `--fs-lg` 24px, `--fs-xl` 32px, `--fs-display` clamp 36 to 56px.
- Post prose: 18px from 768px, 17px below, line-height 1.7, `text-wrap: pretty`, measure `--measure` (600px, about 70 characters). Post titles use their own step (32 to 44px, max 24ch) because post titles run to 80 characters; page titles use the display size with the section square.
- Emphasis in prose (`em`, `i`, `cite`) is italic in body ink. Onest has no italic face, so the browser slants the roman (`font-synthesis-style: auto`). A paragraph that is emphasis from end to end gets `p-aside` from `post.html` and sets in `--ink-2` as an aside.
- Sentence case everywhere, no all-caps labels, no "A · B · C" strings: separate spans with space, or a sentence.
- Post code blocks set at `--fs-sm` (15px), not the 13px mono minimum: in several posts the code is the payload.
- Paragraph gap in prose is 1.3em against a 1.7 leading, so paragraphs read as separate blocks on a phone.
- "The short version": a post with `tldr:` front matter (2 to 4 plain strings) gets a findings block above the contents, on `--surface` with a `--line` hairline, label in `--ink-3`, items in body ink. No hue.
- Key line: one paragraph per post marked `{:.key}` sets at weight 500 behind a 2px `--line` rule. Hairline, not hue, not amber.

## Layout

- Container `.wrap`: max 72rem, gutter `clamp(16px, 4vw, 48px)`. The title's left edge is the same on every non-home page (192px at 1440), so moving between sections never shifts the page.
- Reading measure `--measure` 37.5rem. Code, tables and figures may grow to `--wide` 48rem; on evidence pages (`c-doc`) to `--wide-doc` 60rem. They grow to the right only.
- Posts with four or more h2s get a contents list: a sticky rail to the right of the 48rem column from 1280px, a closed `<details>` under the meta row below.
- Below 768px the status line is static at the end of the page, the top nav wraps under the path, list rows put the date above the title, and the pager stacks.
- No page scrolls sideways at 390px; wide tables and code scroll inside their own box with a scroll-shadow edge cue, and a table's first column stays put.

## Elevation & Depth

Three shadows (`--shadow-sm` chips and controls, `--shadow-md` popovers and open panels, `--shadow-lg` drawers and the palette only), neutral, never coloured. In the dark theme elevation is one surface step lighter plus a 1px top highlight. Lists and cards on the blog side use `--surface` and a hairline, not shadows.

## Shapes

Radii `--r-sm` 10px (small controls), `--r-md` 14px (rows, code, cards), `--r-lg` 18px (listings, panels, the prompt, doors), pills for chips. Topic shapes: circle postgres, square reliability, diamond security, hexagon platform, triangle ai, ring other.

## Components

- Top nav (`command/topnav.html`): `payal@payalsingh.me:~/<path>` in mono, the path in the section hue, and Home, Talks, Writing, CV with `aria-current` and a 2px hue underline on the current section. Every page but home.
- Status line (`command/statusline.html`): mirrors the path (a nested path keeps its last segment on phones), then Search, Keys and Theme, which need JavaScript and stay hidden until it runs.
- Palette and keys sheet (`command/dialogs.html`, `command/search-index.html`): the same index on every page (talk families, posts, sections, actions, links). Off the home page a pick navigates. Posts show date and series part, not reading minutes, because a post page renders the index while later posts are still unrendered.
- Colophon (`command/colophon.html`): licence, source, RSS and email as separate links. Every page but home.
- Listing and link rows (`command/post-list.html`): `/blog/` and each tag on `/blog/topics/`. The title link's `::after` covers the row, so the row is the target; hover (fine pointer) and keyboard focus raise it and nudge it 4px. `li[data-topic]` inside `[data-list]` gets the topic filter from `command.js`.
- Post (`_layouts/post.html`): title, subtitle, a meta row (mono date, minutes, topic tag, series part linking to `#series`), the contents list, the body in `.prose`, then a pager of two cards (Newer, Older). Every h2 gets an empty self-link whose `#` glyph is CSS, so the article text stays the post's text.
- Post footer (`_includes/post-footer.html`, included from each post): "Tagged" plus links to `/blog/topics/#<tag>`, then for a series the card: every part in order, the current one marked `aria-current` with an amber inset bar and not a link.
- Prose (`.prose`): lists, links (ink with a hue underline that thickens on hover), inline code on `--surface`, code blocks, tables with a sticky first column, blockquotes, figures, hr, kramdown footnotes (44px hit areas on coarse pointers).
- Reading years: `<details>` per year, the latest open, a chevron that turns; the page's own script folds older years on phones.
- 404: says there is nothing at the requested path (filled in by JavaScript with `textContent`, "this address" without it), one mono prompt echo, a Search button that opens the palette, and links to Talks, Writing, CV and Home.
- Focus: every interactive element shows a 2px `--ring` outline with a 2px offset (row targets draw it inside the row).

## Do's and Don'ts

- Do give a new page `layout: page` (or a layout on top of `command`) and a `c_section`; it inherits the shell, the theme and the palette.
- Do keep hue to the section and amber to state. Don't colour a topic, a year or a kind of thing.
- Do use 44px targets on coarse pointers and gate hover effects behind `(hover: hover) and (pointer: fine)`.
- Don't add third-party requests; fonts and icons are local.
- Don't edit `_posts/` or `evidence/` to change presentation; the layouts and `command.css` own it.

## Motion

Press and hover 120ms, row expand 180ms, drawer 260ms (`--ease-out`, `--ease-drawer`), nothing over 300ms, never `transition: all`. The palette and anything keyboard-invoked do not animate. Nothing moves on page load. Under `prefers-reduced-motion: reduce` transforms are off (row nudges, press scale, drawer slide) and only opacity crosses; under `prefers-reduced-transparency: reduce` the status line is opaque.

## Favicon

`favicon.svg` is a 32 by 32 rounded square in `#100e0c` with a prompt chevron and a filled block cursor in `#e9e4dd`. `favicon.ico` holds PNG-encoded 16, 32 and 48px renders of the same SVG. `apple-touch-icon.png` is a 180px render of the square (unrounded) variant, since iOS masks its own corners. `_includes/head-meta.html` links all three.

To regenerate after editing the SVG: rasterise it at 16, 32, 48 and 180px with headless Chromium (set the SVG's `width`/`height` to the target size in a blank page and screenshot the viewport with `omitBackground`; `qlmanage` keeps the SVG's intrinsic 32px inside a larger canvas, so it does not work for the bigger sizes), then pack the 16, 32 and 48px PNGs into the ICO (a 6-byte header, one 16-byte directory entry per image, then the PNG bytes).
