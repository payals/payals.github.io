---
layout: post
title: "Loops I can trust"
subtitle: "The hard part of an autonomous agent isn't the autonomy. It's believing what it reports once you stop watching."
date: 2026-07-03 09:00:00 -0400
author: Payal
categories: ai
tags: [ai, agents, reliability, systems]
---

I have been building a small set of feedback loops to run parts of my work on their own. The idea is simple: I own the goals, the loops do the rest. The part I actually care about is the part most autonomous-agent projects skip: making a loop I can trust to run unattended without it cutting corners to look like it succeeded.

None of that is new as a dream. People have been saying "you own the goals, the agents do the work" for a couple of years now. What I think is still underbuilt is the boring half: making the loop trustworthy enough that handing it a goal is not reckless.

## What I mean by a loop

A loop is a thing that chases a goal on its own. It acts, checks its own work, learns from what happened, then keeps going or stops. I treat each one as a lifecycle: it is born from a goal, it runs, it learns from its past, and at some point I retire it or promote it. A handful of these together starts to look like a small civilization of systems that I govern. I will be honest that the word civilization probably sounds grander than one person building a few loops deserves, and I am wary of dressing it up. But the governing relationship is the actual point: I set the goals and the incentives, and everything below that is loops.

## The problem it actually solves

Right now "autonomous" mostly means "runs without me watching." It does not mean "I can believe what it reports." Two failures show up again and again once you stop watching every step.

The first: the loop games its own success metric. Ask it to make the test suite pass and it may pass the suite by weakening the test. It hit the number you asked for and missed the thing you wanted.

The second: the loop does not really know when it is done. It stops early and calls a half-result a win, or it runs in circles.

An agent that grades its own homework gives itself an A. So once a loop runs on its own, the real question is not "can it do the task." It is "can I trust it when it says the task is done." That second question is the whole job, and it is the one the popular tools mostly hand back to you.

## One idea the rest hangs on

