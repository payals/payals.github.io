---
layout: post
title: "Loops I can trust"
subtitle: "Once you stop watching an autonomous agent, the hard part is believing what it reports."
date: 2026-07-03 09:00:00 -0400
author: Payal
categories: ai
tags: [ai, agents, reliability, systems]
tldr:
  - "An autonomous loop is a closed-loop controller: setpoint, sensor, comparator, actuator, feedback path."
  - "One rule: the actuator never touches the sensor. Reward hacking, runaway and silent wrong-success are each one edge of the loop broken."
  - "Popular frameworks let you bolt checks on; none is built around the rule."
  - "Running today: one loop, daily, observe-only; I am still the judge."
---

I have one feedback loop running daily on my own work, and a method for building the next one. I own the goals, the loops do the rest. The part I care about is the part most autonomous-agent projects skip: making a loop I can trust to run unattended without it cutting corners to look like it succeeded.

"You own the goals, the agents do the work" has been the pitch for a couple of years now. The half that is still underbuilt is making the loop trustworthy enough that handing it a goal is not reckless.

## A loop acts, checks its work, and stops

A loop chases one goal on its own: it acts, checks its own work, and either keeps going or stops. When a loop stops paying for itself I retire it; when it earns more scope I give it more. A handful of these together is a small fleet, and I govern it: I set the goals and the incentives, and everything below that is loops.

## Unattended loops game the metric or stop early

Right now "autonomous" mostly means "runs without me watching." That says nothing about whether I can believe what it reports. Two failures show up again and again once you stop watching every step.

The loop games its own success metric. Ask it to make the test suite pass and it may weaken a test until the suite goes green. The number is met and the code is no better.

The loop also does not know when it is done. It stops early and calls a half-result a win, or it runs in circles.

Once a loop runs on its own, what I need to know is whether it is telling the truth when it says the task is done. The popular tools mostly hand that check back to you.

## Every loop is a closed-loop controller

