# Deep Interview Spec: Gate consequence, not novelty (yolo-mode + deterministic hooks post)

## Metadata
- Interview ID: 0B4D87CE-F768-44B2-8994-A5AD57F1B82A
- Rounds: 3 (Round 0 topology + 2 scored rounds; Round 2 answer arrived with a mid-turn addition)
- Final Ambiguity Score: ~18%
- Type: brownfield (existing blog, existing series, existing harness evidence)
- Generated: 2026-07-18
- Threshold: 0.2
- Threshold Source: default
- Initial Context Summarized: no (research reports summarized into codebase_context)
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.85 | 0.35 | 0.298 |
| Constraint Clarity | 0.78 | 0.25 | 0.195 |
| Success Criteria | 0.75 | 0.25 | 0.188 |
| Context Clarity | 0.93 | 0.15 | 0.140 |
| **Total Clarity** | | | **0.82** |
| **Ambiguity** | | | **0.18** |

## Topology
| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|--------------------------|
| Blog post | active | payalsingh.me post; third in agents/reliability thread | Covered by all acceptance criteria below |
| Operating-principles artifact | deferred | Separate living principles doc | User (Round 0): principles are framing INSIDE the post, no second artifact |
| Gap-closing harness work | deferred | Missing destructive-op deny hook in ~/.claude | User (Round 0): defer; post may admit the gap |

## Goal
Publish a first-person practitioner essay on payalsingh.me arguing that the correct default for a serious agent environment is full autonomy (dangerously-skip-permissions / yolo / run-everything) with **deterministic hooks as the safety layer**, because:
1. **Permission prompts gate novelty; hooks gate consequence.** Default prompts fire on "new folder / new file / new tool," which is exactly what reasoning and triage produce. They stay silent on familiar-but-fatal actions.
2. **The cybernetic-loop argument (the spine):** an autonomous loop needs its cognitive engine free to triage, reason, and decide if the human is to be removed from that pool. You cannot remove the human if every novel instruction pauses for approval. Instead you place **your custom constraints** — the things you know you never want the LLM to do without your approval.
3. **Prompts are stochastic, hooks are deterministic.** All prompt/rule instructions can be ignored by an LLM; hooks are the gates that cannot.
4. **Hooks are model-invariant; prompts are per-model.** A new model release changes prompt compliance overnight (the sol5.6 story); the deterministic gate lattice is what makes swapping the cognitive engine safe.

The post reframes the debate (option 1), includes a general gate list, and carries a bit of field-notes texture (option 4) from real incidents.

## Constraints
- Evidence scope (Round 1): **both machines, anonymized.** Personal-machine configs (~/.claude, ~/.codex, ~/.cursor) may be described freely. Work-machine material appears only as "on my work machine" patterns: no employer name, no repo names, no quoted internal docs.
- No secrecy framing (durable memory rule): never write "sanitized" / "I keep X private" — omit confidential details silently.
- Voice (napkin + personal-voice-writing skill): first-person practitioner, no em-dashes, exact strings where things are quoted, no AI-slop tells; heavy-LLM-user should not clock it as AI-written.
- Series continuity: links to "Loops I can trust" and "The agent that forged its own grade" (both 2026-07-03); reuse the closed-loop controller framing when introducing the cybernetic-loop argument (same concept, her prior vocabulary).
- Jekyll conventions of the repo: `_posts/YYYY-MM-DD-slug.markdown`, front matter with layout/title/subtitle/author/categories/tags, `{% include post-footer.html %}`, Medium pointer line.
- Honesty rules: no claims that her own harness gates everything (the ~/.claude destructive-op gap is prompt-only today); either admit the gap in her voice or do not claim coverage. No fabricated incidents.
- Publishing (commit/push) is a separate approval step; the deliverable of execution is a reviewed draft.

## Non-Goals
- A separate living operating-principles artifact (deferred).
- Writing the missing ~/.claude destructive-op deny hook (deferred).
- Tool-by-tool tutorial / copy-paste hook code for readers.
- Vendor-bashing: the point is "defaults are wrong for people who build agent harnesses," not "Anthropic/OpenAI/Cursor are wrong to ship safe defaults."

## Acceptance Criteria
- [ ] Draft exists in the repo (drafts/ first; _posts/ on approval) in the repo's Jekyll format with correct front matter, categories `ai`, tags including [ai, agents, reliability, security].
- [ ] Leads with the reframe: permission prompts gate novelty, hooks gate consequence; the tweet thesis appears early (paraphrased or quoted).
- [ ] Contains the cybernetic-loop argument in her framing: removing the human from the triage pool requires an unblocked cognitive engine + custom constraints for the never-without-approval list.
- [ ] Contains a general gate list mapped to her real categories: infra destructive/write commands (tf/aws/gcloud + MCPs), git-commit secrets/PII, prompt injection, reward hacking, package install/update gates.
- [ ] Distinguishes the three verdicts allow / ask / deny, including: ask is for human-decidable cases (secret-scan false positives), and ask must degrade to deny when running headless/unattended (anonymized work-machine lesson).
- [ ] Contains a model-release cautions section: sol5.6 (gpt-5.6-sol) writing files it was told only to read; harness essentially ported ~/.claude → ~/.codex; gates as the model-invariant layer that makes a model swap safe.
- [ ] 1–3 concrete field-note incidents woven in (candidates: curl|bash installer hard-denied; headless ask auto-approve probe; sol5.6 grabby writes; shasum-verified gate refusing to run if tampered).
- [ ] Work-machine material fully anonymized per Constraints; silent omission, no secrecy framing.
- [ ] Passes personal-voice-writing review (no em-dashes, no stock AI phrasing, practitioner tone).
- [ ] Makes no coverage claims contradicted by her real harness (honesty rule).

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| Post + separate principles doc + gap-fix might all be wanted | Round 0 topology gate | Post only; principles inside; gap-work deferred |
| Work-repo material might be unusable publicly | Round 1 evidence question | Usable as anonymized patterns; personal configs freely |
| The post's job might be a how-to | Round 2 | Reframe essay + gate list + light field notes; not a tutorial |
| Tweet framing ("default deny lists") is the full model | Research | Refined to allow/ask/deny keyed on consequence; user endorsed via Round 2 answer |
| Harness fully implements the tweet | ~/.claude research | Destructive-op rule is prompt-only there; post must not overclaim (admit or omit) |

