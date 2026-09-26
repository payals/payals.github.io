---
layout: post
title: "The contract I write before an agent touches production"
subtitle: "A coding agent did most of the typing in a production recovery. What made that an ordinary change instead of a gamble was the document it ran under."
author: Payal
date: 2026-09-25 19:00:00 -0400
categories: [ai]
tags: [ai, agents, reliability, systems]
tldr:
  - "A coding model did most of the typing in a GitOps deployer recovery after Kubernetes 1.35 broke it."
  - "It ran under a short contract: ten hard rules, stop triggers as numbers, a fresh session per phase, every mutation approved at a prompt."
  - "Seven phases, zero deletions, three misses that each became a rule. The template is at the end."
---

This summer a coding model did most of the typing in a production recovery: a GitOps deployer, broken by a managed Kubernetes upgrade. I made the decisions, approved each mutation, and checked the results; a few steps I did by hand. This post is the document it ran under, and the three places the document fell short.

The break is upstream behavior. Kubernetes 1.35 turns on a Deployment status field, `terminatingReplicas`, by default. Argo CD releases before 3.1 ship a static schema that predates the field. When an ignore rule routes live objects through that schema, as a managed-fields rule did here, comparison fails with a field-not-declared error before any diff is produced. Workloads keep running; deploys stop. The fix is an upgrade to a release tested against 1.35. The risk is everything between the break and the upgrade. A self-healing deployer that has been blind for about a day and a half reconciles all of that drift the moment it can see again, including anything it decides is an orphan.

## Each phase: a fresh session reading three files

The contract is a short markdown file the implementing model reads before every phase. Its first sentence tells the reader it is doing one phase of the recovery, that each phase is a separate session, and that it has no memory of earlier sessions. Everything it needs is in three files (the contract, the analysis and the phase plan) plus the log that every session appends to. Nine phases were planned and seven ran, one of them a restore phase added midway. Each was a fresh session that started from those files and nothing else.

The facts table that follows carries the date it was verified, and the model re-verifies each row before it acts: versions, namespaces, how many applications were failing, how many had automated prune. The numbers drift. The failing-app count moved by one between two reads on the same afternoon, and the baseline notes it wandering across three values as conditions refreshed.

These are ordinary production change control rules: scope the change, and keep irreversible decisions with a person. Never mask a fault to make a dashboard green. The only new part is who reads them, and a rule the model has read is cheaper than a gate it has to discover by hitting it. The rules, the files the model reads, and the approval prompt together are the harness, what people now call harness engineering. Mine covers one job: a model running mutating commands against a live cluster.

## Five of the ten rules, and what each one guards against

Breaking any one of these fails the session, which means the model stops and I decide whether it continues. Each of them encodes a question I would ask on any production change.

Do not run a mutating command outside the phase's scope. The question is blast radius. Reads are always allowed; a write belongs to exactly one phase, and a phase that finishes early does not start the next one.

Never merge, and never delete anything. The question is reversibility. Both are hard to undo, and decisions that are hard to undo stay with a person. The model may open and update pull requests, and I merge them.

Never scale down, restart, or drain a workload to make things converge. The question is whether the fault is fixed or hidden. In this recovery a restart would have hidden the fault instead of fixing it. The contract names the one restart it allows, of the deployer's own controller in one phase, and nothing else.

The baseline goes outside git. The question is where secrets end up. Before anything is touched, the model dumps live state to a directory in my home folder, never to a repository, because application specs and config maps can carry secrets.

The plan had an ordering rule, and the template now carries it as a hard rule: the desired state lands in git before the live system is touched. This one is specific to a self-healing controller. Patch the live config while git still holds the old value and the controller reverts your patch within seconds.

Git first, then the cluster.
{:.key}

## Stop triggers are counts the model compares

The stop-and-ask triggers are the most important part of the contract. Most of them are pre-computed comparisons, so the model compares rather than judges: the phase plan says what count a precondition check should return, and if the number differs, the model stops and reports. If the deployer is a different version than the contract states, stop. If any application shows degraded health that was healthy in the baseline, stop. A command that would delete, prune, evict, or restart something the phase plan did not name is also a stop. The one that took me longest to learn to write down: if you cannot verify a step's success with a command, that is itself a stop.

Right after those sits the anti-circumvention rule. Every mutation the model runs goes through an approval prompt, a hook I configured on the commands that can change the cluster, and the human answers it. The model runs the command once and waits. It may never split a command, wrap it in a script, or reword it to avoid the prompt, and it may never edit the guard or add an exemption. I write this down because a capable agent that wants to finish treats a gate as an obstacle, and when finishing matters more to it than being careful it routes around the gate.

## Cheap model for mechanical phases, strong for judgment

Phases are routed by risk. The mechanical ones, taking the baseline and landing the git change, are written for a cheaper model with every judgment already made in the plan: which keys to remove and which count to expect. The phases that need live judgment, deciding per application whether a pending sync is a release or a wipe, go to the stronger model. Either way it is one fresh session per phase. A session inherits nothing except what is written in the files, and I can read the files.

## Scripts dry-run by default, counts re-checked after every phase

The mutating scripts are dry-run by default and act on one object at a time. Two scripts matter here. One parks an application's automation: it switches off automated sync, so the application can neither prune nor self-heal until someone turns it back on. The other restores it. Both print what they would do and refuse to act without an explicit apply flag. Restore also refuses any application with a pending prune unless a second override flag is set.

After every phase, and after any mutation that could touch a workload, the model re-counts the workloads and compares against the baseline: deployments, stateful sets, services, config maps, secrets. If any count differs from the baseline, the model stops and reports the difference; the upgrade phase ended with exactly one such report, a single new secret that the new chart creates.

