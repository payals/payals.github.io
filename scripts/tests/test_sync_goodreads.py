"""Tests for scripts/sync_goodreads.py.

Run with: python3 -m unittest discover -s scripts/tests
"""

from __future__ import annotations

import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent.parent
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"
sys.path.insert(0, str(SCRIPTS_DIR))

import sync_goodreads as sg  # noqa: E402


def make_policy(**overrides):
    policy = {
        "mode": "opt-in",
        "include_shelf": "site",
        "remove_shelf": "no-site",
        "include_unrated": True,
        "title_overrides": {},
        "author_overrides": {},
        "strip_title_suffixes": [],
    }
    policy.update(overrides)
    return policy


def make_item(book_id, title="Some Title", author="Some Author", rating=5,
              read_at="", date_added="Mon, 01 Jan 2024 00:00:00 -0800",
              shelves=None, published="2020"):
    return {
        "book_id": book_id,
        "title": title,
        "author": author,
        "rating": rating,
        "user_read_at": read_at,
        "user_date_added": date_added,
        "user_shelves": shelves or [],
        "book_published": published,
    }


class TestParsing(unittest.TestCase):
    def test_read_fixture_parses_six_items(self):
        items = sg.load_items_from_file(str(FIXTURES_DIR / "read.xml"))
        self.assertEqual(len(items), 6)
        book_ids = {it["book_id"] for it in items}
        self.assertEqual(
            book_ids, {"1111111", "2222222", "3333333", "4444444", "5555555", "6666666"}
        )

    def test_currently_reading_fixture_parses_one_item(self):
        items = sg.load_items_from_file(str(FIXTURES_DIR / "currently-reading.xml"))
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["book_id"], "7777777")
        self.assertEqual(items[0]["title"], "In Progress Book")
        self.assertEqual(items[0]["user_shelves"], ["currently-reading", "site"])

    def test_rating_and_shelves_parsed(self):
        items = sg.load_items_from_file(str(FIXTURES_DIR / "read.xml"))
        by_id = {it["book_id"]: it for it in items}
        self.assertEqual(by_id["1111111"]["rating"], 5)
        self.assertEqual(by_id["1111111"]["user_shelves"], ["site"])
        self.assertEqual(by_id["2222222"]["rating"], 0)
        self.assertEqual(by_id["3333333"]["user_shelves"], ["no-site"])

    def test_non_digit_book_id_is_skipped(self):
        xml_bytes = b"""<?xml version="1.0"?>
        <rss><channel>
          <item>
            <title><![CDATA[No id book]]></title>
            <book_id>abc123</book_id>
            <author_name>Author</author_name>
            <user_rating>5</user_rating>
            <user_read_at></user_read_at>
            <user_date_added><![CDATA[Mon, 01 Jan 2024 00:00:00 -0800]]></user_date_added>
            <user_shelves></user_shelves>
          </item>
        </channel></rss>"""
        self.assertEqual(sg.parse_items(xml_bytes), [])

    def test_item_with_empty_book_id_raises_syncerror(self):
        xml_bytes = b"""<?xml version="1.0"?>
        <rss><channel>
          <item>
            <title><![CDATA[No book_id at all]]></title>
            <book_id></book_id>
            <author_name>Author</author_name>
            <user_rating>5</user_rating>
            <user_read_at></user_read_at>
            <user_date_added><![CDATA[Mon, 01 Jan 2024 00:00:00 -0800]]></user_date_added>
            <user_shelves></user_shelves>
          </item>
        </channel></rss>"""
        with self.assertRaises(sg.SyncError):
            sg.parse_items(xml_bytes)

    def test_item_missing_title_raises_syncerror(self):
        xml_bytes = b"""<?xml version="1.0"?>
        <rss><channel>
          <item>
            <book_id>42</book_id>
            <author_name>Author</author_name>
            <user_rating>5</user_rating>
            <user_read_at></user_read_at>
            <user_date_added><![CDATA[Mon, 01 Jan 2024 00:00:00 -0800]]></user_date_added>
            <user_shelves></user_shelves>
          </item>
        </channel></rss>"""
        with self.assertRaises(sg.SyncError):
            sg.parse_items(xml_bytes)

    def test_malformed_xml_raises_syncerror_not_empty_list(self):
        # A truncated/corrupt response must never be silently treated as
        # "zero items" -- that's indistinguishable from a legitimate empty
        # shelf and would let a bad fetch look like "nothing to publish".
        xml_bytes = b"<?xml version=\"1.0\"?><rss><channel><item><book_id>1"
        with self.assertRaises(sg.SyncError):
            sg.parse_items(xml_bytes)

    def test_root_element_not_rss_raises_syncerror(self):
        xml_bytes = (
            b'<?xml version="1.0"?>'
            b"<feed><channel><item><book_id>1</book_id>"
            b"<title>T</title></item></channel></feed>"
        )
        with self.assertRaises(sg.SyncError):
            sg.parse_items(xml_bytes)

    def test_missing_channel_raises_syncerror(self):
        xml_bytes = b'<?xml version="1.0"?><rss></rss>'
        with self.assertRaises(sg.SyncError):
            sg.parse_items(xml_bytes)

    def test_well_formed_empty_channel_returns_empty_list(self):
        # The legitimate case: a well-formed page with zero items (end of
        # pagination) must NOT raise -- only actual malformation should.
        xml_bytes = b'<?xml version="1.0"?><rss><channel></channel></rss>'
        self.assertEqual(sg.parse_items(xml_bytes), [])

    def test_untrusted_content_tags_stripped_and_capped(self):
        raw = "<script>alert(1)</script>Evil <b>Title</b>" + ("x" * 400)
        cleaned = sg.clean_field(raw, sg.MAX_TITLE_LEN)
        self.assertNotIn("<", cleaned)
        self.assertNotIn(">", cleaned)
        self.assertLessEqual(len(cleaned), sg.MAX_TITLE_LEN)
        self.assertTrue(cleaned.startswith("alert(1)Evil Title"))

    def test_doctype_declaration_is_rejected(self):
        malicious = (
            b'<?xml version="1.0"?>'
            b"<!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]>"
            b"<rss><channel><item><book_id>1</book_id></item></channel></rss>"
        )
        with self.assertRaises(ValueError):
            sg.parse_items(malicious)
        # SyncError specifically, not just any ValueError.
        with self.assertRaises(sg.SyncError):
            sg.parse_items(malicious)

    def test_doctype_padded_past_old_4096_byte_prefix_is_still_rejected(self):
        # The DOCTYPE/ENTITY guard used to only scan the first 4096 bytes.
        # Padding the DOCTYPE out past that (here, past 5000 bytes of
        # padding) proves the guard now scans the complete body.
        padding = b"<!-- " + (b"x" * 5000) + b" -->"
        malicious = (
            b'<?xml version="1.0"?>'
            + padding
            + b"<!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]>"
            + b"<rss><channel><item><book_id>1</book_id>"
              b"<title>T</title></item></channel></rss>"
        )
        self.assertGreater(len(malicious), 5000)
        with self.assertRaises(sg.SyncError):
            sg.parse_items(malicious)


