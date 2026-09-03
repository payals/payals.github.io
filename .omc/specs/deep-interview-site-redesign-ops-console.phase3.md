# Phase 3 brief: data portrait grafts and the links row

Supplements the base spec and the phase-2 brief. Runs after phase 2 is committed. Source of the decisions: Payal viewed the concept gallery on 2026-09-03 and said she likes the data-portrait prototype a lot, except its lower links section which is too wide; other prototypes do it better with one line above the status bar; and she loves the one-keystroke search (already in phase 2).

Reference prototype: `scratchpad/concepts/data-portrait/` (index.html, CONCEPT.md, shots/). Links-row reference: `scratchpad/concepts/command-palette/shots/desktop-1440x900.png` (the `[4] links` line directly above the status bar).

## Decisions

| Topic | Decision |
|---|---|
| Charts | Every pane gains the data-portrait chart above its list: now = LED row plus career-uptime line; talks = timeline strip; writing = day calendar plus reading-time bar per row; cv = three lanes on one axis plus summary line. The full record lists stay under every chart, so the page reads identically with charts ignored. |
| Topic palette and filter | A topic legend bar under the topbar (chips with shape, color, count). Pressing a topic, or `filter <topic>` in the terminal, dims every non-matching mark, LED, bar, cell and row across all panes; `esc` or `filter off` clears. Topic identity is never color alone (shape plus text). |
| Links | The links pane becomes one compact line directly above the status bar, inside the console frame: `[4] links` label then the eight links inline, wrapping only below 768px. No bordered pane, no tall cell. Key `4` and `#links` still target it. |
| Color budget | Three color dimensions now coexist: topic hues (charts, LEDs, legend, row marks only), kind hues from phase 2 (pane key chips, statusbar keys, palette badges, terminal prefixes), year temperature (date columns), amber (state). The architect must look at the combined page and reduce, in this order, if it reads loud: drop kind hue from pane key chips (keep on palette badges and statusbar), then mute year temperature to two anchors. Body text stays neutral ink; every text token at or above 4.5:1. |
| Data source for topics | No edits to data/talks.json or posts. Add `data/topics.json`: a hand-authored map from talk id and post slug to one topic in {postgres, reliability, security, platform, ai, other}, each entry with a one-line reason (title keyword or tag). Posts may also derive from tags via a mapping table in the same file. |

## Feature definitions

### T. Topic legend and filter
- T1. Legend bar under the topbar with one chip per topic that has at least one record: shape glyph, name, count; `aria-pressed`; `esc` clears; polite live region announces "showing N talks and M posts about security" and "filter cleared".
- T2. Filter dims non-matching marks to 0.28 opacity and non-matching list rows to 0.55 opacity (text stays above 4.5:1 since the dim is on the row container and links keep full ink on hover/focus); never dims the terminal, the topbar, or the status bar.
- T3. Terminal: `filter <topic>` and `filter off`; tab completion on topic names; the palette (phase 2) gets a "topic" kind whose entries apply the filter.
- T4. Filter state is reflected in the hash (`#topic=security`) and restored on load; the scrubber (phase 2) and the filter compose (a year plus a topic).

### N. Now pane
- N1. First row: `career uptime 13y 7m since 2013, all of it around Postgres` computed from the cv start year at load (no ticker).
- N2. Each fact row carries an LED in its topic color with a shape glyph; the speaking row's LED is the upcoming talk's topic.

### TL. Talks timeline
- TL1. A strip above the list, axis 2014 to 2027, one mark per sourced talk, shape and color by topic, lanes when dates collide, archive leads as hollow marks on a dashed span under the axis.
- TL2. Pointer over the strip shows a year-month hairline in amber, mirrored into the cv lanes; hover or focus on a mark shows a tooltip (title, venue, date, topic, evidence caveat); marks are native buttons with full `aria-label`, roving tabindex, arrow keys, Home, End; Enter or click highlights and scrolls to the matching row.

### W. Writing calendar
- W1. A GitHub-style calendar from the first post month to the current month, one cell per day, colored by topic and shaded by reading length (three steps with a legend), a count badge when two posts share a day.
- W2. Cells have the same hover, focus, arrow-key and click behavior as timeline marks, landing on the post row. Each post row gains a reading-time bar proportional to minutes.

