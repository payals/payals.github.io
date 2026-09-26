---
layout: post
title: "Three Postgres outages that were not Postgres bugs"
subtitle: "Three OS-level failures that show up as database outages, and what to put in the runbook before you hit them."
date: 2026-05-27 09:00:00 -0400
author: Payal
categories: postgres
tags: [postgres, reliability, linux]
series: "Postgres War Stories"
part: 1
tldr:
  - "Three OS faults that surface as Postgres outages: fsync() succeeding after a lost write, glibc 2.28 reordering indexes, THP compaction freezing backends."
  - "The glibc case logs nothing; the THP case shows only in p99."
  - "Four runbook lines cover all three: THP off, REINDEX after any glibc upgrade, data_sync_retry off on a patched release, amcheck on a schedule."
---

Three of the worst Postgres incidents I have read postmortems for started in the kernel, in glibc, or in the page allocator. In each one Postgres did the right thing with the answers the OS gave it.

This series catalogs Postgres production failures I have seen hit many users and clients. It started with one incident, the first time I saw the same failure on several clients' clusters at once; that one gets its own part later. These three come first because the fixes are cheap and most teams still ship without them.

## fsync() returned success on a lost write

For years Postgres assumed two things about `fsync()`: success meant the data was on disk, and an error meant it could retry. Linux did neither. Under writeback errors on some filesystems, the kernel marked the failed pages clean and cleared the error once one reader had seen it. The next `fsync()` returned success, nothing retried those pages, and the data was gone.

This came to be known in 2018 as fsyncgate. The fix in Postgres shipped in the February 2019 minor releases (11.2, 10.7 and the older branches still supported then): PANIC on `fsync()` failure and recover from WAL instead of trusting the OS to retry. The same releases added `data_sync_retry`, which you almost certainly want left at `off`.

What this means for an operator:

- If you run a minor release older than those, upgrade. There is no clever workaround.
- Alert on PANIC events in the logs. They are rare, and they are how the database tells you the OS just admitted to lying.
- If you use a network or shared filesystem, confirm it actually honors `fsync` semantics. Many do not, and the docs rarely say so plainly.