class TestFetchUrlAndShelf(unittest.TestCase):
    def test_response_over_size_bound_raises_syncerror(self):
        from unittest import mock

        oversized = b"x" * (sg.MAX_RESPONSE_BYTES + 1)

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *exc):
                return False

            def read(self, n=-1):
                return oversized[:n] if n and n > 0 else oversized

        with mock.patch.object(sg.urllib.request, "urlopen", return_value=FakeResponse()):
            with self.assertRaises(sg.SyncError):
                sg.fetch_url("https://example.invalid/feed", "shelf=read page=1")

    def test_fetch_shelf_legitimate_empty_page_ends_pagination(self):
        empty_page = b'<?xml version="1.0"?><rss><channel></channel></rss>'
        calls = []

        def fake_fetch(url, desc):
            calls.append(desc)
            return empty_page

        result = sg.fetch_shelf("1", "key", "read", fetch=fake_fetch)
        self.assertEqual(result, [])
        self.assertEqual(len(calls), 1)  # stopped after the first empty page

    def test_fetch_shelf_propagates_syncerror_instead_of_treating_as_end(self):
        malformed_page = b"<?xml version=\"1.0\"?><rss><channel><item><book_id>1"

        def fake_fetch(url, desc):
            return malformed_page

        with self.assertRaises(sg.SyncError):
            sg.fetch_shelf("1", "key", "read", fetch=fake_fetch)

    def test_fetch_shelf_paginates_until_empty_page(self):
        page_one = (
            b'<?xml version="1.0"?><rss><channel><item><book_id>1</book_id>'
            b"<title>One</title></item></channel></rss>"
        )
        empty_page = b'<?xml version="1.0"?><rss><channel></channel></rss>'
        pages = [page_one, empty_page]

        def fake_fetch(url, desc):
            return pages.pop(0)

        result = sg.fetch_shelf("1", "key", "read", fetch=fake_fetch)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["book_id"], "1")


class TestYearDerivation(unittest.TestCase):
    def test_prefers_read_at_over_date_added(self):
        year = sg.extract_year("Sat, 04 Mar 2023 00:00:00 +0000") or sg.extract_year(
            "Sat, 04 Mar 2020 00:00:00 +0000"
        )
        self.assertEqual(year, 2023)

    def test_falls_back_to_date_added_when_read_at_blank(self):
        item = make_item("1", read_at="", date_added="Tue, 14 Jun 2022 09:30:00 -0700")
        year = sg.extract_year(item["user_read_at"]) or sg.extract_year(item["user_date_added"])
        self.assertEqual(year, 2022)

    def test_unparseable_date_returns_none(self):
        self.assertIsNone(sg.extract_year(""))


