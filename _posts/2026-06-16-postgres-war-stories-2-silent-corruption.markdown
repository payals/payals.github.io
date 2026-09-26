---
layout: post
title: "Three silent Postgres corruptions and the jobs that catch them"
subtitle: "Three ways data goes wrong inside Postgres with nothing in the log, and the jobs that catch it before a user does."
tldr:
  - "Multixact wraparound has its own counter, default freeze age 400 million, and the XID dashboard misses it."
  - "Postgres does not know it is wrong. Ask on a schedule: pg_amcheck on a replica, nightly pg_dump to /dev/null, both wraparound counters on one dashboard."
  - "Checksums default on from Postgres 18. Older: SHOW data_checksums; if off, pg_checksums (12+) enables them offline."
date: 2026-06-16 09:00:00 -0400
author: Payal
categories: postgres
tags: [postgres, reliability, data-integrity]
series: "Postgres War Stories"
part: 2
---

Three Postgres corruptions with nothing in the log: a wrapped multixact counter on 9.3, a missing TOAST chunk that surfaces months later in `pg_dump`, and a torn 8 KB page that reads back clean. All three sit one layer above the kernel, glibc and page-allocator bugs of [Part 1]({% post_url 2026-05-27-postgres-war-stories-1-the-bugs-that-arent-postgres %}), and all three are worse. The logs are clean and recovery never runs. A query returns the wrong answer, or drops rows that are still on disk, and no error fires.

The three have nothing in common except the part that makes them dangerous: none raises an error while the damage is being done, and the check that catches each one early is one you schedule.

## Multixact age is a second wraparound counter

This is the one that scares me most, so it goes first. When more than one transaction holds a row-level lock on the same row, Postgres cannot record a single transaction ID on that row. It allocates a MultiXactId, a small object that names the set of transactions involved, and stores that instead. `SELECT ... FOR SHARE`, `SELECT ... FOR UPDATE`, and the `FOR KEY SHARE` locks that foreign-key checks take all create them.

