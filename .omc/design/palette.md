# Color Palette — payals.github.io terminal landing

## Design Decision

Dark-only (v1). Palette leans toward **deep slate-green**, not pure black. The
green accent is desaturated enough to read as "terminal heritage" without
screaming "hacker stereotype". Amber is reserved strictly for interactive
feedback states (hover, focus ring) — it never appears as decoration.

---

## Token Table

| Token         | Hex       | Role                                          |
|---------------|-----------|-----------------------------------------------|
| `--bg`        | `#0a0c0d` | Page background. Near-black, slight warm cast.|
| `--bg-panel`  | `#101518` | Panel / card surface. 2 stops lighter than bg.|
| `--bg-chip`   | `#161c20` | Chip resting state. Between bg and bg-panel.  |
| `--bg-input`  | `#0e1214` | Terminal input row background.                |
| `--text`      | `#dfe4df` | Primary text. Slightly warm white, not pure.  |
| `--text-dim`  | `#7a8c8a` | Secondary / muted labels, timestamps.         |
| `--text-faint`| `#3d4f4c` | Decorative rule chars, box-drawing lines.     |
| `--accent`    | `#6fcfa0` | CRT-green desaturated. Prompt symbol, links.  |
| `--accent-2`  | `#e8b84b` | Warm amber. Hover state, focus rings only.    |
| `--accent-dim`| `#2e5e45` | Subtle accent bg (e.g. active chip fill).     |
| `--border`    | `#1a2228` | Panel borders, dividers.                      |
| `--border-dim`| `#131a1e` | Faint structural lines inside panels.         |
| `--err`       | `#d46060` | Error output (e.g. "command not found").      |
| `--ok`        | `#6fcfa0` | Same as accent — boot "ok" lines.             |
| `--shadow`    | `0 24px 60px rgba(0,0,0,0.55)` | Panel drop shadow.         |

---

## Contrast Ratios (WCAG AA minimum: 4.5:1 normal, 3:1 large)

All ratios computed against `--bg` (#0a0c0d) as the worst-case background.

| Foreground       | Hex       | Against `--bg` | AA Normal | AA Large |
|------------------|-----------|----------------|-----------|----------|
| `--text`         | `#dfe4df` | ~17.8:1        | PASS      | PASS     |
| `--text-dim`     | `#7a8c8a` | ~5.1:1         | PASS      | PASS     |
| `--text-faint`   | `#3d4f4c` | ~2.1:1         | FAIL*     | PASS     |
| `--accent`       | `#6fcfa0` | ~8.4:1         | PASS      | PASS     |
| `--accent-2`     | `#e8b84b` | ~9.7:1         | PASS      | PASS     |
| `--err`          | `#d46060` | ~5.3:1         | PASS      | PASS     |

*`--text-faint` intentionally fails AA Normal — it is ONLY used for decorative
box-drawing characters and structural lines, never for readable text content.
WCAG exempts purely decorative elements.

Against `--bg-panel` (#101518), ratios drop by ~0.2 — all passing tokens remain
AA-compliant.

---

## CSS Variable Block (ready to paste)

```css
:root {
  --bg:          #0a0c0d;
  --bg-panel:    #101518;
  --bg-chip:     #161c20;
  --bg-input:    #0e1214;
  --text:        #dfe4df;
  --text-dim:    #7a8c8a;
  --text-faint:  #3d4f4c;
  --accent:      #6fcfa0;
  --accent-2:    #e8b84b;
  --accent-dim:  #2e5e45;
  --border:      #1a2228;
  --border-dim:  #131a1e;
  --err:         #d46060;
  --shadow:      0 24px 60px rgba(0,0,0,0.55);
}
```

---

## Usage Rules

1. `--accent` is the terminal's "voice" color: prompt symbol (`>`), command
   echo text, active panel title underline, ASCII portrait strokes.
2. `--accent-2` fires ONLY on interaction (hover, focus, active). Never static.
3. `--err` is used for `command not found` output lines only.
4. Panel card backgrounds use `--bg-panel`. Nested elements inside panels
   (e.g. talk cards) use `--bg-chip` as their surface.
5. No gradients anywhere. Flat surfaces, clear borders.
6. The shadow token applies to the entire panel-stack area only —
   not individual cards inside panels.
