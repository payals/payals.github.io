---
layout: post
title: "Postgres War Stories Part 2: multixact wraparound, TOAST corruption, and torn pages"
subtitle: "Three ways data goes wrong inside Postgres with nothing in the log, and the jobs that catch it before a user does."
date: 2026-06-16 09:00:00 -0400
author: Payal
categories: postgres
---

[Part 1]({% post_url 2026-05-27-postgres-war-stories-1-the-bugs-that-arent-postgres %}) was about failures that start one layer below Postgres: the kernel, glibc, the page allocator. This post is about the worse class, where the failure is inside Postgres itself. The logs are clean. Recovery never runs. And a query either returns the wrong answer or drops rows that are still sitting on disk.

The three incidents below have nothing in common except the part that makes them dangerous: there is no error to alert on. A wrapped-around multixact counter, a missing TOAST chunk, a torn page on disk, none of them rings a bell. The database does not know it is wrong. You either schedule a job that goes looking, or you find out when a user tells you a row they swear existed is gone.

So this post is half incidents, half detection. The detection is the point.

## Multixacts: the wraparound nobody watches

This is the one that scares me most, so it goes first. When more than one transaction holds a row-level lock on the same row, Postgres cannot record a single transaction ID on that row. It allocates a MultiXactId, a small object that names the set of transactions involved, and stores that instead. `SELECT ... FOR SHARE`, `SELECT ... FOR UPDATE`, and the `FOR KEY SHARE` locks that foreign-key checks take all create them.

