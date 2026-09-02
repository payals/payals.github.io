# Deep Interview Spec: payalsingh.me redesign as an ops console

## Metadata
- Interview ID: di-2026-09-01-site-redesign
- Rounds: 5 (plus Round 0 topology gate)
- Final Ambiguity Score: 16.5%
- Type: brownfield
- Generated: 2026-09-01T20:25:00-07:00
- Threshold: 0.2
- Threshold Source: default
- Initial Context Summarized: no
- Status: PASSED
- Companion brief for Pi (HTML, gitignored): `drafts/site-redesign-brief-2026-09-01.html`
- Evidence: Lighthouse JSON + screenshots captured 2026-09-01 (see brief); repo survey in this spec's Technical Context

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.90 | 0.35 | 0.315 |
| Constraint Clarity | 0.80 | 0.25 | 0.200 |
| Success Criteria | 0.80 | 0.25 | 0.200 |
| Context Clarity | 0.80 | 0.15 | 0.120 |
| **Total Clarity** | | | **0.835** |
| **Ambiguity** | | | **0.165** |

## Topology
| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|--------------------------|
| Landing terminal (`/`) | active | Replace chip-launcher page with an ops-console layout: four always-visible panes (now, talks, writing, cv), one terminal input pane, a status bar | Direction (R2), mobile behavior (R5), palette (R4); acceptance criteria L1–L8 |
| Blog surfaces (`/blog/`, posts, `/blog/topics/`, `/evidence/...`) | active | Replace StartBootstrap Clean Blog remote theme with owned Jekyll layouts sharing the console tokens | Scope (R3); acceptance criteria B1–B5 |
| Shared design system | active | One token file (palette, type, spacing, motion) consumed by both halves; favicon; DESIGN.md | Palette (R4); acceptance criteria D1–D4 |
| Quality fixes | active | Contrast, CLS, post-page a11y, render-blocking third-party assets | Audit-derived; acceptance criteria Q1–Q5 |

## Goal
Make payalsingh.me read as the site of a staff platform engineer to two primary visitors, a hiring manager or founder and a Postgres/AI conference organizer or peer, within 15 seconds and without typing anything, while keeping the terminal as a real, working pane for the visitor who wants to type. The landing becomes an ops console (tmux/htop idiom): every fact that establishes credibility (current role, upcoming and past talks with evidence links, recent writing, CV) is on screen at first paint. The blog and post pages drop the borrowed Bootstrap theme and adopt the same identity. Palette moves from green-on-black to a dark, quiet system with one restrained accent used only for state and focus.

## Constraints
- Static hosting on GitHub Pages from `master`; Jekyll for blog pages only; the landing stays hand-written HTML/CSS/ES modules with no build step and no framework (carried from the prior spec).
- Post URLs (`/blog/:year/:month/:day/:title/`), post front matter, `_posts/*.markdown` content, `data/*.json` schemas (especially `data/talks.json` with `record_type`, `evidence_level`, `status`) are unchanged and load-bearing.
- No third-party runtime requests on any page: no jQuery, Bootstrap, FontAwesome, Google Fonts, analytics.
- Dark only. No light theme this pass; the blog's existing light/dark toggle is removed with the theme.
- Fonts: free, OFL-licensed, self-hosted woff2 subsets with `font-display: swap`, or system stacks. No paid faces (assumption; Berkeley Mono is the obvious paid upgrade if Pi wants it later).
- Motion follows `.omc/design/motion.md`: boot ≤800ms, one theatric, cursor blink is the only loop, `prefers-reduced-motion` honored in CSS and JS.
- No CRT scanlines, glow, curvature, flicker, embedded games (carried vetoes from the prior spec; confirmed by realism research).
- Performance budget: landing ≤150KB gzipped total transfer including fonts; post page ≤200KB. (Prior spec said 100KB with no web fonts; raised to fund one mono face. The current post page ships roughly 300KB+ of theme assets, so this is still a large cut.)
- Root-level Jekyll pages must use the `.markdown` extension (`_config.yml` `markdown_ext`).
- Keep existing hash deep links working: `#about`, `#now`, `#talks`, `#cv`.

