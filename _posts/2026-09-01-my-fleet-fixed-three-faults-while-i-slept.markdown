---
layout: post
title: "My fleet fixed three faults while I slept. Here are the receipts."
subtitle: "Seven days of no-touch autonomy, graded by a controller running as a different OS user. Every number below is copied from its signed ledger, and the ledger is linked."
author: Payal
date: 2026-09-01 09:00:00 -0400
categories: [ai]
tags: [ai, agents, reliability, systems]
---

The [last post](/blog/2026/08/15/the-agent-is-not-the-system/) ended with a promise: no more architecture documents until real rows showed up, and if they did, I would write up the first closed campaign. They showed up. Between August 21 and August 28 my repair fleet ran for seven days with zero actions from me inside its perimeter, took three blinded faults, and repaired all three. The controller that graded the week is not the fleet and is not me, and its ledger is [published with this post](/evidence/soak-1/window-2/).

## How the week was graded

The system under test is a small repair fleet on my laptop. A sensor watches a fixture repository, and when it sees the fixture broken a kernel opens a campaign. A coding seat attempts the fix, a deterministic verifier re-runs the acceptance check in a fresh clone, and a reaper recovers stuck work through lease expiry. All of it is coordinated through Postgres, the way the last post described.

The part I am prouder of is the proof harness around it. The fleet runs as its own macOS user. A test controller runs as a second user, and that second user is the only role with write access to the proof schema. Every five minutes it runs eleven detectors: who owns every file in the fleet's home, whether the running code matches the pinned tree, unexplained commits on the fixture, sudo lines, launchd manifests, database writes arriving through the wrong door, my own interactive sessions, liveness of each lane. The results go into an HMAC-chained ledger with an append-only anchor file beside it. On three sealed days the controller breaks the fixture itself, at a minute derived from an HMAC, so neither the fleet nor I know the schedule in advance. Any action from my account inside the perimeter stamps the window contaminated. The system under test may not write its own proof, and neither may I.

## What the fleet did

Three challenges fired. Three repairs came back. Times run from the fault landing on the fixture to the campaign's `confirmed` event, which the kernel only writes after the next scheduled observation sees green.

- **Day 2.** Fault pushed at 18:40:02. The sensor saw RED at 18:41:23 and campaign 201 was opened in the same minute. Three attempts. The first stalled in verification; the second passed the verifier and then stalled before the merge. Both had their leases expire and were reaped and re-claimed by the kernel without anyone asking. The third passed, merged, and confirmed at 00:29. 5 h 49 min end to end, most of it inside the recovery path doing what it was built for.
- **Day 3.** Fault at 17:29:23. Campaign 202 opened, verified, merged, and confirmed at 18:09. 39 minutes, one attempt.
- **Day 6.** Fault at 02:21:27. Campaign 203 confirmed at 02:58:57. 37 minutes, one attempt, at three in the morning. I read about it in the ledger the next day.

Two of the three fired late. The injector is part of the instrument, and it spent the day-2 and day-3 slots refusing to read its own config, so those faults landed a day and more after their sealed minute, within minutes of the amendments that fixed it. I knew those two were coming; the fleet did not, and the contamination detectors are what say I kept my hands off it. The day-6 fault fired on its sealed minute with nobody awake.

Across the week the detectors recorded no contaminations, no interventions, and no writes to the fleet's tables from anything but the kernel's own socket. The 17,413 detector rows reconcile against the signed projection with no mismatches. The [challenge table](/evidence/soak-1/window-2/challenges.csv) and the [campaign event log](/evidence/soak-1/window-2/campaign-events.csv) are exported straight from the two schemas.

## The one bar the grader got wrong

The verdict string on the window says `failed`. Every substantive criterion passed: 3/3 challenges resolved and confirmed, 0 interventions, 0 contaminations, liveness replay clean, ledger intact. The failing metrics are all one family, bucket coverage, and tracing them to their SQL was the most useful hour of the week.

