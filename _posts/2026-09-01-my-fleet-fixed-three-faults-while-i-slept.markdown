---
layout: post
title: "My fleet fixed three faults while I slept. Here are the receipts."
subtitle: "Seven days of no-touch autonomy, graded by a controller running as a different OS user. Every number below is copied from its signed ledger, and the ledger is linked."
author: Payal
date: 2026-09-01 09:00:00 -0400
categories: [ai]
tags: [ai, agents, reliability, systems]
tldr:
  - "Seven days, zero touches, three blinded faults, three repairs confirmed: 5 h 49 min, 39 min, 37 min."
  - "A grader running as a second OS user signed 17,413 detector rows; ledger linked."
  - "Its verdict says failed: a coverage bar no day could pass (an awake day scored 218 of 288). It stays; window 3 passed under the amended rule."
---

The [last post](/blog/2026/08/15/the-agent-is-not-the-system/) ended with a promise: no more architecture documents until real rows showed up, and if they did, I would write up the first closed campaign. They showed up. Between August 21 and August 28 my repair fleet ran for seven days with zero actions from me inside its perimeter. It took three blinded faults and repaired all three. The controller that graded the week is not the fleet and is not me, and its ledger is [published with this post](/evidence/soak-1/window-2/).

## The grader ran as a second OS user

The system under test is a small repair fleet on my laptop. A sensor watches a fixture repository, and when it sees the fixture broken a kernel opens a campaign. A coding seat attempts the fix, a deterministic verifier re-runs the acceptance check in a fresh clone, and a reaper recovers stuck work through lease expiry. All of it is coordinated through Postgres, the way the last post described.

The part I am prouder of is the proof harness. The fleet runs as its own macOS user. A test controller, the grader everywhere below, runs as a second user, the only role with write access to the proof schema. Every five minutes it runs eleven detectors, among them:

- who owns every file in the fleet's home
- whether the running code matches the pinned tree
- unexplained commits on the fixture
- sudo lines and launchd manifests
- database writes arriving through the wrong door
- my own interactive sessions
- liveness of each lane

The results go into an HMAC-chained ledger with an append-only anchor file beside it.

On three sealed days the controller breaks the fixture itself, at a minute derived from an HMAC, so neither the fleet nor I know the schedule in advance. Any action from my account inside the perimeter stamps the window contaminated. The system under test may not write its own proof, and neither may I.

## All three repairs confirmed, one at 3 a.m.

Three challenges fired in window 2; three repairs came back. Window 3, appended below, ran three more. Times run from the fault landing on the fixture to the campaign's `confirmed` event, which the kernel only writes after the next scheduled observation sees green; minutes are floored.

| Window | Day | Fault at | Campaign | Confirmed at | Attempts | Elapsed |
|---|---|---|---|---|---|---|
| 2 | 2 | 18:40:02 | 201 | 00:29 | 3 | 5 h 49 min |
| 2 | 3 | 17:29:23 | 202 | 18:09 | 1 | 39 min |
| 2 | 6 | 02:21:27 | 203 | 02:58:57 | 1 | 37 min |
| 3 | 2 | 18:32:53 | 204 | 19:07:24 | 1 | 34 min |
| 3 | 3 | 18:18:31 | 205 | 18:53:58 | 1 | 35 min |
| 3 | 4 | 11:54:28 | 206 | 12:41:38 | 1 | 47 min |

Campaign 201 exercised the recovery path. The sensor saw RED at 18:41:23 and opened it in the same minute. The first attempt stalled in verification; the second passed the verifier, then stalled before the merge. Both leases expired and the kernel reaped and re-claimed them without anyone asking. The third passed, merged, and confirmed. Most of the 5 h 49 min was the recovery path: two leases expiring and being reaped. Campaign 203 confirmed at 02:58:57, just before 3 a.m.; I read about it in the ledger the next day.

