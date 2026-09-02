#!/usr/bin/env python3
"""Assert WCAG contrast for the text tokens in assets/css/tokens.css.

Every text token is checked against every surface it can sit on. Any pair
below 4.5:1 fails the run (exit 1). Decorative tokens are excluded and
listed explicitly so the exclusion is visible in the output.

Usage: python3 scripts/check-contrast.py [path/to/tokens.css]
"""

import re
import sys
from pathlib import Path

TOKENS_PATH = Path(__file__).resolve().parent.parent / "assets" / "css" / "tokens.css"

# Text tokens: anything a glyph is painted with.
TEXT_TOKENS = ["--ink", "--ink-2", "--ink-3", "--accent", "--ok", "--err"]

# Surfaces text can sit on.
SURFACE_TOKENS = ["--bg", "--surface", "--surface-2"]

# Extra pairs that are not text-on-surface but still carry text:
# (foreground, background, where it happens)
EXTRA_PAIRS = [
    ("--bg", "--accent", "text inside the block cursor and the active statusbar key"),
    ("--ink", "--selection", "selected text (::selection)"),
]

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


def luminance(hex_color: str) -> float:
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))

    def lin(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def ratio(fg: str, bg: str) -> float:
    lf, lb = luminance(fg), luminance(bg)
    hi, lo = max(lf, lb), min(lf, lb)
    return (hi + 0.05) / (lo + 0.05)


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
    header = f"{'text':<12}{'hex':<10}" + "".join(f"{s:<14}" for s in SURFACE_TOKENS)
    print(header)
    for t in TEXT_TOKENS:
        cells = []
        for s in SURFACE_TOKENS:
            r = ratio(tokens[t], tokens[s])
            mark = "ok" if r >= MIN_RATIO else "FAIL"
            if r < MIN_RATIO:
                failures += 1
            cells.append(f"{r:5.2f}:1 {mark:<5}")
        print(f"{t:<12}{tokens[t]:<10}" + "".join(f"{c:<14}" for c in cells))

    print()
    print("extra pairs")
    for fg, bg, where in EXTRA_PAIRS:
        r = ratio(tokens[fg], tokens[bg])
        mark = "ok" if r >= MIN_RATIO else "FAIL"
        if r < MIN_RATIO:
            failures += 1
        print(f"{fg} on {bg}: {r:5.2f}:1 {mark}  ({where})")

    print()
    print("excluded as decorative (no glyph uses them): " + ", ".join(DECORATIVE))
    print()
    if failures:
        print(f"FAIL: {failures} pair(s) below {MIN_RATIO}:1")
        return 1
    print("PASS: all text tokens are at or above 4.5:1 on every surface")
    return 0


if __name__ == "__main__":
    sys.exit(main())
