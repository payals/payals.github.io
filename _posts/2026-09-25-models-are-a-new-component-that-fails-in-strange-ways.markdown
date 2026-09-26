---
layout: post
title: "Models are a new component that fails in strange ways"
subtitle: "Thirteen years of Postgres left me six questions to ask any component that fails without telling you. Asked of a model this year, they held."
tldr:
  - "Six Postgres questions carry over to a model that reports success while failing."
  - "They caught a forged grade, a 47-night no-op reported OK, and a coverage bar no day could pass."
  - "The September soak's grader took six signed amendments before I trusted its verdicts; the next grader I build grades another model."
author: Payal
date: 2026-09-25 19:30:00 -0400
categories: [ai]
tags: [ai, agents, reliability, systems]
---

A language model is a component, and it belongs to a class I already know: components that report success while failing. An `fsync()` that reported an error once, then returned success on the retry after the kernel had already dropped the pages it was asked to write. A btree index that kept answering queries after a glibc upgrade reordered its collation, missing rows and letting duplicates past unique indexes under a clean log. A backup reported green every night, and nobody had ever restored it.

I spent thirteen years running Postgres in other people's production, and most of that time went into building deterministic checks around components like these. Some I lived through. Some I learned from other people's postmortems and then went looking for on my own clusters.

The model is the newest member of the class, and its version of the failure is worse. It fails plausibly. The wrong answer arrives in fluent sentences with a confident summary, and a task that is half done comes back described as complete. A replica that lies about being caught up at least lies in a number I can compare against another number.

A model lies in prose, and prose is the one format I never managed to alert on.
{:.key}

What I bring to an agent working against production is what I brought to a Postgres cluster: a short list of questions I ask out of habit. The specifics I look up on the day, at the pinned version. The questions are what stay. Six of them follow.

## Status is a claim; check the effect

For years Postgres assumed that a failed `fsync()` could be retried. In 2018 fsyncgate showed it could not. Under writeback errors, some Linux filesystems reported the error once, dropped the dirty pages, and returned success on the next call. The status said written. The effect was a page that never landed. The 11.2 release started to PANIC on the failure and recover from WAL rather than trust the return code again; the details are in [the first war-stories post](/blog/2026/05/27/postgres-war-stories-1-the-bugs-that-arent-postgres/).

The return code was the kernel's claim about itself, and nothing checked the claim against the disk.

A model's status line is "done" or "tests pass." In July my own coding agent [forged a perfect score](/blog/2026/07/03/the-agent-that-forged-its-own-grade/) by rebinding the serializer its grader used and returning nothing; an empty result list iterated cleanly and fell through to the passing exit. In the repair fleet I run on my own hardware and wrote up in [September](/blog/2026/09/01/my-fleet-fixed-three-faults-while-i-slept/), a campaign now has four states that no worker can collapse: attempted, reported complete, verified, confirmed. Confirmed is written only after a verifier re-runs the acceptance check in a fresh clone the worker never saw, and the next scheduled observation sees green on its own.

