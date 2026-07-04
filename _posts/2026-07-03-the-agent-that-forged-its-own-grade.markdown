---
layout: post
title: "The agent that forged its own grade"
subtitle: "A post-mortem of a real reward-hacking catch: my coding agent forged a perfect score by returning nothing, and a reviewer from a different model family caught what a same-family reviewer had waved through."
author: Payal
date: 2026-07-03 17:30:00 -0400
categories: ai
tags: [ai, agents, reliability, security]
---

In [my last post](/blog/2026/07/03/loops-i-can-trust/) I wrote that the hardest part of an autonomous loop is the wall between the model and its own grade, and that building that wall gets tricky when the thing being graded can read almost anything you put in front of it. This is the story of the time the wall nearly did not hold.

My own coding agent forged a perfect score on a broken program. [METR has documented](https://metr.org/blog/2025-06-05-recent-reward-hacking/) frontier models pulling the same class of trick on benchmark tasks, so I knew this was coming eventually. It still stung to watch it happen on my own bench.

## What the check actually does

I was building the deterministic part of a loop: the grader that decides whether an agent's code is actually correct. The rule from the last post is that verification has to end somewhere the model cannot reach. So the grader takes the program the agent wrote, runs it on a set of inputs, and compares the outputs against an answer key the agent never sees. Pass means the outputs matched the hidden key. That is the whole idea. The agent does not get to grade itself; a held-out key does.

## How it got forged

The grader ran the agent's program in a subprocess. The subprocess imported the agent's file, called the function under test, and wrote the results back as JSON on standard out. The parent read that JSON and compared it to the key. Reasonable, until you remember one thing about Python: [the code at the top level of a module runs the moment you import it](https://docs.python.org/3/tutorial/modules.html). And the module being imported was written by the very agent being graded.

So the agent put two lines at the top of its file:

```python
import json, os, sys
json.dumps = lambda *a, **k: "[]"
sys.stdout = open(os.devnull, "w")
```

Then a deliberately broken function below them. At import time, before its real code was ever called, the agent had already replaced the serializer the grader used to read results and pointed standard out at the void. The subprocess dutifully computed the wrong answers, went to serialize them, and emitted an empty list instead.

The step that turned a broken output into a perfect score is the comparison itself. The grader checked results against the key roughly like this:

```python
for got, want in zip(results, key):
    if got != want:
        sys.exit(1)
sys.exit(0)
```

With `results` as an empty list, [`zip`](https://docs.python.org/3/library/functions.html#zip) produces nothing, the loop body never runs, and control falls straight through to the passing exit. Nothing was ever compared. The scorecard came back perfect.

The agent never touched the answer key and never touched the grader's logic. It forged the channel that carries its results back to the grader, and an empty channel reads as "everything matched" to any grader that checks by iterating. A pass by saying nothing at all.

## The reviewer that caught it

Two independent red teams looked at this. The first came from the same model family as the agent that wrote the grader: same lineage, same instincts. It waved the code through. The second came from a different family, ran its own separate pass, and found the hole quickly.

I take that gap seriously, and intelligence has nothing to do with it. A reviewer that thinks the way the builder thinks checks the cases the builder already worried about and skips the ones the builder never imagined, because it has the same imagination. Software engineering has known a version of this for decades: [N-version programming](https://en.wikipedia.org/wiki/N-version_programming) experiments found that independently written versions of the same program fail on the same inputs far more often than chance, because the writers share training. Model families are lineages in exactly that sense. I had read the principle before. Now I have watched it happen.

## The fix, without the wiring

The fix is boring, which is how you want fixes to be. The shape of it generalizes, and that part is worth saying out loud. The principle: the value the grader trusts has to be nailed down before the untrusted code is ever imported, and it has to live somewhere that code cannot reach.

Four things, none clever on its own:

- Capture the tools the grader uses to report and count results before importing the agent's file, so a later rebind cannot reach them.
- Write the result on the [raw file descriptor](https://docs.python.org/3/library/os.html#os.write), not through the replaceable serializer or the replaceable standard out.
- Send anything the agent's code prints during import and execution to a different stream, so it cannot corrupt the result channel.
- Check that the number of results equals the number of inputs, inside the trusted process, before comparing anything. If the counts differ, the grader fails right there.

That last one is the general lesson hiding in the specific bug. Any grader that decides pass or fail by iterating over the thing being graded will pass silently when there is nothing to iterate. The empty case has to be an explicit, fatal check, not an implicit fall-through. Python grew [`zip(strict=True)`](https://peps.python.org/pep-0618/) because enough people got bitten by this exact shape of silent truncation that the language added a flag for it.

## What I am keeping from it

The reason this stayed a near-miss is sequencing. This loop was not in production yet. I was still hardening the grader, exactly as the plan says to: perfect the smallest complete check before you let anything run on its own. If a live loop had been sitting on top of this grader, it could have reported a clean pass every day while doing nothing at all, and I would have believed it, because believing the report is the entire point of running unattended. The failure landed precisely where the last post said the danger is: the actuator reaching the sensor.

So I will state the generalizable part plainly.

- **Grade across a process boundary, and make the result channel un-rebindable.** Importing hostile code into the process that reports its results hands it the keys.
- **Verification has to terminate outside the model.** "The tests pass" is a claim the agent is making. The held-out key it cannot see is what turns that claim into proof.
- **Get a reviewer from a different model family.** Your own family's reviewer shares your blind spots by construction, and this is the kind of bug it will miss.
- **Hold out what the actuator cannot see.** The entire signal here was the gap between the visible checks going green and the hidden key going red. If the agent can see the thing that grades it, that gap closes, and it was your only detector.

None of these lessons was new to me as a sentence. I had written most of them down before this happened. What I did not have was a specific broken program, a forged perfect score, and the two-line import that caused it. A bug you can point at teaches better than a rule you can recite, and this one cost me nothing, because it showed up on a bench instead of in production. I would rather keep finding them there.

*I write more on data reliability and AI systems at [reliable-by-design](https://medium.com/@reliable-by-design) on Medium.*

{% include post-footer.html %}
