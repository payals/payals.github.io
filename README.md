# payals.github.io

Source for <https://payalsingh.me>. Terminal landing at `/` (vanilla HTML + CSS + ES modules, passed through Jekyll unchanged) plus a Jekyll-rendered blog at `/blog/`.

---

## Editing content

All hand-edited content lives in `data/` and `assets/img/`:

| File | What it controls |
|------|-----------------|
| `data/now.json` | "What's true this month" widget — `reading`, `shipping`, `city`, `updated` fields |
| `data/talks.json` | Ordered sourced speaking records followed by clearly labeled archive leads; see `data/talks.README.md` |
| `data/about.md` | Bio panel content (rendered as markdown in the `about` panel) |
| `data/cv.md` | CV panel content |
| `data/cv.pdf` | CV download; enables the panel download button when present |
| `assets/img/portrait.txt` | ASCII portrait displayed in the header |

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

Single HTML entry point (`index.html`) with a fake-but-functional terminal
as the navigation metaphor. Visitors can type commands or click chip buttons.
Rich content renders as panels below the terminal. A boot sequence plays
on first load (~0.8 s, skippable). An ASCII portrait draws line-by-line
during boot.

JS is split into ES modules under `assets/js/`: `main.js` wires everything,
`terminal.js` handles input/history/tab-complete, `boot.js` runs the boot
sequence, `portrait.js` animates the portrait, `panels.js` renders content
panels, `now.js` fetches live signals, and `commands.js` holds the command
registry.

Full design rationale and acceptance criteria:
[`.omc/specs/deep-interview-ghpages-terminal-landing.md`](.omc/specs/deep-interview-ghpages-terminal-landing.md)