## Technical Context (evidence inventory, from 3 research passes)
**~/.claude (personal):** defaultMode bypassPermissions + skipDangerousModePermissionPrompt; native allow-list of 2, NO deny/ask arrays; ~15 hooks skewing toward completion-honesty (machine-completion-check haiku auditor, persistent-mode anti-stop, correction ledger + replay) and rewrite-safety (rtk exit-code protocol, here.now TTL injection). Gap: destructive-op approval rule is prompt-only.
**~/.codex (personal, gpt-5.6-sol):** approval_policy untrusted + per-project trust_level allowlist; sandbox workspace-write, network off; hooks.json shasum-integrity-checks security-gate.mjs before running it (mismatch → deny); security-gate.mjs (~1500 lines): 168h package age, exact pins, frozen lockfile + --ignore-scripts, 7-registry HTTP allowlist, secret-path exfil deny (~/.ssh, .env, keychains...), protected self-paths (AGENTS.md, config.toml, hooks, rc files), tree-sitter bash parsing; default.rules = 100 pre-approved prefixes (compounding allowlist); safety.rules = 45 allow→prompt clawbacks; AGENTS.md autonomy directive + user safety boundary. PreToolUse matcher `^(Bash|apply_patch|Edit|Write)$` = direct response to sol5.6 writing on read-only instructions.
**~/.cursor (personal):** every lifecycle event (incl. beforeShellExecution, beforeMCPExecution) routed through one external deterministic hook script.
**Work machine (anonymize):** Cursor approvalMode unrestricted + sandbox disabled; fail-closed prod-guard (gates gcloud/terraform/kubectl etc. AND edits to the guard files themselves); allowlist_only_mutations where only the human adds entries and exemptions can never override a prod signal; env detection from real gcloud/kubectl/TF state, not word-matching; DROP/TRUNCATE/destroy always prompt; three secret nets (agent-layer ask, git-native block, nightly denylist unstage) with deliberate fail-open/fail-closed choices; live probe: `ask` auto-approves headless → promoted to deny for unattended workers; curl|bash installer hard-denied in practice.
**Series:** loops-i-can-trust (closed-loop controller, actuator/sensor wall), forged-grade (grader forged via import-time rebind; different-family reviewer). This post = the harness is the wall, prompts are the actuator's suggestions, hooks are the sensor side.

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| Blog post | core deliverable | slug, front matter, sections | third in Series; argues Thesis |
| Permission prompt | concept (antagonist) | fires-on novelty, trains click-through | replaced by Policy verdicts |
| Deterministic hook/gate | core concept | event, matcher, verdict, integrity hash | enforces Custom constraints; model-invariant |
| Policy verdicts | concept | allow / ask / deny; headless ask→deny | keyed on consequence |
| Cognitive engine (agent) | actor | reasoning loop, triage | must stay unblocked inside Cybernetic loop |
| Cybernetic loop | framing | setpoint, sensor, actuator | from prior post (closed-loop controller) |
| Custom constraints | concept | infra writes, secrets/PII, injection, reward hacking, install gates | the never-without-approval list |
| Harness | system | ~/.claude, ~/.codex, ~/.cursor, work stack | ported per Model release |
| Model release | event | behavioral drift (sol5.6 grabby writes) | motivates model-invariant gates |
| Evidence | material | two machines, anonymization rule | grounds field notes |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|-----------------|
| 1 | 8 | 8 | - | - | N/A |
| 2 | 10 | 1 (Model release) | 1 (controller→cybernetic loop) | 8 | ~90% |

## Interview Transcript
<details>
<summary>Q&A (3 rounds)</summary>

### Round 0 (topology)
**Q:** 3 components: post / separate principles artifact / gap-closing hook work?
**A:** Post only. Principles = framing inside. Gap-work deferred; post may admit the gap.

### Round 1 (constraints)
**Q:** Evidence scope: personal configs vs private work-derived repo material?
**A:** Both, anonymized. Work machine as patterns, no employer/repo names/quoted internals.
**Ambiguity:** 32%

### Round 2 (success criteria)
**Q:** Post's job: reframe essay / copyable posture / hybrid / field notes?
**A:** Reframe + general gate list + a bit of field notes. Autonomous loops require triage and reasoning by the cognitive engine in the cybernetic loop if the human is removed from that pool; impossible if every instruction is gated. Place custom constraints instead: destructive/write infra commands, prompt injection, reward hacking, package update gates, git-commit PII.
**Mid-turn addition:** cover model-release cautions: sol5.6 wrote files it was told only to read; whole harness essentially ported ~/.claude → ~/.codex; harness matters a lot.
**Ambiguity:** 18% (threshold 20% met)
</details>