Two of window 2's three faults fired late. The injector lives inside the controller, and on days 2 and 3 it could not read its own config. Those two faults landed a day and more after their sealed minute, within minutes of the amendments that fixed it. I knew those two were coming; the fleet did not, and the contamination detectors say I kept my hands off it. The day-6 fault fired on its sealed minute with nobody awake.

Across the week the detectors recorded 0 contaminations, 0 interventions, and no writes to the fleet's tables from anything but the kernel's own socket. The 17,413 detector rows reconcile against the signed projection with no mismatches. The [challenge table](/evidence/soak-1/window-2/challenges.csv) and the [campaign event log](/evidence/soak-1/window-2/campaign-events.csv) are exported straight from the two schemas.

## The failed verdict is a geometry bug

The verdict string on the window says `failed`. Every substantive criterion passed: 3 of 3 challenges resolved and confirmed, 0 interventions, 0 contaminations, liveness replay clean, ledger intact. The failing metrics are all one family, bucket coverage, and tracing them to their SQL was the most useful hour of the week.

The rule sounds reasonable: the controller must have rows in at least 95% of the window's five-minute buckets, because a proof nobody was observing is not a proof. The implementation had a geometry bug. launchd schedules its 300-second interval from the start of each run, and a tick takes 40 to 70 seconds, so the real cadence is about 371 seconds. Against a fixed 300-second grid a flawless controller misses roughly one bucket in five. The bar was unpassable on the day it was written, and it sat through two adversarial code reviews. The reviewers and I traced every check that was red at the time. The coverage check had not fired yet, so nobody had traced it. I checked a fully awake day to be sure: 218 of 288.

<figure>
<svg viewBox="0 0 640 200" role="img" aria-labelledby="fig1-title fig1-desc" style="width:100%;height:auto;display:block;color:var(--ink);font-family:var(--sans)">
  <title id="fig1-title">Ticks every 371 seconds against a 300-second grid</title>
  <desc id="fig1-desc">A row of eight controller ticks spaced about 371 seconds apart sits above a row of ten fixed 300-second buckets. A dashed line drops from each tick into the bucket it lands in. Two of the ten buckets receive no tick and are shaded and labeled empty. A note at the bottom reads: 2 of 10 buckets get no row, about one in five, under the 95% bar.</desc>
  <text x="50" y="30" font-size="12" font-family="var(--mono)" fill="currentColor" opacity=".7">CONTROLLER TICKS, ABOUT 371 s APART</text>
  <text x="68" y="52" font-size="12" font-family="var(--mono)" fill="var(--accent)">300 s interval plus a 40 to 70 s tick: about 371 s apart</text>
  <line x1="68" y1="60" x2="134" y2="60" stroke="var(--accent)" stroke-width="1.5"/>
  <line x1="68" y1="56" x2="68" y2="64" stroke="var(--accent)" stroke-width="1.5"/>
  <line x1="134" y1="56" x2="134" y2="64" stroke="var(--accent)" stroke-width="1.5"/>
  <rect x="68" y="70" width="9" height="20" fill="var(--accent)"/>
  <rect x="134" y="70" width="9" height="20" fill="var(--accent)"/>
  <rect x="201" y="70" width="9" height="20" fill="var(--accent)"/>
  <rect x="268" y="70" width="9" height="20" fill="var(--accent)"/>
  <rect x="335" y="70" width="9" height="20" fill="var(--accent)"/>
  <rect x="401" y="70" width="9" height="20" fill="var(--accent)"/>
  <rect x="468" y="70" width="9" height="20" fill="var(--accent)"/>
  <rect x="535" y="70" width="9" height="20" fill="var(--accent)"/>
  <line x1="72" y1="90" x2="72" y2="110" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" opacity=".6"/>
  <line x1="138" y1="90" x2="138" y2="110" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" opacity=".6"/>
  <line x1="205" y1="90" x2="205" y2="110" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" opacity=".6"/>
  <line x1="272" y1="90" x2="272" y2="110" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" opacity=".6"/>
  <line x1="339" y1="90" x2="339" y2="110" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" opacity=".6"/>
  <line x1="405" y1="90" x2="405" y2="110" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" opacity=".6"/>
  <line x1="472" y1="90" x2="472" y2="110" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" opacity=".6"/>
  <line x1="539" y1="90" x2="539" y2="110" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" opacity=".6"/>
  <rect x="212" y="110" width="54" height="40" fill="var(--accent)" opacity=".18"/>
  <rect x="482" y="110" width="54" height="40" fill="var(--accent)" opacity=".18"/>
  <rect x="50" y="110" width="54" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <rect x="104" y="110" width="54" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <rect x="158" y="110" width="54" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <rect x="212" y="110" width="54" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <rect x="266" y="110" width="54" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <rect x="320" y="110" width="54" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <rect x="374" y="110" width="54" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <rect x="428" y="110" width="54" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <rect x="482" y="110" width="54" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <rect x="536" y="110" width="54" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="239" y="168" font-size="11" font-family="var(--mono)" fill="var(--accent)" text-anchor="middle">empty</text>
  <text x="509" y="168" font-size="11" font-family="var(--mono)" fill="var(--accent)" text-anchor="middle">empty</text>
  <text x="50" y="168" font-size="12" font-family="var(--mono)" fill="currentColor" opacity=".7">FIXED 300 s BUCKETS</text>
  <text x="50" y="190" font-size="12" fill="currentColor">2 of 10 buckets get no row: about one in five, under the 95% bar.</text>