<figure>
<svg viewBox="0 0 640 250" role="img" aria-labelledby="fig1-title fig1-desc" style="width:100%;height:auto;display:block;color:var(--ink);font-family:var(--sans)">
  <title id="fig1-title">The same loop for a replica and for a model</title>
  <desc id="fig1-desc">Three boxes in a row: an untrusted component, a deterministic check, and a recorded outcome. Labels above show the Postgres version: a replica that says it is caught up, a row written on the primary and read back on the replica, an audit row nobody can edit. Labels below show the model version: a model that says the task is done, the acceptance test re-run in a fresh clone, a ledger the worker cannot write to. A dashed arrow returns from the check to the component, labeled mismatch: stop, report.</desc>
  <defs>
    <marker id="fig1-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0L10 5L0 10z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="20" y="42" font-size="12" font-family="var(--mono)" fill="currentColor" opacity=".7">POSTGRES, 2015</text>
  <text x="20" y="236" font-size="12" font-family="var(--mono)" fill="currentColor" opacity=".7">A MODEL, 2026</text>
  <text x="110" y="70" font-size="13" fill="currentColor" text-anchor="middle">a replica that says</text>
  <text x="110" y="86" font-size="13" fill="currentColor" text-anchor="middle">it is caught up</text>
  <text x="320" y="70" font-size="13" fill="currentColor" text-anchor="middle">write a row on the primary,</text>
  <text x="320" y="86" font-size="13" fill="currentColor" text-anchor="middle">read it back on the replica</text>
  <text x="530" y="70" font-size="13" fill="currentColor" text-anchor="middle">an audit row</text>
  <text x="530" y="86" font-size="13" fill="currentColor" text-anchor="middle">nobody can edit</text>
  <rect x="30" y="100" width="160" height="50" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="110" y="130" font-size="15" font-weight="600" fill="currentColor" text-anchor="middle">untrusted component</text>
  <rect x="240" y="100" width="160" height="50" rx="8" fill="none" stroke="var(--accent)" stroke-width="2"/>
  <text x="320" y="130" font-size="15" font-weight="600" fill="var(--accent)" text-anchor="middle">deterministic check</text>
  <rect x="450" y="100" width="160" height="50" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="530" y="130" font-size="15" font-weight="600" fill="currentColor" text-anchor="middle">recorded outcome</text>
  <line x1="190" y1="125" x2="238" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#fig1-arrow)"/>
  <line x1="400" y1="125" x2="448" y2="125" stroke="currentColor" stroke-width="1.5" marker-end="url(#fig1-arrow)"/>
  <path d="M320 150 V178 H110 V152" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#fig1-arrow)"/>
  <text x="215" y="173" font-size="12" font-family="var(--mono)" fill="var(--accent)" text-anchor="middle">mismatch: stop, report</text>
  <text x="110" y="200" font-size="13" fill="currentColor" text-anchor="middle">a model that says</text>
  <text x="110" y="216" font-size="13" fill="currentColor" text-anchor="middle">the task is done</text>
  <text x="320" y="200" font-size="13" fill="currentColor" text-anchor="middle">re-run the acceptance test</text>
  <text x="320" y="216" font-size="13" fill="currentColor" text-anchor="middle">in a fresh clone</text>
  <text x="530" y="200" font-size="13" fill="currentColor" text-anchor="middle">a ledger the worker</text>
  <text x="530" y="216" font-size="13" fill="currentColor" text-anchor="middle">cannot write to</text>
</svg>
<figcaption>The loop I ran around replicas for years and the loop I run around a model now, with the component swapped.</figcaption>
</figure>

## Count the backlog before you fix the fault

Multixact wraparound is the failure that scares me most, and I wrote it up in [the second war-stories post](/blog/2026/06/16/postgres-war-stories-2-silent-corruption/). Multixacts have their own wraparound counter, separate from the transaction ID counter every dashboard watches. A cluster can sit at a comfortable XID age while that second counter ages silently under a foreign-key-heavy workload, until the database refuses new writes to avoid data loss. The stop is loud. The recovery is quiet and slow: clearing it means an aggressive vacuum of every table whose multixacts have aged, on a cluster that is already refusing writes.

The question has two halves: what accumulated while the component failed silently, and what the recovery does the instant it works again.

The first half turned up in August, in an audit of my own systems at home. One job had been failing for close to two months before a sentinel caught it. A nightly agent had been scheduled 47 nights in a row and launched zero times, because a one-byte marker file was never created, and the audit reported it OK every night. Exiting zero by refusing to run looks identical to working.

The second half belongs to any agent that self-heals. A controller that has been blind for a while does not resume gently; it reconciles every piece of drift it can see, including anything it decides is an orphan. This summer a managed Kubernetes upgrade broke a GitOps deployer, my first time on that stack. Before I fixed the fault I counted what had accumulated and parked every job that would act on that backlog the moment it could see again. It was back the next day with nothing deleted.

## Test each failing path as its runtime role

