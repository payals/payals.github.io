---
layout: page
title: "Soak 1, window 2: evidence"
permalink: /evidence/soak-1/window-2/
---

Ledger exports for the week described in [My fleet fixed three faults while I slept](/blog/2026/09/01/my-fleet-fixed-three-faults-while-i-slept/). Window 2 opened 2026-08-21 00:41 ET and closed 2026-08-28 00:41 ET. The four data files were exported from the Postgres schemas involved; the report is the controller's own render. One free-text planning note was removed before publishing.

## Files

| File | What it is | Source |
|---|---|---|
| [verdict.json](verdict.json) | The close-time verdict the test controller wrote: pass/fail, failing metrics, ledger reconciliation, liveness replay, revealed challenge schedule, and every signed amendment with its commit and controller tree hash. | `soak.windows.verdict` |
| [window.json](window.json) | The window row minus the verdict: pinned fleet head, fixture head at open, launchd plist and config hashes, controller tree hash, sealed schedule HMAC, and the fingerprints of every `loop.*` function and catalog object the window was graded against. | `soak.windows` |
| [challenges.csv](challenges.csv) | The three blinded challenges: injection time, fixture commit, campaign id, campaign opened and confirmed timestamps, minutes from injection to confirmed, attempts, resolution. | `soak.challenges` joined to `loop.campaigns` and `loop.campaign_events` |
| [campaign-events.csv](campaign-events.csv) | The kernel's own event log for campaigns 201, 202 and 203, heartbeats removed: opened, claimed, attempt started, verifying, reaped, verified, merged, confirmed. | `loop.campaign_events` |
| [controller-report.html](controller-report.html) | The report page the controller rendered at close, as it stood on the shared status directory. Detector status, amendments, and the verdict, unedited. | test controller output |

## How to read it

- `verdict.reconciliation` is the controller re-deriving every signed table from the HMAC chain and comparing it to the live projection. `mismatches: []` on all five tables is the integrity claim.
- `verdict.failing_metrics` lists only `tick_bucket_coverage` and the per-detector `detector_bucket_coverage` entries. Those are the coverage bar discussed in the post; no challenge, intervention, contamination, or liveness criterion is in that list.
- `verdict.liveness_replay` is the close-time re-run of the liveness rule over the whole window: `fails: false`, 6 flagged buckets, 53 disclosed blackout buckets across three intervals.
- `verdict.controller_amendments` is the list of five signed amendments, in order, each carrying the commit it installed and the tree hash it replaced.
- `window.revealed_schedule` is the unsealed challenge schedule, each entry a day of the window and a minute from local midnight. Its HMAC, `sealed_schedule_hmac`, was written at window open, before any challenge fired. Compare it with `injected_at` in `challenges.csv`: the day-2 and day-3 injections trail their sealed minute by a day and more because the injector was down until the amendments of 08-23 and 08-24 in `controller_amendments`; day 6 fired on its minute.
- `challenges.csv` times are wall-clock ET as recorded by each schema. `ledger_recorded_at` is when the controller's next tick observed the campaign as confirmed, so it trails `campaign_confirmed_at` by up to one tick.
- The report's daily metrics table starts at 2026-08-20. That row belongs to window 1, which was contaminated and restarted; window 2 is the rows from 08-21 on.

## What cannot be checked from here

The HMAC key that signs the ledger is not published, so the chain cannot be recomputed from these files alone; what can be checked is internal consistency between the four exports. The controller and kernel source are not published. The commit and tree hashes in `verdict.json` and `window.json` are included so that a later publication can be matched against exactly what ran.

## Integrity

SHA-256 of each file as published:

```
c7d68d56dfe7842dbbe232f39bed08f40d6624316628c144451836b2290463a3  verdict.json
1a34261f0c680d7436d85a7fbe36aefe0a65c68a589513d214992c4e7f8fc10d  window.json
39e429efc926c405c54bc2ffce73013e6fc9b6f555f10d935a3e5c0e15174187  challenges.csv
b6ec593e1726e56ade42e1c9ec8c0450393cabcbd835e76ea70baa934ce2dd0b  campaign-events.csv
7f3d07425a43fff4f3a49fc1c8153bd9a57538497c4794361e9c7f8d22312952  controller-report.html
```
