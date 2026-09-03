#!/usr/bin/env python3
"""Sync data/books.json and data/now.json from the Goodreads RSS shelves.

Fetches the "read" and "currently-reading" shelves for a Goodreads user via
the list_rss endpoint, applies data/books.policy.json's opt-in shelf policy
to decide what shows up on the public site, collapses duplicate editions of
the same book, and rewrites data/books.json (the finished-reading table) and
data/now.json (the "now reading" line) to match.

Publishing is opt-in: a finished book only appears when it is tagged with the
policy's include_shelf ("site") on Goodreads, is grandfathered in because it
is already present in data/books.json on disk, or both -- and never when it
carries the remove_shelf ("no-site") tag. Nothing new appears on the site by
default just by finishing a book.

Standard library only: urllib, xml.etree, json, argparse, re, datetime, html.

Feed content is untrusted: every string field is HTML-tag-stripped and
length-capped before it reaches the site's data files. The Goodreads RSS key
is read from the GOODREADS_RSS_KEY environment variable and is never printed,
logged, or embedded in an error message.

A malformed, truncated, or otherwise unparseable feed response never reaches
data/books.json or data/now.json: fetching and parsing raise SyncError, and
main() exits non-zero without writing anything. A read list that would shrink
by more than 3 books or more than 10% is refused the same way unless
--allow-shrink is passed, since a bad or partial feed response can look like
a legitimate "book removed" edit otherwise.

Usage:
    GOODREADS_RSS_KEY=... python3 scripts/sync_goodreads.py [--dry-run]
    python3 scripts/sync_goodreads.py --from-file read.xml --from-file-reading currently.xml --dry-run

See data/books.README.md for the full operator guide.
"""

from __future__ import annotations

import argparse
import datetime
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

GOODREADS_USER_ID_DEFAULT = "50358708"
RSS_URL_TEMPLATE = (
    "https://www.goodreads.com/review/list_rss/{user_id}"
    "?key={key}&shelf={shelf}&page={page}"
)
MAX_PAGES = 50  # defensive cap; a real shelf is a handful of pages
MAX_TITLE_LEN = 300
MAX_AUTHOR_LEN = 200
MAX_MISC_LEN = 40
MAX_RESPONSE_BYTES = 8 * 1024 * 1024  # 8 MiB; a real shelf page is a few KB
RFC822_FORMAT = "%a, %d %b %Y %H:%M:%S %z"
SHRINK_ABSOLUTE_THRESHOLD = 3  # refuse a read-list shrink bigger than this...
SHRINK_PERCENT_THRESHOLD = 0.10  # ...or bigger than this fraction, without --allow-shrink

REPO_ROOT = Path(__file__).resolve().parent.parent


class SyncError(ValueError):
    """Raised when a Goodreads feed is malformed or fails a safety check.

    A SyncError anywhere in the fetch/parse/safety-valve path means main()
    must exit non-zero without writing data/books.json or data/now.json --
    a bad feed response must never be able to publish a partial or empty
    result, or silently delete books that are still on the real shelf.
    Subclasses ValueError so the DOCTYPE/ENTITY guard's existing callers
    (and tests) that catch ValueError keep working unchanged.
    """


# --------------------------------------------------------------------------
# Untrusted-input handling
# --------------------------------------------------------------------------


def strip_tags(text: str | None) -> str:
    """Remove HTML tags and normalize whitespace in feed-sourced text."""
    if not text:
        return ""
    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def clean_field(text: str | None, max_len: int) -> str:
    return strip_tags(text)[:max_len]


# --------------------------------------------------------------------------
# Fetching
# --------------------------------------------------------------------------


