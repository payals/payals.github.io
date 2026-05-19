# Layout — payals.github.io terminal landing

## Structural Concept

Single scrolling column. The terminal is a fixed-width "viewport within the
viewport" centered on large screens, full-width on mobile. Content panels
render below the terminal in the same column and scroll naturally. No
sidebars. No sticky elements (except the portrait in header on desktop).

Max content width: `720px`. Horizontally centered with `auto` margins.
Page uses `min-height: 100vh` with flex column to push footer to bottom.

---

## Desktop (≥ 1024px)

```
┌──────────────────────────────────────────────────────────────────────┐
│  VIEWPORT (100vw)                                                    │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  CENTERING SHELL  max-width: 720px  margin: 0 auto            │  │
│  │  padding: 2rem 1.5rem                                          │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  HEADER AREA                   height: auto              │ │  │
│  │  │  ┌────────────────┐  ┌───────────────────────────────┐   │ │  │
│  │  │  │ ASCII PORTRAIT │  │ IDENTITY BLOCK                │   │ │  │
│  │  │  │ ~15 lines tall │  │ "payal@payals.github.io"      │   │ │  │
│  │  │  │ ~28 chars wide │  │ tagline (muted)               │   │ │  │
│  │  │  │ color: accent  │  │ status bar (dimmer)           │   │ │  │
│  │  │  └────────────────┘  └───────────────────────────────┘   │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  │  margin-top: 2rem                                             │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  TERMINAL BLOCK                border: 1px solid border  │ │  │
│  │  │  background: bg-input                                    │ │  │
│  │  │  padding: 1rem                                           │ │  │
│  │  │  ┌────────────────────────────────────────────────────┐  │ │  │
│  │  │  │  OUTPUT SCROLL AREA   max-height: 260px  overflow-y │  │ │  │
│  │  │  │  (boot lines appear here, then command history)    │  │ │  │
│  │  │  └────────────────────────────────────────────────────┘  │ │  │
│  │  │  ┌────────────────────────────────────────────────────┐  │ │  │
│  │  │  │  INPUT ROW                                         │  │ │  │
│  │  │  │  [accent]>  [input field            ] [cursor]    │  │ │  │
│  │  │  └────────────────────────────────────────────────────┘  │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  │  margin-top: 0.75rem                                          │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  CHIP ROW                  display: flex  flex-wrap: wrap │ │  │
│  │  │  gap: 0.5rem                                              │ │  │
│  │  │  [help] [about] [now] [talks] [resume] [github]          │ │  │
│  │  │  [linkedin] [medium] [blog] [email] [clear]              │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  │  margin-top: 2rem                                             │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  PANEL AREA                                              │ │  │
│  │  │  (empty until command runs; panels stack top-to-bottom)  │ │  │
│  │  │  Each panel:                                             │ │  │
│  │  │  ┌────────────────────────────────────────────────────┐  │ │  │
│  │  │  │  PANEL CARD   background: bg-panel                 │  │ │  │
│  │  │  │  border: 1px solid border   padding: 1.5rem        │  │ │  │
│  │  │  │  border-top: 2px solid accent (active accent bar)  │  │ │  │
│  │  │  │  [panel content]                                   │  │ │  │
│  │  │  └────────────────────────────────────────────────────┘  │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  FOOTER                  margin-top: auto  padding: 2rem │ │  │
│  │  │  "© Payal Singh · source · CC-BY"  (text-faint)         │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Tablet (481px – 1023px)

Same column layout. Key differences:
- `max-width: 100%`, `padding: 1.5rem 1.25rem`
- Header becomes `display: block` (portrait above identity, stacked)
- ASCII portrait shrinks to ~22 chars wide (font-size: 0.65rem)
- Terminal output max-height: `200px`
- Chip row wraps — all chips remain visible

```
┌──────────────────────────────────────────┐
│  CENTERING SHELL  padding: 1.5rem 1.25rem │
│                                           │
│  ┌───────────────────────────────────┐    │
│  │  ASCII PORTRAIT  (centered)       │    │
│  └───────────────────────────────────┘    │
│  ┌───────────────────────────────────┐    │
│  │  IDENTITY BLOCK  (centered text)  │    │
│  └───────────────────────────────────┘    │
│  ┌───────────────────────────────────┐    │
│  │  TERMINAL BLOCK                   │    │
│  │  OUTPUT SCROLL (200px max)        │    │
│  │  INPUT ROW                        │    │
│  └───────────────────────────────────┘    │
│  ┌───────────────────────────────────┐    │
│  │  CHIP ROW (wrapping)              │    │
│  └───────────────────────────────────┘    │
│  ┌───────────────────────────────────┐    │
│  │  PANEL AREA                       │    │
│  └───────────────────────────────────┘    │
│  FOOTER                                   │
└──────────────────────────────────────────┘
```

---

## Mobile (≤ 480px)

```
┌─────────────────────────────────┐
│  padding: 1rem 0.875rem          │
│                                  │
│  ┌───────────────────────────┐   │
│  │  ASCII PORTRAIT            │   │
│  │  font-size: 0.6rem         │   │
│  │  line-height: 1.1          │   │
│  │  overflow-x: hidden        │   │
│  │  (clipped to ~40 chars)    │   │
│  └───────────────────────────┘   │
│  ┌───────────────────────────┐   │
│  │  IDENTITY                  │   │
│  │  name — font-size: 1rem    │   │
│  │  tagline — 0.75rem         │   │
│  └───────────────────────────┘   │
│  ┌───────────────────────────┐   │
│  │  TERMINAL BLOCK            │   │
│  │  font-size: 0.8125rem      │   │
│  │  OUTPUT max-height: 160px  │   │
│  │  INPUT ROW (full width)    │   │
│  └───────────────────────────┘   │
│  ┌───────────────────────────┐   │
│  │  CHIP ROW                  │   │
│  │  flex-wrap: wrap           │   │
│  │  gap: 0.375rem             │   │
│  │  font-size: 0.6875rem      │   │
│  └───────────────────────────┘   │
│  ┌───────────────────────────┐   │
│  │  PANEL AREA                │   │
│  │  padding: 1rem 0.875rem    │   │
│  │  (panel cards full width)  │   │
│  └───────────────────────────┘   │
│  FOOTER (centered, small)        │
└─────────────────────────────────┘
```

---

## Spacing Tokens

| Token name         | Value     | Usage                                  |
|--------------------|-----------|----------------------------------------|
| `--space-xs`       | `0.25rem` | Internal chip padding (vertical)       |
| `--space-sm`       | `0.5rem`  | Chip gap, tight stack margins          |
| `--space-md`       | `1rem`    | Terminal padding, panel padding mobile |
| `--space-lg`       | `1.5rem`  | Panel padding desktop, section margins |
| `--space-xl`       | `2rem`    | Header-to-terminal gap, footer padding |
| `--space-2xl`      | `3rem`    | Panel-to-footer gap                    |
| `--terminal-width` | `720px`   | Max content width                      |
| `--chip-height`    | `1.75rem` | Fixed chip height for alignment        |

---

## Z-index Stack

No layering complexity — everything is in-flow. Only exception:
- Focus ring on terminal input: `outline` only, no `z-index` needed.
- Panels appear below the terminal in DOM order — scroll-into-view
  on panel open, no overlay/modal pattern.
