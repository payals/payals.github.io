---
layout: post
title: "The agent is not the system. Postgres is."
subtitle: "An audit of sixteen loops found zero verified autonomous fixes. The rebuild puts every open piece of work in a Postgres row and makes the agents replaceable."
author: Payal
date: 2026-08-15 17:00:00 -0400
categories: [ai, postgres]
tags: [ai, agents, reliability, systems, postgres]
tldr:
  - "Sixteen loops, zero verified autonomous fixes; the fixer skipped as \"needs human\" in 3,196 of 3,446 decisions."
  - "Zero hits for \"campaign\": 3,920 run records, no open objective."
  - "A Postgres row per piece of work, claimed with a fencing token; only a separate verifier can mark it verified."
  - "A plan as of 2026-08-15; the seven-day zero-touch proof has not run."
---

In mid-August I had my agent fleet audit itself: sixteen loops, at least eight of them observe-only, zero verified autonomous fixes. The org chart above those loops had been the summer's main design work. This post is the audit, what it showed was missing, and the rebuild around a Postgres row per piece of work.

*The numbers here come from my own audit and design records as of 2026-08-15. Everything described as a redesign is a plan I have started building and have not proven yet.*

The fleet is Looper, an experimental system I have been building since June for running long-lived autonomous loops against real work. In [July](/blog/2026/07/03/loops-i-can-trust/) I wrote about the control-theory core: every loop is a closed-loop controller, and the actuator must never reach its own sensor. This post is about the layer above that. When I measured the system, what mattered was whatever keeps work alive after an agent disappears. In the rebuild that mechanism is a Postgres schema, and the agents became replaceable workers that Postgres wakes, hands a claim to, and outlives.

## The sensors held; the org chart failed

The June idea was that I own the goals and everything below me is loops: controllers that sense, act, verify and adjust. Each is born from a goal, runs, learns and is retired, and together they would form what I called a civilization. I wrote it a constitution, 18 articles on sensing honesty, independence, containment, lifecycle and the one seat a human never delegates. In August I added eight more articles on warrants: signed, bounded, expiring grants of operational authority that flow from me to project heads to worker loops.

A good part of that has held up. Thinking in terms of an organization gave me:

- separation of powers: the thing that acts never grades itself, and the judge comes from a different model family than the actor;
- jurisdiction: each loop touches a named perimeter and nothing else, least privilege, no monarch;
- escalation as a contract: who is asked, with what evidence, by when, and what happens if nobody answers;
- red lines: money, outward acts, and the ultimate goal stay with me at every level;
- institutional memory: the fleet should learn from its own past, through a form that cannot drift.

The sensing plane, the loops that only watch, held up too. A deterministic sentinel ran against my target repository 45 nights out of 45 with no missed nights, on a hash-chained ledger where each entry carries the hash of the one before it. It caught real defects I would not have caught by hand, including a job that had been silently failing for close to two months. A nightly steward committed accumulated hygiene across several repositories on its own, and its refusals were typed and auditable. Fail-closed held: on the nights the fleet broke, it latched, stopping and staying stopped until a human looked, instead of writing anything bad. Almost every verification and containment article in the constitution is still in force, and I will come back to why that matters.

What did not hold up was the organizational layer on top of that.

## Sixteen loops, zero verified autonomous fixes

By mid-August the fleet had eighteen component directories and a 22-job queue, plus a Postgres control plane for warrants and escalations. It also had a daily journalist, a civilization map, a project-head loop that issued child warrants, a dreamer that improved memory at night, a scorer, an advisor. My notes from that week include a sketch where a prioritizer contacts a "CTO node," which creates a project and a project head. The project head decides how many builder, planner, QA and reviewer loops to launch. It is a coherent org design.

The July post had named the risk in this direction: governance built for loops that do not exist yet. In mid-August I had the system audit itself, evidence-graded, every number copied from a named file. Then I had the result adversarially steel-manned from the position of a skeptic who thought the whole thing was a distraction. That is what the ledger and the reports were built for, and it is the part of the summer I would repeat exactly.

