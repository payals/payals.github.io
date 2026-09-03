# Motion — payals.github.io terminal landing

## Philosophy

Motion here is **functional evidence**, not decoration. Every animation proves
something happened: the system booted, a line was printed, a panel opened. The
timing budget is tight (0.8s boot total) and every value is justified. Nothing
loops except the cursor blink.

---

## prefers-reduced-motion

All time-based animations are gated:

```css
@media (prefers-reduced-motion: reduce) {
  /* All animation durations → 0ms. Transitions → 0ms.
     Boot sequence: skip directly to ready state.
     ASCII portrait: render complete immediately.
     Panel open: render at full opacity instantly. */
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```

JS also reads `window.matchMedia('(prefers-reduced-motion: reduce)')` and
skips the boot sequence loop entirely — calling the "boot complete" handler
immediately.

---

## Boot Sequence Lines

Total boot budget: **800ms** across ~5 lines, measured from **navigation
start**, not from DOMContentLoaded. `bootlog.js` schedules every deadline on
the `performance.now()` timeline with origin 0, so HTML parse and module load
time is spent inside the budget instead of being added to it; on a slow
connection the header deadlines that have already passed print at once and the
ready handoff still lands close to on time.

The ready handoff is scheduled at **700ms**; the remaining 100ms absorbs
setTimeout lateness. An earlier schedule put the nominal ready at 750ms with
only 50ms of headroom on the (mistaken) assumption that accumulated
setTimeout lateness across the sequence topped out around 10ms; a 1440x900
measurement with no injected latency caught it landing at 803.3ms on a fresh
load — actual lateness ran to about 53ms, over the 800ms budget. Every other
header deadline below is scaled down by the same factor (700/750) to keep the
sequence's relative pacing. The career log starts at 740ms and prints one
line every 40ms, ending at 1740ms for 26 records, inside the 2s ceiling.

Because the deadline is absolute, the module graph has to arrive well before
700ms or the handoff simply happens late. `_includes/head.html` therefore
carries a `modulepreload` hint for all twelve landing modules, which collapses
a three-round-trip import chain (`main.js`, its ten imports, then
`mdlines.js`) into one round trip after the HTML.

| Line   | Content                             | Deadline from navigation | Reasoning                                 |
|--------|-------------------------------------|--------------------------|-------------------------------------------|
| 0      | `payalsingh.me console`             | 0ms                      | Instant start — no dead silence           |
| 1      | `[ ok ] now.json     updated ...`   | 100ms                    | Feels like reading a real boot log        |
| 2      | `[ ok ] talks.json   ... sourced`   | 220ms                    | Slight acceleration — tension builds      |
| 3      | `[ ok ] writing      N posts`       | 335ms                    | Consistent with line 2                    |
| Bar    | `indexing N records ▓▓▓▓▓▓▓▓▓▓ done`| 390ms, +30ms per 2 cells | Work you can watch finish, ends at 540ms  |
| 4      | `ready. type help, ...`             | 600ms                    | Longer pause before "ready" = payoff beat |
| Prompt | Cursor appears + blink starts       | 700ms                    | Brief silence after "ready" before handoff|

Ready handoff at **700ms** of an **800ms** budget, with 100ms of headroom for
timer lateness (see the verify-B-1 evidence bundle for the 6-run, no-latency
and 100ms-latency measurements taken after this schedule shipped).

Each delay is an absolute deadline measured from one start timestamp, not a
relative wait chained from the previous line, so timer jitter does not
accumulate across the sequence.

Each line is appended to the DOM (not typed character-by-character) — this
keeps the total duration predictable and avoids the "O(n_chars)" problem
where longer lines feel sluggish. The "typewriter" illusion comes from the
line-by-line delay, not per-character delay.

Skip: any `keydown` or `click` before boot completes calls `bootComplete()`
immediately, appending all remaining lines at once with 0 delay.

---

## ASCII Portrait Draw

Drawn line-by-line, synchronized with boot but on the left column (or above
on mobile). Timing is interleaved with boot lines, not sequential after.