## Non-Goals
- Light theme or theme toggle.
- CRT/retro effects, games, scroll-triggered animation libraries.
- Rewriting post content, CV content, or talks records.
- Resume builder, talks scraper, analytics, comments, search.
- Migrating to React, Astro, or any build pipeline beyond Jekyll.
- Changing the domain, URL scheme, or RSS feed path.

## Acceptance Criteria

### Landing (L)
- [ ] L1. At viewport ≥1024px, `/` shows, without any interaction: header (name, one-line positioning), four panes titled `now`, `talks`, `writing`, `cv`, one terminal pane with prompt, and a status bar. Verified by full-page screenshot at 1440×900.
- [ ] L2. `.chip-list` and chip buttons are gone. Navigation is the status bar (keys `0`–`4` and click) plus typed commands. Pressing `0`–`4` while the input is not focused scrolls to and focuses the matching pane.
- [ ] L3. Terminal pane: prompt reads `payal@payalsingh.me:~$`; a blinking block cursor is visible on the input row (current rule `.terminal-input-row .cursor{display:none}` removed); `↑`/`↓` history and `Tab` completion work (already in `assets/js/terminal.js`); unknown command prints `bash: <cmd>: command not found` plus a did-you-mean when Levenshtein distance ≤2 to a known command.
- [ ] L4. Typed command output appends inside the terminal pane's own scrollback. The scrollback is not capped at 160–260px; it fills the pane and scrolls internally at pane height on desktop, grows with content on mobile.
- [ ] L5. At 390×844, panes stack in status-bar order (now, talks, writing, cv), the status bar is sticky at the bottom, the terminal input sits directly above it, and a full-page screenshot shows no clipped or overlapped text.
- [ ] L6. Boot sequence completes in ≤800ms, any key or click skips it, reduced-motion renders the ready state immediately.
- [ ] L7. `#now`, `#talks`, `#cv`, `#about` deep links scroll to and focus the matching pane (`#about` targets the header/positioning block).
- [ ] L8. Talks pane renders from `data/talks.json` honoring `status: upcoming` first, then by date desc, showing the evidence link per record; the "load more" focus management in `panels.js` is preserved or reimplemented.

### Blog (B)
- [ ] B1. `_config.yml` has no `remote_theme`; `_layouts/default.html`, `post.html`, `page.html`, and a blog index layout exist in the repo; `_includes/head.html` loads only local CSS and the self-hosted fonts.
- [ ] B2. Chrome DevTools network panel on `/blog/` and on a post shows zero requests to third-party origins.
- [ ] B3. All existing post URLs return 200 with unchanged paths; `feed.xml` and `sitemap.xml` still generate; series nav and tag footer from `_includes/post-footer.html` still render.
- [ ] B4. Post body column is 65–75ch wide, body face is the sans token, headings and metadata are the mono token, code blocks use the mono token with the console surface color.
- [ ] B5. Lighthouse mobile on a post page: accessibility ≥95, `html[lang]` set, exactly one `<main>`, in-text links distinguishable by underline (not color alone).

### Design system (D)
- [ ] D1. One token stylesheet (`assets/css/tokens.css`) is imported by both `index.html` and the Jekyll default layout. No green primary. Tokens (proposed, contrast script-verified against `#0b0d10`): `--bg #0b0d10`, `--surface #12151a`, `--line #232830`, `--ink #e6e8eb` (15.9:1), `--ink-2 #9aa3ad` (7.6:1), `--ink-3 #7a8590` (≥4.5:1), `--accent #d9a441` amber (8.7:1) for focus/state only, `--ok #8fbf8f`, `--err #d76c6c` (5.8:1).
- [ ] D2. A script (`scripts/check-contrast.py` or equivalent) asserts every text token ≥4.5:1 against every surface it is used on; runs green.
- [ ] D3. `favicon.svg` plus `favicon.ico` and `apple-touch-icon.png` exist and are linked from both heads; console shows no 404.
- [ ] D4. `DESIGN.md` at the repo root documents tokens, type scale, spacing, motion, in the awesome-design-md format; `.omc/design/*.md` marked superseded.

