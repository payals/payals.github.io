> Superseded by `DESIGN.md` at the repo root as of 2026-09-01. Kept for history; do not use these values. `motion.md` stays authoritative.

# Panel Mockups — payals.github.io

## Conventions

- `[ ]` = interactive element (button, link)
- `───` = horizontal rule (border-dim color)
- `▸` = accent-colored label prefix
- `·` = separator in metadata lines
- All panels: `background: --bg-panel`, `border-top: 2px solid --accent`
- Panel heading row uses mono font; body text uses prose font stack
- Max panel width: 720px (same as content column)

---

## cat about

```
┌──────────────────────────────────────────────────────────────────┐
│  ▸ about                                              [× close]  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  Payal Singh                                                     │
│  ──────────────────────────────────────────────                  │
│  Researcher and engineer working at the intersection of AI       │
│  systems, software, and markets. I write about what I build,     │
│  what I read, and what surprises me.                             │
│                                                                  │
│  Currently: [placeholder — Pi to fill]                           │
│  Previously: [placeholder]                                       │
│  Writing at: makeworld.dev                                       │
│                                                                  │
│  ▸ find me                                                       │
│  ─────────────────────────────────────                           │
│  [ github ]   [ linkedin ]   [ medium ]   [ email ]             │
│                                                                  │
│  ▸ interests                                                     │
│  ─────────────────────────────────────                           │
│  AI · inference systems · research workflows                     │
│  markets · epistemics · tools for thought                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Notes:
- Bio text is `about.md` rendered by a tiny inline markdown parser (no deps).
- Social links are chips that mirror the main chip row — same style.
- `[× close]` dismisses the panel (sets `display: none`, no animation on close).
- "Currently / Previously" fields are plain text in `about.md`.

---

## cat now

```
┌──────────────────────────────────────────────────────────────────┐
│  ▸ now                          last updated: 2026-05  [× close] │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  ▸ what's true this month                                        │
│  ─────────────────────────────────────                           │
│  [hand-edited field from now.json: "what" key]                   │
│  [hand-edited field from now.json: "reading" key]                │
│  [hand-edited field from now.json: "building" key]               │
│                                                                  │
│  ▸ live signals                                                  │
│  ─────────────────────────────────────                           │
│  latest commit  ·  [repo name]  ·  [relative time]              │
│  [commit message, truncated to 72 chars]                         │
│                                                                  │
│  latest post  ·  makeworld.dev                                   │
│  [post title, linked]   [date]                                   │
│                                                                  │
│  ─────────────────────────────────────                           │
│  (live signals unavailable)   ← shown only if API fails          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Notes:
- `now.json` schema: `{ updated, what, reading, building }`. All strings.
- `updated` renders as `last updated: YYYY-MM` in the header row.
- GitHub API: `GET /repos/payals/payals.github.io/commits?per_page=1`.
  Displays `sha[0..7]`, repo name, relative time (`2 days ago`), message.
- RSS: fetches `https://makeworld.dev/feed.xml`, parses first `<item>`.
  Displays `<title>` as a link to `<link>`, plus `<pubDate>`.
- If either API fails: that sub-section shows the fallback note only.
  Hand-edited fields always render regardless.

---

## cat talks

```
┌──────────────────────────────────────────────────────────────────┐
│  ▸ talks                                              [× close]  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ [image or ░░░ stub]  │  │ [image or ░░░ stub]  │             │
│  │                      │  │                      │             │
│  │ Talk title here      │  │ Talk title here      │             │
│  │ venue · date         │  │ venue · date         │             │
│  │ [slides] [video]     │  │ [slides] [video]     │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ [image or ░░░ stub]  │  │ [image or ░░░ stub]  │             │
│  │ Talk title here      │  │ Talk title here      │             │
│  │ venue · date         │  │ venue · date         │             │
│  │ [slides] [video]     │  │ [slides] [video]     │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                  │
│  [load more ↓]  ← only if > 6 talks                             │
└──────────────────────────────────────────────────────────────────┘
```

Notes:
- Grid: `display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem`.
- On mobile: `grid-template-columns: 1fr` (single column).
- Each card: `background: --bg-chip`, `border: 1px solid --border`, `padding: 1rem`.
- Image slot: `aspect-ratio: 16/9`, `object-fit: cover`, `background: --border`
  as fallback color (no image = dark rectangle, still looks intentional).
- `talks.json` schema per item: `{ title, venue, date, slides_url, video_url, image }`.
  `slides_url` and `video_url` are optional — buttons only render if field present.
- `[slides]` and `[video]` are small chip-style buttons in accent color.
- First load shows 6 talks; "load more" reveals the rest (no network call,
  all data already in `talks.json`).

---

## cat resume

```
┌──────────────────────────────────────────────────────────────────┐
│  ▸ resume                                             [× close]  │
│  ─────────────────────────────────────────────────────────────   │
│                                     [ download PDF ↓ ]           │
│                                                                  │
│  Payal Singh                                                     │
│  notes on data, AI, markets, research                            │
│  github · linkedin · email                                       │
│                                                                  │
│  ▸ experience                                                    │
│  ─────────────────────────────────────                           │
│  Role  ·  Company                           YYYY–YYYY            │
│  Short description of what you did here.                         │
│                                                                  │
│  Role  ·  Company                           YYYY–YYYY            │
│  Short description.                                              │
│                                                                  │
│  ▸ education                                                     │
│  ─────────────────────────────────────                           │
│  Degree  ·  Institution                          YYYY            │
│                                                                  │
│  ▸ selected writing & talks                                      │
│  ─────────────────────────────────────                           │
│  makeworld.dev  ·  [selected talk title, linked]                 │
│                                                                  │
│  ─────────────────────────────────────                           │
│  [ download PDF ↓ ]                                              │
└──────────────────────────────────────────────────────────────────┘
```

Notes:
- Content source: `data/resume.md` rendered by the same inline markdown
  renderer used by `about`.
- `[ download PDF ↓ ]` links to `data/resume.pdf` (or is hidden if Pi has
  not provided the file — check file existence at page load, toggle visibility).
- The resume panel uses the prose font stack for body paragraphs (readability
  at longer read length). Headings remain mono.
- Role / date lines use `display: flex; justify-content: space-between` to
  push the date to the right edge.
- No print stylesheet in v1 — the PDF download handles that use case.

---

## Shared Panel Behaviors

| Behavior              | Implementation note                                  |
|-----------------------|------------------------------------------------------|
| Open                  | `opacity 0→1 + translateY(8→0)` in 220ms            |
| Close (`× close`)     | `display: none` instantly (no exit animation)        |
| Multiple open         | Panels stack vertically; each has its own close btn  |
| Same panel re-opened  | Scroll to existing panel, no duplicate               |
| Hash routing          | `/#about` opens `cat about` panel on load            |
| Panel heading color   | `--accent` for the `▸` prefix; `--text` for the name |
| Border top            | `2px solid --accent` — the only accent surface color |
| Separator lines       | `border-bottom: 1px solid --border-dim`              |
