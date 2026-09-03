# Reading list sync

`data/books.json` and `data/now.json` are generated from Goodreads. A scheduled job
reads two shelves on the Goodreads account, applies the policy in
`data/books.policy.json`, and rewrites the two data files that `reading.markdown`
and the home page's now pane render.

Publishing is opt-in. Finishing a book on Goodreads does not put it on the site by
itself. A book only shows up because it was deliberately tagged, or because it was
already showing up before this sync model existed.

## How the job works

The workflow at `.github/workflows/goodreads-sync.yml` runs `scripts/sync_goodreads.py`
once a day. The script fetches the `read` and `currently-reading` shelves as RSS,
one page at a time, until a page comes back empty. For each book it reads the
title, author, rating, the date it was marked read, the date it was added to the
shelf, any custom shelves, and the publication year.

A book from the read shelf is included in `data/books.json` when it is on the
Goodreads shelf named `site`, or when it is already present in `data/books.json`
on disk (matched by its Goodreads book id in the entry's url), and it is not on
the `no-site` shelf. Being on `no-site` always wins, even for a book that would
otherwise stay because it is already on the site. If `include_unrated` is false,
an unrated book is left off regardless of shelf tags. A book that is currently on
the currently-reading shelf never appears in the read list, even if the same
review also shows up on the read feed, which happens when a finished book gets
re-shelved as in progress.

Books with the same title after `strip_title_suffixes` is applied count as
different editions of the same book and collapse into a single row: the row
keeps the earliest year among the editions and the highest rating among them.
The url always points at `https://www.goodreads.com/book/show/<book_id>`.

The job is quiet by default. If the computed read list and now-reading value
match what is already on disk, it writes nothing and prints `no changes`. It
never touches the `source` timestamp in `data/books.json` unless the read list
actually changed.

## Failure behaviour: the job fails rather than publishing on a bad feed

A malformed, truncated, or otherwise unparseable response from Goodreads --
bad XML, an unexpected root element, a missing `<channel>`, or an item
missing its `book_id` or `title` -- makes the script exit non-zero and write
nothing at all, to either `data/books.json` or `data/now.json`. The GitHub
Actions job fails at the sync step, before the commit step ever runs, so a
bad feed response can never publish a partial or empty result and can never
get committed. A response is also capped at 8 MiB; anything larger is
treated as a failure the same way.

This also means a page that parses cleanly to zero items is *not* a failure:
that is the normal end-of-pagination signal, and is handled separately from
an actual parse failure.

## The shrink safety valve

Before writing, the script compares the newly computed read list against
what is already in `data/books.json` and refuses to publish -- exit 1,
nothing written -- if the new list would lose more than 3 books, or more
than 10% of the existing list, in one run. A book that vanishes from the
feed entirely (rather than being explicitly tagged `no-site` in a
successfully-parsed feed) is exactly what a truncated or partial Goodreads
response looks like, and grandfathering has no way to tell that apart from
a deliberate mass removal once the book is simply absent from the fetch.

A book that's present in the feed and explicitly tagged `no-site` does not
count toward this threshold, no matter how many of them there are in one
run -- that is a deliberate, visible removal, not a sign of a bad feed.

If a shrink past the threshold is genuinely intended (a deliberate cleanup
of the read list on Goodreads), pass `--allow-shrink` to publish it anyway:

```
GOODREADS_RSS_KEY=your_rss_key python3 scripts/sync_goodreads.py --allow-shrink
```

## Publishing a book

To put a finished book on the site, add it to the `site` shelf on Goodreads. The
next sync picks it up.

To pull a book that is already on the site, either add it to the `no-site` shelf
on Goodreads, or edit `data/books.json` directly and remove its row. Either one
works: the `no-site` shelf overrides everything, and removing the row from disk
means there is nothing left to grandfather in on the next sync.

Two other policy knobs are worth knowing about:

- `title_overrides` and `author_overrides` replace the feed's title or author
  for a specific book id, keyed by that id.
- `strip_title_suffixes` removes a literal trailing suffix from a title before
  it is compared for edition collapsing, so two editions whose only textual
  difference is a suffix like `" (Vintage International)"` still merge into
  one row.

## How the now pane is driven

`data/now.json`'s `reading` field is set to the most recently added book on the
currently-reading shelf that is also tagged with the `site` shelf and not tagged
`no-site` -- as with the read list, `no-site` always wins, even for a book that
also carries the `site` tag. Unrated books are eligible here, since a book in
progress usually has no rating yet.

If the currently-reading shelf has no eligible book -- nothing tagged `site`,
everything tagged `no-site`, or the shelf is simply empty -- a successful sync
actively clears `reading` to an empty string rather than leaving a stale value
in place. The home page's now pane and `reading.markdown` both hide the
"reading" row when `reading` is empty, so finishing a book with nothing new
started yet correctly makes the row disappear instead of showing a book
that's no longer being read. `updated` only changes when `reading` actually
changes.

## Running it locally

```
GOODREADS_RSS_KEY=your_rss_key python3 scripts/sync_goodreads.py --dry-run
```

`--dry-run` prints the diff without writing `data/books.json` or `data/now.json`.
Drop `--dry-run` to write the files. `GOODREADS_USER_ID` defaults to the account
id already used in the workflow; pass `--user-id` or set the environment
variable to point at a different account.

For an offline run against a saved feed, use `--from-file` for the read shelf
and `--from-file-reading` for the currently-reading shelf:

```
python3 scripts/sync_goodreads.py --from-file read.xml --from-file-reading currently.xml --dry-run
```

The RSS key comes from your Goodreads account's RSS feed settings page. The
script never prints or logs it.

## Tests

```
python3 -m unittest discover -s scripts/tests
```

## Adding the secret

The workflow reads the key from a repository secret, not a variable, since it
is a credential:

```
gh secret set GOODREADS_RSS_KEY
```

`GOODREADS_USER_ID` is a plain repository variable, only needed if the account
id ever changes:

```
gh variable set GOODREADS_USER_ID --body 50358708
```