The audit's verdict was "not a waste of time" and "not yet the thing you believe you built": a working nervous system with no immune system, meaning it could sense and could not repair. The numbers behind that verdict:

| What the audit counted | Count |
|---|---|
| Loops counted | 16 |
| Of those, observe-only sensors | 8 or more |
| Of those, never ran at all | 2 |
| Of those, LLM stage never fired | 1 |
| Of those, actuating outside the orchestrator | 3 |
| Verified autonomous red-to-green fixes, fleet-wide | 0 |
| Rows in the governance tables, live a few days earlier: escalations, leases, pruning audits | 0, 0, 0 |
| Fixer runs over six weeks, and successes | 8, 0 |
| Dispatcher decisions that skipped the fixer as "needs human" | 3,196 of 3,446 |
| Orchestrator commits since July, against the three repositories it maintains combined | 127 against 83 |
| Sentinel nights red, in high resolution, nothing acting on it | 43 of 45 |
| Steering entries, first three weeks to the next three | roughly quadrupled |

A long diagnostic session with ChatGPT, given those reports, put it in a way I have not improved on. I had built the institutions of autonomy, hierarchies, warrants, audits, evals, triage, ahead of the metabolism that causes work to happen without me: a sophisticated government that only convenes when the president calls a meeting.

## Most of the controls never bound

The fixer could write patches. Its success predicate could never be satisfied, and the same shape turned up across the fleet.

The fixer ran eight times over six weeks and succeeded zero times. It was skipped as "needs human" in 3,196 of the dispatcher's 3,446 decisions, about 93%, with dark stretches of 7, 10 and 14 nights when it did not run at all. Its own reports show one run clearing two real test-collection errors, and another correctly refusing to fabricate an artifact for a past date because the artifact would have been false. Both were scored red and latched.

Its success predicate needed every sentinel check green at once. Some checks needed a seven-run streak. One was red for a correct external reason. Three of the five failing checks were outside anything the fixer was allowed to touch. The predicate was arithmetically unsatisfiable. It rewarded fabrication and punished honesty: a run that did exactly the right thing got the same red score as a crash.

The "needs human" latch itself was a file. One place in the code wrote it, on any non-zero exit. Nothing anywhere deleted it. A human noticed and removed the file; the latch had bound nothing in the system and had only cost my attention. The same file already contained a timed self-recovery pattern for rate-limit caps. Nobody had applied it to job failure.

The warrant gate that a signed policy document asserted ("no warrant, no engine call") was missing from the script that ran. It had been lost to a git reset, silently, because the one loop that commits everything nightly excluded its own repository from custody.

The child-warrant broker had a lifetime budget of one; the one child was issued, never consumed, and expired eight hours later, after which the issuing function raised "budget exhausted" forever. Two separate human acts were needed to re-arm the only code-fixing actuator in the fleet, and no document said so.

Until an outside review checked, the documented kill switch was admission control: it could prevent the next dispatch and could not stop a job already running. That one got fixed the same day, and it shows the pattern: the control existed, in code and in a runbook, and nobody had asked whether it bound.

The target project had the mirror image. It contained a nightly self-improvement agent, contracted, bounded, dual-provider, scheduled 47 nights in a row. It had launched an engine zero times, because a one-byte enable marker was never created. The audit reported that job as OK every night, because exiting zero by refusing to run is indistinguishable from working.

Its inner search loop had run 3,677 iterations with no promotion in 107 days while its own champion, the current best candidate, re-scored as negative infinity. The halt that should have fired was suppressed by a dev-mode flag; the log said "no longer observe-only" and then did not write the sentinel. Its system audit always exited zero. Four hard limits in the environment template were referenced by no code. In effect the world I was trying to keep healthy had an off switch and no effector, and the off switch was off.

Once I had that list, I stopped seeing separate bugs. The audit counted at least six live instances of the same thing on the Looper side alone:

- a sensor whose failing checks never entered its own error vector: four checks failing, aggregate error reported as 0.0, health true;
- a freshness check that had drifted into measuring whether a string was greppable;
- a quota guard reporting "stale input, gate not binding" since April;
- a deferred-commit script that had never executed once;
- a stall predicate fed hard-coded empty arrays.

