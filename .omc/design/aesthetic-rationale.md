> Superseded by `DESIGN.md` at the repo root as of 2026-09-01. Kept for history; do not use these values. `motion.md` stays authoritative.

# Aesthetic Rationale — payals.github.io terminal landing

## The question: what makes this memorable vs. the competition?

Reference sites: sive.rs (radical simplicity), jvns.ca (playful hand-drawn),
brittanychiang.com (polished dark-mode portfolio). All excellent. All have
a clear signature. What is this site's?

---

## 7 things this site is willing to be opinionated about

**1. The terminal IS the page, not a metaphor layered on top.**

Most "terminal-aesthetic" portfolios apply a dark background + monospace font
to a conventional hero/about/work layout. This site inverts that: the terminal
shell is the actual navigation mechanism. There is no hero section. The "hero
moment" is the boot sequence. Visitors who type get a different experience than
visitors who click — both valid, neither wrong. That dual path is rare.

**2. Restraint over spectacle, except in one place.**

The boot sequence and ASCII portrait draw are the site's only animated moments.
Everything else — hover states, panel opens — is fast and subtle. This makes
the boot sequence feel earned. Contrast: brittanychiang.com uses scroll-triggered
animations throughout, which reads as comprehensive effort. This site makes one
bet (the boot) and wins it cleanly rather than spreading motion everywhere.

**3. Content panels as "museum exhibits", not pages.**

The panels below the terminal are spatially separate from the navigation layer.
Running `cat about` feels like pulling a file from a drawer: the terminal stays
at the top, the content opens below. This is architecturally different from
sive.rs (separate URLs) and jvns.ca (separate scroll sections). It makes the
site feel like a tool you're operating, not a page you're scrolling.

**4. The ASCII portrait earns its frame.**

The embedded `> cat about` text on the laptop screen in the ASCII motif is a
self-referential loop: a terminal inside the portrait inside the terminal page.
This is the kind of detail that rewards the 5% of visitors who look carefully —
without requiring the other 95% to understand it. It will not be a "cool trick"
callout. It will just be there.

**5. No web fonts is a design decision, not a concession.**

System monospace fonts render at native quality in the user's own display
calibration. On a well-calibrated MacBook Pro with SF Mono, the site looks
native to the machine. That is better than any web font that arrives
after a 200ms network round trip. The choice signals: I am not trying to
impress you with typography choices I lifted from a design system. I am
showing you the substrate.

**6. The `now` widget is the only dynamic content and that scarcity matters.**

jvns.ca has a blog. sive.rs has essays. brittanychiang.com has case studies.
This site has one live feed: a hand-edited JSON file plus two API signals.
Because the `now` widget is the only thing that changes, it becomes the reason
to return. "What is Payal working on this month?" is a better retention hook
than a full blog archive on a personal landing page.

**7. Amber is used exactly once, as a reward.**

`--accent-2` (warm amber) appears only on hover and focus states. It never
appears in static content. This means the color becomes an affordance: if you
see amber, you can interact with this thing. The discipline of using one accent
for "static emphasis" (green) and one for "interactive invitation" (amber)
makes the UI legible without documentation.

---

## What this site deliberately avoids

- CRT scanlines / curve distortion (explicitly vetoed; reads as costume)
- Purple-on-dark gradients (the canonical "AI slop" aesthetic circa 2024–25)
- "Scroll to reveal" hero animations (implies the site is performing for you)
- Three-column bento grids (correct for dashboards; wrong for a calling-card)
- A navigation bar (the chips ARE the nav; a second nav layer is redundant)
- Loading spinners (the boot sequence IS the loading state)
- Background texture, noise overlays (adds weight without meaning)

---

## The one sentence

This site treats the terminal not as a stylistic flourish but as the
actual contract between visitor and author: type what you want to know,
or click if you prefer — either way, the answer arrives the same way
a real shell delivers it.
