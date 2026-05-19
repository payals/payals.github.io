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

Total boot duration: **800ms** across ~5 lines.

| Line # | Content example              | Delay from prev | Reasoning                                  |
|--------|------------------------------|-----------------|-------------------------------------------|
| 0      | `PayalOS v1.0 booting...`    | 0ms (immediate) | Instant start — no dead silence           |
| 1      | `loading bio............ok`  | 120ms           | Feels like reading a real boot log        |
| 2      | `loading talks..........ok`  | 140ms           | Slight acceleration — tension builds      |
| 3      | `fetching now.json......ok`  | 130ms           | Consistent with line 2                    |
| 4      | `system ready`               | 200ms           | Longer pause before "ready" = payoff beat |
| Prompt | Cursor appears + blink starts| 210ms           | Brief silence after "ready" before handoff|

Total: 120 + 140 + 130 + 200 + 210 = **800ms**

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
| Boot line append       | 120–210ms | step (instant)  |
| ASCII portrait per line| 55ms delay + 80ms fade | ease-out |
| Panel open             | 220ms     | cubic spring    |
| Chip hover             | 120ms     | ease            |
| Chip active press      | 60ms      | ease            |
| Cursor blink           | 1100ms    | step-end        |
| Terminal line output   | 30ms/line | instant         |