Postgres 9.3 leaned on this much harder than any version before it. It added gentler row-lock modes so foreign-key checks stopped blocking updates to non-key columns, and that machinery ran on multixacts. The feature was good and the first releases of it were not. Multixact bugs got fixed across the early 9.3 minors, and the heavy data-integrity fixes landed in [9.3.5 in July 2014](https://www.postgresql.org/docs/9.3/release-9-3-5.html): wraparound handling for `pg_multixact/members`, and truncating `pg_multixact` at checkpoint instead of during `VACUUM`. If you ran 9.3 at point-zero, you ran the version before those fixes existed.

The part that outlived 9.3 is the second counter. Multixact members and offsets have their own wraparound counter, separate from the transaction ID counter everyone monitors. A cluster can sit at a comfortable XID age and still hit:

```
ERROR: database is not accepting commands that assign new MultiXactIds to avoid wraparound data loss in database "orders"
```

This stays hidden because the standard wraparound dashboard watches `age(datfrozenxid)` and stops there. Multixact age is a different number, and a workload heavy on foreign keys or `SELECT ... FOR SHARE` can age multixacts far faster than plain transactions. It fails the same way XID wraparound does, with half the monitoring coverage. [Richard Yen's writeup](https://richyen.com/postgres/2026/05/18/multixact_wraparound.html) walks through the mechanics if you want them. One query reads both counters:

```sql
SELECT datname,
       age(datfrozenxid)    AS xid_age,
       mxid_age(datminmxid) AS mxid_age
FROM pg_database;
```

What this means for an operator:

- Monitor multixact age on the same dashboard as XID age; they are two separate counters and the second one is usually missing. AWS has a [piece on multixact monitoring](https://aws.amazon.com/blogs/database/multixacts-in-postgresql-usage-side-effects-and-monitoring/) with the full set of queries.
- Tune `autovacuum_multixact_freeze_max_age` deliberately. The default is 400 million, and a workload heavy on foreign keys ages multixacts faster than it ages transactions.
- Keep a minor-version pinning policy and never deploy x.y.0. The 9.3 multixact era is the reason this rule exists.

## A missing TOAST chunk surfaces months later

Postgres stores large field values out of line. When a row passes roughly 2 KB, Postgres compresses its wide values and, if that is not enough, slices them into chunks stored in a hidden companion table, the TOAST table. Each chunk is a row keyed by a chunk ID and a sequence number. The visible row keeps a pointer. This is [TOAST](https://www.postgresql.org/docs/current/storage-toast.html).

It needs no attention until a chunk goes missing or comes back numbered wrong. The row reads fine right up until something dereferences the TOAST pointer, and then:

```
ERROR: unexpected chunk number 0 (expected 1) for toast value 76753264 in pg_toast_10920100
ERROR: missing chunk number 0 for toast value 14227980
```

These usually trace back to storage doing something Postgres trusted: a torn or dropped write, or bit rot on the volume underneath. They have been showing up on the mailing lists for more than a decade, on every storage stack you can name. The missing-chunk variant was [reported in 2004](https://www.postgresql.org/message-id/eca519a10407071405369a1639%40mail.gmail.com); the unexpected-chunk variant has [more recent threads](https://www.postgresql.org/message-id/20170611033840.hruqadsk47qcdrqb%40alvherre.pgsql).

What makes it a silent-corruption story is the delay. A `SELECT` that skips the wide column succeeds and every dashboard stays green, so the damage surfaces months later, usually the first time something reads the whole row. In practice that is often `pg_dump` during a backup, long after the write that broke it.

The checks that catch it:

- A logical dump reads every value, TOAST chunks included. If you already back up with `pg_dump`, the backup is your scan: alert when it fails and read the error. If not, a nightly `pg_dump` to `/dev/null` on a replica is the cheapest full-table corruption scan you have.
- `amcheck`'s `verify_heapam` with `check_toast` turned on will flag TOAST pointers that reference missing or invalid chunks. It is slow. Run it anyway, on a replica.
- When you hit it live, isolate the bad rows by `ctid` before you touch anything. Decide between restoring from a known-good backup and deleting the unreadable rows. Do not run `VACUUM FULL` on the table; it can rewrite a partly readable table into one nothing can read.

## Torn pages read back clean without checksums

A torn page is what you get when an 8 KB page write is interrupted partway through and nothing repairs it. Crash recovery replays full-page images from WAL for the writes it knows about, so the torn pages that survive come from storage that reported a write it never finished, or from bit rot with no crash to blame. The page that lands is structurally plausible and wrong. The same torn writes are behind many of the TOAST errors above. The difference is where the page lives: a corrupt TOAST page fails the first time something reads the wide column, while a corrupt heap page can hand back a wrong row and say nothing. Without data checksums, Postgres reads that page back, sees nothing obviously malformed, and trusts it.

Data checksums catch exactly this. For years they were off by default. You had to remember to pass `--data-checksums` to `initdb` at cluster creation, and most clusters were not created by someone thinking about bit rot that day. So a large share of running Postgres has no checksum protection and the operators do not know it.

That default finally flipped. Postgres 18's `initdb` enables data checksums every time, with a new `--no-data-checksums` flag to opt out; [Crunchy Data's writeup](https://www.crunchydata.com/blog/postgres-18-new-default-for-data-checksums-and-how-to-deal-with-upgrades) covers the upgrade path. One constraint before you upgrade: `pg_upgrade` requires the old and new clusters to have the same checksum setting, both on or both off. Upgrading an old checksum-less cluster onto a fresh 18 cluster means either initializing the new one with `--no-data-checksums` to match, or enabling checksums on the old data first.

With checksums on, the corruption that used to read back clean produces an error instead of a wrong answer:

```
WARNING: page verification failed, calculated checksum 3482 but expected 32232
```

Jeremy Schneider has a [walkthrough](https://ardentperf.com/2019/11/08/postgresql-invalid-page-and-checksum-verification-failed/) of what to do when you see this, including what `ignore_checksum_failure` and `zero_damaged_pages` do. `ignore_checksum_failure` reads past the bad checksum; `zero_damaged_pages` throws the damaged page away, rows and all, so the rest of the table can be read. Both are last-resort salvage settings. Turn them off again once the page is dealt with.

What to run on every cluster:

- Run `SHOW data_checksums;`. If it says `off`, a torn page that looks well-formed will never be reported.
- You do not need a dump and restore to fix that. `pg_checksums`, built in since Postgres 12, enables checksums on an existing cluster offline. The cluster has to be cleanly shut down for the duration, and on a large cluster the duration is real, so plan the window. It is the same tool that earlier shipped as `pg_verify_checksums` in 11, back when it could only verify.
- Once checksums are on, alert on `page verification failed` in the logs and on `pg_stat_database.checksum_failures`. Both are rare and never false positives, so page on the first one.

## Corruption is found by the check you scheduled

Nothing pages you for corruption inside Postgres, so the check has to be a scheduled job. `amcheck` ships in contrib and has since [Postgres 10](https://www.postgresql.org/docs/current/amcheck.html). `bt_index_check` and `bt_index_parent_check` verify that a B-tree index still respects its own invariants, which is how you catch the glibc collation reordering from Part 1 and ordinary index corruption alike. Postgres 14 added `verify_heapam` for the heap itself and the [`pg_amcheck`](https://www.postgresql.org/docs/current/app-pgamcheck.html) command-line wrapper that runs both across a whole database or cluster in one invocation. Point it at a replica so the cost stays off the primary, and remember that a replica checks only its own copy: storage damage confined to the primary's disks needs the same check there, in a quiet window. A logical dump to `/dev/null` on a replica reads every row and TOAST chunk, which catches what an index-only check walks right past.

| Failure | What the log says | What finds it | Where to run it |
|---|---|---|---|
| Multixact wraparound | A warning as the limit nears, then `database is not accepting commands` | `mxid_age(datminmxid)` beside `age(datfrozenxid)` | The XID dashboard |
| Missing TOAST chunk | Nothing, until something reads the whole row | `pg_dump` to `/dev/null`; `verify_heapam` with `check_toast` | A replica, on a schedule |
| Torn page | Nothing without checksums; `page verification failed` with them | Data checksums; alert on `pg_stat_database.checksum_failures` | Every cluster, once checksums are on |

## Five runbook lines catch all three before a user does

All five are about asking the database whether it is still telling the truth:

1. Monitor multixact age beside XID age, and tune `autovacuum_multixact_freeze_max_age` rather than trusting the default.
2. Pin minor versions and never run x.y.0; the early 9.3 multixact bugs are why.
3. Turn on data checksums. Use `pg_checksums` on an existing cluster, `initdb` defaults on a new one. Alert on `page verification failed` and on `pg_stat_database.checksum_failures`.
4. Run `pg_amcheck` against a replica as a scheduled job, heap and indexes both, and alert on any finding.
5. Take a nightly logical dump to `/dev/null` on a replica as a corruption canary.

Part 1's rule was "look down before you look in." The rule this part adds is harder to keep: the database will not tell you it is corrupt.

You have to ask it, on a schedule, when nothing is wrong.
{:.key}

Next in the series: the corruption you cause yourself by upgrading, starting with `pg_upgrade` and the 9.4 and 9.5 freeze-map bug, and why a fast upgrade is also a fast way to lose data.

{% include post-footer.html %}