def fetch_url(url: str, sanitized_desc: str) -> bytes:
    """Fetch a URL, never leaking the URL (which carries the RSS key) on error.

    Bounds the response to MAX_RESPONSE_BYTES so a misbehaving or malicious
    endpoint can't hand back an unbounded body; parse_items() then runs its
    DOCTYPE/ENTITY guard over this whole (already-bounded) body, not a prefix.
    """
    req = urllib.request.Request(
        url, headers={"User-Agent": "payals.github.io-goodreads-sync/1.0"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310
            body = resp.read(MAX_RESPONSE_BYTES + 1)
    except urllib.error.HTTPError as exc:
        raise SyncError(
            f"Goodreads request failed for {sanitized_desc}: HTTP {exc.code}"
        ) from None
    except urllib.error.URLError as exc:
        raise SyncError(
            f"Goodreads request failed for {sanitized_desc}: {exc.reason}"
        ) from None
    if len(body) > MAX_RESPONSE_BYTES:
        raise SyncError(
            f"Goodreads response for {sanitized_desc} exceeded "
            f"{MAX_RESPONSE_BYTES} bytes; refusing to parse it"
        )
    return body


def fetch_shelf(
    user_id: str, key: str, shelf: str, fetch: "Any" = fetch_url
) -> list[dict[str, Any]]:
    """Fetch every page of one shelf and return parsed item dicts.

    A page that parses to zero items ends pagination legitimately -- that's
    the normal "ran out of pages" signal. A page that fails to parse (bad
    XML, wrong root, missing channel, a malformed item) is a different
    thing entirely: parse_items() raises SyncError for that, which
    propagates out of this function rather than being mistaken for the end
    of the shelf. `fetch` is injectable for tests; production code always
    uses the module-level fetch_url.
    """
    items: list[dict[str, Any]] = []
    page = 1
    while page <= MAX_PAGES:
        url = RSS_URL_TEMPLATE.format(user_id=user_id, key=key, shelf=shelf, page=page)
        body = fetch(url, f"shelf={shelf} page={page}")
        page_items = parse_items(body)  # raises SyncError on a malformed page
        if not page_items:
            break  # a validly-parsed, empty page: legitimate end of pagination
        items.extend(page_items)
        page += 1
    return items


def load_items_from_file(path: str) -> list[dict[str, Any]]:
    with open(path, "rb") as f:
        return parse_items(f.read())


# --------------------------------------------------------------------------
# Parsing
# --------------------------------------------------------------------------


def _text(item_el: ET.Element, tag: str) -> str:
    el = item_el.find(tag)
    if el is None or el.text is None:
        return ""
    return el.text


_UNSAFE_XML_MARKERS = (b"<!doctype", b"<!entity")


def _reject_unsafe_xml(xml_bytes: bytes) -> None:
    """Refuse XML carrying a DOCTYPE/ENTITY declaration.

    stdlib xml.etree.ElementTree (via expat) has no built-in defense against
    entity-expansion ("billion laughs") or XXE payloads, and this parses
    externally-fetched, untrusted feed content. The task's stdlib-only
    constraint rules out defusedxml, so this refuses the one thing a
    legitimate Goodreads RSS response never contains: a DTD. Scans the
    complete body (already size-bounded by fetch_url's MAX_RESPONSE_BYTES),
    not just a prefix -- a DOCTYPE padded past an early cutoff would
    otherwise slip through unnoticed.
    """
    lowered = xml_bytes.lower()
    for marker in _UNSAFE_XML_MARKERS:
        if marker in lowered:
            raise SyncError("refusing to parse XML with a DOCTYPE/ENTITY declaration")


def parse_items(xml_bytes: bytes) -> list[dict[str, Any]]:
    _reject_unsafe_xml(xml_bytes)
    try:
        root = ET.fromstring(xml_bytes)  # noqa: S314
    except ET.ParseError as exc:
        raise SyncError(f"malformed XML: {exc}") from None
    if root.tag != "rss":
        raise SyncError(f"unexpected XML root element <{root.tag}>, expected <rss>")
    channel = root.find("channel")
    if channel is None:
        raise SyncError("RSS feed is missing a <channel> element")
    items = []
    for item_el in channel.findall("item"):
        parsed = parse_item(item_el)
        if parsed is not None:
            items.append(parsed)
    return items


def parse_item(item_el: ET.Element) -> dict[str, Any] | None:
    book_id = _text(item_el, "book_id").strip()
    if not book_id:
        raise SyncError("feed item is missing book_id")
    if not book_id.isdigit():
        return None

    title = clean_field(_text(item_el, "title"), MAX_TITLE_LEN)
    if not title:
        raise SyncError(f"feed item book_id={book_id} is missing title")
    author = clean_field(_text(item_el, "author_name"), MAX_AUTHOR_LEN)

    rating_raw = _text(item_el, "user_rating").strip()
    try:
        rating = int(rating_raw)
    except ValueError:
        rating = 0
    rating = max(0, min(5, rating))

    shelves_raw = clean_field(_text(item_el, "user_shelves"), MAX_MISC_LEN * 10)
    shelves = [s.strip() for s in shelves_raw.split(",") if s.strip()]

    return {
        "book_id": book_id,
        "title": title,
        "author": author,
        "rating": rating,
        "user_read_at": _text(item_el, "user_read_at").strip(),
        "user_date_added": _text(item_el, "user_date_added").strip(),
        "user_shelves": shelves,
        "book_published": clean_field(_text(item_el, "book_published"), MAX_MISC_LEN),
    }


def parse_rfc822(date_str: str) -> datetime.datetime | None:
    if not date_str:
        return None
    try:
        return datetime.datetime.strptime(date_str.strip(), RFC822_FORMAT)
    except ValueError:
        return None


def extract_year(date_str: str) -> int | None:
    dt = parse_rfc822(date_str)
    if dt is not None:
        return dt.year
    match = re.search(r"\b(19|20)\d{2}\b", date_str)
    return int(match.group(0)) if match else None


# --------------------------------------------------------------------------
# Policy
# --------------------------------------------------------------------------


def load_policy(path: str) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    data.setdefault("mode", "opt-in")
    data.setdefault("include_shelf", "site")
    data.setdefault("remove_shelf", "no-site")
    data.setdefault("include_unrated", True)
    data.setdefault("title_overrides", {})
    data.setdefault("author_overrides", {})
    data.setdefault("strip_title_suffixes", [])
    return data


def is_on_include_shelf(item: dict[str, Any], policy: dict[str, Any]) -> bool:
    return policy["include_shelf"] in item["user_shelves"]


def is_removed(item: dict[str, Any], policy: dict[str, Any]) -> bool:
    return policy["remove_shelf"] in item["user_shelves"]


def passes_policy(
    item: dict[str, Any],
    policy: dict[str, Any],
    grandfathered_ids: "set[str] | frozenset[str]" = frozenset(),
) -> bool:
    """Opt-in eligibility for the published read list.

    A book is eligible when it carries the include_shelf tag, or is already
    present in data/books.json on disk (grandfathered) -- and never when it
    carries the remove_shelf tag, which always wins. include_unrated then
    applies uniformly on top of that eligibility check.
    """
    if is_removed(item, policy):
        return False
    if not (is_on_include_shelf(item, policy) or item["book_id"] in grandfathered_ids):
        return False
    if not policy["include_unrated"] and item["rating"] == 0:
        return False
    return True


def apply_overrides(item: dict[str, Any], policy: dict[str, Any]) -> tuple[str, str]:
    title = policy["title_overrides"].get(item["book_id"], item["title"])
    for suffix in policy["strip_title_suffixes"]:
        if suffix and title.endswith(suffix):
            title = title[: -len(suffix)].rstrip()
    author = policy["author_overrides"].get(item["book_id"], item["author"])
    return title, author


_BOOK_ID_FROM_URL_RE = re.compile(r"/book/show/(\d+)")


def book_id_from_url(url: str) -> str | None:
    match = _BOOK_ID_FROM_URL_RE.search(url)
    return match.group(1) if match else None


def grandfathered_ids_from_books(old_books: dict[str, Any] | None) -> set[str]:
    """Book ids already present in data/books.json on disk.

    These stay published even if they are never (or no longer) tagged with
    the include_shelf, since opt-in publishing must not silently drop a book
    someone already chose to show. The only ways off this list are the
    remove_shelf tag or editing data/books.json directly.
    """
    if not old_books:
        return set()
    ids = set()
    for book in old_books.get("read", []):
        book_id = book_id_from_url(book.get("url", ""))
        if book_id:
            ids.add(book_id)
    return ids


def normalize_title(title: str) -> str:
    """Collapsing key for same-book editions. Deliberately does not strip
    parenthetical suffixes (e.g. series markers) since those distinguish
    real, different books; strip_title_suffixes in the policy is the
    mechanism for edition-only suffixes that should collapse together."""
    t = title.lower().strip()
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


# --------------------------------------------------------------------------
# Building the read list
# --------------------------------------------------------------------------


def build_read_list(
    read_items: list[dict[str, Any]],
    currently_reading_items: list[dict[str, Any]],
    policy: dict[str, Any],
    grandfathered_ids: "set[str] | frozenset[str]" = frozenset(),
) -> list[dict[str, Any]]:
    currently_reading_ids = {it["book_id"] for it in currently_reading_items}

    groups: dict[str, list[dict[str, Any]]] = {}
    for item in read_items:
        if item["book_id"] in currently_reading_ids:
            continue  # a book being (re)read right now is never in the read list
        if not passes_policy(item, policy, grandfathered_ids):
            continue
        title, author = apply_overrides(item, policy)
        year = extract_year(item["user_read_at"]) or extract_year(item["user_date_added"])
        if year is None:
            continue  # can't place it chronologically; skip rather than guess
        entry = {
            "title": title,
            "author": author,
            "rating": item["rating"],
            "year": year,
            "url": f"https://www.goodreads.com/book/show/{item['book_id']}",
        }
        groups.setdefault(normalize_title(title), []).append(entry)

    collapsed = []
    for entries in groups.values():
        best_rating = max(e["rating"] for e in entries)
        canonical = min(entries, key=lambda e: e["year"])  # earliest edition wins title/url
        collapsed.append(
            {
                "title": canonical["title"],
                "author": canonical["author"],
                "rating": best_rating,
                "year": canonical["year"],
                "url": canonical["url"],
            }
        )

    collapsed.sort(key=lambda e: (-e["year"], e["title"].lower()))
    return collapsed


def compute_now_reading(
    currently_reading_items: list[dict[str, Any]], policy: dict[str, Any]
) -> str:
    """Title/author of the most recently added currently-reading book that
    carries the include_shelf tag (unrated is normal for a book still in
    progress, so it is not gated here) and does not carry the remove_shelf
    tag -- remove_shelf always wins, same as it does for the read list, even
    if the item also carries the include_shelf tag. Returns "" if there is
    no such book, including the ordinary case where the shelf legitimately
    has nothing eligible on it right now (a finished book with nothing else
    in progress). Grandfathering does not apply to currently-reading: there
    is no prior now.json value to match a book id against, only the shelf
    tags on the current fetch.

    currently_reading_items only ever reaches this function after a
    successful fetch -- a malformed or failed fetch raises SyncError
    upstream, before this point -- so "" here always means the shelf really
    is empty of eligible books, never that the fetch failed."""
    candidates = []
    for item in currently_reading_items:
        if is_removed(item, policy):
            continue
        if not is_on_include_shelf(item, policy):
            continue
        title, author = apply_overrides(item, policy)
        added_at = parse_rfc822(item["user_date_added"])
        candidates.append((added_at, title, author))

    if not candidates:
        return ""

    epoch = datetime.datetime.min.replace(tzinfo=datetime.timezone.utc)
    candidates.sort(key=lambda c: c[0] or epoch, reverse=True)
    _, title, author = candidates[0]
    return f"{title} by {author}"


# --------------------------------------------------------------------------
# Output assembly
# --------------------------------------------------------------------------


def load_json_if_exists(path: str) -> Any | None:
    p = Path(path)
    if not p.exists():
        return None
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: str, data: Any, indent: int) -> None:
    text = json.dumps(data, indent=indent, ensure_ascii=False)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text + "\n")


