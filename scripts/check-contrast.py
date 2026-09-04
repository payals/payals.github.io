#!/usr/bin/env python3
"""Assert WCAG contrast for the text tokens in assets/css/tokens.css.

Every text token is checked against every surface it can sit on. Any pair
below 4.5:1 fails the run (exit 1). Decorative tokens are excluded and
listed explicitly so the exclusion is visible in the output.

Phase 3 additions: the six topic hues (--topic-*) join the text tokens at
the same 4.5:1 floor, --topic-other is asserted equal to --ink-3, and the
topic filter's dimmed state is checked as a composite: a non-matching row is
drawn at --dim-row opacity, which composites its text toward the surface, so
the token the dimmed row's text actually uses (--ink) is checked at that
alpha on every surface rather than at full strength.

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

# Phase-3 addition: the six topic hues. They are painted on marks, LEDs,
# calendar cells, career ticks and legend chips, never on body text, but
# they are held to the 4.5:1 text floor anyway so a topic hue can never be
# the weakest thing on the page.
TOPIC_TOKENS = [
    "--topic-postgres", "--topic-reliability", "--topic-security",
    "--topic-platform", "--topic-ai", "--topic-other",
]

# Text tokens: anything a glyph is painted with.
TEXT_TOKENS = [
    "--ink", "--ink-2", "--ink-3",
    "--accent", "--warn", "--ok", "--err",
    "--kind-now", "--kind-talk", "--kind-post", "--kind-cv", "--kind-link", "--kind-cmd",
] + TOPIC_TOKENS + YEAR_TOKENS

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
    ("--topic-other", "--ink-3", "the topic with no hue of its own is plain tertiary ink"),
]

# Year scale anchors. Intermediate years are linear in sRGB between them.
YEAR_ANCHORS = {2013: "--year-2013", 2018: "--year-2018", 2022: "--year-2022", 2026: "--year-2026"}

# Decorative tokens: borders, rules, fills. No glyph is painted with them.
DECORATIVE = ["--line", "--line-strong", "--selection"]

MIN_RATIO = 4.5

# Dimmed state (T2). features.css puts opacity: var(--dim-row) on a row that
# does not match the active topic filter. Opacity composites the whole row
# toward the surface underneath it, and nothing inside the row can undo it.
# --dim-row is 0.76: --ink and every kind/year hue a row can carry already
# clear 4.5:1 at that alpha, but --ink-3 (the row's own quietest text token)
# does not, so features.css swaps --ink-3 for --ink-2 inside a dimmed row
# rather than re-inking every glyph to full --ink. This is the check that
# binds the swap: --ink-2 (what --ink-3 now resolves to, and what a row's
# own --ink-2 text already was) at --dim-row alpha must still clear 4.5:1.
# Marks are not text and are excluded, as they are everywhere else in this
# file. Dimmed rows only ever sit on --surface (hover/focus-within, the only
# states that could put one on --surface-2, are excluded from dimming), so
# that is the one surface this composite is checked against.
DIMMED_TEXT_TOKEN = "--ink-2"
DIM_ALPHA_TOKEN = "--dim-row"
DIMMED_SURFACES = ["--surface"]

# The composite above is only the truth while the stylesheet really does put
# --ink-3: var(--ink-2) on every dimmed row. That is one rule in features.css,
# and without this check it could be deleted and the composite math would go
# on passing over a token no glyph uses any more. So the rule is asserted from
# source: it has to name all six topics and it has to swap --ink-3 to --ink-2.
FEATURES_PATH = Path(__file__).resolve().parent.parent / "assets" / "css" / "features.scss"
REINK_MARKER = "--ink-3: var(--ink-2)"
TOPIC_IDS = ["postgres", "reliability", "security", "platform", "ai", "other"]


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


def parse_alpha(css: str, name: str) -> float:
    """Read a bare number token (an opacity) out of the :root block."""
    root = re.search(r":root\s*\{(.*?)\n\}", css, re.S)
    if not root:
        sys.exit("no :root block found")
    m = re.search(re.escape(name) + r"\s*:\s*([0-9]*\.?[0-9]+)\s*;", root.group(1))
    if not m:
        sys.exit(f"{name} not found in :root")
    return float(m.group(1))


def composite(fg: str, bg: str, alpha: float) -> str:
    """fg drawn at `alpha` over bg, as the browser composites an opacity group."""
    f, b = rgb(fg), rgb(bg)
    return "#" + "".join(f"{round(alpha * f[i] + (1 - alpha) * b[i]):02x}" for i in range(3))


def reink_rule(css: str) -> tuple:
    """The features.css rule that swaps --ink-3 for --ink-2 inside a dimmed
    row, as (selector, body).

    Returns (None, None) when the rule is gone, which fails the run: the
    dimmed composite below would then be asserting a token nothing renders.
    """
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    for match in re.finditer(r"([^{}]*)\{([^{}]*)\}", css):
        if REINK_MARKER in match.group(2):
            return match.group(1).strip(), match.group(2).strip()
    return None, None


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
    css = path.read_text()
    tokens = parse_tokens(css)
    dim_row = parse_alpha(css, DIM_ALPHA_TOKEN)

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
    print("dimmed rows (topic filter): the --ink-3 swap rule in assets/css/features.scss")
    selector, declarations = reink_rule(FEATURES_PATH.read_text())
    if selector is None:
        failures += 1
        print(f"  rule declaring {REINK_MARKER!r}: FAIL, not found in {FEATURES_PATH}")
    else:
        has_swap = REINK_MARKER in declarations
        if not has_swap:
            failures += 1
        verdict = "ok" if has_swap else f"FAIL, the rule declares {declarations!r}"
        print(f"  swaps to {REINK_MARKER}: {verdict}")
        for topic in TOPIC_IDS:
            named = f'body[data-topic-filter="{topic}"]' in selector
            if not named:
                failures += 1
            print(f"  covers {topic}: {'ok' if named else 'FAIL, topic not in the selector list'}")

    print()
    print(f"dimmed rows (topic filter): {DIMMED_TEXT_TOKEN} (what --ink-3 now resolves to) "
          f"at {DIM_ALPHA_TOKEN} {dim_row} over {', '.join(DIMMED_SURFACES)}")
    for surface in DIMMED_SURFACES:
        comp = composite(tokens[DIMMED_TEXT_TOKEN], tokens[surface], dim_row)
        r = ratio(comp, tokens[surface])
        mark = "ok" if r >= MIN_RATIO else "FAIL"
        if r < MIN_RATIO:
            failures += 1
        print(f"{DIMMED_TEXT_TOKEN} on {surface}: composites to {comp}, {r:5.2f}:1 {mark}")
    # --ink itself, the row's primary text, at the same alpha: always the
    # widest margin, printed so the composite table shows the whole picture
    # rather than only the token that was tight enough to need a rule.
    for surface in DIMMED_SURFACES:
        comp = composite(tokens["--ink"], tokens[surface], dim_row)
        r = ratio(comp, tokens[surface])
        mark = "ok" if r >= MIN_RATIO else "FAIL"
        if r < MIN_RATIO:
            failures += 1
        print(f"--ink on {surface}: composites to {comp}, {r:5.2f}:1 {mark}")

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
    print("PASS: all text tokens are at or above 4.5:1 on every surface, dimmed rows included; identities and year scale hold")
    return 0


if __name__ == "__main__":
    sys.exit(main())