class TestPolicy(unittest.TestCase):
    def setUp(self):
        self.items = sg.load_items_from_file(str(FIXTURES_DIR / "read.xml"))
        self.by_id = {it["book_id"]: it for it in self.items}

    def test_is_on_include_shelf(self):
        policy = make_policy()
        self.assertTrue(sg.is_on_include_shelf(self.by_id["1111111"], policy))
        self.assertFalse(sg.is_on_include_shelf(self.by_id["4444444"], policy))

    def test_is_removed(self):
        policy = make_policy()
        self.assertTrue(sg.is_removed(self.by_id["3333333"], policy))
        self.assertFalse(sg.is_removed(self.by_id["1111111"], policy))

    def test_passes_policy_requires_site_shelf_or_grandfather(self):
        policy = make_policy()
        self.assertTrue(sg.passes_policy(self.by_id["1111111"], policy))  # on site shelf
        self.assertFalse(sg.passes_policy(self.by_id["4444444"], policy))  # neither
        self.assertTrue(
            sg.passes_policy(self.by_id["4444444"], policy, grandfathered_ids={"4444444"})
        )

    def test_remove_shelf_wins_even_when_grandfathered(self):
        policy = make_policy()
        self.assertFalse(
            sg.passes_policy(self.by_id["3333333"], policy, grandfathered_ids={"3333333"})
        )

    def test_include_unrated_true_passes(self):
        policy = make_policy(include_unrated=True)
        self.assertTrue(sg.passes_policy(self.by_id["2222222"], policy))

    def test_include_unrated_false_excludes(self):
        policy = make_policy(include_unrated=False)
        self.assertFalse(sg.passes_policy(self.by_id["2222222"], policy))
        # a rated book on the site shelf is unaffected
        self.assertTrue(sg.passes_policy(self.by_id["1111111"], policy))

    def test_title_and_author_overrides_apply(self):
        policy = make_policy(
            title_overrides={"1111111": "Overridden Title"},
            author_overrides={"1111111": "Overridden Author"},
        )
        title, author = sg.apply_overrides(self.by_id["1111111"], policy)
        self.assertEqual(title, "Overridden Title")
        self.assertEqual(author, "Overridden Author")

    def test_strip_title_suffixes(self):
        item = make_item("9", title="Some Book (Vintage International)")
        policy = make_policy(strip_title_suffixes=[" (Vintage International)"])
        title, _ = sg.apply_overrides(item, policy)
        self.assertEqual(title, "Some Book")

    def test_strip_title_suffixes_enables_edition_collapse(self):
        # Same book, one edition carries a suffix that should be stripped
        # before the normalized-title collapse key is computed.
        a = make_item("10", title="Shared Book (Vintage International)", rating=3,
                      read_at="Mon, 01 Jan 2018 00:00:00 +0000", shelves=["site"])
        b = make_item("11", title="Shared Book", rating=5,
                      read_at="Mon, 01 Jan 2019 00:00:00 +0000", shelves=["site"])
        policy = make_policy(strip_title_suffixes=[" (Vintage International)"])
        result = sg.build_read_list([a, b], [], policy)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["title"], "Shared Book")
        self.assertEqual(result[0]["rating"], 5)
        self.assertEqual(result[0]["year"], 2018)


class TestBookIdFromUrl(unittest.TestCase):
    def test_extracts_id(self):
        self.assertEqual(
            sg.book_id_from_url("https://www.goodreads.com/book/show/12345"), "12345"
        )

    def test_no_match_returns_none(self):
        self.assertIsNone(sg.book_id_from_url("not a url"))
        self.assertIsNone(sg.book_id_from_url(""))


class TestGrandfatheredIds(unittest.TestCase):
    def test_extracts_ids_from_existing_books(self):
        old_books = {
            "read": [
                {"title": "A", "url": "https://www.goodreads.com/book/show/111"},
                {"title": "B", "url": "https://www.goodreads.com/book/show/222"},
            ]
        }
        self.assertEqual(sg.grandfathered_ids_from_books(old_books), {"111", "222"})

    def test_none_returns_empty_set(self):
        self.assertEqual(sg.grandfathered_ids_from_books(None), set())

    def test_missing_read_key_returns_empty_set(self):
        self.assertEqual(sg.grandfathered_ids_from_books({}), set())