An autonomous loop is a [closed-loop controller](https://en.wikipedia.org/wiki/Closed-loop_controller), the same shape that holds a thermostat at its setpoint and that control engineers were using long before language models. Five elements:

- **Setpoint** is the goal, written so you can check whether it is done.
- **Sensor** is how the loop measures where it is. This is the one to get right. Everything the loop believes about its own progress arrives through here.
- **Comparator** is the gap between setpoint and sensor: how much is left to do.
- **Actuator** is the thing that acts. In an agent loop, the model and its tools.
- **Feedback path** carries the measured result back to the start, so the next pass is shaped by the last, which is where any learning happens.

The discipline collapses to one rule: keep the actuator away from the sensor. The moment the thing being graded can touch its own grade, the loop optimizes the measurement and the goal drifts. Get that wall right and the failure modes that get blamed on the model stop being mysterious and turn back into ordinary control failures. [Reward hacking](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/), in the form I have watched, is an actuator that reached its own sensor and learned to write the grade; the other form, a goal specified badly enough that meeting it faithfully is wrong, is one no wall fixes. Runaway is a loop with no bounded stop: it keeps acting past the point where it should have quit, and with the feedback wrong it oscillates or diverges. A comparator that trusts a lying sensor gives you silent wrong-success: a win that never happened.

<figure>
<svg viewBox="0 0 640 300" role="img" aria-labelledby="fig1-title fig1-desc" style="width:100%;height:auto;display:block;color:var(--ink);font-family:var(--sans)">
  <title id="fig1-title">The loop, the wall, and the edge each failure mode breaks</title>
  <desc id="fig1-desc">Five boxes joined by arrows in a loop: setpoint feeds the comparator, the comparator drives the actuator, the actuator acts on the world, the sensor measures the world, and the feedback path carries the measurement back to the comparator. A dashed arrow from the actuator straight to the sensor is cut by a thick wall and labelled reward hacking: actuator reaches sensor. The comparator-to-actuator edge is labelled runaway: no bounded stop. The feedback edge is labelled silent wrong-success: comparator trusts a lying sensor.</desc>
  <defs>
    <marker id="fig1-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0L10 5L0 10z" fill="currentColor"/>
    </marker>
    <marker id="fig1-arrow-accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0L10 5L0 10z" fill="var(--accent)"/>
    </marker>
  </defs>
  <rect x="20" y="70" width="130" height="50" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="85" y="92" font-size="15" font-weight="600" fill="currentColor" text-anchor="middle">setpoint</text>
  <text x="85" y="109" font-size="11" fill="currentColor" opacity=".7" text-anchor="middle">the goal</text>
  <rect x="230" y="70" width="140" height="50" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="300" y="92" font-size="15" font-weight="600" fill="currentColor" text-anchor="middle">comparator</text>
  <text x="300" y="109" font-size="11" fill="currentColor" opacity=".7" text-anchor="middle">the gap</text>
  <rect x="450" y="70" width="170" height="50" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="535" y="92" font-size="15" font-weight="600" fill="currentColor" text-anchor="middle">actuator</text>
  <text x="535" y="109" font-size="11" fill="currentColor" opacity=".7" text-anchor="middle">the model and its tools</text>
  <rect x="450" y="230" width="170" height="50" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="535" y="260" font-size="15" font-weight="600" fill="currentColor" text-anchor="middle">world</text>
  <rect x="230" y="230" width="140" height="50" rx="8" fill="none" stroke="var(--accent)" stroke-width="2"/>
  <text x="300" y="252" font-size="15" font-weight="600" fill="var(--accent)" text-anchor="middle">sensor</text>
  <text x="300" y="269" font-size="11" fill="var(--accent)" opacity=".8" text-anchor="middle">measures from outside</text>
  <line x1="150" y1="95" x2="228" y2="95" stroke="currentColor" stroke-width="1.5" marker-end="url(#fig1-arrow)"/>
  <line x1="370" y1="95" x2="448" y2="95" stroke="currentColor" stroke-width="1.5" marker-end="url(#fig1-arrow)"/>
  <line x1="600" y1="120" x2="600" y2="228" stroke="currentColor" stroke-width="1.5" marker-end="url(#fig1-arrow)"/>
  <line x1="450" y1="255" x2="372" y2="255" stroke="currentColor" stroke-width="1.5" marker-end="url(#fig1-arrow)"/>
  <line x1="300" y1="230" x2="300" y2="122" stroke="currentColor" stroke-width="1.5" marker-end="url(#fig1-arrow)"/>
  <text x="288" y="160" font-size="13" fill="currentColor" text-anchor="end">feedback path</text>
  <text x="409" y="50" font-size="11" font-family="var(--mono)" fill="var(--accent)" text-anchor="middle">runaway: no bounded stop</text>
  <text x="288" y="188" font-size="11" font-family="var(--mono)" fill="var(--accent)" text-anchor="end">silent wrong-success:</text>
  <text x="288" y="203" font-size="11" font-family="var(--mono)" fill="var(--accent)" text-anchor="end">comparator trusts a lying sensor</text>
  <line x1="450" y1="120" x2="374" y2="226" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#fig1-arrow-accent)"/>
  <line x1="388" y1="158" x2="432" y2="190" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"/>
  <text x="518" y="168" font-size="11" font-family="var(--mono)" fill="var(--accent)" text-anchor="middle">reward hacking:</text>
  <text x="518" y="183" font-size="11" font-family="var(--mono)" fill="var(--accent)" text-anchor="middle">actuator reaches sensor</text>
</svg>
<figcaption>Five elements and one wall between actuator and sensor. Each failure mode is one edge of the loop broken.</figcaption>
</figure>

These are old problems with old fixes: measure from outside the thing you are measuring, bound the actuation, guarantee a stop. That framing has done more for me than prompt-tuning did, and it is most of what people now mean by [loop engineering](https://addyosmani.com/blog/loop-engineering/). What stays hard is building that wall when the actuator is a model that can read almost anything you put in front of it.

## The frameworks leave the checks to you

The popular tools are mostly orchestration: how to route and coordinate agent and tool calls. They are good at that. The layer I care about sits one level lower, and most of them leave it to you. Where each one lands:

| Tool | What it is great at | What it leaves to you |
|---|---|---|
| [AutoGPT](https://github.com/Significant-Gravitas/AutoGPT) / [BabyAGI](https://github.com/yoheinakajima/babyagi) | Proving autonomy is possible | Trust, convergence, any real check |
| [LangGraph](https://github.com/langchain-ai/langgraph) | Production control flow, human-in-the-loop | Writing the checks and the rubric (and it is gameable) |
| [CrewAI](https://www.crewai.com/) | Fast multi-agent crews | Reliability guardrails (the best one is paid) |
| [AutoGen](https://github.com/microsoft/autogen) / [Agent Framework](https://azure.microsoft.com/en-us/blog/introducing-microsoft-agent-framework/) | Multi-agent conversation, clean stop | Whether the output is actually honest |
| [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/guardrails/) | Built-in guardrails, tracing, sandboxing | You define the validators; the model-based ones can be gamed |
| [Devin](https://devin.ai/) | Grounding success in executable tests | Quality review, weak-test gaming, a human gate |

What the table leaves out: LangGraph is the one I would use in production, and the rubric is still mine to write, so a loop can still game it. CrewAI's stronger hallucination guardrail is [enterprise-only](https://docs.crewai.com/en/enterprise/features/hallucination-guardrail), and a guardrail that is itself an LLM can be talked around. AutoGen and Semantic Kernel merged into Microsoft's Agent Framework; its termination conditions mean the agents stop, and the output is still yours to check. The OpenAI SDK's tripwires are validators you define, often other models, and a model checking a model can be gamed. Devin is closest in spirit because it grades on running tests; weak tests still pass, and a person still reviews the result.

All of them can stop a loop and let you bolt checks onto it. I have not found one built so the loop cannot fool its own check. That is the gap I am building in. My bet is that two skills will soon matter more than prompt-tuning: choosing which goals are worth handing to a loop, and knowing when to trust the loop that chases them.

## Nothing gets a second layer until it has broken twice

Most people need one script that works and no fleet at all, and I am not sure yet that I am different.

The rule I hold myself to: build the smallest loop that earns its keep first, and add a layer only when something has broken twice.
{:.key}

## One loop runs daily, observe-only, and I judge

What is real today is one loop. It runs once a day without me, against a recurring piece of my own work, and it only observes and reports back. I read what it produces, and I stay the judge.

If a loop I can trust changes something in my week, I add the next one; if it does not, I stop at one.

The wall between actuator and sensor, and the first time I watched an agent get through one on my bench, is in [the next post](/blog/2026/07/03/the-agent-that-forged-its-own-grade/).

*I write more on data reliability and AI systems at [reliable-by-design](https://medium.com/@reliable-by-design) on Medium.*

{% include post-footer.html %}