Postgres 9.3 leaned on this much harder than any version before it. It added gentler row-lock modes so foreign-key checks stopped blocking each other, and that machinery ran on multixacts. The feature was good. The implementation took a while to settle, and the settling happened in production. Across the early 9.3 minor releases a series of multixact bugs got fixed, with the heavy data-integrity work landing in [9.3.5 in July 2014](https://www.postgresql.org/docs/9.3/release-9-3-5.html): wraparound handling for `pg_multixact/members`, and a change to truncate `pg_multixact` during checkpoints instead of during `VACUUM`, specifically so segments still needed for WAL replay after a crash could not be removed early. If you ran 9.3 at point-zero, you ran the version before those fixes existed.

The lesson that outlived 9.3 is structural. Multixact members and offsets have their own wraparound counter, completely separate from the transaction ID counter everyone monitors. A cluster can sit at a comfortable XID age and still hit:

```
ERROR: database is not accepting commands that assign new MultiXactIds to avoid wraparound data loss in database "orders"
```

This stays hidden because the standard wraparound dashboard watches `age(datfrozenxid)` and stops there. Multixact age is a different number, and a workload heavy on foreign keys or `SELECT ... FOR SHARE` can age multixacts far faster than plain transactions. [Richard Yen's writeup](https://richyen.com/postgres/2026/05/18/multixact_wraparound.html) calls multixact wraparound the equally-evil twin of XID wraparound, which is exactly right: same failure mode, half the monitoring coverage.

What this means for an operator:

- Monitor multixact age on the same dashboard as XID age; they are two separate counters and the second one is usually missing. One query covers both: `SELECT datname, age(datfrozenxid) AS xid_age, mxid_age(datminmxid) AS mxid_age FROM pg_database;`. AWS has a [thorough piece on multixact monitoring](https://aws.amazon.com/blogs/database/multixacts-in-postgresql-usage-side-effects-and-monitoring/) if you want the full set of queries.
- Tune `autovacuum_multixact_freeze_max_age` deliberately. The default is 400 million. Leaving freeze entirely to luck is how you discover the second counter.
- Keep a minor-version pinning policy and never deploy x.y.0. The 9.3 multixact era is the canonical reason this rule exists.

## TOAST: unexpected chunk number

Postgres stores large field values out of line. Anything past roughly 2 KB after compression gets sliced into chunks and pushed into a hidden companion table, the TOAST table, where each chunk is a row keyed by a chunk ID and a sequence number. The visible row keeps a pointer. This is [TOAST](https://www.postgresql.org/docs/current/storage-toast.html), and most of the time you never think about it.

You think about it when a chunk goes missing or comes back numbered wrong. The row reads fine right up until something dereferences the TOAST pointer, and then:

```
ERROR: unexpected chunk number 0 (expected 1) for toast value 76753264 in pg_toast_10920100
ERROR: missing chunk number 0 for toast value 14227980
```

These usually trace back to storage doing something Postgres trusted: a torn write, a dropped page, bit rot on the volume underneath. People have been showing up on the mailing lists with these for more than a decade, across every storage stack you can name, from a [2004 report](https://www.postgresql.org/message-id/eca519a10407071405369a1639%40mail.gmail.com) of the missing-chunk variant to [more recent threads](https://www.postgresql.org/message-id/20170611033840.hruqadsk47qcdrqb%40alvherre.pgsql) on the unexpected-chunk one.

What makes it a silent-corruption story is the delay. A `SELECT` that never reads the wide column succeeds. The table looks healthy in every dashboard. The damage surfaces months later, often the first time something reads the whole row, which in practice is often `pg_dump` during a backup. That is a bad time to learn your data is unreadable.

What this means for an operator:

- A logical dump reads every value, TOAST chunks included. `pg_dump` piped to nowhere on a replica is the cheapest full-table corruption scan you have, and it costs you nothing you were not already paying for backups.
- `amcheck`'s `verify_heapam` with `check_toast` turned on will flag TOAST pointers that reference missing or invalid chunks. It is slow. Run it anyway, on a schedule, on a replica.
- When you hit it live, isolate the bad rows by `ctid` before you touch anything. Decide between restoring from a known-good backup and deleting the unreadable rows. Do not reach for `VACUUM FULL` and hope. You can turn a readable mess into an unreadable one.

## Torn pages and the checksum you never turned on

A torn page is what you get when a crash or power loss interrupts an 8 KB page write partway through. The page that lands is structurally plausible and wrong. Storage bit rot does the same thing without even a crash to blame. These are the torn writes and dropped pages behind many of the TOAST errors above, except a corrupt heap page can hand back a wrong row directly, with no oversized value involved. Without data checksums, Postgres reads that page back, sees nothing obviously malformed, and trusts it.

Data checksums catch exactly this. The catch, for years, was that they were off by default. You had to remember to pass `--data-checksums` to `initdb` at cluster creation, and most clusters were not created by someone thinking about bit rot that day. So a large share of running Postgres has no checksum protection and the operators do not know it.

That default finally flipped. As Crunchy Data describes in [Postgres 18's new checksum default](https://www.crunchydata.com/blog/postgres-18-new-default-for-data-checksums-and-how-to-deal-with-upgrades), `initdb` now enables data checksums every time, with a new `--no-data-checksums` flag to opt out. There is one sharp edge worth knowing before you upgrade: `pg_upgrade` requires the old and new clusters to have the same checksum setting, both on or both off. Upgrading an old checksum-less cluster onto a fresh 18 cluster means either initializing the new one with `--no-data-checksums` to match, or enabling checksums on the old data first.

With checksums on, the corruption that used to read back clean turns into a loud, locatable error:

```
WARNING: page verification failed, calculated checksum 3482 but expected 32232
```

Jeremy Schneider has a [detailed walkthrough](https://ardentperf.com/2019/11/08/postgresql-invalid-page-and-checksum-verification-failed/) of what to do when you see this, including how `ignore_checksum_failure` and `zero_damaged_pages` behave and why you should treat both as scalpels, not switches.

What this means for an operator:

- Run `SHOW data_checksums;`. If it says `off`, you are flying without this entirely.
- You do not need a dump and restore to fix that. `pg_checksums`, built in since Postgres 12, enables checksums on an existing cluster offline. The cluster has to be cleanly shut down for the duration, and on a large cluster the duration is real, so plan the window. It is the same tool that earlier shipped as `pg_verify_checksums` in 11, back when it could only verify.
- Once checksums are on, alert on `page verification failed` in the logs and on `pg_stat_database.checksum_failures`. These lines are rare and always real.

## Detection is the job

The thread through all three is that waiting does not work. Corruption inside Postgres is not an event that pages you. It is a state you discover, and you only discover it on purpose. Four tools do the discovering, and none of them are exotic.

`amcheck` ships in contrib and has since [Postgres 10](https://www.postgresql.org/docs/current/amcheck.html). `bt_index_check` and `bt_index_parent_check` verify that a B-tree index still respects its own invariants, which is how you catch the glibc collation reordering from Part 1 and ordinary index corruption alike. Postgres 14 added `verify_heapam` for the heap itself and the [`pg_amcheck`](https://www.postgresql.org/docs/current/app-pgamcheck.html) command-line wrapper that runs both across an entire database, or the whole cluster, in one invocation. Point it at a replica so the cost stays off the primary.

`pg_checksums` plus the `data_checksums` setting cover the on-disk class going forward. A logical dump to `/dev/null` on a replica reads every row and every TOAST chunk, which catches the things an index-only check walks right past. And the two wraparound counters, XID and multixact, both belong on the same dashboard.

None of this is clever. All of it is scheduled, boring, and the only reason you find out before your users do.

## What goes into the runbook

After these three, a cluster picks up five lines that are all about asking the database whether it is still telling the truth:

1. Monitor multixact age beside XID age, and tune `autovacuum_multixact_freeze_max_age` rather than trusting the default.
2. Pin minor versions and never run x.y.0. The 9.3 multixact bugs are the receipt.
3. Turn on data checksums. Use `pg_checksums` on an existing cluster, `initdb` defaults on a new one. Alert on `page verification failed` and on `pg_stat_database.checksum_failures`.
4. Run `pg_amcheck` against a replica on a schedule, heap and indexes both, and alert on any finding.
5. Take a nightly logical dump to `/dev/null` on a replica as a corruption canary.

Part 1 closed with look down before you look in. This one closes with the harder habit: the database will not tell you it is corrupt. You have to ask it, on a schedule, when nothing is wrong.

Next post in the series: the corruption you cause yourself by upgrading. `pg_upgrade`, the 9.4 and 9.5 freeze-map bug, and why a fast upgrade is also a fast way to lose data.