class TestBuildReadList(unittest.TestCase):
    def setUp(self):
        self.read_items = sg.load_items_from_file(str(FIXTURES_DIR / "read.xml"))
        self.policy = make_policy()

    def test_only_site_shelf_books_appear_by_default(self):
        result = sg.build_read_list(self.read_items, [], self.policy)
        titles = {b["title"] for b in result}
        self.assertIn("Test Novel", titles)  # on site shelf
        self.assertIn("Unrated Book", titles)  # on site shelf, unrated
        self.assertIn("Duplicate Title", titles)  # both editions on site shelf
        self.assertNotIn("No Site Tag Book", titles)  # on no-site shelf, no site tag
        self.assertNotIn("Not Opted In Book", titles)  # no shelf tag, not grandfathered

    def test_grandfathered_book_stays_without_site_shelf(self):
        result = sg.build_read_list(
            self.read_items, [], self.policy, grandfathered_ids={"4444444"}
        )
        titles = {b["title"] for b in result}
        self.assertIn("Not Opted In Book", titles)

    def test_grandfathered_book_on_no_site_shelf_is_removed(self):
        # remove_shelf always wins, even for a book already published.
        result = sg.build_read_list(
            self.read_items, [], self.policy, grandfathered_ids={"3333333"}
        )
        titles = {b["title"] for b in result}
        self.assertNotIn("No Site Tag Book", titles)

    def test_edition_collapsing_keeps_earliest_year_and_best_rating(self):
        result = sg.build_read_list(self.read_items, [], self.policy)
        dup_rows = [b for b in result if b["title"] == "Duplicate Title"]
        self.assertEqual(len(dup_rows), 1)
        row = dup_rows[0]
        self.assertEqual(row["year"], 2018)
        self.assertEqual(row["rating"], 5)
        self.assertEqual(row["url"], "https://www.goodreads.com/book/show/6666666")

    def test_url_format(self):
        result = sg.build_read_list(self.read_items, [], self.policy)
        by_title = {b["title"]: b for b in result}
        self.assertEqual(
            by_title["Test Novel"]["url"], "https://www.goodreads.com/book/show/1111111"
        )

    def test_sorted_by_year_desc_then_title_asc(self):
        items = [
            make_item("100", title="Zed Book", read_at="Mon, 01 Jan 2020 00:00:00 +0000",
                      shelves=["site"]),
            make_item("101", title="Alpha Book", read_at="Mon, 01 Jan 2020 00:00:00 +0000",
                      shelves=["site"]),
            make_item("102", title="Newer Book", read_at="Mon, 01 Jan 2021 00:00:00 +0000",
                      shelves=["site"]),
        ]
        result = sg.build_read_list(items, [], make_policy())
        titles = [b["title"] for b in result]
        self.assertEqual(titles, ["Newer Book", "Alpha Book", "Zed Book"])

    def test_currently_reading_book_never_in_read_list(self):
        # Same book_id shows up on both shelves at once (a real Goodreads
        # quirk when a previously-read book is re-shelved as in-progress).
        overlap_id = "9999999"
        read_items = self.read_items + [
            make_item(overlap_id, title="Being Reread", rating=5,
                      read_at="Mon, 01 Jan 2019 00:00:00 +0000", shelves=["site"])
        ]
        currently_reading = [
            make_item(overlap_id, title="Being Reread", rating=0,
                      date_added="Mon, 01 Jan 2024 00:00:00 -0800",
                      shelves=["currently-reading", "site"])
        ]
        result = sg.build_read_list(read_items, currently_reading, self.policy)
        titles = {b["title"] for b in result}
        self.assertNotIn("Being Reread", titles)

    def test_currently_reading_book_excluded_even_when_grandfathered(self):
        overlap_id = "9999999"
        read_items = self.read_items + [
            make_item(overlap_id, title="Being Reread", rating=5,
                      read_at="Mon, 01 Jan 2019 00:00:00 +0000")
        ]
        currently_reading = [
            make_item(overlap_id, title="Being Reread", rating=0,
                      date_added="Mon, 01 Jan 2024 00:00:00 -0800",
                      shelves=["currently-reading"])
        ]
        result = sg.build_read_list(
            read_items, currently_reading, self.policy, grandfathered_ids={overlap_id}
        )
        titles = {b["title"] for b in result}
        self.assertNotIn("Being Reread", titles)

    def test_item_with_no_derivable_year_is_skipped(self):
        items = [make_item("200", title="No Date Book", read_at="", date_added="",
                            shelves=["site"])]
        result = sg.build_read_list(items, [], make_policy())
        self.assertEqual(result, [])


class TestNowReading(unittest.TestCase):
    def test_most_recently_added_wins(self):
        items = [
            make_item("1", title="Older", author="A1",
                      date_added="Mon, 01 Jan 2024 00:00:00 -0800",
                      shelves=["currently-reading", "site"]),
            make_item("2", title="Newer", author="A2",
                      date_added="Fri, 01 Mar 2024 00:00:00 -0800",
                      shelves=["currently-reading", "site"]),
        ]
        result = sg.compute_now_reading(items, make_policy())
        self.assertEqual(result, "Newer by A2")

    def test_book_without_site_shelf_not_a_candidate(self):
        items = [
            make_item("4444444", title="Not Opted In",
                      date_added="Fri, 01 Mar 2024 00:00:00 -0800",
                      shelves=["currently-reading"]),
        ]
        result = sg.compute_now_reading(items, make_policy())
        self.assertEqual(result, "")

    def test_book_on_no_site_shelf_only_is_not_a_candidate(self):
        items = [
            make_item("55", title="Private book",
                      date_added="Fri, 01 Mar 2024 00:00:00 -0800",
                      shelves=["currently-reading", "no-site"]),
        ]
        result = sg.compute_now_reading(items, make_policy())
        self.assertEqual(result, "")

    def test_removed_tag_wins_even_with_site_tag_on_same_record(self):
        # A currently-reading item can carry both shelf tags at once (e.g. a
        # book opted in earlier, then pulled). remove_shelf must win, same
        # as it does for the read list.
        items = [
            make_item("77", title="Pulled Book",
                      date_added="Fri, 01 Mar 2024 00:00:00 -0800",
                      shelves=["currently-reading", "site", "no-site"]),
        ]
        result = sg.compute_now_reading(items, make_policy())
        self.assertEqual(result, "")

    def test_unrated_currently_reading_book_on_site_shelf_is_still_a_candidate(self):
        # include_unrated only gates the finished-reading list; an in-progress
        # book is naturally unrated and must not be filtered out by it.
        items = [make_item("60", title="In Progress", rating=0,
                            date_added="Fri, 01 Mar 2024 00:00:00 -0800",
                            shelves=["currently-reading", "site"])]
        result = sg.compute_now_reading(items, make_policy(include_unrated=False))
        self.assertEqual(result, "In Progress by Some Author")

    def test_empty_shelf_returns_empty_string(self):
        # "" (not None) -- a legitimately empty shelf is a definite result,
        # not "couldn't tell, leave the old value alone".
        self.assertEqual(sg.compute_now_reading([], make_policy()), "")

    def test_finished_book_with_nothing_else_eligible_returns_empty_string(self):
        # A book finished and nothing new started: the currently-reading
        # shelf has items, but none pass the site-shelf/not-removed check.
        items = [
            make_item("81", title="Finished, not currently reading",
                      date_added="Fri, 01 Mar 2024 00:00:00 -0800",
                      shelves=["currently-reading"]),
        ]
        self.assertEqual(sg.compute_now_reading(items, make_policy()), "")

    def test_fixture_currently_reading(self):
        items = sg.load_items_from_file(str(FIXTURES_DIR / "currently-reading.xml"))
        result = sg.compute_now_reading(items, make_policy())
        self.assertEqual(result, "In Progress Book by Progress Author")