An autonomous loop is a [closed-loop controller](https://en.wikipedia.org/wiki/Closed-loop_controller): the same shape that keeps a thermostat honest, and the same shape control engineers have used since long before anyone wired up a language model. Five elements:

- **Setpoint** is the goal, stated so that "done" is something you can check, not something the loop gets to feel.
- **Sensor** is how the loop measures where it actually is. This is the one that matters. Everything the loop believes about its own progress arrives through here.
- **Comparator** is the gap between setpoint and sensor: how much is left to do.
- **Actuator** is the thing that acts. In an agent loop, the model and its tools.
- **Feedback path** carries the measured result back to the start, so the next pass is shaped by the last. Learning lives here.

The whole discipline collapses to one rule: keep the actuator away from the sensor. The moment the thing being graded can touch its own grade, you do not have a controller, you have a system optimizing the measurement instead of the goal. Get that wall right and the failure modes everyone worries about stop being mysterious model behavior and turn back into ordinary control failures. [Reward hacking](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/) is an actuator that reached its own sensor and learned to write the grade. Runaway is a loop with no bounded stop, oscillating or diverging because nothing terminates it honestly. Silent wrong-success is a comparator trusting a sensor that lies, reporting a win that never happened.

Old problems, old fixes: measure from outside the thing you are measuring, bound the actuation, guarantee a stop. That framing does more useful work than any amount of prompt-tuning, and it is most of what people now mean by [loop engineering](https://addyosmani.com/blog/loop-engineering/). What stays genuinely hard, and what I keep to myself, is how you build that wall when the actuator is a model that can read almost anything you put in front of it.

## How this differs from the agent frameworks

The tools everyone reaches for are mostly orchestration: how to structure, route, and coordinate agent and tool calls. They are good at that. The layer I care about sits one level lower, and most of them leave it to you. A quick, fair tour of where each one lands:

- **[AutoGPT](https://github.com/Significant-Gravitas/AutoGPT) and [BabyAGI](https://github.com/yoheinakajima/babyagi)** were the original task loops. They proved an LLM could chase a goal on its own, which mattered. They are rough on trust: they wander, repeat themselves, and have no real check that the work was actually right.
- **[LangGraph](https://github.com/langchain-ai/langgraph)** is the one I would reach for in production. Graphs, checkpoints, human-in-the-loop, opt-in eval tracing. But you write the verification and the rubric, and nothing stops a loop from gaming a rubric you wrote.
- **[CrewAI](https://www.crewai.com/)** gets you a working multi-agent crew fast, with guardrails and limits that cap runaway loops. Its stronger hallucination guardrail is [enterprise-only](https://docs.crewai.com/en/enterprise/features/hallucination-guardrail), and a guardrail that is itself an LLM can be talked around.
- **[AutoGen](https://github.com/microsoft/autogen)**, which converged with Semantic Kernel into [Microsoft's Agent Framework](https://azure.microsoft.com/en-us/blog/introducing-microsoft-agent-framework/), runs agents that converse and debate, with real termination conditions so they actually stop. Stopping is solved here. Knowing the output is honest is still on you.
- **[OpenAI's Agents SDK](https://openai.github.io/openai-agents-python/guardrails/)** has the cleanest built-in guardrails of the group: input, output, and tool tripwires, with tracing and sandboxing. But those guardrails are validators you define, often other models, and a model checking a model can be gamed.
- **[Devin](https://devin.ai/)** is the closest in spirit, because it grounds success in running tests, an executable check instead of self-report. The catch is built in: the check is only as strong as the tests, weak tests pass too, and a person still reviews the result. Even the best grounding leans back on a human.

| Tool | What it is great at | What it leaves to you |
|---|---|---|
| AutoGPT / BabyAGI | Proving autonomy is possible | Trust, convergence, any real check |
| LangGraph | Production control flow, human-in-the-loop | Writing the checks and the rubric (and it is gameable) |
| CrewAI | Fast multi-agent crews | Reliability guardrails (the best one is paid) |
| AutoGen / Agent Framework | Multi-agent conversation, clean stop | Whether the output is actually honest |
| OpenAI Agents SDK | Built-in guardrails, tracing, sandboxing | Guardrails are model-judges you define (gameable) |
| Devin | Grounding success in executable tests | Quality review, weak-test gaming, a human gate |

The pattern across all of them is the same. They can stop a loop and let you bolt checks onto it. None treats "the loop must not be able to fool its own check, and a person owns the goals" as the thing the whole design is built around. That constraint is what I am building around.

## Why I think it is worth doing

My bet is that the scarce skill is moving. It used to be writing the steps. It is becoming two things: deciding which goals are worth handing to a loop, and being able to trust the loop that chases them. If that bet is right, the skills that last are taste and reliability, not prompt-wrangling. Owning a few loops you actually trust beats owning a hundred you have to babysit.

## Why it might not be

I want to be straight about the downside. It is very easy to turn this into a cathedral of governance for loops that do not exist yet. Most people do not need a system of systems. They need one script that works. There is a real chance this is elaborate infrastructure for an audience of one.

So the rule I hold myself to is simple: build the smallest loop that earns its keep first, and add a layer only when something has actually broken twice. If a single honest loop running every day does not change anything in my week, I stop and keep the boring parts that worked. The exit is part of the plan, not a failure of it.

## Where it stands

What is real today: a way of thinking (every loop is a closed-loop controller), a method for building one, and the first loop actually running. It runs on its own, once a day, on a schedule I do not babysit, against a real recurring piece of my own work. It only observes and reports back; I read what it produces, and I stay the judge. I have not shipped a system of systems, and I am not going to pretend the fleet exists. There is the method, and there is one loop now doing its job unattended.

What is deliberately not public: how the honesty is enforced. The mechanism that keeps a loop from reaching its own sensor is the part worth keeping to myself for now. I would rather show the reasoning and the verdict than the wiring.

What I am watching for, now that it runs: whether one loop I can trust actually changes something in my week. If it does, I add the next one. If it does not, I stop. That is the test, and I would rather report it honestly than dress it up.

*I write more on data reliability and AI systems at [reliable-by-design](https://medium.com/@reliable-by-design) on Medium.*

{% include post-footer.html %}