def build_books_output(
    old_data: dict[str, Any] | None, new_read_list: list[dict[str, Any]], today_str: str
) -> tuple[dict[str, Any], bool]:
    old_read = old_data.get("read", []) if old_data else []
    scale = old_data.get("scale", 5) if old_data else 5
    if new_read_list == old_read:
        return (old_data if old_data is not None else {"scale": scale, "source": "", "read": []}), False
    new_data = {
        "scale": scale,
        "source": f"Goodreads read shelf, synced {today_str}",
        "read": new_read_list,
    }
    return new_data, True


def build_now_output(
    old_now: dict[str, Any], reading_value: str, today_str: str
) -> tuple[dict[str, Any], bool]:
    """reading_value is compute_now_reading()'s result from a successful
    fetch -- "" is a legitimate value meaning nothing is eligible right now,
    not "leave the old value alone". Key order is preserved and "updated"
    is only touched when "reading" actually changes."""
    if old_now.get("reading") == reading_value:
        return old_now, False
    new_now = dict(old_now)
    new_now["reading"] = reading_value
    new_now["updated"] = today_str
    return new_now, True


def summarize_books_diff(
    old_read: list[dict[str, Any]], new_read: list[dict[str, Any]]
) -> list[str]:
    old_by_url = {b["url"]: b for b in old_read}
    new_by_url = {b["url"]: b for b in new_read}

    added = [new_by_url[u] for u in new_by_url if u not in old_by_url]
    removed = [old_by_url[u] for u in old_by_url if u not in new_by_url]
    changed = [
        (old_by_url[u], new_by_url[u])
        for u in (set(old_by_url) & set(new_by_url))
        if old_by_url[u] != new_by_url[u]
    ]
    added.sort(key=lambda b: b["title"].lower())
    removed.sort(key=lambda b: b["title"].lower())
    changed.sort(key=lambda pair: pair[1]["title"].lower())

    lines = []
    for b in added:
        lines.append(f"+ {b['title']} by {b['author']} ({b['year']}, {b['rating']}/5)")
    for b in removed:
        lines.append(f"- {b['title']} by {b['author']} ({b['year']}, {b['rating']}/5)")
    for old_b, new_b in changed:
        lines.append(
            f"~ {new_b['title']}: rating {old_b['rating']}->{new_b['rating']}, "
            f"year {old_b['year']}->{new_b['year']}"
        )
    return lines


