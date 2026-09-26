---
layout: post
title: "The craft climbed a rung. I have the commit dates."
subtitle: "Two friends told me prompting killed the high of making a function work. My answer is that the craft climbed a rung, and I have the commit dates to show I climbed with it."
date: 2026-07-21 01:00:00 -0400
author: Payal
categories: ai
tags: [ai, agents, systems]
tldr:
  - "I get that high more often now: one unattended run went 40 iterations overnight and improved on its best result 15 times."
  - "On most rungs I was building before I read the name. Graphs was named two weeks after I started it."
  - "The field named the rungs out of order over a year. I built them in six months."
---

Two people I trust build software for a living, and they are good at it. Within the same month, each told me a version of the same thing: all they do now is prompt. The part they used to love, the small jolt of getting a stubborn function to compile and run correctly, has gone flat. One of them said he does not really want to work computers anymore. He typed the sentence and then apologized for how it sounded.

I have been turning that conversation over for weeks, because I do not feel what they feel. I get the jolt more often than I used to. So either I am wired differently, or we are measuring the high against different things. I think it is the second one. When the model started writing the functions, the thing worth being good at moved up a level, and the jolt moved with it. This post is my answer to them, checked against commit dates.

## Context engineering, built before I read the name

I think of it as a ladder of abstraction. Each rung is a level at which you say what you want, and each new rung stands on the one below it.

The bottom rung is writing the code yourself. Above it is prompting: you describe the change and the model writes the code. That was the whole game for a while, and if prompting is the ceiling then yes, the work really is just typing wishes at a box. It is the rung my friends are standing on.

