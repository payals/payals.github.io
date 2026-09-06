---
layout: page
title: "Soak 1, window 3: evidence"
permalink: /evidence/soak-1/window-3/
---

Ledger exports for the second week described in [My fleet fixed three faults while I slept](/blog/2026/09/01/my-fleet-fixed-three-faults-while-i-slept/), appended to that post on September 4. Window 3 opened 2026-08-28 00:47 ET and closed 2026-09-04 00:47 ET with the verdict `passed`. The four data files were exported from the Postgres schemas involved, by the same queries as the [window 2 bundle](/evidence/soak-1/window-2/); the report is the controller's own render. One free-text planning note was removed before publishing, the same one as in window 2.

## Files

| File | What it is | Source |
|---|---|---|
| [verdict.json](verdict.json) | The close-time verdict the test controller wrote: pass/fail, failing metrics, ledger reconciliation, liveness replay, revealed challenge schedule, and the one signed amendment with its commit and controller tree hash. | `soak.windows.verdict` |
| [window.json](window.json) | The window row minus the verdict: pinned fleet head, fixture head at open, launchd plist and config hashes, controller tree hash, sealed schedule HMAC, and the fingerprints of every `loop.*` function and catalog object the window was graded against. | `soak.windows` |
| [challenges.csv](challenges.csv) | The three blinded challenges: injection time, fixture commit, campaign id, campaign opened and confirmed timestamps, minutes from injection to confirmed, attempts, resolution. | `soak.challenges` joined to `loop.campaigns` and `loop.campaign_events` |
| [campaign-events.csv](campaign-events.csv) | The kernel's own event log for campaigns 204, 205 and 206, heartbeats removed: opened, claimed, attempt started, verifying, verified, merge intended, merged, confirmed. | `loop.campaign_events` |
| [controller-report.html](controller-report.html) | The report page the controller rendered at close, as it stood on the shared status directory. Detector status, the amendment, and the verdict, unedited apart from the note above. | test controller output |

## How to read it

- `verdict.passed` is `true` and `verdict.failing_metrics` is empty. `closure_reasons` is `scheduled_close`: the window closed on its clock, not by hand.
- `verdict.reconciliation` is the controller re-deriving every signed table from the HMAC chain and comparing it to the live projection. `mismatches: []` on all five tables is the integrity claim; 17,688 detector rows this window.
- `verdict.liveness_replay` is the close-time re-run of the liveness rule over the whole window: `fails: false`, 0 flagged buckets, 0 blackout buckets. The laptop stayed awake for the whole week.
- `verdict.controller_amendments` has one entry: the coverage-grid fix described in the post, installed twelve minutes after the window opened, carrying the commit it installed and the tree hash it replaced. No amendment after that.
- `window.revealed_schedule` is the unsealed challenge schedule, each entry a day of the window and a minute from local midnight. Its HMAC, `sealed_schedule_hmac`, was written at window open. Compare it with `injected_at` in `challenges.csv`: all three injections landed on their sealed day, within one controller tick of the sealed minute.
- `challenges.csv` times are wall-clock ET as recorded by each schema. `injection_to_confirmed_min` runs from the fault landing on the fixture to the campaign's `confirmed` event and is floored to the minute. `ledger_recorded_at` is when the controller's next tick observed the campaign as confirmed, so it trails `campaign_confirmed_at` by up to one tick.
- The report's daily metrics table starts at 2026-08-27: the window opened at 00:47 on 08-28 and the first nightly metrics pass wrote the previous local day. That row is empty.

## One defect in the report

The per-day metrics table in `controller-report.html` is wrong for the days a challenge ran. At close the controller recomputes every day's row with the window's close time as the upper bound instead of the day's end, so each day's `closures_n` counts closures from that day through the end of the window (3, 3, 2, 1 for 08-28 to 08-31, where the nightly values were 0, 1, 1, 1). The window-level verdict uses whole-window bounds and is unaffected: three eligible campaigns, three closures. The same defect is present in the window 2 report. The report is published as the controller wrote it; the fix goes in as a signed amendment under the next window, and this note is the disclosure.

## What cannot be checked from here

The HMAC key that signs the ledger is not published, so the chain cannot be recomputed from these files alone; what can be checked is internal consistency between the four exports. The controller and kernel source are not published. The commit and tree hashes in `verdict.json` and `window.json` are included so that a later publication can be matched against exactly what ran.

## Integrity

SHA-256 of each file as published:

```
adbe99899a46804f59b955cfe51dfd959806d0dc121624e1864bbbe551c224a2  verdict.json
30d72838eec6ecdbe81533ddc176130ac8f53e45601eef884b4b299988ccd8a9  window.json
9f0b8fce70b835a1af51ccfd17418416d2781d0f73c997d09b2433e6294d8634  challenges.csv
5fb139335dac3b66c8d451681d123ffd6974c699a70751ac5f845d21d893af90  campaign-events.csv
ac09edbdc8de5ecac0ab5916dee2827d4a95d7370efbc437d55c51ac52d7fdbc  controller-report.html
```
