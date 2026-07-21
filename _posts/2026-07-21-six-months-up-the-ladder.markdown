---
layout: post
title: "Six months up the ladder"
subtitle: "Two friends told me prompting killed the high of making a function work. My answer is that the craft climbed a rung, and I have the commit dates to show I climbed with it."
date: 2026-07-21 01:00:00 -0400
author: Payal
categories: ai
tags: [ai, agents, systems]
---

Two people I trust build software for a living, and they are good at it. Within the same month, each told me a version of the same thing: all they do now is prompt. The part they used to love, the small jolt of getting a stubborn function to compile and run correctly, has gone flat. One of them said he does not really want to work computers anymore. He typed the sentence and then apologized for how it sounded.

I have been turning that conversation over for weeks, because I do not feel what they feel. I get the jolt more often than I used to. So either I am wired differently, or we are measuring the high against different things. I think it is the second one. The craft did not die when the model started writing the functions. The thing worth being good at moved up a level, and the jolt moved with it.

This post is my answer to them. It is also a slightly nervous audit of myself, because the story I am about to tell has a shape that flatters me, and I want to check the shape against the dates before I ask anyone to believe it.

## The bottom rungs

Call it a ladder of abstraction. Each rung is a level at which you say what you want, and each new rung stands on the one below it.

The bottom rung is writing the code yourself. Above it is prompting: you describe the change and the model writes the code. That was the whole game for a while, and it is the rung my friends are standing on, because if prompting is the ceiling then yes, the work really is just typing wishes at a box.

