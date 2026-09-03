#!/usr/bin/env python3
"""Assert WCAG contrast for the text tokens in assets/css/tokens.css.

Every text token is checked against every surface it can sit on. Any pair
below 4.5:1 fails the run (exit 1). Decorative tokens are excluded and
listed explicitly so the exclusion is visible in the output.

Phase 2 additions: the kind key (--kind-*), --warn and the year scale
(--year-2013 to --year-2026) join the text tokens; --bg is checked on every
solid hue it can sit on (selected palette row, active statusbar key, cursor);
the token identities that DESIGN.md promises are asserted (kind-now equals
ok, warn and kind-cmd equal accent, year-2022 equals ink, year-2026 equals
kind-post); and every year token is asserted to be the sRGB interpolation of
its anchors (2013, 2018, 2022, 2026) to within one 8-bit step per channel.

Usage: python3 scripts/check-contrast.py [path/to/tokens.css]
"""

import re
import sys
from pathlib import Path

TOKENS_PATH = Path(__file__).resolve().parent.parent / "assets" / "css" / "tokens.css"

YEARS = list(range(2013, 2027))
YEAR_TOKENS = [f"--year-{y}" for y in YEARS]

# Text tokens: anything a glyph is painted with.
TEXT_TOKENS = [
    "--ink", "--ink-2", "--ink-3",
    "--accent", "--warn", "--ok", "--err",
    "--kind-now", "--kind-talk", "--kind-post", "--kind-cv", "--kind-link", "--kind-cmd",
] + YEAR_TOKENS

# Surfaces text can sit on.
SURFACE_TOKENS = ["--bg", "--surface", "--surface-2"]

# Extra pairs that are not text-on-surface but still carry text:
# (foreground, background, where it happens)
EXTRA_PAIRS = [
    ("--bg", "--accent", "text inside the block cursor, the active statusbar key, a selected command row"),
    ("--bg", "--ok", "selected now row in the palette"),
    ("--bg", "--err", "text on an error fill"),
    ("--bg", "--kind-now", "statusbar key 0 when current, selected now row"),
    ("--bg", "--kind-talk", "statusbar key 1 when current, selected talk row"),
    ("--bg", "--kind-post", "statusbar key 2 when current, selected post row"),
    ("--bg", "--kind-cv", "statusbar key 3 when current, selected cv row"),
    ("--bg", "--kind-link", "statusbar key 4 when current, selected link row"),
    ("--bg", "--kind-cmd", "the / and ? statusbar keys when current"),
    ("--ink", "--selection", "selected text (::selection)"),
]

# Tokens that must be the same hex, so one meaning never drifts into two hues.
IDENTITIES = [
    ("--kind-now", "--ok", "now facts are the ok state of the person"),
    ("--warn", "--accent", "attention is a state, and amber is the one state colour"),
    ("--kind-cmd", "--accent", "commands share the state colour, as in the winning prototype"),
    ("--year-2022", "--ink", "the white anchor of the year scale is plain text"),
    ("--year-2026", "--kind-post", "this year and posts share one blue"),
]

# Year scale anchors. Intermediate years are linear in sRGB between them.
YEAR_ANCHORS = {2013: "--year-2013", 2018: "--year-2018", 2022: "--year-2022", 2026: "--year-2026"}

# Decorative tokens: borders, rules, fills. No glyph is painted with them.
DECORATIVE = ["--line", "--line-strong", "--selection"]

MIN_RATIO = 4.5


def parse_tokens(css: str) -> dict:
    root = re.search(r":root\s*\{(.*?)\n\}", css, re.S)
    if not root:
        sys.exit("no :root block found")
    tokens = {}
    for name, value in re.findall(r"(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\b", root.group(1)):
        tokens[name] = value.lower()
    return tokens


def rgb(hex_color: str):
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def luminance(hex_color: str) -> float:
    r, g, b = (c / 255 for c in rgb(hex_color))

    def lin(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def ratio(fg: str, bg: str) -> float:
    lf, lb = luminance(fg), luminance(bg)
    hi, lo = max(lf, lb), min(lf, lb)
    return (hi + 0.05) / (lo + 0.05)


def expected_year(tokens: dict, year: int) -> tuple:
    """sRGB interpolation between the two anchors that bracket the year."""
    anchors = sorted(YEAR_ANCHORS)
    lo = max(a for a in anchors if a <= year)
    hi = min(a for a in anchors if a >= year)
    if lo == hi:
        return rgb(tokens[YEAR_ANCHORS[lo]])
    t = (year - lo) / (hi - lo)
    a, b = rgb(tokens[YEAR_ANCHORS[lo]]), rgb(tokens[YEAR_ANCHORS[hi]])
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else TOKENS_PATH
    tokens = parse_tokens(path.read_text())

    missing = [t for t in TEXT_TOKENS + SURFACE_TOKENS + DECORATIVE if t not in tokens]
    if missing:
        print(f"missing tokens in {path}: {', '.join(missing)}")
        return 1

    failures = 0
    print(f"tokens: {path}")
    print(f"minimum ratio: {MIN_RATIO}:1")
    print()
    header = f"{'text':<14}{'hex':<10}" + "".join(f"{s:<14}" for s in SURFACE_TOKENS)
    print(header)
    for t in TEXT_TOKENS:
        cells = []
        for s in SURFACE_TOKENS:
            r = ratio(tokens[t], tokens[s])
            mark = "ok" if r >= MIN_RATIO else "FAIL"
            if r < MIN_RATIO:
                failures += 1
            cells.append(f"{r:5.2f}:1 {mark:<5}")
        print(f"{t:<14}{tokens[t]:<10}" + "".join(f"{c:<14}" for c in cells))

    print()
    print("extra pairs")
    for fg, bg, where in EXTRA_PAIRS:
        r = ratio(tokens[fg], tokens[bg])
        mark = "ok" if r >= MIN_RATIO else "FAIL"
        if r < MIN_RATIO:
            failures += 1
        print(f"{fg} on {bg}: {r:5.2f}:1 {mark}  ({where})")

    print()
    print("identities")
    for a, b, why in IDENTITIES:
        same = tokens[a] == tokens[b]
        if not same:
            failures += 1
        print(f"{a} == {b}: {tokens[a]} {'ok' if same else 'FAIL ' + tokens[b]}  ({why})")

    print()
    print("year scale: sRGB interpolation of the anchors, tolerance 1 per channel")
    for year in YEARS:
        name = f"--year-{year}"
        got = rgb(tokens[name])
        want = expected_year(tokens, year)
        off = max(abs(got[i] - want[i]) for i in range(3))
        mark = "ok" if off <= 1 else "FAIL"
        if off > 1:
            failures += 1
        want_hex = "#" + "".join(f"{c:02x}" for c in want)
        print(f"{name} {tokens[name]} expected {want_hex} (max channel delta {off}) {mark}")

    lowest = min(((ratio(tokens[t], tokens[s]), t, s) for t in TEXT_TOKENS for s in SURFACE_TOKENS))
    print()
    print(f"lowest text pair: {lowest[1]} on {lowest[2]} at {lowest[0]:.2f}:1")
    print("excluded as decorative (no glyph uses them): " + ", ".join(DECORATIVE))
    print()
    if failures:
        print(f"FAIL: {failures} check(s) failed")
        return 1
    print("PASS: all text tokens are at or above 4.5:1 on every surface; identities and year scale hold")
    return 0


if __name__ == "__main__":
    sys.exit(main())
