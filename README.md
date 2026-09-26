# payals.github.io

Source for <https://payalsingh.me>. A command-first site: the home page at `/`, `/talks/`, `/cv/` and the blog at `/blog/` share one Jekyll layout, one hand-written stylesheet and one script.

---

## Editing content

All hand-edited content lives in `data/`, `_posts/` and `_config.yml`; the pages render it with Liquid, so nothing on `/`, `/talks/` or `/cv/` is typed into a template:

| File | What it controls |
|------|-----------------|
| `data/now.json` | The Now door and drawer: `reading`, `reading_url`, `shipping`, `state`, `updated` |
| `data/talks.json` | Ordered sourced speaking records followed by clearly labeled archive leads; see `data/talks.README.md`. The hero shows whichever is freshest: an upcoming talk within 14 days, else the newer of the latest post and latest talk if it is within 45 days, else a further-out upcoming talk (`_includes/command/featured.html`, mirrored at runtime in `command.js`) |
| `data/talk_families.json` | Groups records that are the same talk at several venues into one row (display title and slug); a talk not listed is its own row |
| `data/topics.json` | Topic (and shape glyph) for every talk and post; new posts fall back to `tag_precedence` |
| `data/cv.md` | Roles, independent work, selected writing, speaking note and education on `/cv/` and in the CV drawer; its first role is the hero's "Now" line and its intro's first sentence is the hero lede |
| `data/cv.pdf` | CV download |
| `_config.yml` `profile_links` | Contact chips (plus `email`) and the elsewhere links |

---

## Local preview

```bash
export PATH="$HOME/.rbenv/shims:$PATH"
bundle exec jekyll build --future
cd _site && python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Talk evidence

`_talk-evidence/` is the private provenance archive for sourced speaking records and is excluded from Jekyll output. Its manifest maps public records to official event pages and available archive snapshots. Validate the records with `node scripts/verify-talk-records.mjs` after changing talk data or evidence.

---

## Architecture

Every page uses `_layouts/command.html` (redesign direction C, 2026-09;
the blog, posts, `/reading/`, the evidence pages and the 404 joined it in the
sitewide port). The home page has a hero with the key facts, four door cards (CV, Talks, Blog,
Now), a command prompt, and a status line with `/` search, `?` keys and a
theme toggle. With JavaScript off the four sections render as plain page
content under the doors; `assets/js/command.js` lifts them into drawers
(bottom sheets on phones) and wires the prompt, the palette and the keyboard
layer. Styles and both themes (dark "dusk", light "dawn") live in
`assets/css/command.css`; the two faces are self-hosted under `assets/fonts/`
(SIL OFL, licences alongside). Shared partials are in `_includes/command/`.

The prompt behaves like a shell. Enter consumes the line: it is echoed above
the field as `~$ <line>`, cleared, and kept for the Up arrow; Ctrl-C abandons a
line. Doors, digit keys and the palette echo the command they stand for. Input
is forgiving (case, quotes and trailing punctuation are ignored), a section name
anywhere in a line routes to it with an optional topic ("show me your postgres
talks"), a near miss offers the nearest command with Tab to accept it, and
`cd`, `pwd`, `ls talks`, `ls blog`, `search <text>`, `close` and `history` do
what they say. The output block is always its own row under the prompt; it
never shares a row with the chips.
Run `python3 scripts/check-contrast.py` after changing any colour token.

A post's front matter may carry `tldr:` (a YAML list of 2 to 4 plain strings) for the "short version" block above its contents, and one paragraph may be followed by a `{:.key}` line to set it as the post's key line.

The `post`, `page` and `blog` layouts sit on top of `command.html` and set
its section, kind and prompt path through their front matter (`c_section`,
`c_kind`, `c_path`; `_config.yml` defaults cover `evidence/` and
`/reading/`). Every page but home gets the top nav, the status line, the
palette, the `?` keys sheet, the theme toggle and a colophon. Posts read in
Onest at 18px (17px on phones) at a 600px measure, with a contents list when
a post has four or more sections. The standalone deck under
`talks/pgsummit-2026/` is static files and uses none of this.

Design tokens, type scale, spacing, and components: [`DESIGN.md`](DESIGN.md).
Motion timing: [`.omc/design/motion.md`](.omc/design/motion.md).
Redesign spec and acceptance criteria:
[`.omc/specs/deep-interview-site-redesign-ops-console.md`](.omc/specs/deep-interview-site-redesign-ops-console.md)