### Quality (Q)
- [ ] Q1. Lighthouse CLS ≤0.05 on `/` desktop and mobile (currently 0.098 / 0.274): portrait and pane containers have reserved dimensions, fonts use `size-adjust` or system fallback metrics.
- [ ] Q2. Footer and placeholder text ≥4.5:1 (currently 2.26:1).
- [ ] Q3. Post page ships no render-blocking third-party script or stylesheet.
- [ ] Q4. Zero console errors on `/`, `/blog/`, a post, `/blog/topics/`, `/404`.
- [ ] Q5. Total transfer ≤150KB gz for `/` and ≤200KB gz for a post (measured in DevTools with cache disabled).

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| The site's job is "minimal blog" (wiki open question since May) | R1 asked for the 15-second visitor outcome | Hiring signal and peer/organizer trust lead; writing byline and craft demo are secondary |
| Chip wrapping is a CSS bug | Survey showed `flex-wrap` with no fixed widths | It is a layout decision; chips are removed entirely by the console direction |
| "Real terminal" means more shell simulation | R2 offered a full shell vs a console | Console chosen: content visible without typing; the terminal is one pane, not the container |
| The Clean Blog theme can be re-skinned | R3 asked how far to go | Theme replaced with owned layouts |
| Green on near-black is the brand | R4 (contrarian) named it a default AI look | Dark stays; green primary retired; one restrained accent for state only |
| Four panes need tabs on mobile | R5 offered stack / tabs / accordion / terminal-only | Stack in status-bar order with sticky bottom bar |
| Prior spec's "delete Jekyll" still applies | Survey found 10 posts through 2026-09-01 | Jekyll stays for the blog; landing stays no-build |
| Web fonts are a concession (prior typography.md) | Design research on type carrying identity | One self-hosted OFL mono is allowed; budget raised to 150KB |