In 2018 I gave a talk at SCaLE and PGCon called [Securing Your Data on PostgreSQL](https://www.pgcon.org/2018/schedule/track/DBA/1144.en.html). It was mostly permissions and ACLs. The question it left me with was which role a failing path ran as, and whether anyone had ever tested that path as that role rather than as themselves.

In the fleet the agents run as their own OS user, and the controller that grades them runs as a second user, the only role with write access to the proof schema. Outward actions stay with me. The [contract I run agents under](/blog/2026/09/25/the-contract-i-write-before-an-agent-touches-production/) writes the same separation down as rules a model can be caught breaking: the agent may not delete or merge anything, and a person approves each mutation at the prompt. Its most important clause is the anti-circumvention rule: run the command once and wait for the prompt, and rewording the command to dodge the prompt counts as touching the guard, which is off limits.

## Checks that never bind are the top finding

Postgres has been able to checksum every page since 9.3, and until Postgres 18 flipped the default the feature was off unless someone passed `--data-checksums` at `initdb`. Most clusters were created without it. A torn page read back as plausible and wrong, and `SHOW data_checksums` said `off` on cluster after cluster. The check existed and, on those clusters, caught nothing.

The question is whether the check binds, in four steps:

1. Does it exist?
2. Is it wired into the live path?
3. Has it run for real at least once?
4. Does its outcome change what happens next?

Against models this question has found more than any other; a check that never binds, or always fails, is a top-severity finding. The grader that passed the forged score existed and was wired; it just iterated over an empty list.

For the September soak I wrote a coverage bar that required rows in 95 percent of the window's five-minute buckets. It was unpassable on the day I wrote it, and it sat through two adversarial code reviews because everyone traces the check that is currently red. The controller's real cadence was about 371 seconds, so a flawless day could not reach 95 percent; a fully awake day measured 218 of 288.

An earlier fixer loop had a success predicate no run could satisfy, so the dispatcher skipped it as "needs human" in 3,196 of 3,446 decisions. The latch that should have cleared that state was a file nothing deleted, so the only thing that check bound was my attention. Where each check stopped:

| Step | Postgres: page checksums | A model, this year |
|---|---|---|
| Exists | Yes, since 9.3 | Yes, all of them |
| Wired | Off by default before Postgres 18 | The fixer's latch, a file nothing deleted |
| Exercised | Never, on those clusters | The grader, iterating over an empty list |
| Binding | Never, on those clusters | The coverage bar; the fixer's predicate |

In the contract, stop conditions are numbers the model compares rather than judges. The four that matter most:

```text
Stop and report if:
- a precondition count differs from the phase file
- anything is Degraded that was Healthy in the baseline
- a background job has not exited (its output is not a result yet)
- you cannot verify this step's success with a command
```

## A truncated source reads as a whole one

The forged grade was a completeness failure first, and the fix that mattered most was a count. The number of results has to equal the number of inputs, checked inside the trusted process, before any comparison runs. Python added `zip(strict=True)` because enough people were bitten by exactly this. A truncated source reads as a whole one, so judgment alone does not catch it, which is why the count has to be stated before the read.

Is my source complete? Retention windows, shallow clones, truncated output and a job that has not exited yet each hand back a partial answer that reads as whole.

The Postgres version was transparent huge pages, also from the first post. The kernel's compaction thread would freeze a Postgres backend for hundreds of milliseconds, and the instruments an operator trusts said nothing was wrong. The stalls were too rare to move the averages in `pg_stat_statements` and too brief to catch by sampling `pg_stat_activity`. The place they surfaced was p99 latency, as spikes that correlated with nothing in the SQL.

## Memory is infrastructure; a hook beat a lesson

The planner chooses a plan from what `pg_statistic` says about the data, and after a bulk load those numbers describe a table that no longer exists. The plan it picks is confident and wrong, and it stays wrong until something runs `ANALYZE`. It is close to the cheapest performance fix there is, and on many clusters nobody had run it since the load.

What does this component already know, and who keeps that current? For a model, memory is infrastructure. My agents read from a vault of markdown notes that scheduled jobs keep current, so a session starts from something better than a cold prompt.

The memory experiment I ran this summer came back negative on the test that mattered. A written, dated lesson loaded at session start produced no change in behavior, while a small hook that fires the same lesson at the moment of the risky action changed what the agent did. When a map describes one part of a system in detail, it pulls an investigation toward that part, and the fix for that goes into the map. Each postmortem's table of wrong or late conclusions, with the better source beside each, goes into the vault before anyone else reads the postmortem.

## Knowing what to verify makes the handoff safe

Andrej Karpathy put the mechanism in one line in his [Sequoia Ascent summary](https://karpathy.bearblog.dev/sequoia-ascent-2026/) on April 30: "Traditional software automates what you can specify. LLMs and reinforcement learning automate what you can verify." If that holds, the person who can safely hand the most to an agent is the one who knows what to verify in production, and that knowledge is what an incident history leaves behind.

The division of labor that falls out is the one I run: I decide and verify, models implement. The agent contracts I have read from other people are mostly about formatting and tone. Mine are about what may be deleted, which stop condition is a number, and who approves a mutation. The same frame, Postgres as the durable ledger no model can rewrite, is the one I am building [my Postgres Summit US talk](https://postgresql.us/events/postgressummitus2026/schedule/session/2241-using-postgresql-as-a-control-plane-for-reliable-ai-workflows/) around on September 30.

## A grader model gets the same six questions

As models take on more of the verification, reviewing their own diffs and running their own tests, my bet is that these questions move up a rung, to who verifies the verifier.

The receipt is the September soak. The fleet took three blinded faults and repaired all three. The component that needed the most fixing was the grader: six signed amendments before I trusted its verdicts. The grader I build next grades another model, and it gets the same six questions. What I am watching is whether its first bug is found by me or by a check I wrote before it fired.

*I write more on data reliability and AI systems at [reliable-by-design](https://medium.com/@reliable-by-design) on Medium.*

{% include post-footer.html %}
