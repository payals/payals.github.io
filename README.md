# payals.github.io

Source for <https://payalsingh.me>. Console landing at `/` (one Jekyll-rendered HTML page, hand-written CSS, ES modules) plus a Jekyll-rendered blog at `/blog/`.

---

## Editing content

All hand-edited content lives in `data/` and `assets/img/`:

| File | What it controls |
|------|-----------------|
| `data/now.json` | The `now` pane: `reading`, `shipping`, `state`, `updated` fields |
| `data/talks.json` | Ordered sourced speaking records followed by clearly labeled archive leads; see `data/talks.README.md` |
| `data/about.md` | Positioning text under the header; printed by the `about` command |
| `data/cv.md` | The `cv` pane; printed by the `cv` command |
| `data/cv.pdf` | CV download linked from the `cv` pane |
| `assets/img/portrait.txt` | ASCII portrait printed by the `portrait` command |

---

## Local preview

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. No install, no build.

## Talk evidence

`_talk-evidence/` is the private provenance archive for sourced speaking records and is excluded from Jekyll output. Its manifest maps public records to official event pages and available archive snapshots. Validate the records with `node scripts/verify-talk-records.mjs` after changing talk data or evidence.

---

## Architecture

Single entry point (`index.html`) laid out as an ops console: four panes
(`now`, `talks`, `writing`, `cv`) rendered by Jekyll from `data/` and
`_posts/` at build time, one terminal pane, and a status bar whose keys
`0` to `4` jump between panes. A boot sequence plays in the terminal pane on
first load (at most 0.8 s, skippable, skipped under reduced motion).

JS is split into ES modules under `assets/js/`: `main.js` wires everything,
`terminal.js` handles input, history, tab completion and the block cursor,
`boot.js` runs the boot sequence, `panes.js` handles pane navigation and
focus, `mdlines.js` turns `data/*.md` into scrollback lines, and
`commands.js` holds the command registry.

Design tokens, type scale, spacing, and components: [`DESIGN.md`](DESIGN.md).
Motion timing: [`.omc/design/motion.md`](.omc/design/motion.md).
Redesign spec and acceptance criteria:
[`.omc/specs/deep-interview-site-redesign-ops-console.md`](.omc/specs/deep-interview-site-redesign-ops-console.md)