</svg>
<figcaption>A controller that ticks about every 371 seconds cannot fill a fixed 300-second grid. A fully awake day scored 218 of 288 against a 95% bar.</figcaption>
</figure>

An earlier audit gave me a rule: a check that never binds, one that can never block anything, is a top-severity finding. This bar is the mirror case with the same root cause: nobody had run the threshold against the raw data it judges.

A check that cannot pass measures nothing.
{:.key}

The fix keeps the intent and repairs the geometry. Coverage is now judged on a grid of three times the tick interval, and buckets inside a disclosed blackout are excluded from the expectation. The 95% bar did not move, and I did not re-grade the window: verdicts are never rewritten in this system. The `failed` string stands in the ledger with the analysis beside it. The controller opened window 3 on its own six minutes after window 2 closed, with three fresh sealed challenges, and the coverage fix went in twelve minutes later as the new window's first declared amendment.

## Five signed amendments fixed the grader mid-window

Four other defects turned up during the week. All four were in the controller:

- a liveness rule that leaned on a heartbeat file the controller was not allowed to read
- a config policy with two copies that disagreed about a file mode
- a retry gate that could not tell a wedged slot from a scheduled one
- a retry fuse that counted "the previous repair is still running" as a failed attempt

Each was fixed live through a mechanism I had to build on day one: an owner-run amendment. It swaps only the controller's code between ticks and refuses to touch anything the window has pinned. It records the new tree hash where the controller's own drift detector looks, and the controller has to declare the amendment in its signed ledger on the next tick.

Two owner rulings went through the same door. The first: buckets where my laptop was asleep count as disclosed blackout rather than fleet death. The second: a verifier stall the reaper recovered belongs to the lease system and stays out of the liveness check. The fourth amendment also added an owner-gated command that puts a challenge slot the controller had written off back on the schedule. Without it the day-3 fault would never have fired. All five amendments are listed in the [verdict](/evidence/soak-1/window-2/verdict.json), each with its commit and tree hash.

That mechanism is why the week finished at all. The alternative is restarting the window every time the grader has a bug, which is forever.

## The grader needed more engineering than the agents

- Trace every decision-driving metric to its raw computation before the clock starts, including the ones that have never fired.
- Hold the instrument to the same standard as the system under test. If your verifier gets less engineering than your agent, your results are about your verifier.
- Make amendments part of the proof. A fix signed into the same ledger it grades is evidence; a fix applied off the record is a restart.
- Separate "failed" from "waiting" at the type level. My retry fuse counted a repair that was still running as a failed attempt.
- One policy, one implementation. Every duplicated rule I had disagreed with its twin at first production contact.