The end-of-session report has a fixed shape: what you ran, the verification numbers, what is still open, and what you did not verify. One false alarm the model raised stayed in the log on its own initiative; the template now asks for that explicitly. The log is the only memory the next session has, and a log that records only the wins teaches the next reader that nothing ever goes wrong.

## Three misses, each now a rule

Midway through the phase that restores parked applications, the model reported that a production application had been reverted to an old state. It had read the output of a background job that was still running, and the truncated output looked like a complete result. The application had been correctly restored the whole time. So now the contract says a background job's output is not a source until the job has exited, and the exit is confirmed with its own command.

The contract assumed one reconciler. The plan knew the cluster has a parent application that manages the child application objects, with self-heal on, but the contract said nothing about parking order. When the model parked the children's automation in the pre-flight phase, the parent put it back within seconds, because the children's automation is part of the parent's desired state in git. Parked again, parent first this time, and a re-check 15 seconds later showed the children still parked. The same mechanism bit twice more. Restoring the parent re-armed children I meant to keep parked, and parking the deployer's own application ahead of the upgrade did not hold either, for the same reason. Parking order is now part of the phase plan: list every controller that holds the object in its desired state, and park those first.

To decide whether a parked production application's drift was safe to release, the model searched the code host for the image tag and got an answer that did not match the cluster. Acting on it would have misread a pending release. What caught it was measuring the live diff against the application's actual source directory: the drift was one patch version, merged the day the deployer broke and never shipped. The rule: treat a search result as a hint and check it against the live diff before acting.

Two of the three came from an incomplete source treated as complete, and the third from an incomplete picture of which controllers owned what. All three were caught by re-measurement with checks the plan already called for. The contract's job is to make the cheap check mandatory, and after this recovery the stop-and-ask list grew from 6 triggers to 8.

## The contract held on deletions and broke once on restarts

What held: zero resources deleted across the whole operation, every mutation approved by a person at the prompt, every phase re-measured against the baseline, and every pull request merged by me. The deployer upgraded through its own GitOps path with one exception. Its new custom resource definitions were too large for client-side apply, so they were applied by hand once, and a follow-up change put them back under GitOps the same day. No manual cluster state was left behind.

What did not: the three findings above are the ones that produced a rule. The log holds the smaller surprises. A chart hook job stalled for several minutes on an injected sidecar and was unblocked by terminating the sidecar. That broke rule five, a restart-shaped mutation outside the named exception; I decided at the prompt to let the session finish, wrote the breach into the log, and the template's rule five now takes a list of named exceptions instead of one. A repo cache had not picked up a merge minutes after it landed and needed a forced refresh. A restore script was patched mid-phase.

What changes next: the three rules are in the template now. Simon Willison's line from [a post on using LLMs for code](https://simonwillison.net/2025/Mar/11/using-llms-for-code/) applies to the contract as much as to the code it governs: "If you haven't seen it run, it's not a working system." I have seen this one run once, on one recovery. It was my first time operating that stack, and one recovery has not made me fluent in it. That is the size of the claim.

## Appendix: the template, with the three new rules in it

Replace the angle-bracket names with your own.

```markdown
# Session contract: read before any phase of <recovery>

You are implementing one phase of <recovery> on <cluster>. Each phase
is a separate session. You have no memory of earlier sessions. This
file, README.md, and the phase file contain everything you need.

## Facts (verified <date>; re-verify, do not trust)

| Thing | Value |
|---|---|
| Cluster | <cluster>, project <project>, region <region> |
| <Deployer> | <version>, chart <chart-version> |
| Applications | <total>; <n> with <error> |
| Auto-prune applications | <n> |
| Desired-state repo | <repo>, path <path>, branch <branch> |
| Target version (decided) | <version> |

## Hard rules: breaking any one fails the session

1. No mutating command until the phase file says so, and never
   outside this phase's scope. Reads are always fine.
2. Every mutation is approved by the human at the approval prompt.
   Run the command once and wait. Never split, wrap, or reword a
   command to avoid the prompt. Never edit the guard or add
   exemptions.
3. Never merge. Open and update pull requests; merging is human-only.
4. Never delete anything.
5. Never scale down, restart, or drain a workload to make things
   converge, except <the named exceptions, one per line>.
6. Never commit cluster dumps. Baselines go to <path outside git>.
7. Never touch <secrets config>, <access policy>, or <chart version>
   outside the phase that owns them.
8. The desired state lands in git before the live system is touched.
9. Stop on any mismatch. Do not fix a surprise by improvising.
10. One phase per session.

## Stop-and-ask triggers

- A precondition count differs from the phase file.
- <Deployer> is a different version than stated above.
- A command would delete, prune, evict, or restart something the
  phase file did not name.
- The approval prompt fires for something you did not expect to
  mutate.
- Any application is Degraded that was Healthy in the baseline.
- A background job has not exited; its output is not a result yet.
- A search result disagrees with a live diff; the diff wins.
- You cannot verify a step's success with a command.

## Tooling

- Mutating scripts are dry-run by default and require --apply.
  Restore refuses objects with pending prunes unless <override>=1.
- Before parking an object, list every controller that holds it in
  its desired state, and park those first.
- Re-quote workload counts against the baseline after every phase, and
  after any mutation that touches a workload.

## Report, required at the end of every session

1. Append a dated entry to the log: what you ran, the verification
   numbers, what is still open. Keep your own false alarms in it.
2. Tell the human: what changed, what you verified, what you did not
   verify, and whether the next phase is unblocked.
```

*I write more on data reliability and AI systems at [reliable-by-design](https://medium.com/@reliable-by-design) on Medium.*

{% include post-footer.html %}