class TestOutputAssembly(unittest.TestCase):
    def test_build_books_output_no_change_when_read_list_identical(self):
        old = {"scale": 5, "source": "old source", "read": [{"title": "A", "author": "B",
                                                                "rating": 5, "year": 2020,
                                                                "url": "u"}]}
        new_data, changed = sg.build_books_output(old, old["read"], "2026-09-05")
        self.assertFalse(changed)
        # unchanged: source must not be rewritten just because the sync ran
        self.assertEqual(new_data["source"], "old source")

    def test_build_books_output_updates_source_when_read_list_differs(self):
        old = {"scale": 5, "source": "old source", "read": []}
        new_read = [{"title": "A", "author": "B", "rating": 5, "year": 2020, "url": "u"}]
        new_data, changed = sg.build_books_output(old, new_read, "2026-09-05")
        self.assertTrue(changed)
        self.assertEqual(new_data["source"], "Goodreads read shelf, synced 2026-09-05")
        self.assertEqual(new_data["read"], new_read)

    def test_build_now_output_updates_reading_and_updated(self):
        old_now = {"reading": "Old Book by Old Author", "shipping": "x", "state": "y",
                   "updated": "2026-01-01"}
        new_now, changed = sg.build_now_output(old_now, "New Book by New Author", "2026-09-05")
        self.assertTrue(changed)
        self.assertEqual(new_now["reading"], "New Book by New Author")
        self.assertEqual(new_now["updated"], "2026-09-05")
        # other keys preserved, in original order
        self.assertEqual(list(new_now.keys()), ["reading", "shipping", "state", "updated"])
        self.assertEqual(new_now["shipping"], "x")
        self.assertEqual(new_now["state"], "y")

    def test_build_now_output_clears_reading_when_shelf_has_nothing_eligible(self):
        # compute_now_reading() returns "" (never None) for a successful
        # fetch with nothing eligible in progress, and build_now_output()
        # must actually clear the stale value rather than keep it -- the
        # now pane's Liquid hides the row when reading is genuinely empty.
        old_now = {"reading": "Old Book by Old Author", "updated": "2026-01-01"}
        new_now, changed = sg.build_now_output(old_now, "", "2026-09-05")
        self.assertTrue(changed)
        self.assertEqual(new_now["reading"], "")
        self.assertEqual(new_now["updated"], "2026-09-05")

    def test_build_now_output_no_change_when_already_empty(self):
        old_now = {"reading": "", "updated": "2026-01-01"}
        new_now, changed = sg.build_now_output(old_now, "", "2026-09-05")
        self.assertFalse(changed)
        self.assertEqual(new_now["updated"], "2026-01-01")

    def test_build_now_output_no_change_when_value_identical(self):
        old_now = {"reading": "Same Book by Same Author", "updated": "2026-01-01"}
        new_now, changed = sg.build_now_output(old_now, "Same Book by Same Author", "2026-09-05")
        self.assertFalse(changed)
        self.assertEqual(new_now["updated"], "2026-01-01")

    def test_summarize_books_diff_added_and_removed(self):
        old = [{"title": "Gone", "author": "A", "rating": 5, "year": 2020,
                "url": "https://www.goodreads.com/book/show/1"}]
        new = [{"title": "New One", "author": "B", "rating": 4, "year": 2021,
                "url": "https://www.goodreads.com/book/show/2"}]
        lines = sg.summarize_books_diff(old, new)
        self.assertTrue(any(line.startswith("+ New One") for line in lines))
        self.assertTrue(any(line.startswith("- Gone") for line in lines))