def removed_books(
    old_read: list[dict[str, Any]],
    new_read: list[dict[str, Any]],
    present_book_ids: "set[str] | None" = None,
) -> list[dict[str, Any]]:
    """Books present in old_read (matched by url) that are absent from new_read.

    When present_book_ids is given (the book ids seen in this run's fetched
    read-shelf items), a removal only counts if the book's id is NOT among
    them -- i.e. the book is missing from the feed itself. A book that IS in
    the feed but was dropped by policy (an explicit remove_shelf tag) is
    deliberate, visible operator intent, not a sign of a bad feed, so it's
    excluded here even though it still disappears from the read list.
    """
    new_urls = {b["url"] for b in new_read}
    removed = [b for b in old_read if b["url"] not in new_urls]
    if present_book_ids is None:
        return removed
    return [b for b in removed if book_id_from_url(b.get("url", "")) not in present_book_ids]


def read_list_shrink_refused(
    old_read: list[dict[str, Any]],
    new_read: list[dict[str, Any]],
    present_book_ids: "set[str] | None" = None,
) -> list[dict[str, Any]] | None:
    """The books that would be removed if the shrink from old_read to
    new_read exceeds the safety valve (more than SHRINK_ABSOLUTE_THRESHOLD
    books, or more than SHRINK_PERCENT_THRESHOLD of old_read), else None.

    A malformed, truncated, or partially-failed feed response can make
    grandfathered books vanish from the fetched shelf items entirely --
    build_read_list() has no way to tell that apart from a deliberate
    removal, since grandfathering only re-admits books that ARE present in
    the current fetch. This is the last line of defense before disk. See
    removed_books() for how present_book_ids excludes deliberate
    remove_shelf drops (a book present in the feed) from the count.
    """
    if not old_read:
        return None
    removed = removed_books(old_read, new_read, present_book_ids)
    if not removed:
        return None
    if len(removed) > SHRINK_ABSOLUTE_THRESHOLD:
        return removed
    if len(removed) > SHRINK_PERCENT_THRESHOLD * len(old_read):
        return removed
    return None


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------