I now use a four-step ladder for every mechanism I rely on: does it exist, is it wired into the live path, has it run for real at least once, and does its outcome change what happens next. Exists, wired, exercised, binding. A mechanism is trustworthy at the last step only, and most of the organizational layer stopped at the first or second.

The design rule that fell out is short: no check without a response contract, and no skip without a row. If a sensor can go red, something must own what happens next; if the system decides not to act, that decision has to leave a record.

| Rung | A control that failed this test |
|---|---|
| Exists | The warrant gate: asserted in a signed policy, missing from the script after a git reset |
| Wired | The governance tables: live, nothing required to write through them, zero rows |
| Exercised | The nightly self-improvement agent: scheduled 47 nights, launched zero times, reported OK |
| Binding | The fixer's unsatisfiable predicate; the "needs human" latch only a person ever cleared |

## Work has to outlive the worker

The unit of an autonomous system is a closed loop with a durable object in the middle:

- a desired state;
- an observation of the actual state;
- the gap between them, turned into owned and bounded work;
- an attempt;
- evidence;
- an independent verification;
- a state transition that either closes the work or schedules the next attempt.

Repeat until the world matches the setpoint, the desired state, or the budget is gone. An organization is one way to route and decompose those loops. If the loops do not close, hierarchy above them will not make them close.

I had the loop half of this in June, and the July post is about it. I also had a loop-builder that checked a controller had enough options to cover its inputs and gated out any loop whose error was not shrinking. What I did not have was the durable object.

When I grepped the codebase for the word "campaign," there were zero hits. The dispatcher kept a run ledger, 3,920 records, but nothing survived a run to say "this objective is still open." Every night the fleet re-derived from scratch what it had already learned the night before. That included a set of owner-approved fix briefs, each containing the exact defect and a pre-registered verification spec, written and delivered to nothing.

The elaborate version was a project head with a persona, a fixer with a persona, an advisor, a journalist, warrants down, escalations up, each a resident process with its own prompt and its own memory. The plain version is a table with a row per open piece of work:

- the desired state it serves;
- the observation that opened it;
- its current state;
- who holds the lease and until when;
- attempts made and attempts allowed;
- when it should next be looked at and why it is blocked if it is;
- the acceptance criteria;
- where the evidence lives.

A worker wakes on a clock and claims one row with a conditional update, a single statement that takes the row only if nobody else holds it. It builds its context from the row and the previous attempts, acts in an isolated worktree, records what it did and why as an attempt, and exits. A different process, under a different database role, verifies the result. It checks against a verification bundle: pinned test config, its own copy of the check code, and a mutation canary, meaning a planted defect the checks must catch. The bundle is minted after the commit, and the worker never sees it.

On pass the row waits for the next scheduled observation to confirm; on fail it goes to retry with a failure signature and a rule that the next attempt must differ. If the worker dies mid-attempt, a reaper that does not depend on the dispatcher expires the lease and the row goes back to ready. No process needs the previous conversation; the row and the attempts table are the state.

A campaign row survives a process restart, a model swap, a crash, and my absence. The org chart was my earlier attempt at that property.