class TestShrinkSafetyValve(unittest.TestCase):
    def _read_entry(self, book_id, title=None):
        return {
            "title": title or f"Book {book_id}",
            "author": "Author",
            "rating": 4,
            "year": 2020,
            "url": f"https://www.goodreads.com/book/show/{book_id}",
        }

    def test_removed_books_computed_by_url(self):
        old = [self._read_entry(1), self._read_entry(2), self._read_entry(3)]
        new = [self._read_entry(1)]
        removed = sg.removed_books(old, new)
        self.assertEqual({b["url"] for b in removed},
                          {self._read_entry(2)["url"], self._read_entry(3)["url"]})

    def test_no_refusal_for_small_removal(self):
        old = [self._read_entry(i) for i in range(1, 21)]  # 20 books
        new = old[1:]  # remove 1 (5%): under both thresholds
        self.assertIsNone(sg.read_list_shrink_refused(old, new))

    def test_refused_when_removed_exceeds_absolute_threshold(self):
        old = [self._read_entry(i) for i in range(1, 21)]  # 20 books
        new = old[4:]  # remove 4 (>3 absolute, 20% > 10%)
        shrunk = sg.read_list_shrink_refused(old, new)
        self.assertIsNotNone(shrunk)
        self.assertEqual(len(shrunk), 4)

    def test_refused_when_removed_exceeds_percent_threshold_only(self):
        old = [self._read_entry(i) for i in range(1, 21)]  # 20 books
        new = old[3:]  # remove exactly 3 (not > 3 absolute) but 15% > 10%
        shrunk = sg.read_list_shrink_refused(old, new)
        self.assertIsNotNone(shrunk)
        self.assertEqual(len(shrunk), 3)

    def test_no_refusal_when_old_list_empty(self):
        self.assertIsNone(sg.read_list_shrink_refused([], []))

    def test_no_refusal_when_nothing_removed(self):
        old = [self._read_entry(1)]
        new = [self._read_entry(1), self._read_entry(2)]
        self.assertIsNone(sg.read_list_shrink_refused(old, new))

    def test_present_book_ids_excludes_deliberate_no_site_removal(self):
        # A book that's present in this run's fetched feed but explicitly
        # tagged remove_shelf is a deliberate, visible removal -- not the
        # "book silently vanished from a bad feed" scenario the valve
        # exists to catch -- so it must not count toward the threshold,
        # even when it's the entire (single-book) list.
        old = [self._read_entry(1)]
        new = []
        self.assertIsNotNone(sg.read_list_shrink_refused(old, new))  # without info: refused
        self.assertIsNone(
            sg.read_list_shrink_refused(old, new, present_book_ids={"1"})
        )

    def test_present_book_ids_still_counts_books_missing_from_feed(self):
        old = [self._read_entry(i) for i in range(1, 21)]
        new = old[4:]
        # None of the removed ids (1-4) are present in this run's feed at
        # all -- exactly the truncated/partial-feed scenario -- so they
        # still count even with present_book_ids supplied.
        present_ids = {str(i) for i in range(5, 21)}
        shrunk = sg.read_list_shrink_refused(old, new, present_book_ids=present_ids)
        self.assertIsNotNone(shrunk)
        self.assertEqual(len(shrunk), 4)


