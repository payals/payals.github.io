---
layout: post
title: "Postgres War Stories Part 1: Postgres outages that aren't Postgres bugs"
subtitle: "Three OS-level failures that show up as database outages, and what to put in the runbook before you hit them."
date: 2026-05-27 09:00:00 -0400
author: Payal
categories: postgres
---

This series is aimed at recounting, explaining, and cataloging issues pertaining to Postgres in large-scale production environments that affected a wide section of users and clients. The idea occured to me when discussing one specific issue (covered in a later part in this series) that was my first experience dealing with such issues on a wide scale (multiple clients and clusters affected). This specific part focuses on issues that were caused not by Postgres itself, but by the tools, OS, and ecosystems that Postgres relies on.

Three of the worst Postgres incidents I have read postmortems for did not start in Postgres. They started one layer down: the kernel, glibc, the page allocator. Postgres handled the input correctly given what it was told.

I want to cover these first because the fixes are cheap and most teams still ship without them.

## fsyncgate (2018)

For years, Postgres assumed that if `fsync()` returned success, the data was on disk, and if it returned an error, it could be retried. Linux did neither. Under writeback errors on some filesystems, the kernel cleared the error after the first reader saw it. The next `fsync()` returned success while pages were still dirty in memory and never made it to disk.

This came to be known as fsyncgate. The fix in Postgres was to PANIC on `fsync()` failure (PG 11+), forcing recovery from WAL instead of trusting the OS to retry. There is also `data_sync_retry`, which you almost certainly want set to `off`.

What this means for an operator:

- If you run anything older than PG 11, plan the upgrade. There is no clever workaround.
- Alert on PANIC events in the logs. They are rare, and they are how the database tells you the OS just admitted to lying.
- If you use a network or shared filesystem, confirm it actually honors `fsync` semantics. Many do not, and the docs rarely say so plainly.

For the long version of how this came to light on the pgsql-hackers list, Jonathan Corbet's [PostgreSQL's fsync() surprise](https://lwn.net/Articles/752063/) on LWN is the canonical writeup.

## glibc 2.28 and the silent index corruption

When distros moved to glibc 2.28 (RHEL 8, Debian 10, Ubuntu 19.10 onward), `en_US.UTF-8` collation reordered. The order of strings in btree indexes built before the bump no longer matched what new comparisons returned. SELECTs missed rows. UNIQUE indexes let duplicates in. Nothing logged a warning.

The community has spent the years since adding detection: `pg_collation_actual_version`, `pg_database.datcollversion`, mismatch warnings. Newer versions complain loudly. Older clusters stay silent and wrong.

There is no clean fix once corrupt indexes have shipped. The workable answers:

- Reindex every text or varchar index after a libc bump. Put it on the upgrade runbook, not the first incident report.
- Use ICU collations where you can. They are versioned independently of the OS, and Postgres knows when they change.
- Run `amcheck` on a schedule. It is not free. It catches this exact failure.

The reason this one keeps surprising teams is that the symptom looks like an application bug. A user reports a row they swear was there. Engineering cannot reproduce it. The index disagrees with the heap, and queries that hit the index disagree with queries that fall through to a seq scan.

If you actually have to clean this up on a live cluster, Crunchy Data's [How To Correct and Identify Indexes Affected by the GNU C 2.28 Update](https://www.crunchydata.com/blog/glibc-collations-and-data-corruption) walks through the detection queries and the REINDEX strategy in detail.

## Transparent huge pages

Linux normally manages memory in 4 KB pages. To reduce TLB pressure for memory-hungry programs, the kernel can promote groups of those into 2 MB "huge" pages. A background thread called `khugepaged` walks process memory looking for opportunities to coalesce small pages into big ones. This feature is Transparent Huge Pages, or THP, and on most modern Linux distros it is on by default.

For most workloads this is fine. But Postgres is not most workloads. A Postgres cluster uses shared memory with many small mappings, forks a fresh backend process per connection, and runs long-lived processes that constantly touch new pages. The compaction work `khugepaged` does in order to satisfy a huge-page allocation can freeze a backend in kernel mode for hundreds of milliseconds at a time. From the database's point of view the query is not running. From `pg_stat_activity` the backend looks idle. `pg_stat_statements` shows no slow query, because the slow part happened underneath the planner. The only place the cost surfaces is your p99 latency graph, and it surfaces as random spikes that correlate with nothing in your SQL.

Two checks confirm it quickly:

```
cat /sys/kernel/mm/transparent_hugepage/enabled
# [always] madvise never   -> THP on
# always madvise [never]    -> THP off

cat /sys/kernel/mm/transparent_hugepage/khugepaged/full_scans
# rising fast -> active compaction in progress
```

If `perf top` shows time in `khugepaged` or `compact_zone`, the diagnosis is done.

The fix is one line, and it should be persistent:

```
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
```

Persist it through `tuned`, a systemd unit, or the kernel command line (`transparent_hugepage=never`). Managed services such as RDS and Aurora already disable THP for you. On self-hosted clusters, and on Kubernetes Postgres operators like Crunchy or Zalando, check the host or pod spec.

One thing worth keeping separate: *explicit* huge pages are a different feature, and they are good. The Postgres `huge_pages = try` setting reserves 2 MB pages up front for `shared_buffers`, which reduces TLB pressure without needing any background compaction. The feature you want off is Transparent huge pages. The feature you want on, where the host has the memory for it, is explicit huge pages.

The fullest treatment I have seen of this on modern Postgres is Christophe Pettus's [Huge Pages, End to End](https://thebuild.com/blog/2026/04/24/huge-pages-end-to-end/). He argues that on recent kernels the THP stall behavior is much better and `madvise` is a defensible setting, not just `never`. I still default to disabling THP on a fresh cluster, but his post is worth reading before you decide it is settled.

## What goes into the runbook

After these three, a new cluster picks up four lines that have nothing to do with Postgres itself:

1. Disable transparent huge pages, both `enabled` and `defrag`. Persist through reboot.
2. Pin glibc, or use ICU collations. REINDEX after any libc or kernel upgrade.
3. Confirm `data_sync_retry` is `off` and you are on PG 11 or newer.
4. Run `amcheck` on a schedule and alert on findings.

None of these are clever. They are all known. The pattern worth keeping is that Postgres trusts the layer beneath it, that sometimes has its own bugs. When the database logs are clean and something is still wrong, look down before you look in.

Next post in the series: corruption that lives inside Postgres itself. TOAST chunk errors, multixact wraparound, and the question of how you find out before your users do.
