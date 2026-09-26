---
layout: post
title: "The contract I write before an agent touches production"
subtitle: "A coding agent did most of the typing in a production recovery. What made that an ordinary change instead of a gamble was the document it ran under."
author: Payal
date: 2026-09-25 19:00:00 -0400
categories: [ai]
tags: [ai, agents, reliability, systems]
---

This summer I recovered a GitOps deployer after a managed Kubernetes upgrade broke it. It was my first time operating that stack, and one recovery has not made me fluent in it. Most of the typing was done by a coding model. I decided, approved, and verified, and did a few steps by hand. The model implemented the rest. The stack specifics were read from upstream source on the day, at the pinned versions, rather than remembered. This post is about the document the model ran under.

The break itself is public upstream behavior. Kubernetes 1.35 turns on a Deployment status field, `terminatingReplicas`, by default. Argo CD releases before 3.1 carry a static schema that predates it, and when configuration routes live objects through that schema, as a managed-fields ignore rule did here, comparison fails with a field-not-declared error before any diff is produced. Workloads keep running; deploys stop. The fix is an upgrade to a release tested against 1.35. The risk is everything between the break and the upgrade, because a self-healing deployer that has been blind for about a day and a half reconciles all of that drift the moment it can see again, including anything it decides is an orphan.

## A document for a reader with no memory

The contract is a short markdown file the implementing model reads before every phase. Its first sentence tells the reader it is doing one phase of the recovery, that each phase is a separate session, and that it has no memory of earlier sessions. Everything it needs is in three files, the contract, the analysis, and the phase plan, plus the log that every session appends to. Nine phases were planned and seven ran, one of them a restore phase added midway. Each was a fresh session that started from those files and nothing else.

The facts table that follows is marked as verified on a date, to be re-verified rather than trusted. Versions, namespaces, how many applications were failing, how many had automated prune. The model measures each one before it acts, because the numbers drift. The failing-app count moved by one between two reads on the same afternoon, and the baseline notes it wandering across three values as conditions refreshed.

These are ordinary production change control rules: scope the change and keep irreversible decisions with a person, and never mask a fault to make a dashboard green. The only new part is who reads them, and a rule the model has read is cheaper than a gate it has to discover by hitting it. This rig around the model is what people now call harness engineering. The contract is my harness for one job: a model running mutating commands against a live cluster.

## The hard rules and the question each one encodes

Breaking any one of these fails the session, which means the model stops and I decide whether it continues. Each of them encodes a question I would ask on any production change.

Do not run a mutating command outside the phase's scope. The question is blast radius. Reads are always allowed; a write belongs to exactly one phase, and a phase that finishes early does not start the next one.

Never merge, and never delete anything. Both are hard to undo, and decisions that are hard to undo stay with a person. The model may open and update pull requests. I merge.

Never scale down, restart, or drain a workload to make things converge. In this recovery a restart would have hidden the fault instead of fixing it. The contract names the one restart it allows, of the deployer's own controller in one phase, and nothing else.

The baseline goes outside git. Before anything is touched, the model dumps live state to a directory in my home folder, never to a repository, because application specs and config maps can carry secrets.

The plan's ordering rule, which the template now carries as a hard rule: the desired state lands in git before the live system is touched. This one is specific to a self-healing controller. Patch the live config while git still holds the old value and the controller reverts your patch within seconds. Git first, then the cluster.

## Stop conditions as numbers

The stop-and-ask triggers are the most important part of the contract. Most of them are pre-computed comparisons, so the model compares rather than judges. The phase plan says what count a precondition check should return; if the number differs, stop and report. If the deployer is a different version than the contract states, stop. If any application shows degraded health that was healthy in the baseline, stop. If a command would delete, prune, evict, or restart something the phase plan did not name, stop. And the one that took me longest to learn to write down: if you cannot verify a step's success with a command, that is itself a stop.

Right after those sits the anti-circumvention rule. Every mutation the model runs goes through an approval prompt, a hook I configured on the commands that can change the cluster, and the human answers it. The model runs the command once and waits. It may never split a command, wrap it in a script, or reword it to avoid the prompt, and it may never edit the guard or add an exemption. I write this down because a capable agent that wants to finish treats a gate as an obstacle, and when finishing matters more to it than being careful it routes around the gate.