The rule sounds reasonable: the controller must have rows in at least 95% of the window's five-minute buckets, because a proof nobody was observing is not a proof. The implementation had a geometry bug. launchd schedules its 300-second interval from the start of each run, and a tick takes 40 to 70 seconds, so the real cadence is about 371 seconds. Against a fixed 300-second grid a flawless controller misses roughly one bucket in five. I checked a fully awake day to be sure: 218 of 288. The bar was unpassable on the day it was written and sat through two adversarial code reviews, because everyone traces the check that is currently red and nobody traces the one that has not fired yet.

I had a rule from an earlier audit that a check which never binds is a top-severity finding. This is its mirror: a check that always fails binds nothing either. Same disease, a threshold nobody ran against the raw data it judges.

The fix keeps the intent and repairs the geometry. Coverage is now judged on a grid of three times the tick interval, buckets inside a disclosed blackout are excluded from the expectation, and the 95% bar stays. What I did not do is re-grade the window. Verdicts are never rewritten in this system; the `failed` string stands in the ledger with the analysis beside it. The controller opened window 3 on its own six minutes after window 2 closed, with three fresh sealed challenges, and the coverage fix went in twelve minutes later as the new window's first declared amendment. That one gets to earn the clean string.

## Fixing the instrument without restarting the clock

Four other defects turned up during the week, all on the grading side and none in the fleet: a liveness rule that leaned on a heartbeat file the controller was not allowed to read, a config policy with two copies that disagreed about a file mode, a retry gate that could not tell a wedged slot from a scheduled one, and a retry fuse that counted "the previous repair is still running" as a failed attempt. Each was fixed live through a mechanism I had to build on day one: an owner-run amendment. It swaps only the controller's code between ticks and refuses to touch anything the window has pinned. It records the new tree hash where the controller's own drift detector looks, and the controller has to declare the amendment in its signed ledger on the next tick. Two owner rulings went through the same door: buckets where my laptop was asleep count as disclosed blackout rather than fleet death, and a verifier stall the reaper recovered belongs to the lease system, not the liveness check. The fourth amendment also added an owner-gated verb to put a written-off challenge slot back on the schedule, which is how the day-3 fault got to fire at all. All five amendments are listed in the [verdict](/evidence/soak-1/window-2/verdict.json), each with its commit and tree hash.

That mechanism is why the week finished at all. The alternative is restarting the window every time the grader has a bug, which is forever.

## What transfers

- Trace every decision-driving metric to its raw computation before the clock starts, not just the one that is red today.
- Hold the instrument to the same standard as the system under test. If your verifier gets less engineering than your agent, your results are about your verifier.
- Make amendments part of the proof. A fix signed into the same ledger it grades is evidence; a fix applied off the record is a restart.
- Separate "failed" from "waiting" at the type level, or your retry fuse will eventually turn patience into permanent failure.
- One policy, one implementation. Every duplicated rule I had disagreed with its twin at first production contact.

Google published a [zero-trust agents post](https://developers.googleblog.com/build-zero-trust-ai-agents-with-googles-agent-development-kit/) the week before this window opened: per-agent keys signing every mutation, continuous ledger re-verification, the assumption that the model can be jailbroken. It is close to this design, and it stops where this post starts, at running a completed adversarial window against a live fleet. The coding-agent products I have used mostly go the other way and verify by reviewing their own output. For my workload I am not willing to call that verification, and I now have a week of ledger rows for why: the agents were fine, and the component that needed the most fixing was the one doing the grading.

## Where this leaves it

Window 3 closes September 4. If it comes back clean, Soak 1 is done and the fleet gets pointed at work I actually care about, with the metric changing from "did it repair the fixture" to verified autonomous closures per human intervention on real work. If it does not, the same ledger will say why.

Scorecard for the week: the fleet and the ledger did better than I expected, the instrument needed five signed fixes before I trusted it, and the thesis from the last post survived first contact. Keeping work alive after any one agent disappears turned out to be the easy half. Being able to show the evidence, and having the evidence survive its own bugs, was the job.

If you want the two-line version of this check for your own setup, `npx skills add payals/ghost-manual` gives your agent a `/stress-test` that names what grades the work and who can edit the grader; run on this bundle, line 2 named me.

*I write more on data reliability and AI systems at [reliable-by-design](https://medium.com/@reliable-by-design) on Medium.*

{% include post-footer.html %}