class TestMainCLI(unittest.TestCase):
    def _run(self, args):
        buf = io.StringIO()
        with redirect_stdout(buf), redirect_stderr(buf):
            code = sg.main(args)
        return code, buf.getvalue()

    def test_dry_run_from_files_writes_nothing_and_prints_diff(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            policy_path = tmp / "policy.json"
            policy_path.write_text(json.dumps(make_policy()))
            out_books = tmp / "books.json"
            out_now = tmp / "now.json"
            out_now.write_text(json.dumps({"reading": "Nothing Yet", "updated": "2020-01-01"}))

            code, output = self._run([
                "--dry-run",
                "--from-file", str(FIXTURES_DIR / "read.xml"),
                "--from-file-reading", str(FIXTURES_DIR / "currently-reading.xml"),
                "--policy", str(policy_path),
                "--out-books", str(out_books),
                "--out-now", str(out_now),
            ])

            self.assertEqual(code, 0)
            self.assertFalse(out_books.exists())
            # now.json untouched on disk (dry run)
            self.assertEqual(
                json.loads(out_now.read_text())["reading"], "Nothing Yet"
            )
            self.assertIn("Test Novel", output)
            self.assertIn("now:", output)

    def test_real_run_writes_files_then_second_run_is_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            policy_path = tmp / "policy.json"
            policy_path.write_text(json.dumps(make_policy()))
            out_books = tmp / "books.json"
            out_now = tmp / "now.json"
            out_now.write_text(json.dumps({"reading": "Nothing Yet", "updated": "2020-01-01"}))

            args = [
                "--from-file", str(FIXTURES_DIR / "read.xml"),
                "--from-file-reading", str(FIXTURES_DIR / "currently-reading.xml"),
                "--policy", str(policy_path),
                "--out-books", str(out_books),
                "--out-now", str(out_now),
            ]

            code1, output1 = self._run(args)
            self.assertEqual(code1, 0)
            self.assertTrue(out_books.exists())
            data = json.loads(out_books.read_text())
            self.assertEqual(data["scale"], 5)
            self.assertIn("Goodreads read shelf, synced", data["source"])
            titles = {b["title"] for b in data["read"]}
            self.assertIn("Test Novel", titles)
            self.assertNotIn("No Site Tag Book", titles)
            self.assertNotIn("Not Opted In Book", titles)
            now_data = json.loads(out_now.read_text())
            self.assertEqual(now_data["reading"], "In Progress Book by Progress Author")

            code2, output2 = self._run(args)
            self.assertEqual(code2, 0)
            self.assertEqual(output2.strip(), "no changes")

    def test_grandfathered_book_stays_across_a_real_run(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            policy_path = tmp / "policy.json"
            policy_path.write_text(json.dumps(make_policy()))
            out_books = tmp / "books.json"
            out_now = tmp / "now.json"
            # Seed books.json with a book that's on the read shelf in the
            # fixture but carries no site tag there (book id 4444444).
            out_books.write_text(json.dumps({
                "scale": 5,
                "source": "seed",
                "read": [{
                    "title": "Not Opted In Book",
                    "author": "Plain Author",
                    "rating": 5,
                    "year": 2020,
                    "url": "https://www.goodreads.com/book/show/4444444",
                }],
            }))
            out_now.write_text(json.dumps({"reading": "Nothing Yet", "updated": "2020-01-01"}))

            args = [
                "--from-file", str(FIXTURES_DIR / "read.xml"),
                "--from-file-reading", str(FIXTURES_DIR / "currently-reading.xml"),
                "--policy", str(policy_path),
                "--out-books", str(out_books),
                "--out-now", str(out_now),
            ]
            code, _ = self._run(args)
            self.assertEqual(code, 0)
            data = json.loads(out_books.read_text())
            titles = {b["title"] for b in data["read"]}
            self.assertIn("Not Opted In Book", titles)

    def test_grandfathered_book_on_no_site_shelf_is_removed_on_real_run(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            policy_path = tmp / "policy.json"
            policy_path.write_text(json.dumps(make_policy()))
            out_books = tmp / "books.json"
            out_now = tmp / "now.json"
            # Seed books.json with a book that IS tagged no-site in the
            # fixture (book id 3333333): remove_shelf wins over grandfather.
            out_books.write_text(json.dumps({
                "scale": 5,
                "source": "seed",
                "read": [{
                    "title": "No Site Tag Book",
                    "author": "Hidden Author",
                    "rating": 4,
                    "year": 2021,
                    "url": "https://www.goodreads.com/book/show/3333333",
                }],
            }))
            out_now.write_text(json.dumps({"reading": "Nothing Yet", "updated": "2020-01-01"}))

            args = [
                "--from-file", str(FIXTURES_DIR / "read.xml"),
                "--from-file-reading", str(FIXTURES_DIR / "currently-reading.xml"),
                "--policy", str(policy_path),
                "--out-books", str(out_books),
                "--out-now", str(out_now),
            ]
            code, _ = self._run(args)
            self.assertEqual(code, 0)
            data = json.loads(out_books.read_text())
            titles = {b["title"] for b in data["read"]}
            self.assertNotIn("No Site Tag Book", titles)

    def test_currently_reading_without_site_shelf_clears_stale_now(self):
        # A successful fetch with nothing eligible on the currently-reading
        # shelf must actively clear a stale now.json value to "" rather than
        # leave it pointing at a book that's no longer being read.
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            policy_path = tmp / "policy.json"
            policy_path.write_text(json.dumps(make_policy()))
            reading_path = tmp / "currently-reading-no-site.xml"
            reading_path.write_text(
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<rss version="2.0"><channel>'
                '<item>'
                '<title><![CDATA[No Tag Book]]></title>'
                '<book_id>8888888</book_id>'
                '<author_name>No Tag Author</author_name>'
                '<user_rating>0</user_rating>'
                '<user_read_at></user_read_at>'
                '<user_date_added>'
                '<![CDATA[Mon, 01 Jan 2024 09:00:00 -0800]]>'
                '</user_date_added>'
                '<user_shelves>currently-reading</user_shelves>'
                '</item>'
                '</channel></rss>'
            )
            out_books = tmp / "books.json"
            out_now = tmp / "now.json"
            out_now.write_text(json.dumps({
                "reading": "Existing Book by Existing Author",
                "updated": "2020-01-01",
            }))

            args = [
                "--from-file", str(FIXTURES_DIR / "read.xml"),
                "--from-file-reading", str(reading_path),
                "--policy", str(policy_path),
                "--out-books", str(out_books),
                "--out-now", str(out_now),
            ]
            code, _ = self._run(args)
            self.assertEqual(code, 0)
            now_data = json.loads(out_now.read_text())
            self.assertEqual(now_data["reading"], "")
            self.assertEqual(now_data["updated"], sg.today_str())

    def test_currently_reading_with_site_shelf_updates_now(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            policy_path = tmp / "policy.json"
            policy_path.write_text(json.dumps(make_policy()))
            out_books = tmp / "books.json"
            out_now = tmp / "now.json"
            out_now.write_text(json.dumps({
                "reading": "Existing Book by Existing Author",
                "updated": "2020-01-01",
            }))

            args = [
                "--from-file", str(FIXTURES_DIR / "read.xml"),
                "--from-file-reading", str(FIXTURES_DIR / "currently-reading.xml"),
                "--policy", str(policy_path),
                "--out-books", str(out_books),
                "--out-now", str(out_now),
            ]
            code, _ = self._run(args)
            self.assertEqual(code, 0)
            now_data = json.loads(out_now.read_text())
            self.assertEqual(now_data["reading"], "In Progress Book by Progress Author")
            self.assertEqual(now_data["updated"], sg.today_str())

    def test_missing_key_without_from_file_errors(self):
        import os

        with tempfile.TemporaryDirectory() as tmp:
            policy_path = Path(tmp) / "policy.json"
            policy_path.write_text(json.dumps(make_policy()))

            env_backup = os.environ.pop("GOODREADS_RSS_KEY", None)
            try:
                with self.assertRaises(SystemExit):
                    sg.main(["--policy", str(policy_path)])
            finally:
                if env_backup is not None:
                    os.environ["GOODREADS_RSS_KEY"] = env_backup

    def test_malformed_read_feed_exits_nonzero_and_writes_nothing(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            policy_path = tmp / "policy.json"
            policy_path.write_text(json.dumps(make_policy()))
            bad_feed = tmp / "bad.xml"
            bad_feed.write_bytes(b'<?xml version="1.0"?><rss><channel><item><book_id>1')
            out_books = tmp / "books.json"
            out_now = tmp / "now.json"
            seed_now = {"reading": "Existing Book by Existing Author", "updated": "2020-01-01"}
            out_now.write_text(json.dumps(seed_now))

            code, output = self._run([
                "--from-file", str(bad_feed),
                "--policy", str(policy_path),
                "--out-books", str(out_books),
                "--out-now", str(out_now),
            ])

            self.assertEqual(code, 1)
            self.assertFalse(out_books.exists())
            # now.json completely untouched by a failed fetch.
            self.assertEqual(json.loads(out_now.read_text()), seed_now)

    def test_malformed_currently_reading_feed_leaves_now_json_untouched(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            policy_path = tmp / "policy.json"
            policy_path.write_text(json.dumps(make_policy()))
            bad_reading_feed = tmp / "bad-reading.xml"
            bad_reading_feed.write_bytes(b"<rss><channel><item><book_id></book_id></item>")
            out_books = tmp / "books.json"
            out_now = tmp / "now.json"
            seed_now = {"reading": "Existing Book by Existing Author", "updated": "2020-01-01"}
            out_now.write_text(json.dumps(seed_now))

            code, output = self._run([
                "--from-file", str(FIXTURES_DIR / "read.xml"),
                "--from-file-reading", str(bad_reading_feed),
                "--policy", str(policy_path),
                "--out-books", str(out_books),
                "--out-now", str(out_now),
            ])

            self.assertEqual(code, 1)
            self.assertFalse(out_books.exists())
            self.assertEqual(json.loads(out_now.read_text()), seed_now)

    @staticmethod
    def _items_xml(book_ids, shelf="site"):
        items_xml = "".join(
            f"""
            <item>
              <book_id>{bid}</book_id>
              <title><![CDATA[Book {bid}]]></title>
              <author_name>Author {bid}</author_name>
              <user_rating>4</user_rating>
              <user_read_at><![CDATA[Mon, 01 Jan 2018 00:00:00 +0000]]></user_read_at>
              <user_date_added><![CDATA[Mon, 01 Jan 2018 00:00:00 +0000]]></user_date_added>
              <user_shelves>{shelf}</user_shelves>
            </item>
            """
            for bid in book_ids
        )
        return (
            '<?xml version="1.0" encoding="UTF-8"?><rss><channel>'
            + items_xml
            + "</channel></rss>"
        ).encode("utf-8")

    def _seed_books(self, path, book_ids):
        path.write_text(json.dumps({
            "scale": 5,
            "source": "seed",
            "read": [
                {
                    "title": f"Book {bid}",
                    "author": f"Author {bid}",
                    "rating": 4,
                    "year": 2018,
                    "url": f"https://www.goodreads.com/book/show/{bid}",
                }
                for bid in book_ids
            ],
        }))

    def test_shrink_past_threshold_refused_by_default(self):
        # 20 grandfathered books on disk; the fetched feed only carries 16 of
        # them (a stand-in for a truncated/partial feed response). Losing 4
        # exceeds both the absolute (>3) and percent (>10%) thresholds.
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            policy_path = tmp / "policy.json"
            policy_path.write_text(json.dumps(make_policy()))
            all_ids = list(range(1, 21))
            kept_ids = all_ids[4:]
            feed_path = tmp / "read.xml"
            feed_path.write_bytes(self._items_xml(kept_ids))

            out_books = tmp / "books.json"
            out_now = tmp / "now.json"
            self._seed_books(out_books, all_ids)
            out_now.write_text(json.dumps({"reading": "", "updated": "2020-01-01"}))
            seed_books_text = out_books.read_text()

            code, output = self._run([
                "--from-file", str(feed_path),
                "--policy", str(policy_path),
                "--out-books", str(out_books),
                "--out-now", str(out_now),
            ])

            self.assertEqual(code, 1)
            self.assertIn("refusing to publish", output)
            # nothing written: books.json byte-identical to the seed
            self.assertEqual(out_books.read_text(), seed_books_text)

    def test_shrink_past_threshold_allowed_with_flag(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            policy_path = tmp / "policy.json"
            policy_path.write_text(json.dumps(make_policy()))
            all_ids = list(range(1, 21))
            kept_ids = all_ids[4:]
            feed_path = tmp / "read.xml"
            feed_path.write_bytes(self._items_xml(kept_ids))

            out_books = tmp / "books.json"
            out_now = tmp / "now.json"
            self._seed_books(out_books, all_ids)
            out_now.write_text(json.dumps({"reading": "", "updated": "2020-01-01"}))

            code, output = self._run([
                "--from-file", str(feed_path),
                "--policy", str(policy_path),
                "--out-books", str(out_books),
                "--out-now", str(out_now),
                "--allow-shrink",
            ])

            self.assertEqual(code, 0)
            data = json.loads(out_books.read_text())
            self.assertEqual(len(data["read"]), len(kept_ids))

    def test_small_shrink_under_threshold_proceeds_without_flag(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            policy_path = tmp / "policy.json"
            policy_path.write_text(json.dumps(make_policy()))
            all_ids = list(range(1, 21))
            kept_ids = all_ids[1:]  # remove 1 of 20 (5%): under both thresholds
            feed_path = tmp / "read.xml"
            feed_path.write_bytes(self._items_xml(kept_ids))

            out_books = tmp / "books.json"
            out_now = tmp / "now.json"
            self._seed_books(out_books, all_ids)
            out_now.write_text(json.dumps({"reading": "", "updated": "2020-01-01"}))

            code, output = self._run([
                "--from-file", str(feed_path),
                "--policy", str(policy_path),
                "--out-books", str(out_books),
                "--out-now", str(out_now),
            ])

            self.assertEqual(code, 0)
            data = json.loads(out_books.read_text())
            self.assertEqual(len(data["read"]), len(kept_ids))


if __name__ == "__main__":
    unittest.main()