| Value              | Amount   | Reasoning                                           |
|--------------------|----------|-----------------------------------------------------|
| Per-line delay     | `55ms`   | 15-line portrait × 55ms = 825ms — matches boot end  |
| Character reveal   | None     | Lines appear whole; per-char is too slow at 40+ chars|
| Fade-in per line   | `80ms ease-out` | Slight opacity 0→1 per line, not a jump      |
| Final state        | Static   | Portrait persists; no loop; no pulse                |

On `prefers-reduced-motion`: entire portrait renders at once, no animation.

---

## Cursor Blink

```css
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
animation: blink 1.1s step-end infinite;
```

| Value    | Amount  | Reasoning                                              |
|----------|---------|--------------------------------------------------------|
| Rate     | `1.1s`  | Slightly slower than OS default (0.5–0.8s); less fidgety|
| Function | `step-end` | Hard cut, not fade — matches real terminal behavior |
| Pause on input | cursor stays visible while user types | Standard UX |

Cursor is hidden when boot is running (system is "busy"), appears after
`bootComplete()`.

---

## Panel Open Transition

Panels render below the terminal when a command is run. The open animation
communicates "content has arrived" without drawing attention away from the
terminal.

| Property           | Value                    | Reasoning                              |
|--------------------|--------------------------|----------------------------------------|
| Initial state      | `opacity: 0; transform: translateY(8px)` | Subtle upward reveal       |
| Final state        | `opacity: 1; transform: translateY(0)`  |                             |
| Duration           | `220ms`                  | Fast enough to not feel slow           |
| Easing             | `cubic-bezier(0.16, 1, 0.3, 1)` | Ease-out spring — snappy entry  |
| Scroll into view   | `scrollIntoView({ behavior: 'smooth', block: 'start' })` | After animation starts |
| Scroll delay       | `50ms` after panel open begins | Prevents jarring simultaneous motion |

If the same panel is opened twice: no re-animation. If a new panel opens:
scroll to new panel only.

---

## Chip Hover

```css
.chip {
  transition: background-color 120ms ease,
              color 120ms ease,
              border-color 120ms ease;
}
.chip:hover {
  background-color: var(--accent-dim);
  color: var(--accent);
  border-color: var(--accent);
}
.chip:active {
  transform: scale(0.97);
  transition: transform 60ms ease;
}
```

| Property    | Value   | Reasoning                                              |
|-------------|---------|--------------------------------------------------------|
| Hover speed | `120ms` | Fast enough to feel responsive, not instant (jarring)  |
| Active scale| `0.97`  | Tactile press feedback — small so it reads as physical |
| Active speed| `60ms`  | Faster than hover — presses should feel snappy         |

No chip animation on focus (`:focus-visible` uses outline only — no transform).

---

## Terminal Line Append (command output)

Each line of command output (e.g. `help` listing) is appended to the
output area with a staggered delay.

| Value              | Amount   | Reasoning                                           |
|--------------------|----------|-----------------------------------------------------|
| Per-line delay     | `30ms`   | Output feels "printed" not dumped; ≤10 lines max   |
| Duration           | `0ms`    | Lines appear instantly (no fade) — terminal realism |
| Max lines animated | `12`     | Beyond 12 lines, all appear at once (performance)  |

---

## Focus Ring

Not an animation — a static, high-visibility ring for keyboard users.

```css
:focus-visible {
  outline: 2px solid var(--accent-2);
  outline-offset: 3px;
}
```

`--accent-2` (amber) is used here — distinct from the green accent — so focus
rings are unambiguous against any surface color.

---

## Summary — all durations at a glance

| Element                | Duration  | Easing          |
|------------------------|-----------|-----------------|
| Boot line append       | 120–200ms | step (instant)  |
| ASCII portrait per line| 55ms delay + 80ms fade | ease-out |
| Panel open             | 220ms     | cubic spring    |
| Chip hover             | 120ms     | ease            |
| Chip active press      | 60ms      | ease            |
| Cursor blink           | 1100ms    | step-end        |
| Terminal line output   | 30ms/line | instant         |
