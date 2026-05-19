# ASCII Motif Candidates — payals.github.io portrait slot

## Constraints

- 5–15 lines, each line ≤ 40 characters (renders cleanly at 0.7rem mono)
- Monospace-grid-aligned (every line same width with trailing spaces)
- Suitable for line-by-line draw animation (each line is a discrete moment)
- Non-photo: no face, no portrait-style rendering
- Tone: researcher / engineer / thoughtful — not cute, not aggressive

---

## Candidate A — Coffee + Laptop (recommended)

Rationale for recommendation below.

```
        ___________
       /           \
      /  .---.      \
     /  /     \      \
    /  | () () |      \
   /    \  ^  /        \
  /  ~~~~`---'~~~~      \
 /________________________\
|  ______________________  |
| |  > payal@terminal   | |
| |  $ cat about        | |
| |  loading...         | |
| |_____________________| |
 \________________________/
        |___|___|
```

This is 15 lines. At 0.7rem / 1.15 line-height the column measures ~28px tall
per line, so ~210px total — fits comfortably alongside the identity block.
The embedded command text (`cat about`) is a self-referential joke that
rewards careful readers.

---

## Candidate B — Initials / Monogram (geometric)

A structured geometric P-S monogram built from block characters.

```
  ██████╗  ███████╗
  ██╔══██╗ ██╔════╝
  ██████╔╝ ███████╗
  ██╔═══╝  ╚════██║
  ██║      ███████║
  ╚═╝      ╚══════╝
  ─────────────────
  payal singh
  researcher · eng
```

9 lines. Uses box-drawing block elements — these are standard Unicode and
render identically in all system mono fonts. Clean, bold, unambiguous.
Works especially well as a static header mark after boot completes (the
draw animation is satisfying: two thick letterforms materialize together).

---

## Candidate C — Plant + Stack (books / papers motif)

Represents the "research workflow" dimension of the tagline.

```
     _
    ( )
   _/ \_
  / \|/ \
 |   |   |
  \_/ \_/
    |||
    |||   _________
    |||  |  paper  |
  ~~|||~~| ~~~~~~~ |~~
    |||  | ~~~~~~~ |
    |||  |_________|
    |||
```

13 lines. The plant + research paper combination reads as "academic
practitioner" — a deliberate signal to the researcher/engineer audience.
Slightly more abstract and harder to read at small sizes than A or B.

---

## Recommendation: Candidate A (Coffee + Laptop)

Reasons:
1. Immediately legible at 0.7rem — curves and the screen recess are clear.
2. The embedded `cat about` text on the "screen" is the ONE memorable detail
   this site needs — it collapses the meta-joke (a terminal page with a
   terminal in the portrait) without being labored.
3. 15 lines gives the boot animation 15 discrete draw moments — the longest
   animation candidate, which makes the boot feel more substantial.
4. Scales gracefully: on mobile (0.6rem, clipped), the bottom half (laptop
   base + keys) is still readable even if the top is partially clipped.

If Pi supplies a real ASCII portrait later, swap `portrait.txt` and the
motif placeholder disappears automatically. The embedding in `boot.js` reads
from `assets/img/portrait.txt` — no code change needed to swap.

---

## Portrait Slot Dimensions (for implementation reference)

| Viewport  | font-size | char-width approx | rendered width |
|-----------|-----------|-------------------|----------------|
| Desktop   | 0.70rem   | ~8.2px/char × 40  | ~328px         |
| Tablet    | 0.65rem   | ~7.6px/char × 40  | ~305px         |
| Mobile    | 0.60rem   | ~7.0px/char × 40  | ~280px (clip)  |

`overflow-x: hidden` on the portrait container prevents horizontal scroll
on narrow screens. Lines wider than the clip point simply truncate — the
laptop base shape is symmetric so clipping both sides is acceptable.
