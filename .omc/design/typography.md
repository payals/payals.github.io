# Typography — payals.github.io terminal landing

## Guiding Principle

One font family governs the entire terminal interface. The spec permits system
monospace and that is the right call: zero HTTP cost, native rendering, no FOIT,
and the resulting aesthetic is "real terminal" rather than "styled-to-look-like
one". Prose in panels gets a system sans-serif fallback only.

---

## Font Stacks

### Primary — Monospace (terminal, chips, command output, headers)

```css
font-family: ui-monospace, "Cascadia Code", "JetBrains Mono",
             "SF Mono", Menlo, Consolas, "Liberation Mono",
             "Courier New", monospace;
```

Justification: `ui-monospace` resolves to SF Mono on macOS/iOS (clean, wide
metrics), Cascadia Code on modern Windows (ligature-capable but we disable
ligatures), and falls through to Menlo/Consolas elsewhere. No web font fetch.

Ligatures explicitly disabled on the terminal input and output areas:
```css
font-variant-ligatures: none;
```
Reason: ligatures on `->`, `=>`, `!=` look clever but break copy-paste fidelity
in a terminal context.

### Secondary — Prose (panel body text only)

```css
font-family: ui-sans-serif, system-ui, -apple-system,
             BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Justification: panels like `cat about` and `cat resume` benefit from slightly
looser prose reading at paragraph length. Switching to sans-serif here — but
keeping it system — preserves weight budget and feels intentional rather than
accidental.

---

## Type Scale

Base: `16px` (`1rem`). All sizes in `rem` for zoom/accessibility compliance.

| Role                     | Size      | Weight | Line-height | Letter-spacing | Font stack  |
|--------------------------|-----------|--------|-------------|----------------|-------------|
| Terminal output          | `0.875rem`| 400    | 1.6         | `0`            | mono        |
| Terminal input           | `0.875rem`| 400    | 1.6         | `0`            | mono        |
| Prompt symbol (`>`)      | `0.875rem`| 600    | 1.6         | `0`            | mono        |
| Command echo             | `0.875rem`| 400    | 1.6         | `0.01em`       | mono        |
| Chip label               | `0.75rem` | 500    | 1           | `0.04em`       | mono        |
| Boot lines               | `0.875rem`| 400    | 1.5         | `0`            | mono        |
| ASCII portrait           | `0.7rem`  | 400    | 1.15        | `0`            | mono        |
| Panel heading (h2)       | `1rem`    | 600    | 1.3         | `0.02em`       | mono        |
| Panel subheading (h3)    | `0.875rem`| 600    | 1.4         | `0.01em`       | mono        |
| Panel body               | `0.9375rem`| 400   | 1.7         | `0`            | prose       |
| Panel metadata / dates   | `0.75rem` | 400    | 1.5         | `0.03em`       | mono        |
| Panel link               | `0.9375rem`| 400   | 1.7         | `0`            | prose       |
| Footer / status bar      | `0.6875rem`| 400   | 1           | `0.05em`       | mono        |
| Error output             | `0.875rem`| 400    | 1.6         | `0`            | mono        |

---

## Cursor

```
width: 0.5ch
height: 1.1em
background: var(--accent)
animation: blink 1.1s step-end infinite
```

`step-end` gives a hard on/off blink (real terminal behavior, not a fade).
Rate 1.1s is slightly slower than the OS default (0.5s) — less anxious.

---

## Vertical Rhythm

All spacing units derive from `0.25rem` (4px) increments.

- Line height 1.6 × 0.875rem ≈ 22.4px ≈ `1.4rem` — use as base spacing unit
  for terminal output lines.
- Panel sections separated by `2rem` gaps.
- Chip row: `0.5rem` gap between chips.

---

## Anti-patterns to Avoid in Implementation

- Do not mix mono and sans-serif within a single terminal output line.
- Do not use `font-weight: 700` in the terminal — `600` is the maximum.
  Bold in a terminal reads as "error" to trained users; reserve weight
  differentiation for panel headings only.
- Do not set `font-size` smaller than `0.6875rem` (11px at 16px base) anywhere
  interactive or informational.
- Do not use italic in the terminal area.