## Technical Context
- Two disconnected design systems today. Landing: `index.html` + `assets/css/terminal.css` (1002 lines) + ES modules `assets/js/{boot,terminal,commands,panels,portrait,now,main}.js`. Blog: `remote_theme: StartBootstrap/startbootstrap-clean-blog-jekyll` with `assets/css/overrides.scss` dark override, `_includes/{head,navbar,scripts,post-footer}.html`. `_layouts/home.html` is dead code.
- Terminal already implements history and tab completion (`terminal.js:17-124`). Block cursor exists (`terminal.css:305-324`) but is hidden on the input row (`terminal.css:315`). Scrollback capped (`terminal.css:214-221`, 938-940, 980-982). Panels switch to `--font-prose` (`terminal.css:485-491`, 620-624, 651-657).
- Prior design docs in `.omc/design/`: `palette.md`, `typography.md`, `layout.md`, `motion.md`, `panel-mockups.md`, `aesthetic-rationale.md`, `ascii-motif.md`. Motion doc remains authoritative; palette/typography/layout are superseded by this spec.
- Data: `data/now.json` (reading, shipping, state, updated), `data/talks.json` (15 records; schema documented in `data/talks.README.md`), `data/about.md`, `data/cv.md`, `data/cv.pdf`.
- Audit baseline 2026-09-01 (Lighthouse via chrome-devtools MCP): home desktop a11y 96 / mobile 96, CLS 0.098 / 0.274, footer contrast 2.26:1; post mobile a11y 79 (missing lang, no main, navbar toggler contrast 1.66, unnamed icon link, links by color only), agentic-browsing 50. Favicon 404 on every page.
- Breakpoints today: 481px and 1024px only. New layout needs a tablet step (~768px) for the 2×2 grid to collapse to 1 column.
- Assess/redesign tooling available locally: chrome-devtools MCP (`lighthouse_audit`, a11y-debugging and debug-optimize-lcp skills), Playwright MCP for screenshots, `frontend-design` plugin skill (anti-default calibration), `web-design-guidelines` (Vercel rules, needs network), `design-md` (DESIGN.md lint), `visual-verdict` (screenshot vs reference loop), `design` canvas for an editable mockup.

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| Visitor | core domain | role (hiring, organizer/peer, reader, tinkerer), device | Visitor scans Panes; Visitor may type in Terminal |
| Landing | core domain | header, panes[], terminal, status bar | Landing contains 4 Panes + Terminal + StatusBar |
| Pane | core domain | id (now/talks/writing/cv), title, source, order | Pane renders data (now.json, talks.json, posts, cv.md); StatusBar key targets Pane |
| Terminal | core domain | prompt, scrollback, history, completions | Terminal is a Pane; commands focus Panes or print inside Terminal |
| StatusBar | supporting | keys 0–4, help hint | StatusBar navigates Panes; sticky on mobile |
| Now | supporting | reading, shipping, state, updated | Now feeds the now Pane |
| Talks | supporting | record_type, evidence_level, status, date, links | Talks feeds the talks Pane and CV |
| Post | core domain | title, subtitle, date, tags, series, body | Post listed in writing Pane; rendered by Layout |
| Blog | core domain | index, topics, feed | Blog groups Posts; uses Layout |
| Layout | supporting | default, post, page, index | Layout applies DesignTokens to Blog pages |
| CV | supporting | cv.md, cv.pdf | CV feeds the cv Pane; PDF download |
| DesignTokens | supporting | palette, type, spacing, motion | DesignTokens consumed by Landing and Layout |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 10 | 10 | - | - | - |
| 2 | 11 | 2 (StatusBar, Now) | 1 (Chip+Panel→Pane) | 8 | 82% |
| 3 | 12 | 1 (Layout) | 0 | 11 | 92% |
| 4 | 12 | 0 | 0 | 12 | 100% |
| 5 | 12 | 0 | 0 | 12 | 100% |

## Interview Transcript
<details>
<summary>Full Q&A (5 rounds + topology gate)</summary>

### Round 0 (topology)
**Q:** Four components: landing terminal, blog surfaces, shared design system, quality fixes. Right?
**A:** Looks right, all four.

### Round 1
**Q:** Picture the visitor you most want to impress. 15 seconds. What should have happened?
**A:** Mix of hiring signal and peer/organizer trust, but also writing byline and craft demonstration.
**Ambiguity:** 60.5% (Goal 0.45, Constraints 0.35, Criteria 0.15, Context 0.75)

### Round 2
**Q:** Four directions: ops console, real shell restrained, editorial mono, two-mode. Which would you send to a hiring manager and a PGCon organizer?
**A:** Ops console.
**Ambiguity:** 41.8% (Goal 0.70, Constraints 0.40, Criteria 0.50, Context 0.75)

### Round 3
**Q:** Blog runs on Clean Blog (Lora, Open Sans, jQuery, Bootstrap, FontAwesome). How far may I go?
**A:** Replace the theme.
**Ambiguity:** 30.0% (Goal 0.80, Constraints 0.60, Criteria 0.60, Context 0.80)

### Round 4 (contrarian)
**Q:** What if near-black with green is the indie tell? Which palette constraint?
**A:** Dark, quieter accent.
**Ambiguity:** 23.3% (Goal 0.85, Constraints 0.75, Criteria 0.65, Context 0.80)

### Round 5
**Q:** On a 390px phone, what should the four panes do?
**A:** Stack in status-bar order.
**Ambiguity:** 16.5% (Goal 0.90, Constraints 0.80, Criteria 0.80, Context 0.80)
</details>