Google published a [zero-trust agents post](https://developers.googleblog.com/build-zero-trust-ai-agents-with-googles-agent-development-kit/) the week before this window opened: per-agent keys signing every mutation, continuous ledger re-verification, the assumption that the model can be jailbroken. The design is close to mine. This post adds a completed adversarial window, run against a live fleet. The coding-agent products I have used mostly go the other way and verify by reviewing their own output. For my workload I am not willing to call that verification, and I now have a week of ledger rows for why: all five of the week's signed fixes went to the controller.

## Window 3 was Soak 1's exit test

When I published on September 1, window 3 was still open and due to close September 4. A clean close would end Soak 1 and point the fleet at work I care about. The metric would change from "did it repair the fixture" to verified autonomous closures per human intervention on real work. A failed close would show up in the same ledger.

Scorecard for the week: the fleet and the ledger did better than I expected, and the thesis from the last post held. Keeping work alive after an agent dies was the easy half. The hard half was producing evidence that survived the controller's own bugs.

If you want this check on your own setup, `npx skills add payals/ghost-manual` gives your agent a `/stress-test` command. It prints two lines: what grades the work, and who can edit the grader. On this bundle the second line named me.

## Window 3 passed clean, 3 of 3

*Appended September 4.* Window 3 closed at 00:53:14 this morning on its scheduled tick. The verdict string reads `passed` and `failing_metrics` is an empty list. The numbers come from the controller's schema and are in the [window 3 bundle](/evidence/soak-1/window-3/): 3 sealed challenges, 3 repairs confirmed, 17,688 detector rows, 0 contaminations, 0 interventions, 0 unauthorized writes. The signed projection reconciled with no mismatches. Campaigns 204, 205 and 206 opened at 18:36:00, 18:22:35 and 12:10:17; the last was the sensor's slowest pickup of the week.

This time the injector did its job. All three faults fired on their sealed day, each within one controller tick of its sealed minute (sealed 18:31, 18:14, 11:53; fault times in the table). The receipt is the `injected_at` column of the [challenge table](/evidence/soak-1/window-3/challenges.csv). On the fleet side it was one attempt each, with no lease expiries and no reaps; window 2 exercised the recovery path and this window never needed it. The [event log](/evidence/soak-1/window-3/campaign-events.csv) has 24 rows, eight per campaign, in the same order every time.

Days 5 through 7 were idle. Kernel and controller kept ticking; no campaign opened. That tail is what the coverage, contamination, and liveness bars measure. All eleven detectors passed under the amended coverage rule, and so did the controller's own tick record. The liveness replay flagged 0 buckets; the laptop never slept, so the blackout list is empty. This window carried one amendment, the coverage fix, installed twelve minutes after open and listed in the [verdict](/evidence/soak-1/window-3/verdict.json) with its commit.

One controller defect turned up at close, and it does not touch the verdict. The per-day closures table in the report is wrong. At close it recomputes every day using the window's end as the upper bound, so a day's row also counts closures from later days. The window-level count uses whole-window bounds and is right: three challenges eligible, three closed. Window 2's report has the same rows. Both are disclosed in the bundle indexes rather than edited, the same rule as the `failed` string.

The section above said a clean window would end Soak 1 and point the fleet at real work. The first half is done and its ledger is closed. Window 4, which the controller opened on its own five minutes later, gets closed by hand as an abort rather than run for a seventh repair of the same file. Pointing the fleet at my real repository is a separate decision and a separate post.

Soak 1 totals, across windows 2 and 3: 6 blinded challenges, 6 autonomous repairs confirmed, 0 contaminations, 0 interventions, 14 days no-touch, 35,101 signed detector rows, 6 signed amendments. Window 2's `failed` string stays in the ledger. Window 3 earned the clean one under the amended coverage rule.

*I write more on data reliability and AI systems at [reliable-by-design](https://medium.com/@reliable-by-design) on Medium.*

{% include post-footer.html %}
