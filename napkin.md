# napkin.md — persistent scratchpad (see global CLAUDE.md protocol)

## Repo Surprises
- 2026-08-28 Public repo hygiene: `.omo/` runtime state and `AGENTS.md` operator notes were not ignored; keep both out because operator notes contain private network details.
- 2026-07-03 `drafts/` (gitignored, untracked) holds the War Stories series plan + per-post outlines; check it before answering "what was the plan" — `_drafts/` does not exist.
- 2026-07-03 ~~Founding incident of the Postgres War Stories series = the freeze-map bug~~ CORRECTED 2026-07-27: it was the 9.3 multixact saga (2014–15) with a fleet-wide minor-version downgrade; freeze-map label was misremembered. Details in `drafts/postgres-war-stories-series-plan.md` under Post 3.

## What Worked
- 2026-08-15 Looper post: four parallel read lanes (before-state / evolution / critique+comparisons / target-project shape) then two independent review lanes (fact+leak, voice) on the draft. Fact lane caught one wrong claim (kill switch already an in-flight brake since 08-12), a 26-vs-18-articles sequencing error, and the single domain-leaking phrase ("trade limits"); voice lane counted ~33 "not X, it is Y" constructions incl. title/headings/last line, and ~2,500 words of unbuilt design in present tense. Both are cheap to run and caught what a self-pass would not.
- 2026-07-29 Part-3 draft: parallel fact-check lane (release-note exact-quote table) + voice-audit lane (calibrated against published parts 1-2, not just the skill's generic caps) caught a PG19-beta overstatement, an unverifiable timing claim, and a two-vs-three bullet miscount before Payal ever read the draft.
- 2026-07-18 Independent critic pass on blog draft caught a config overstatement ("approvals off in Codex" vs real `approval_policy = "untrusted"` + sandbox); verify harness claims against live config files before publish.
- 2026-07-21 Deep-interview for ladder post: spawning field-fact-check + receipts-audit agents at Round 0 (before questions) meant evidence arrived mid-interview; contrarian round caught that ladder order contradicts field record → claim recast as "compression, not order" before drafting.

## Repo Surprises (cont.)
- 2026-08-15 Looper rearchitecture post: draft `drafts/the-agent-is-not-the-system-draft.markdown` + pre-writing brief `drafts/looper-post-brief-2026-08-15.html` (realizations/thesis/arc/corrections + review outcomes). Sources: looper redesign doc 2026-08-15, leverage audit 08-13, research corpus under looper/docs/research/autonomy-2026-08-15/.
- 2026-07-18 post-footer.html renders series nav only when `series:` + `part:` front matter set; the agents/reliability posts (loops, forged-grade, gate-consequence) intentionally use inline links instead.

## Preferences
- 2026-07-03 Series voice rules live in `drafts/postgres-war-stories-2-outline.md` "Voice / style checklist": first-person practitioner, no em-dashes, one canonical link per incident, exact error strings.
