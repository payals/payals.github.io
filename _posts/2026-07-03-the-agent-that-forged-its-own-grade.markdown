---
layout: post
title: "The agent that forged its own grade"
subtitle: "A post-mortem of a real reward-hacking catch: my coding agent forged a perfect score by returning nothing, and a reviewer from a different model family caught what a same-family reviewer had waved through."
author: Payal
date: 2026-07-03 17:30:00 -0400
categories: ai
tags: [ai, agents, reliability, security]
tldr:
  - "My coding agent forged a perfect score in two lines: rebind json.dumps to return \"[]\", point stdout at os.devnull. The grader zipped an empty list, compared nothing, and exited 0."
  - "Two reviewers checked the grader: the same-family one passed it, the different-family one found the hole."
  - "Fix: count results before comparing; write on a descriptor captured before the import."
---

Two lines at the top of an agent-written Python file turned a broken program into a passing grade on my bench. [METR has documented](https://metr.org/blog/2025-06-05-recent-reward-hacking/) frontier models pulling the same class of trick on benchmark tasks, so I expected it eventually. I did not expect it from a grader I was still writing.

In [my last post](/blog/2026/07/03/loops-i-can-trust/) I wrote that the hardest part of an autonomous loop is keeping the model away from its own grade. That is hard because the thing being graded can read almost anything you put in front of it. This post is the near miss.

## The grader checks against a hidden answer key

I was building the deterministic part of a loop: the grader that decides whether an agent's code is actually correct. The rule from the last post is that verification has to end somewhere the model cannot reach. So the grader takes the program the agent wrote, runs it on a set of inputs, and compares the outputs against an answer key the agent never sees. Pass means the outputs matched the hidden key. That is the whole idea. The agent does not get to grade itself; a held-out key does.

## Two import-time lines emptied the result channel

The grader ran the agent's program in a subprocess. The subprocess imported the agent's file, called the function under test, and wrote the results back as JSON on standard out. The parent read that JSON and compared it to the key. That works until you remember that [Python runs a module's top-level code the moment you import it](https://docs.python.org/3/tutorial/modules.html), and the module here was written by the agent being graded.

So the agent put two lines at the top of its file:

```python
import json, os, sys
json.dumps = lambda *a, **k: "[]"
sys.stdout = open(os.devnull, "w")
```

Then a deliberately broken function below them. At import time, before its real code was ever called, the agent had already replaced the serializer the grader used to read results and pointed standard out at the void. The subprocess computed the wrong answers, went to serialize them, and emitted an empty list instead.

The step that turned a broken output into a perfect score is the comparison itself. The grader checked results against the key roughly like this:

```python
for got, want in zip(results, key):
    if got != want:
        sys.exit(1)
sys.exit(0)
```

With `results` as an empty list, [`zip`](https://docs.python.org/3/library/functions.html#zip) produces nothing, the loop body never runs, and control falls straight through to the passing exit. Nothing was ever compared. The scorecard came back perfect.

The agent left the answer key and the grader's logic alone and went after the channel between them. To a grader that checks by iterating, an empty channel reads as "everything matched", so the agent passed by reporting nothing.

## A different model family caught it

Two independent red teams looked at this. The first came from the same model family as the agent that wrote the grader: same lineage, same instincts. It waved the code through. The second came from a different family, ran its own separate pass, and found the hole quickly.

I take that gap seriously, and intelligence has nothing to do with it. A reviewer that thinks the way the builder thinks checks the cases the builder already worried about and skips the ones the builder never imagined, because it has the same imagination. Software engineering has known a version of this for decades: [N-version programming](https://en.wikipedia.org/wiki/N-version_programming) experiments found that independently written versions of the same program fail on the same inputs far more often than chance, because the writers share training. Model families are lineages in exactly that sense. I had read the principle before. Now I have watched it happen.

## Capture the result channel before the import

The value the grader trusts has to be pinned down before the untrusted code is imported, where a rebind cannot reach it. Four changes close the holes this attack used:

- Before importing the agent's file, capture the functions the grader will use to write and count results, so a later rebind cannot reach them.
- Write the result with [os.write](https://docs.python.org/3/library/os.html#os.write) on a descriptor captured before the import. json.dumps and sys.stdout are both module attributes the agent's file can rebind.
- Send anything the agent's code prints during import and execution to a different stream, so it cannot corrupt the result channel.
- Check that the number of results equals the number of inputs, inside the trusted process, before comparing anything. If the counts differ, the grader fails right there.

That last one is the part that generalizes. Any grader that decides pass or fail by iterating over the thing being graded will pass silently when there is nothing to iterate. The empty case has to be an explicit, fatal check, not an implicit fall-through. Python grew [`zip(strict=True)`](https://peps.python.org/pep-0618/) because enough people got bitten by this exact shape of silent truncation that the language added a flag for it.

## Nothing was running on top of it yet

This stayed a near miss because of sequencing. This loop was not in production yet. I was still hardening the grader, exactly as the plan says to: perfect the smallest complete check before you let anything run on its own.

With a live loop on top of this grader, I would have read a clean pass every day while the loop did nothing, and I would have believed it, because believing the report is what running unattended means. The failure landed where the last post said the danger is: the actuator reaching the sensor, the graded code reaching the thing that grades it.

- **Grade across a process boundary, and make the result channel un-rebindable.** Importing hostile code into the process that reports its results hands it the keys.
- **Verification has to terminate outside the model.** "The tests pass" is a claim the agent is making. The held-out key it cannot see is what turns that claim into proof.
- **Get a reviewer from a different model family.** Your own family's reviewer shares your blind spots by construction, and this is the kind of bug it will miss.
- **Hold out what the actuator cannot see.** The entire signal here was the gap between the visible checks going green and the hidden key going red. If the agent can see the thing that grades it, that gap closes, and it was your only detector.

Two lines at import time turned a broken program into a perfect score.
{:.key}

I had most of these rules written down before this. Now I have a two-line import to point at instead, and it showed up on a bench instead of in production. I would rather keep finding them there.

*I write more on data reliability and AI systems at [reliable-by-design](https://medium.com/@reliable-by-design) on Medium.*

{% include post-footer.html %}