For the long version of how this came to light on the pgsql-hackers list, Jonathan Corbet's [PostgreSQL's fsync() surprise](https://lwn.net/Articles/752063/) on LWN is the canonical writeup.

## glibc 2.28 corrupts btree indexes with no warning

When distros moved to glibc 2.28 (RHEL 8, Debian 10, Ubuntu 18.10 onward), `en_US.UTF-8` collation reordered. The order of strings in btree indexes built before the bump no longer matched what new comparisons returned, so SELECTs missed rows and UNIQUE indexes let duplicates in. Nothing wrote a warning to the log.

The community has spent the years since adding detection (`pg_collation_actual_version`, `pg_database.datcollversion`, a warning on collation version mismatch), so a cluster on a recent major complains loudly. Anything older serves the wrong rows and logs nothing.

There is no clean fix once corrupt indexes have shipped. The workable answers:

- Reindex every text or varchar index after a libc bump. Put it on the upgrade runbook, not the first incident report.
- Use ICU collations where you can. They are versioned independently of the OS, and Postgres knows when they change.
- Run `amcheck` on a schedule. It is not free. It catches this exact failure.

This one keeps surprising teams because the symptom looks like an application bug. A user reports a row they swear was there, and engineering cannot reproduce it, because the index disagrees with the heap: a query that uses the index returns one answer and a seq scan returns another.

To clean this up on a live cluster, Crunchy Data's [How To Correct and Identify Indexes Affected by the GNU C 2.28 Update](https://www.crunchydata.com/blog/glibc-collations-and-data-corruption) has the detection queries and the REINDEX strategy.

## Huge-page compaction shows up only in p99

Linux normally manages memory in 4 KB pages. To reduce TLB pressure for memory-hungry programs, the kernel can promote groups of those into 2 MB "huge" pages. A background thread called `khugepaged` walks process memory looking for opportunities to coalesce small pages into big ones. This feature is transparent huge pages (THP), and on most Linux distros it is on by default.

For most workloads this is fine. But Postgres is not most workloads. A Postgres cluster uses shared memory with many small mappings, forks a fresh backend process per connection, and runs long-lived processes that constantly touch new pages. The compaction work `khugepaged` does in order to satisfy a huge-page allocation can freeze a backend in kernel mode for hundreds of milliseconds at a time. From the database's point of view the query is still running: `pg_stat_activity` shows the backend active on the same statement, and nothing looks wrong. `pg_stat_statements` barely moves either, because the stalls are rare and short and its averages absorb them. The only place the cost surfaces is your p99 latency graph, and it surfaces as random spikes that correlate with nothing in your SQL.

Two checks confirm it quickly:

```
cat /sys/kernel/mm/transparent_hugepage/enabled
# [always] madvise never   -> THP on
# always madvise [never]    -> THP off

cat /sys/kernel/mm/transparent_hugepage/khugepaged/full_scans
# rising fast -> khugepaged is busy scanning
```

If `perf top` shows time in `compact_zone` or `khugepaged` while the spikes happen, that is the confirmation.

The fix is two lines, and they have to survive a reboot:

```
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
```

Persist it through `tuned`, a systemd unit, or the kernel command line (`transparent_hugepage=never`). Managed services such as RDS and Aurora already disable THP for you. On self-hosted clusters, and on Kubernetes Postgres operators like Crunchy or Zalando, check the host or pod spec.

One thing worth keeping separate: *explicit* huge pages are a different feature, and they are good. With a kernel pool configured (`vm.nr_hugepages`) and `huge_pages = try`, Postgres maps `shared_buffers` onto 2 MB pages at startup, which reduces TLB pressure without any background compaction; `try` falls back to normal pages if the pool is missing. The feature you want off is Transparent huge pages. The feature you want on, where the host has the memory for it, is explicit huge pages.

The fullest treatment I have seen of this on modern Postgres is Christophe Pettus's April 2026 post [Huge Pages, End to End](https://thebuild.com/blog/huge-pages-end-to-end/). He argues that on recent kernels the THP stall behavior is much better and that `madvise` is a defensible setting. I still default to `never` on a fresh cluster, but read his post before you decide it is settled.

## Four runbook lines that cover all three

| Layer | What you see | The check | The fix |
|---|---|---|---|
| Kernel writeback | A lost write behind a successful `fsync()`; on a patched release, a PANIC in the logs | Alert on PANIC events in the logs | The February 2019 minors or later (11.2, 10.7), `data_sync_retry` left `off` |
| glibc collation | SELECTs miss rows, UNIQUE indexes let duplicates in, nothing in the log | `amcheck` on a schedule | REINDEX after any glibc upgrade; ICU collations where you can |
| THP | Random p99 spikes that correlate with nothing in your SQL | `cat /sys/kernel/mm/transparent_hugepage/enabled`, then `perf top` | `echo never` to both `enabled` and `defrag`, persisted through reboot |

Every cluster I set up now gets four lines. None of them are clever, and none of them are about Postgres itself:

1. Disable THP, both `enabled` and `defrag`. Persist through reboot.
2. Pin glibc, or use ICU collations. REINDEX after any glibc upgrade.
3. Confirm `data_sync_retry` is `off` and you are on a release with the 2019 fsync fix.
4. Run `amcheck` on a schedule and alert on findings.

The pattern worth keeping: Postgres trusts the layer beneath it, and that layer has bugs of its own.

When the Postgres logs are clean and something is still wrong, look one layer down, at the kernel and libc, before you look inside Postgres.
{:.key}

Next in the series: corruption inside Postgres itself, TOAST chunk errors and multixact wraparound, and how to find it before a query does.

{% include post-footer.html %}