### CV. CV lanes
- CV1. Three lanes on one shared 2013 to 2027 axis: roles as a stacked bar (segment per role, labelled), talks as ticks, posts as ticks; a summary line: years, sourced talks, posts, speaking years, computed from data.
- CV2. Role segments have tooltips on hover or focus and click highlights the role row.

### LK. Links row
- LK1. One line inside the console frame directly above the status bar: `[4] links` then github, codeberg, linkedin, medium, older, email, rss as `name/handle` links; at or above 768px it never wraps; below 768px it wraps to at most two lines. No pane border; a top rule only.
- LK2. Key `4`, `#links`, the statusbar item, and the palette entry all focus the row.

### K3. Color reconciliation
- K3a. Topic palette (colorblind-safe, from the prototype, contrast on the phase-2 surfaces re-verified by `scripts/check-contrast.py`): postgres blue circle, reliability green square, security red diamond, platform pink hexagon, ai violet triangle, other grey ring. No yellow or orange, so amber stays unmistakable.
- K3b. DESIGN.md gains the topic table and the three-dimension rule.

## Terminal and scrubber (from the narrative-boot prototype, user's favourite terminal)

Payal on 2026-09-03: "terminal I liked the narrative boot terminal the best", "the top scroll bar in narrative boot I can slide to see I was doing what at which year", "the extreme right side of the slide should show all instead of just 2026". Reference: `scratchpad/concepts/narrative-boot/shots/home-1440x900.png` and its index.html.

### TB. Terminal presentation
- TB1. The career log in the terminal renders as a two-column log like the prototype: a date column in year temperature (`2026-03`), a kind column in its kind hue (`talk`, `post`, `role`, `next`), then wrapped text; posts and talks are links in the log. The pane title reads `terminal` with the hint `boot log is the career log. type help`.
- TB2. The log ends with the summary line `[ ok ] ready. 13 years, 12 sourced talks, 8 posts.` (numbers computed) and the hint `type help, replay, or drag the timeline.` The ready state still lands at or under 800ms (base L6); the log may keep printing after ready under 2s total (phase-2 arbitration).
- TB3. `replay` reprints the log; `t` focuses the timeline slider; the status bar lists `t timeline`.

### SB. Scrubber refinements
- SB1. The slider lives in the topbar, labelled `2013` at the left and `now` at the right (not `2026`). The rightmost position is the live state and shows everything; every other position shows the console as of that year (role at that time, talks and posts up to that year, `now` replaced by the year's then-fact from `data/timeline.json` or hidden).
- SB2. While scrubbed, a persistent line in the status bar reads `as of 2018: 4 talks, 0 posts, Senior Database Reliability Engineer. back to now` with `back to now` as a control; `esc` also returns to now. The hash carries `#2018`; loading it opens the console as of 2018 with that banner visible.
- SB3. Keyboard: `t` focuses the slider, arrows step a year, Home is 2013, End is now; the log lines beyond the scrubbed year dim rather than disappear. Reduced motion: no transitions.
- SB4. The scrubber composes with the topic filter (phase 3 T4) and with charts: timeline marks, calendar cells, and cv lanes beyond the scrubbed year dim too.

## Delegation

Payal on 2026-09-03: use dynamic workflows and delegate subtasks to Codex (codex plugin) or other models best suited; Fable is the manager and the responsible party for final verification. Implementation workers for charts, filter, terminal and scrubber go to Codex through `codex:codex-rescue` (foreground `task --write`); architecture, integration, adversarial verification and code review stay on Claude; a Codex `adversarial-review` of the working tree runs before commit as the second-family check; the session owner (Fable) does the final verification pass and commits.

## Acceptance
- [ ] T1-T4, N1-N2, TL1-TL2, W1-W2, CV1-CV2, LK1-LK2, K3a-K3b, TB1-TB3, SB1-SB4 each shown with a screenshot or console evidence at 1440x900 and 390x844.
- [ ] Base groups L, B, D, Q and phase-2 groups Z, P, B, K still pass (regression verifier).
- [ ] Lighthouse accessibility on `/` at or above 95 desktop and mobile; every chart control keyboard reachable with a full accessible name; reduced motion: no transitions, hairline still works.
- [ ] Landing transfer at or under 150KB gzipped; zero third-party requests; zero console errors.
- [ ] Four panes plus terminal plus links row plus status bar fit in 1440x900 without page scroll (charts must not push the record lists out of the pane; pane bodies scroll internally).