def today_str() -> str:
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run", action="store_true", help="Print the diff, write nothing."
    )
    parser.add_argument(
        "--from-file",
        metavar="PATH",
        help="Read the 'read' shelf from a local RSS XML file instead of fetching.",
    )
    parser.add_argument(
        "--from-file-reading",
        metavar="PATH",
        help="Read the 'currently-reading' shelf from a local RSS XML file.",
    )
    parser.add_argument(
        "--policy",
        default=str(REPO_ROOT / "data" / "books.policy.json"),
        help="Path to the policy JSON file.",
    )
    parser.add_argument(
        "--out-books",
        default=str(REPO_ROOT / "data" / "books.json"),
        help="Path to write the finished-reading data file.",
    )
    parser.add_argument(
        "--out-now",
        default=str(REPO_ROOT / "data" / "now.json"),
        help="Path to write the now-reading data file.",
    )
    parser.add_argument(
        "--user-id",
        default=None,
        help="Goodreads user id (default: GOODREADS_USER_ID env var, or "
        f"{GOODREADS_USER_ID_DEFAULT}).",
    )
    parser.add_argument(
        "--allow-shrink",
        action="store_true",
        help=(
            "Allow the read list to shrink by more than "
            f"{SHRINK_ABSOLUTE_THRESHOLD} books or more than "
            f"{int(SHRINK_PERCENT_THRESHOLD * 100)}%% of its size in one run. "
            "Without this flag, a shrink past that threshold is refused "
            "(exit 1, nothing written), since it usually means a malformed "
            "or partial feed response rather than a deliberate removal."
        ),
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    policy = load_policy(args.policy)

    try:
        if args.from_file:
            read_items = load_items_from_file(args.from_file)
            currently_reading_items = (
                load_items_from_file(args.from_file_reading) if args.from_file_reading else []
            )
        else:
            key = os.environ.get("GOODREADS_RSS_KEY")
            if not key:
                parser.error("GOODREADS_RSS_KEY is required unless --from-file is given.")
            user_id = (
                args.user_id or os.environ.get("GOODREADS_USER_ID") or GOODREADS_USER_ID_DEFAULT
            )
            read_items = fetch_shelf(user_id, key, "read")
            currently_reading_items = fetch_shelf(user_id, key, "currently-reading")
    except SyncError as exc:
        print(f"sync failed, nothing written: {exc}", file=sys.stderr)
        return 1

    old_books = load_json_if_exists(args.out_books)
    old_read = old_books.get("read", []) if old_books else []
    grandfathered_ids = grandfathered_ids_from_books(old_books)

    new_read_list = build_read_list(
        read_items, currently_reading_items, policy, grandfathered_ids
    )

    if not args.allow_shrink:
        present_book_ids = {item["book_id"] for item in read_items}
        shrunk = read_list_shrink_refused(old_read, new_read_list, present_book_ids)
        if shrunk is not None:
            for b in shrunk:
                print(f"  - {b['title']} by {b['author']}", file=sys.stderr)
            print(
                f"refusing to publish: read list would lose {len(shrunk)} of "
                f"{len(old_read)} book(s), past the safety-valve threshold "
                f"(more than {SHRINK_ABSOLUTE_THRESHOLD} books, or more than "
                f"{int(SHRINK_PERCENT_THRESHOLD * 100)}% of the list). This "
                "usually means a malformed or partial feed response. Pass "
                "--allow-shrink if this removal is deliberate.",
                file=sys.stderr,
            )
            return 1

    now_reading_value = compute_now_reading(currently_reading_items, policy)

    today = today_str()

    new_books, books_changed = build_books_output(old_books, new_read_list, today)

    old_now = load_json_if_exists(args.out_now) or {}
    new_now, now_changed = build_now_output(old_now, now_reading_value, today)

    if not books_changed and not now_changed:
        print("no changes")
        return 0

    diff_lines: list[str] = []
    if books_changed:
        diff_lines.extend(summarize_books_diff(old_read, new_read_list))
    if now_changed:
        diff_lines.append(f"now: {old_now.get('reading')!r} -> {new_now['reading']!r}")

    print("\n".join(diff_lines) if diff_lines else "no changes")

    if args.dry_run:
        return 0

    if books_changed:
        write_json(args.out_books, new_books, indent=1)
    if now_changed:
        write_json(args.out_now, new_now, indent=2)
    return 0


if __name__ == "__main__":
    sys.exit(main())
