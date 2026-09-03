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
currently-reading shelf that is also tagged with the `site` shelf. Unrated books
are eligible here, since a book in progress usually has no rating yet. If the
currently-reading shelf has no book tagged `site`, the existing value is left
alone.

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
