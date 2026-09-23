#!/usr/bin/env python3
"""Assert WCAG contrast for the text tokens in both theme blocks of
assets/css/command.css, the one stylesheet of every page on the site.

command.css ships a dark "dusk" :root block and a light "dawn"
:root[data-theme="light"] block (the prefers-color-scheme copy is asserted
identical to it). In each theme every text token and section hue is checked
on --bg, --surface and --raised, on the door fills (the section hue mixed
into --raised at --fill, at rest through --door-rest and fully lit), on the
amber-tinted palette row and flashed row and on the status line, and
--on-hue is checked on every solid hue it labels (badges, buttons). Any pair
below 4.5:1 fails the run (exit 1).

The blog-side pages (posts, /blog/, /reading/, evidence, 404) add no new
colour tokens; the pairs they paint are listed by name under "page pairs"
so a reader can see what each one rests on: body text, meta, code and its
three rouge shades on the code surface, table headers, the contents list,
the series card and the colophon. (tokens.css and its kind key, year scale
and topic hues were retired with the 2026-09 sitewide port.)

Usage: python3 scripts/check-contrast.py [path/to/command.css]
"""

import re
import sys
from pathlib import Path

MIN_RATIO = 4.5


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


def mix(a: str, b: str, t: float) -> str:
    """color-mix(in srgb, a t, b): t of a over (1 - t) of b, per channel."""
    x, y = rgb(a), rgb(b)
    return "#" + "".join(f"{round(t * x[i] + (1 - t) * y[i]):02x}" for i in range(3))


COMMAND_PATH = Path(__file__).resolve().parent.parent / "assets" / "css" / "command.css"
# The amber-tinted rows are lighter than --raised, and --ink-3 falls under
# 4.5:1 on them in the dark theme, so command.css swaps the one --ink-3 text
# each row carries to --ink-2. These rules are what the exclusion rests on, so
# they are asserted from source; delete one and the run fails.
REINKED_ROWS = {
    "palette row": '.pal-opt[aria-selected="true"] .pal-kind{color:var(--ink-2)}',
    "flashed row": ".row.flash > summary .row-lead{color:var(--ink-2)}",
}


# Named text pairs the sitewide pages paint (foreground, background, where).
PAGE_PAIRS = [
    ("--ink", "--bg", "post body, titles, list titles"),
    ("--ink-2", "--bg", "subtitle, meta row, table headers, contents list, blockquote"),
    ("--ink-3", "--bg", "list years and meta, tags line, colophon, pager labels"),
    ("--ink", "--surface", "code text, inline code, 404 prompt echo"),
    ("--ink-2", "--surface", "rouge strings and numbers"),
    ("--ink-3", "--surface", "rouge comments, series part numbers, pager labels"),
    ("--ink", "--raised", "current series part, hovered list row"),
    ("--writing", "--bg", "prompt path on writing pages"),
    ("--now", "--bg", "prompt path on /reading/"),
    ("--on-hue", "--ink", "404 search button (no section hue)"),
]


def command_block(css: str, selector_re: str) -> dict:
    m = re.search(selector_re + r"\s*\{(.*?)\}", css, re.S)
    if not m:
        sys.exit(f"command.css: block {selector_re!r} not found")
    body = m.group(1)
    out = {n: v.lower() for n, v in re.findall(r"(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\b", body)}
    for n, v in re.findall(r"(--fill|--door-rest)\s*:\s*([0-9.]+%?)", body):
        out[n] = float(v[:-1]) / 100 if v.endswith("%") else float(v)
    return out


def check_command(path: Path) -> int:
    """Both command.css themes. Returns the number of failed checks."""
    css = re.sub(r"/\*.*?\*/", "", path.read_text(), flags=re.S)
    dark = command_block(css, r"(?m)^:root")
    light = command_block(css, r':root\[data-theme="light"\]')
    media_light = command_block(css, r':root:not\(\[data-theme="dark"\]\)')
    failures = 0
    print()
    print(f"command layout: {path}")
    same = media_light == light
    if not same:
        failures += 1
    print(f"prefers-color-scheme light block == [data-theme=light] block: {'ok' if same else 'FAIL'}")
    text = ["--ink", "--ink-2", "--ink-3", "--accent", "--talks", "--writing", "--cv", "--now"]
    hues = ["--talks", "--writing", "--cv", "--now"]
    for sname, rule in REINKED_ROWS.items():
        ok = rule in css
        if not ok:
            failures += 1
        print(f"{sname}: --ink-3 text re-inked to --ink-2 by `{rule}`: {'ok' if ok else 'FAIL, rule missing'}")
    for name, t in (("dark (dusk)", dark), ("light (dawn)", light)):
        missing = [k for k in text + ["--bg", "--surface", "--raised", "--on-hue", "--fill", "--door-rest"] if k not in t]
        if missing:
            print(f"{name}: missing {', '.join(missing)}")
            failures += 1
            continue
        surfaces = {"--bg": t["--bg"], "--surface": t["--surface"], "--raised": t["--raised"],
                    "palette row": mix(t["--accent"], t["--raised"], 0.14),
                    "flashed row": mix(t["--accent"], t["--raised"], 0.12),
                    "statusline": mix(t["--surface"], t["--bg"], 0.88)}
        for h in hues:
            fill = mix(t[h], t["--raised"], t["--fill"])
            surfaces[f"{h[2:]} door, rest"] = mix(fill, t["--raised"], t["--door-rest"])
            surfaces[f"{h[2:]} door, lit"] = fill
        print(f"\n{name}")
        low = None
        for fg in text:
            for sname, bg in surfaces.items():
                # hues and --accent are never set on another hue's door
                if "door" in sname and fg not in ("--ink", "--ink-2") and not sname.startswith(fg[2:]):
                    continue
                # --ink-3 is re-inked to --ink-2 on the amber rows (asserted below)
                if fg == "--ink-3" and sname in REINKED_ROWS:
                    continue
                r = ratio(t[fg], bg)
                if low is None or r < low[0]:
                    low = (r, fg, sname)
                if r < MIN_RATIO:
                    failures += 1
                    print(f"  {fg} on {sname}: {r:5.2f}:1 FAIL")
        for h in hues + ["--ink"]:
            r = ratio(t["--on-hue"], t[h])
            if r < MIN_RATIO:
                failures += 1
            print(f"  --on-hue on {h}: {r:5.2f}:1 {'ok' if r >= MIN_RATIO else 'FAIL'}")
        print(f"  lowest text pair: {low[1]} on {low[2]} at {low[0]:.2f}:1")
        print("  page pairs (blog, posts, reading, evidence, 404):")
        for fg, bg, where in PAGE_PAIRS:
            r = ratio(t[fg], t[bg])
            if r < MIN_RATIO:
                failures += 1
            print(f"    {fg} on {bg}: {r:5.2f}:1 {'ok' if r >= MIN_RATIO else 'FAIL'}  ({where})")
    return failures


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else COMMAND_PATH
    print(f"minimum ratio: {MIN_RATIO}:1")
    failures = check_command(path)
    print()
    if failures:
        print(f"FAIL: {failures} check(s) failed")
        return 1
    print("PASS: every text token is at or above 4.5:1 on every surface it sits on in both command.css themes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