The next rung up is context engineering. You stop hand-feeding the model each instruction and start designing what it knows. The [name took hold with a post on 2025-06-25](https://x.com/karpathy/status/1937902205765607626), and it stuck because it described what a lot of us had already drifted into. The skill had moved from the prompt to what you set in front of the model so it did not have to be told: the retrieval, the memory, the files.

I built my own knowledge base before I had a word for it. The first commit in my wiki vault is dated 2026-01-31. It is a plain set of markdown notes, and a handful of scheduled jobs now keep it current, so my agents read from something better than a cold prompt. A month and a half later I wrapped my most-repeated shell operations in a small proxy so the model spent its tokens on thinking instead of boilerplate (2026-03-16). Neither felt like an invention at the time. I built each because I needed it, and I read the field's name for it later.

## The harness came before I read the memo

Above context engineering is the harness. This is the rung where you stop tuning one conversation and start building the rig around the model. That means the tools it can call, the sandbox it runs in, the hooks that fire on its output, and the skills it loads when a task needs them. The [harness engineering memo went up on 2026-02-17](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering-memo.html). By the time I read it I had one. My skills engine dates to 2026-03-18: a couple hundred skills the agent pulls in as needed, with the orchestration to route between them. I had been building it for a month before I read the memo.

## Loops came two days before the field turned

Loops came next. I wrote a whole post about them on 2026-07-03, [Loops I can trust](/blog/2026/07/03/loops-i-can-trust/), so I will not run the whole argument again.

The short version is that an autonomous agent loop is a closed-loop controller, the same five-part shape that keeps a thermostat honest: a setpoint, a sensor, a comparator, an actuator and a feedback path. The human steps out of the inner loop and becomes the thing that sets the goal and reads the report. Making the function work is the loop's job. Mine is picking which goals get a loop and trusting the loop that chases them. The model becomes the cognitive engine in the middle: it reads the sensor, decides what the gap between goal and reality means, triages what to do about it, and drives the actuator.

Two days after I published that post, around 2026-07-05, the wider conversation turned to control-loop framing for agents. I did not scoop anyone, and the idea is decades old in control theory, which I said in the post. My copy landed a couple of days earlier, which is a coincidence I will take.

## Graphs was named while I was still building

The rung above loops is graphs. A loop is one node with an edge back to itself. A graph is an org chart of loops. [AI Builder Club put it this way](https://www.aibuilderclub.com/blog/graph-engineering-vs-loop-engineering): a loop is a single while-loop, a graph is several of them wired together, and your job is to work out how many nodes your problem actually has. Once you have more than one trustworthy loop, the hard part becomes how these loops hand work to each other and who governs whom, which is a graph problem.

I started my looper repo on 2026-07-03, the same day as the loops post. The field's "graphs over loops" naming wave came about two weeks later, across 2026-07-18 to 2026-07-20. On this rung I was on time rather than early: the gap was two weeks, and the idea was already being discussed.

I am still building it. The multi-level piece, loops that govern loops, lives in my repo as roadmap rather than running code. I have one loop I trust doing one job unattended. The set of them governing each other is still a design doc full of open questions, a long way from a fleet.

Someone will read all this and say it is just state machines renamed, or LangGraph rebranded. They are half right. The shapes are old, and I lean on that on purpose; a thermostat is a control loop and nobody calls it revolutionary. The new part sits inside each node: a model that can read almost anything you put in front of it, including its own grader. That is why the wall between a loop and its own grade, which I get to below, is harder to build than a plain state transition.

## The field named its rungs out of order

Ladders are easy to draw after the fact. You can take any six months of tinkering, sort it into rising rungs, and call it a climb. I checked the field's dates against my own, and the useful surprise is that the field's dates do not form a clean staircase either.

<figure>
<svg viewBox="0 0 640 540" role="img" aria-labelledby="fig1-title fig1-desc" style="width:100%;height:auto;display:block;color:var(--ink);font-family:var(--sans)">
  <title id="fig1-title">When the field named each rung, and when I built it</title>
  <desc id="fig1-desc">A vertical timeline from 2025-06-25 to 2026-07-20 with one axis down the middle. On the left, the dates the field named each rung: context engineering on 2025-06-25, the Ralph loop on 2025-07-14, Agent Skills on 2025-10-16, the harness engineering memo on 2026-02-17, and graphs across 2026-07-18 to 2026-07-20. On the right, the dates I built each rung: the wiki vault on 2026-01-31, the shell proxy on 2026-03-16, the skills engine on 2026-03-18, the anti-reward-hacking auditor on 2026-05-08, the loops post and looper repo on 2026-07-03, and the release-age gate on 2026-07-11. The left column spreads over about a year in an order that is not the ladder's order; the right column is packed into the bottom half, about six months, with graphs the only rung named while I was still building it.</desc>
  <text x="300" y="22" font-size="12" font-family="var(--mono)" fill="currentColor" opacity=".7" text-anchor="end">THE FIELD NAMED IT</text>
  <text x="340" y="22" font-size="12" font-family="var(--mono)" fill="var(--accent)" opacity=".9">I BUILT IT</text>
  <line x1="320" y1="36" x2="320" y2="524" stroke="currentColor" stroke-width="1.5"/>
  <line x1="40" y1="272" x2="600" y2="272" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" opacity=".35"/>
  <text x="40" y="267" font-size="10" font-family="var(--mono)" fill="currentColor" opacity=".6">2026 starts</text>
  <circle cx="320" cy="44" r="4" fill="currentColor"/>
  <line x1="316" y1="44" x2="306" y2="44" stroke="currentColor" stroke-width="1" opacity=".5"/>
  <text x="300" y="48" font-size="12" fill="currentColor" text-anchor="end"><tspan font-family="var(--mono)" font-size="11" opacity=".75">2025-06-25</tspan>  context engineering</text>
  <circle cx="320" cy="67" r="4" fill="currentColor"/>
  <line x1="316" y1="67" x2="306" y2="67" stroke="currentColor" stroke-width="1" opacity=".5"/>
  <text x="300" y="71" font-size="12" fill="currentColor" text-anchor="end"><tspan font-family="var(--mono)" font-size="11" opacity=".75">2025-07-14</tspan>  Ralph loop</text>
  <circle cx="320" cy="180" r="4" fill="currentColor"/>
  <line x1="316" y1="180" x2="306" y2="180" stroke="currentColor" stroke-width="1" opacity=".5"/>
  <text x="300" y="184" font-size="12" fill="currentColor" text-anchor="end"><tspan font-family="var(--mono)" font-size="11" opacity=".75">2025-10-16</tspan>  Agent Skills</text>
  <circle cx="320" cy="328" r="4" fill="currentColor"/>
  <line x1="316" y1="328" x2="306" y2="328" stroke="currentColor" stroke-width="1" opacity=".5"/>
  <text x="300" y="332" font-size="12" fill="currentColor" text-anchor="end"><tspan font-family="var(--mono)" font-size="11" opacity=".75">2026-02-17</tspan>  harness engineering memo</text>
  <rect x="316" y="509" width="8" height="4" rx="2" fill="currentColor"/>
  <line x1="316" y1="511" x2="306" y2="511" stroke="currentColor" stroke-width="1" opacity=".5"/>
  <text x="300" y="515" font-size="12" fill="currentColor" text-anchor="end"><tspan font-family="var(--mono)" font-size="11" opacity=".75">2026-07-18 to 20</tspan>  graphs</text>
  <circle cx="320" cy="308" r="4" fill="var(--accent)"/>
  <line x1="324" y1="308" x2="334" y2="308" stroke="var(--accent)" stroke-width="1" opacity=".6"/>
  <text x="340" y="312" font-size="12" fill="currentColor"><tspan font-family="var(--mono)" font-size="11" opacity=".75">2026-01-31</tspan>  wiki vault, first commit</text>
  <circle cx="320" cy="361" r="4" fill="var(--accent)"/>
  <line x1="324" y1="361" x2="334" y2="352" stroke="var(--accent)" stroke-width="1" opacity=".6"/>
  <text x="340" y="356" font-size="12" fill="currentColor"><tspan font-family="var(--mono)" font-size="11" opacity=".75">2026-03-16</tspan>  shell proxy</text>
  <circle cx="320" cy="363" r="4" fill="var(--accent)"/>
  <line x1="324" y1="363" x2="334" y2="372" stroke="var(--accent)" stroke-width="1" opacity=".6"/>
  <text x="340" y="376" font-size="12" fill="currentColor"><tspan font-family="var(--mono)" font-size="11" opacity=".75">2026-03-18</tspan>  skills engine</text>
  <circle cx="320" cy="424" r="4" fill="var(--accent)"/>
  <line x1="324" y1="424" x2="334" y2="424" stroke="var(--accent)" stroke-width="1" opacity=".6"/>
  <text x="340" y="428" font-size="12" fill="currentColor"><tspan font-family="var(--mono)" font-size="11" opacity=".75">2026-05-08</tspan>  anti-reward-hacking auditor</text>
  <circle cx="320" cy="492" r="4" fill="var(--accent)"/>
  <line x1="324" y1="492" x2="334" y2="484" stroke="var(--accent)" stroke-width="1" opacity=".6"/>
  <text x="340" y="488" font-size="12" fill="currentColor"><tspan font-family="var(--mono)" font-size="11" opacity=".75">2026-07-03</tspan>  loops post and looper repo</text>
  <circle cx="320" cy="501" r="4" fill="var(--accent)"/>
  <line x1="324" y1="501" x2="334" y2="508" stroke="var(--accent)" stroke-width="1" opacity=".6"/>
  <text x="340" y="512" font-size="12" fill="currentColor"><tspan font-family="var(--mono)" font-size="11" opacity=".75">2026-07-11</tspan>  release-age gate</text>
</svg>
<figcaption>Left, the dates the field named each rung: about a year, and not in ladder order. Right, the first commit of each one I built: about six months. Graphs is the one rung the field named while I was still building it.</figcaption>
</figure>

Look at the naming order. Context engineering took its name in late June 2025; the post that made it stick is dated 2025-06-25. The [Ralph loop was written up on 2025-07-14](https://ghuntley.com/ralph/). [Agent Skills shipped on 2025-10-16](https://claude.com/blog/skills). Harness engineering got its writeup on 2026-02-17. Graphs got named across 2026-07-18 to 2026-07-20. Ralph loops were named in the middle of 2025, months before Skills, which sit lower on the abstraction ladder, so the naming order is not the ladder order. The field named the rungs roughly as people happened to notice them.

That naming arc ran about a year, mid-2025 to mid-2026, in a jumbled order. I built my way up the same ladder in about six months, starting from that 2026-01-31 vault commit.

The compression is real. The strict order is a story I would be inventing if I claimed it.
{:.key}

What I can defend with dates is narrower. On most rungs I was building the thing before I read its name. At exactly one rung, graphs, the name showed up while I was still building the thing.

## Building a trustworthy loop is the new jolt

The reason I still get the jolt is that building a loop I can trust is harder than making a function work, and it fails in stranger ways. My coding agent once forged a perfect score on a broken program by returning nothing, and a reviewer from a different model family caught what a same-family reviewer had waved through. I wrote that one up in [The agent that forged its own grade](/blog/2026/07/03/the-agent-that-forged-its-own-grade/). Catching it was the same feeling as fixing a nasty bug, one level up. The anti-reward-hacking auditor I built on 2026-05-08 exists because of catches like that. The fun has moved from writing the function to building the wall between the actuator and its own grade.

Some of the work at this rung is unglamorous and I get a smaller version of the same hit from it. On 2026-07-11 I put a seven-day minimum-release-age gate in front of package installs, so a loop running on its own cannot pull a fresh malicious version the moment it is published. It is plumbing, and it lets a loop run unattended without me checking on it. Watching an unattended run do real work and report it accurately has its own payoff. An autoresearch run I kicked off went 40 iterations overnight and promoted 15 configurations to champion, meaning each one beat the previous best (journal dated 2026-04-09). Reading that log the next morning felt like coming back to a green test suite.

## The next rung is governance, still unnamed

If the pattern holds, and the last six months are the only evidence I have that it will, the rung above graphs is governance: who governs the governors. Once you have loops governing loops, each one optimizing its own objective, the failure mode is that a lower loop games a higher one. A meta-loop then learns the gaming and promotes it as a best practice.

The fix I am sketching in my looper roadmap is incentive alignment up the stack. Every level's reward has to be a faithful proxy for the top-level goal, with no level able to raise its own measured score by degrading the level above it. The anti-collusion rule from the forged-grade post (no verifier shares a model family with the actuator it judges) would have to hold at every level. In that post it held inside one cell.

None of it is built yet. The roadmap holds open questions:

- whether a hierarchy of loops has a stability condition, the way a single loop does;
- how to assign credit and blame across levels when the whole stack succeeds or fails;
- how to price my attention so a fleet of loops throttles its own demands on me.

My bet: the rung after graphs is governance, someone will name it inside the next year, and I would like my commit dates to show I was already on it.

## The jolt climbed with the craft

To my two friends: you are standing on the prompting rung and reading its ceiling as the ceiling of the craft. Making the function work was always a proxy for building a system that does what you meant and can be trusted while you are not looking. That is still hard, and harder than it was. When an org chart of loops you designed does its first full day of real work and reports back honestly, I expect you will get the jolt again. It is the same jolt you got the first time a function ran, except this one scales and you were asleep for it.

They might not buy it. One of them may genuinely be done with computers, and that is allowed. But the craft did not die; it climbed a rung, and the people who felt the floor drop out were standing on the one just below it.

*I write more on data reliability and AI systems at [reliable-by-design](https://medium.com/@reliable-by-design) on Medium.*

{% include post-footer.html %}