[Paperclip](https://github.com/paperclipai/paperclip), the open-source "AI company" control plane, arrived at the same table from the other direction. Its busiest table is issues. Every wake is a durable row with a reason and an idempotency key, so a repeated wake does nothing twice. A checkout is a single conditional update that self-heals when the previous holder is dead. Liveness is computed by counting the durable side effects a run produced; the model is never asked whether it did something.

Its own tracker also records the failure mode I had measured. [A seven-agent company](https://github.com/paperclipai/paperclip/issues/3307) with the backend already written generated 68 issues in 48 hours, mostly audits and triage and none to deploy the product. [Eighteen agents across five companies](https://github.com/paperclipai/paperclip/issues/206) had CEO agents that woke on schedule to say "empty inbox, exiting" while issues sat untouched for twenty hours, a failure that durable work at least makes visible.

## Postgres is the only write path

Most of the design now lives in Postgres, and the lesson is narrower than "use a database." I already had Postgres running a governance schema, for warrants, exercises, escalations, leases. What it lacked was traffic: nothing in the fleet was required to write through it, so those tables sat at zero rows, one more check that did not bind.

The rule is this: the durable state has to be the only path, and every verb the system performs has to be a transition on it. That is the design below, in progress and not yet proven, and I will keep flagging results as they land. Once the single-path rule holds, several things become possible that were out of reach while the civilization lived in prompts, markdown, JSONL files, per-loop directories, and the model's own context.

A model session ends when the context fills, the provider fails or the laptop sleeps; the row does not. When the objective is a row, each of those events costs one attempt, the attempt is recorded, and the objective stays open.

Two drivers once fought over a single job's daily-cap slot and starved it; the fix at the time was a special-case flag. A claim is a conditional update that also stamps a lease expiry and a fencing token, a counter that only ever rises. That turns the class of bug from one a worker has to behave well to avoid into one the schema refuses: a stale worker's late writes carry a stale token and are rejected. When there are more claimers than rows per tick, [`SKIP LOCKED`](https://www.postgresql.org/docs/current/sql-select.html) is the standard queue primitive and it is already in the database.

The list of legal state transitions lives in a table, and a database trigger refuses any transition that is missing from it. "Attempted," "reported complete," "verified," and "confirmed by the next independent observation" are different states with different owners, and no worker can jump from the first to the last. Every suppressed action, whether for budget, quota, dedup, or perimeter, writes a skipped row with a reason, so I can tell a loop that chose not to act from one that never woke.

An intent row precedes the side effect, and a state change without a same-transaction event is rejected. History is append-only and hash-chained. This is the [transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html), and it turns "what did the system try, in what order, and what did it think it knew" into a query over time. Today that question means reading across log files by hand.

With attempts as rows I can ask questions across thousands of executions. A closure is a campaign closed on verified evidence. I can ask how many attempts each closure took by campaign class, meaning the kind of work, and how often a fix was reversed. I can ask the median time to green, and which seat family, meaning which provider's models, closes which failure class. That is also the only honest basis for the org questions I used to answer by intuition. A new role is justified when closed-campaign statistics show a recurring failure class with poor generalist closure and a reusable playbook, and the plan says not before something like fifty closures.

The worker, the verifier, the reaper, the digest I read in the morning, and I at a `psql` prompt all look at the same rows. The digest becomes a projection over the event log, a report computed from the rows with a check that everything in the log is covered, so it cannot drift into a narrator that might omit. Authority rides the same rows. Workers hold no database credential at all; the kernel, the dispatcher core that launches workers, calls narrow stored functions granted per role, and a worker hands back a structured result file.

Two caveats. First, the database does not fence the world. A fencing token stops a stale worker from writing rows; it does not stop it from pushing to a git ref. So the merge is its own narrow actuator that writes an intent, checks the target ref still equals the expected sha, does a compare-and-swap ref update, reads back, and only then records success. Second, I deferred the event-driven parts on purpose. A 15-minute tick plus a reconciler is enough activation for nightly-scale work, and [`LISTEN/NOTIFY`](https://www.postgresql.org/docs/current/sql-notify.html) is a doorbell rather than a memory: registrations die with the session and a reconnecting listener can miss commits. It gets added when a latency corpse justifies it. I looked at [Temporal](https://docs.temporal.io/workflows), [Restate](https://docs.restate.dev/), and [NATS JetStream](https://docs.nats.io/nats-concepts/jetstream) and passed on all three for now, on one criterion: my unit of work is an external CLI subprocess in a worktree that can die independently of the queue, which is a job-queue problem, and none of them is worth a second stateful system on one machine to solve it.

The design is now a persistent state machine with replaceable workers, with two exceptions. The world's side effects live outside the state machine and need their own fencing. Workers are also deliberately non-interchangeable in the review path, because a reviewer must come from a different model family than the author.

## The system stays up while every model sleeps

The corollary that changed the most code is that the model is a component the system calls. The system invokes cognition when a step needs judgment and otherwise leaves it alone.

In the old fleet, every loop was a persistent resident with a name and a persona, and the provider was hard-coded in five places. When one provider's OAuth seat, the logged-in account the loops ran on, died, autonomy died with it for six days.

Three times in six weeks the fleet starved itself of budget. Once the cause was the budget sensor counting my own interactive sessions through the same proxy, so an afternoon of my coding could eat the dreamer's night. On the worst night, a cloud seat returned bad-gateway on every one of its eleven sessions and the stage exited zero with status "ok."

In the design a seat is a row: adapter, provider, exact model, auth mode, billing class, quota pool. The router maps a campaign class to a role to an ordered seat preference list. After two failed attempts the router must change seat family or decomposition, because re-sending the same prompt was a measured corpse, a failure I had already recorded. Context resets per attempt; the handoff is the branch plus the attempts table.

Deterministic playbooks, scripted fixes that need no model, go first. A data-ops campaign's first attempt is a script that re-runs the ingestor and republishes the replica, and a model is invoked only if the playbook fails. Cross-family review is a rule. Only one of the three adapters, the code that drives one provider's CLI, has been exercised against this contract so far; the other two are verified from their flags alone, without a live run.

The model can be transient. The system has to exist while every model is asleep. It has to survive model upgrades, crashes, context loss, provider changes and entire family swaps, which it can if a seat is a row and the objective is a row.

I have two reservations. Transient cognition costs something: every attempt re-derives context, and the price of not remembering is a handoff artifact good enough to reason from, which takes discipline.

Ephemeral workers do not learn. My memory experiment this summer, a nightly loop that mined sessions and wrote lessons, came back negative on the one test that mattered. A written, dated, session-start-loaded lesson produced no change in behavior, and the error rate it targeted went up. What did change behavior was a small hook that fires a checked, precision-measured lesson at the moment of the risky action. Learning in this architecture is a phase-three problem and the part I am least sure about.

## A verdict has to change the next state

I had already decided in June that verification exits the hierarchy. My first instinct, "only a parent loop can verify that a child achieved its goal," died on the grounds that a parent is an LLM and shares lineage with its child. A verification chain ends in a deterministic check, a real-world consequence, or me. That principle held all summer. What was missing was the wiring from a verdict to a consequence.

Two examples beyond the fixer's own predicate. The first proposed verification spec for the redesign was green on a repository that still carried the defect, because test collection passes at one scope and fails at another. The scope dependence surfaced only when an outside critic re-ran both commands in the same minute. A nightly report hard-coded its own mode field as a string literal regardless of the mode it ran in. Sensors that cannot fail make everything upstream of them look fine.

The design is verification-shaped all the way down. A worker's own report never closes a campaign; attempted, reported complete, verified, and confirmed are distinct states. The verifier will run from a clean checkout under a different database role, against a bundle minted after the worker commits and stored outside the branch. The bundle holds pinned test config, its own copy of the check code, and a mutation canary. The worker only ever sees a bundle id.

Repair campaigns may not touch tests, test configuration, or check code. Such diffs fail readiness and route to a harness-class campaign, a separate class for changes to the checks themselves. That class is graded against a sealed corpus with planted mutations, meaning a fixed body of code with known bugs planted in it. Resolution is confirmed only when the next independently scheduled observation from a clean environment is green. A correct refusal closes a campaign as a success, and applied to the historical record, that one change reclassifies four of the fixer's eight "failures" as correct outcomes.

<figure>
<svg viewBox="0 0 640 215" role="img" aria-labelledby="fig1-title fig1-desc" style="width:100%;height:auto;display:block;color:var(--ink);font-family:var(--sans)">
  <title id="fig1-title">Campaign states, with retry below and one edge back to ready</title>
  <desc id="fig1-desc">Five boxes in a row: ready, attempted, reported complete, verified, confirmed, and a sixth box, retry, below reported complete. Forward arrows are labeled claim, worker reports, verifier passes, next observation. A dashed arrow from attempted returns to ready, labeled lease expired, the reaper. A dashed arrow from reported complete goes down to retry, labeled verifier fails, next attempt must differ, and a dashed arrow from retry returns to attempted, labeled next attempt.</desc>
  <defs>
    <marker id="fig1-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0L10 5L0 10z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="123" y="50" font-size="11" font-family="var(--mono)" fill="currentColor" opacity=".7" text-anchor="middle">claim</text>
  <text x="251" y="50" font-size="11" font-family="var(--mono)" fill="currentColor" opacity=".7" text-anchor="middle">worker reports</text>
  <text x="379" y="50" font-size="11" font-family="var(--mono)" fill="currentColor" opacity=".7" text-anchor="middle">verifier passes</text>
  <text x="507" y="50" font-size="11" font-family="var(--mono)" fill="currentColor" opacity=".7" text-anchor="middle">next observation</text>
  <rect x="8" y="60" width="104" height="50" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="60" y="90" font-size="14" font-weight="600" fill="currentColor" text-anchor="middle">ready</text>
  <rect x="136" y="60" width="104" height="50" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="188" y="90" font-size="14" font-weight="600" fill="currentColor" text-anchor="middle">attempted</text>
  <rect x="264" y="60" width="104" height="50" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="316" y="84" font-size="14" font-weight="600" fill="currentColor" text-anchor="middle">reported</text>
  <text x="316" y="100" font-size="14" font-weight="600" fill="currentColor" text-anchor="middle">complete</text>
  <rect x="392" y="60" width="104" height="50" rx="8" fill="none" stroke="var(--accent)" stroke-width="2"/>
  <text x="444" y="90" font-size="14" font-weight="600" fill="var(--accent)" text-anchor="middle">verified</text>
  <rect x="520" y="60" width="104" height="50" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="572" y="90" font-size="14" font-weight="600" fill="currentColor" text-anchor="middle">confirmed</text>
  <line x1="112" y1="85" x2="134" y2="85" stroke="currentColor" stroke-width="1.5" marker-end="url(#fig1-arrow)"/>
  <line x1="240" y1="85" x2="262" y2="85" stroke="currentColor" stroke-width="1.5" marker-end="url(#fig1-arrow)"/>
  <line x1="368" y1="85" x2="390" y2="85" stroke="currentColor" stroke-width="1.5" marker-end="url(#fig1-arrow)"/>
  <line x1="496" y1="85" x2="518" y2="85" stroke="currentColor" stroke-width="1.5" marker-end="url(#fig1-arrow)"/>
  <path d="M188 110 V145 H76 V112" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#fig1-arrow)"/>
  <text x="200" y="160" font-size="11" font-family="var(--mono)" fill="var(--accent)" text-anchor="end">lease expired: the reaper</text>
  <rect x="264" y="165" width="104" height="40" rx="8" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 3"/>
  <text x="316" y="190" font-size="14" font-weight="600" fill="var(--accent)" text-anchor="middle">retry</text>
  <path d="M316 110 V163" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#fig1-arrow)"/>
  <text x="324" y="140" font-size="11" font-family="var(--mono)" fill="var(--accent)">verifier fails: next attempt must differ</text>
  <path d="M264 185 H210 V112" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#fig1-arrow)"/>
  <text x="258" y="200" font-size="11" font-family="var(--mono)" fill="var(--accent)" text-anchor="end">next attempt</text>
</svg>
<figcaption>Campaign states, which no worker can collapse: a worker can report complete, and only a verdict moves the row past it. A failed verdict sends the row to retry, where the next attempt must differ; an expired lease sends it back to ready.</figcaption>
</figure>

The fleet had plenty of detection and no verification bound to a transition, a check whose outcome changes what happens next. Goodhart's law, the rule that a measure which becomes a target stops being a good measure, applies twice: the actuator will optimize whatever visible check it can reach, and a sensor that cannot fail hides everything upstream.

The [forged-grade incident](/blog/2026/07/03/the-agent-that-forged-its-own-grade/) I wrote about earlier was one actuator reaching one sensor. This summer's version was subtler: a whole plane of sensors that nothing consumed. On one Mac under one user, worker-verifier isolation stays detection-only, so a crossing is detected after the fact and not prevented, until the fleet runs as its own OS user with separate principals. That limit is stamped on every campaign row.

## Authority is a lease on the row

A worker being able to figure out how to do something is a different fact from that worker being authorized to do it right now. Looper's warrant section got that separation right. Verification establishes what is true; authorization decides what happens next given verified evidence. An LLM may hold the second under a bounded, expiring grant and may never hold the first. The wiring lagged the principle: the gate was asserted and absent, the lease table was empty, and no reaper existed.

In the design authority becomes data attached to the work. Each campaign carries a risk tier: read-only, worktree-write, repository-write, outward. A warrant is a lease with an expiry and revocation triggers. Workers hold no credentials, and phase one has no GitHub credential in the kernel at all; it merges to a local bare remote. Red lines stay red: real money, publishing or messaging anyone but me, and the ultimate goal are ungrantable at any level. When the design let the machine amend its own rules, an adversarial review from a different model family found the hole. Cooling-off periods and cross-family countersigns only delay a loop weakening its own brakes, meaning loosening its own protected controls. The core became monotone: machines may strengthen protected controls and may never weaken them. Whether a change weakens one is decided by a typed policy with a declared stricter direction per field, checked deterministically. Another model's opinion that a diff "does not relax a brake" does not count.

The one actuator in the old fleet that worked, the nightly steward, worked because its authority was simple. Its authority, its refusal vocabulary and its verifier were the same object. That is the property I want every campaign class to have, and it is closer to [capability security](https://en.wikipedia.org/wiki/Capability-based_security) and least privilege than to anything on an org chart.

## Delete any part whose removal costs no closures

Autonomous-agent systems recreate human bureaucracy with almost no effort, and language models make it easier because they are very good at producing artifacts that look like work. Agents supervising agents, planning loops, review loops, governance loops, meta-loops evaluating other loops: all internally coherent and all measurable. Mine had test suites in the thousands, run on two Python versions and mutation-tested, and zero verified changes in the world. Sensing looked like progress because sensing is easy to make honest. Governance looked like progress because the organization metaphor has words for supervision and none for "a retry that changes hypothesis after a lease expires."

The distinction I now hold is between organizational activity and environmental progress, and the test is blunt: a component stays only if removing it would make the system measurably worse at accomplishing external goals. Otherwise it should not exist.

Applied honestly, the test mothballs ten of eighteen loops. Out go the dreamer, the advisor, the daily narrator, the civilization map, the persona learning lanes, a second territory's sentinel and a handful of smaller loops outside the one proof I am chasing. Each mothball is meant to be one command to reverse, checked against a dependency manifest before and after so I do not orphan a consumer. What stays is the target's sentinel, the steward, a journalist that will project the ledger as one of its sources, the dispatcher-as-kernel, the recall hook, and a couple of loops the survivors depend on.

Deleting that machinery should make the system more autonomous. None of it moved anything in the world, and all of it ate the two scarce resources: subscription quota and my attention. The corollary rules are unglamorous. Cadence-driving, deciding when the system wakes and acts, is a kernel rule and no longer a persona's job. The nightly goal scan that decides whether there is work worth doing must be allowed to say no. It computes whether there is a measurable gap, a credible intervention, and expected value above a threshold. If there is none it writes "no campaign, no intervention clears the threshold, next review on this date," and the ledger records that as a valid outcome.

Activity is not progress.
{:.key}

The kernel I am building is itself several pieces (intake, reconciler, router, executor, verifier, merger, digest), and there is a real chance it becomes the same overbuilt layer with better vocabulary. The defense I trust is the one that worked in August: I measure closures and count every component against them.

## Only the decide step is new

Most of this has an older home. The loop itself is cybernetics: sense the environment, compare against a desired state, act, observe the consequences, adjust. My June research leaned on requisite variety, the rule that a controller needs at least as many options as the disturbances it faces, and on the [good-regulator theorem](https://en.wikipedia.org/wiki/Good_regulator). "Memory lives on disk, not in context" was in the design from the start. What cybernetics gave me was the shape of one loop. What it did not give me was what happens between loops and after they die, and those parts come from older fields:

- leases and fencing tokens, from distributed systems;
- claims and dead-letter states, where a job that keeps failing is parked, from job queues;
- the outbox and append-only events, from databases;
- typed capabilities, from capability security;
- work orders that outlive workers, from workflow engines and, further back, from [blackboard systems](https://en.wikipedia.org/wiki/Blackboard_system) and [tuple spaces](https://en.wikipedia.org/wiki/Tuple_space), where independent processes coordinate through shared state.

The organizational-theory half is the oldest of all, and I had it backwards. Closures come first; a working set of closures produces the coordination pressure that justifies a hierarchy.

What a language model adds is a general-purpose component for the decide step, and it comes ready to call. That step used to be the hard part of the loop and the rest was engineering. What surprised me is how much of that engineering was still missing from my system, and from the six frameworks I toured in July. The decide step is the new part, and the old parts around it are the ones that were missing.

## The proof is seven days with zero touches

My model changed in five places.

- Scheduling. I had started to treat fixed-time runs as fake autonomy. The audit put the defect elsewhere: a clock is one kind of sensor, and a clock was the only thing on the machine capable of causing cognition, so nothing could be woken by state.
- The effector. I had described it as missing; the audit found two, both disabled by trivial things: a missing marker file on one side, an unsatisfiable predicate on the other. "What is the cheapest one-line lever" is a better first question than "what is broken."
- Self-assessment. My progress log said the fixer was 0-for-5; the ledger said 0-for-8. Directionally right and numerically wrong, which is itself a finding about which record holds the truth, and an argument for grading a system from its own append-only record.
- The constitution. I had assumed it needed rewriting, and an audit of every article against the goal found the verification and containment invariants intact; the blocker was durable state and recovery. Most of the text is unchanged.
- Autonomy itself. I had equated more of it with more decisions delegated to models. The better measure is how few decisions need to exist at all. The target is a state machine where every state has a machine owner, a wake predicate, a deadline and a fallback, and "wait for the human" is absent from the list of states.

Phase 0 was to make the record true: commit the untracked pieces, put the orchestrator under the steward's custody, correct the policy line that claimed a gate the code did not have. That is done. Phase 1A is one cell: one campaign class, one seat, one fixture desired state watched by a real scheduled sensor, one verification bundle, one authority profile. It adds the campaign tables with lease tokens and an independent reaper, and a local guarded merge. Then deterministic drills that must pass on demand before any clock starts:

1. Inject a fault and watch intake open a campaign with no manual help.
2. Force the first attempt to fail and require the second to differ.
3. Kill the worker mid-attempt and watch the lease get reaped and the campaign resume.
4. Watch the verifier reject a bad patch and accept a good one.
5. Confirm on the next scheduled observation.
6. Prove that a forbidden write is prevented and logged.

Then the proof: seven consecutive days with the laptop on and zero actions from me inside the perimeter. An independent controller running under a separate OS identity records it, because the system under test may not write its own proof. Any action from my account inside the perimeter stamps the window contaminated and restarts the clock. The metric is verified autonomous closures per human intervention, reported as separate counts: closures, eligible campaigns, interventions, minutes. Zero interventions over zero campaigns has to read as "under-exercised, repeat," never as a perfect score.

The thesis I am left with is smaller than the one I started the summer with. For the system I am building, the hard part was never the organization of the agents. It is keeping progress going after any particular agent disappears, and being able to show the evidence. Whether that generalizes to autonomous AI at large I do not know yet.

I have not run the cell or the proof. The next evidence has to be a campaign row, a failed attempt, a recovered lease, a verified commit, and a clean confirmation the following night, and no more architecture documents until then. If those rows appear, I will write up what the first closed campaign looked like. If they do not, the sensors and the steward already pay for themselves in caught defects and committed hygiene, and the same ledger that measured the rest will say so.

*I write more on data reliability and AI systems at [reliable-by-design](https://medium.com/@reliable-by-design) on Medium.*

{% include post-footer.html %}