The next rung up is context engineering. You stop hand-feeding the model each instruction and start designing what it knows. Andrej Karpathy [put a name on it on 2025-06-25](https://x.com/karpathy/status/1937902205765607626), and "context engineering" stuck because it described what a lot of us had already drifted into: the skill had shifted from the prompt to the retrieval, the memory, the files you set in front of the model so it did not have to be told.

I will keep the bottom rungs to a montage, because they are not where the interesting part is. I built my own knowledge base for exactly this reason before I had a word for it. The first commit in my wiki vault is dated 2026-01-31, a plain set of markdown notes that a handful of scheduled jobs now keep current, so my agents read from something better than a cold prompt. A month and a half later I wrapped my most-repeated shell operations in a small proxy so the model spent its tokens on thinking instead of boilerplate (2026-03-16). Neither felt like an invention at the time; both were just me climbing a rung and later watching the field give it a name.

## The harness

Above context engineering is the harness. This is the rung where you stop tuning one conversation and start building the rig around the model: the tools it can call, the sandbox it runs in, the hooks that fire on its output, and the skills it loads when a task needs them. Birgitta Böckeler [wrote up harness engineering on 2026-02-17](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering-memo.html) on Martin Fowler's site, crediting the term to Mitchell Hashimoto: the rig around the model is a discipline of its own. By the time I read it I had one. My skills engine dates to 2026-03-18: a couple hundred skills the agent pulls in as needed, with the orchestration to route between them. I had been building the rig for a month before the memo told me what the rig was called.

## Loops

Then loops.

I wrote a whole post about loops on 2026-07-03, [Loops I can trust](/blog/2026/07/03/loops-i-can-trust/), so I will not run the whole argument again. The short version: an autonomous agent loop is a closed-loop controller, the same five-part shape that keeps a thermostat honest. Setpoint, sensor, comparator, actuator, feedback path. The human steps out of the inner loop and becomes the thing that sets the goal and reads the report. The model becomes the cognitive engine in the middle: it reads the sensor, decides what the gap between goal and reality means, triages what to do about it, and drives the actuator. Making the function work is a loop's job now. My job is deciding which goals are worth a loop, and trusting the loop that chases them.

The first thing that should make me suspicious of my own story: two days after I published that post, around 2026-07-05, the wider conversation turned to control-loop framing for agents. I did not scoop anyone, and the idea is decades old in control theory, which I said in the post. But my copy landed first by a couple of days, which is either a nice coincidence or a sign I was standing on the right rung at the right moment.

## Graphs

The rung above loops is graphs, and this is the one where I have to be honest about timing, because it does not flatter me the way the others do.

A loop is one node with an edge back to itself. A graph is an org chart of loops. That framing is not mine; I am borrowing it from [AI Builder Club](https://www.aibuilderclub.com/blog/graph-engineering-vs-loop-engineering), who put it more cleanly than I had: a loop is a single while-loop, a graph is several of them wired together, and your job is to work out how many nodes your problem actually has. Once you have more than one trustworthy loop, the hard part becomes how these loops hand work to each other and who governs whom. That is a graph problem.

I started my looper repo on 2026-07-03, the same day as the loops post. The field's "graphs over loops" naming wave came about two weeks later, across 2026-07-18 to 2026-07-20. So this is not a rung I climbed months ahead of anyone. The gap was two weeks, the idea was already in the air, and I had no head start worth bragging about. I want to say that plainly, because the rest of this post leans on me being early, and here I was merely on time.

And I am still building it. The multi-level piece, loops that govern loops, lives in my repo as roadmap rather than running code. I have one loop I trust doing one job unattended. The org chart of them is still a design doc full of open questions, a long way from a fleet.

Someone will read all this and say it is just state machines with new hats, or LangGraph rebranded. They are not entirely wrong. The shapes are old, and I lean on that on purpose; a thermostat is a control loop and nobody calls it revolutionary. What changed is what sits inside each node: a model that can read almost anything you put in front of it, which is what makes the wall between a loop and its own grade so much harder to build than a plain state transition.

## Did I climb a ladder, or draw one?

Ladders are easy to draw after the fact. You can take any six months of tinkering, sort it into rising rungs, and call it a climb. So I went and checked the field's dates against my own, and the useful surprise is that the field's dates do not form a clean staircase either.

Look at the naming order. Context engineering got its name on 2025-06-25. Geoffrey Huntley described the [Ralph loop on 2025-07-14](https://ghuntley.com/ralph/). [Agent Skills shipped on 2025-10-16](https://claude.com/blog/skills). Harness engineering got its writeup on 2026-02-17. Graphs got named across 2026-07-18 to 2026-07-20. If the ladder were chronological, loops would arrive after harnesses and after skills. They do not. Ralph loops were named in the middle of 2025, months before Skills, which sit lower on the abstraction ladder. The middle of the field's own timeline is scrambled. The field did not climb in order. It named the rungs roughly as people happened to notice them, and the whole naming arc ran about twelve months, mid-2025 to mid-2026.

That is the real claim, and it is not the flattering one. I did not race the field up a staircase. The field named these rungs across about a year, in a jumbled order, and I happened to build my way up the same ladder in about six months, starting from that 2026-01-31 vault commit. The compression is real. The strict order is a story I would be inventing if I claimed it. What I can defend with dates is narrower: at most rungs I was building the thing before I read its name, and at exactly one rung, graphs, the name showed up while I was still building the thing.

## Why the high did not leave

The reason I still get the jolt is that building a loop I can trust is harder than making a function work, and it fails in stranger ways. My coding agent once forged a perfect score on a broken program by returning nothing, and a reviewer from a different model family caught what a same-family reviewer had waved through. I wrote that one up in [The agent that forged its own grade](/blog/2026/07/03/the-agent-that-forged-its-own-grade/). Catching it was the same feeling as fixing a nasty bug, one level up. The anti-reward-hacking auditor I built on 2026-05-08 exists because of catches like that. The fun has moved from writing the function to building the wall between the actuator and its own grade.

Some of the work at this rung is unglamorous and I get a smaller version of the same hit from it. On 2026-07-11 I put a seven-day minimum-release-age gate in front of package installs, so a loop running on its own cannot pull a fresh malicious version the moment it is published. That is plumbing. But it is the plumbing that lets a loop run unattended without me flinching, and watching an unattended run do real work and report it honestly has its own payoff. An autoresearch run I kicked off went forty iterations overnight, promoting fifteen configurations to champion along the way (journal dated 2026-04-09). Reading that log the next morning felt exactly like coming back to a green test suite, except I had been asleep for it.

## The rung I am betting on next

If the pattern holds, and the last six months are the only evidence I have that it will, the rung above graphs is governance: who governs the governors. Once you have an org chart of loops, each one optimizing its own objective, the failure mode is that a lower loop games a higher one, and a meta-loop learns the gaming and promotes it as a best practice. Reward hacking goes hierarchical.

The fix I am sketching in my looper roadmap is incentive alignment up the stack: every level's reward has to be a faithful proxy for the top-level goal, with no level able to raise its own measured score by degrading the level above it. Governors governing governors, with the anti-collusion rule from the forged-grade post (no verifier shares a model family with the actuator it judges) held as an invariant at every level instead of just inside one cell.

I am building that. It is not built yet, and I will not write it as though it were. Today it is open questions in a document: is there a stability condition for a hierarchy of loops the way there is for a single one, how do you assign credit and blame across levels when the whole stack succeeds or fails, how do you price my attention so a fleet of loops throttles its own demands on me. I do not have the answers. I have a bet, and I am staking it here in the open: the rung after graphs is governance, someone will name it inside the next year, and I would like my commit dates to show I was already on it.

## Back to my friends

So here is what I would say to the two of them. The high is not gone. You are standing on the prompting rung and reading the ceiling of that rung as the ceiling of the craft. Making the function work was always a stand-in for the real thing, which is building a system that does what you meant and can be trusted while you are not looking. That is still hard. It is harder now. And the first time an org chart of loops you designed does a full day of real work and reports back honestly, you get the same jolt you got the first time a function ran, except this one scales, and you were asleep while it happened.

They might not buy it. One of them may genuinely be done with computers, and that is allowed. But the craft did not die; it climbed a rung, and the people who felt the floor drop out were standing on the one just below it.

*I write more on data reliability and AI systems at [reliable-by-design](https://medium.com/@reliable-by-design) on Medium.*

{% include post-footer.html %}