## Routing and tooling

Phases are routed by risk. The mechanical ones, taking the baseline and landing the git change, are written for a cheaper model with every judgment already made in the plan: which keys to remove and which count to expect. The phases that need live judgment, deciding per application whether a pending sync is a release or a wipe, go to the stronger model. Either way it is one fresh session per phase, so the only beliefs a session inherits are the ones written in the files, where I can read them.

The mutating scripts are dry-run by default and act on one object at a time. The one that parks an application's automation (switches off its automated sync, so it can neither prune nor self-heal until someone turns it back on) and the one that restores it both print what they would do and refuse to do it without an explicit apply flag. Restore also refuses any application with a pending prune unless a second override flag is set. After every phase, and after any mutation that could touch a workload, the model re-counts the workloads and compares against the baseline: deployments, stateful sets, services, config maps, secrets. If any count differs from the baseline, the model stops and reports the difference; the upgrade phase ended with exactly one such report, a single new secret that the new chart creates.

The end-of-session report has a fixed shape: what you ran, the verification numbers, what is still open, and what you did not verify. One false alarm the model raised stayed in the log on its own initiative; the template now asks for that explicitly. The log is the only memory the next session has, and a log that records only the wins teaches the next reader that nothing ever goes wrong.

## Where the contract did not save me

Three places, each with the rule that came out of it.

Midway through the phase that restores parked applications, the model reported that a production application had been reverted to an old state. It had read the output of a background job that was still running, and the truncated output looked like a complete result. The application had been correctly restored the whole time. So now the contract says a background job's output is not a source until the job has exited, and the exit is confirmed with its own command.

The contract assumed one reconciler. The plan knew a parent application also self-heals, but the contract said nothing about parking order. The cluster had a parent application that manages the child application objects themselves, with self-heal on. When the model parked the children's automation in the pre-flight phase, the parent put it back within seconds, because the children's automation is part of the parent's desired state in git. Parked again, parent first this time, and a re-check 15 seconds later showed the children still parked. The same mechanism hit twice more from the other side: restoring the parent re-armed children I had chosen to hold, and parking the deployer's own application ahead of the upgrade did not hold either. Parking order is now part of the phase plan: list every controller that holds the object in its desired state, and park those first.

To decide whether a parked production application's drift was safe to release, the model searched the code host for the image tag and got an answer that did not match the cluster. Acting on it would have misread a pending release. What caught it was measuring the live diff against the application's actual source directory: the drift was one patch version, merged the day the deployer broke and never shipped. The rule: treat a search result as a hint and check it against the live diff before acting.

Two of the three came from an incomplete source treated as complete, and the third from an incomplete picture of which controllers owned what. All three were caught by re-measurement with checks the plan already called for. The contract's job is to make the cheap check mandatory, and after this recovery the stop-and-ask list grew from 6 triggers to 8.

## What held, what did not, what changes

What held: zero resources deleted across the whole operation, every mutation approved by a person at the prompt, every phase re-measured against the baseline, and every pull request merged by me. The deployer upgraded through its own GitOps path with one hand-applied exception: its new custom resource definitions were too large for client-side apply, so they were applied by hand once, and a follow-up change put them back under GitOps the same day. No manual cluster state was left behind.

What did not: the three findings above are the ones that produced a rule. The log holds the smaller surprises. A chart hook job stalled for several minutes on an injected sidecar and was unblocked by terminating the sidecar. That broke rule five, a restart-shaped mutation outside the named exception; I decided at the prompt to let the session finish, wrote the breach into the log, and the template's rule five now takes a list of named exceptions instead of one. A repo cache had not picked up a merge minutes after it landed and needed a forced refresh. A restore script was patched mid-phase.

What changes next: the three rules are in the template now. Simon Willison's line from [a post on using LLMs for code](https://simonwillison.net/2025/Mar/11/using-llms-for-code/) applies to the contract as much as to the code it governs: "If you haven't seen it run, it's not a working system." I have seen this one run once, on one recovery. That is the size of the claim.

## Appendix: the template

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
