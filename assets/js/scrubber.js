/**
 * scrubber.js: the year scrubber (B2). A range input in the topbar, 2013 to
 * 2026, that shows the panes as of a year. Nothing here runs during boot:
 * the panes are complete at first paint and change only on user input (the
 * range's input event, the "back to now" button) or a #<year> hash.
 *
 *   setupScrubber({ term, timeline, reducedMotion }) ->
 *     { setYear(year), reset(), year(), applyHash() }
 *
 * As of a past year: talks, posts and cv roles whose data-year is later than
 * the year are hidden (a class, so the writing pane's data-rest rows and the
 * zoom module's own hidden attribute are untouched); the cv role that
 * brackets the year is the current row and its date reads "since <from>";
 * the now pane's facts give way to one "then" line, the latest dated record
 * at or before that year from timeline.json (a talk's caveat detail is
 * trimmed to its venue or first sentence, so the line stays one line at
 * 390px); the pane metas and the talks disclosure label carry the as-of
 * counts; every talk before 2019 lives only inside the talks pane's
 * collapsed "show N more" details, so a past year with talks but nothing
 * visible in the primary list forces that details open (and restores the
 * visitor's own open/closed state once back at 2026); the topbar banner
 * reads "as of <year>: N sourced talks, M posts" beside "back to now", and
 * one dim line goes to the terminal (debounced 150ms while dragging). 2026
 * restores the live state exactly from a snapshot taken at setup.
 *
 * The hash mirrors the year (#2018, replaceState, so no history entries and
 * no hashchange loop) but only while the hash is empty or already a year,
 * so a zoomed pane's #cv is never overwritten. Nothing animates, so reduced
 * motion needs no branch here.
 */

const MIN_YEAR = 2013;
const MAX_YEAR = 2026;
const DEBOUNCE_MS = 150;
const KIND_RANK = { cv: 0, talk: 1, post: 2 };

export function setupScrubber({ term, timeline, reducedMotion }) {
  void reducedMotion;
  const root = document.querySelector('[data-scrubber]');
  const input = root ? root.querySelector('[data-scrubber-input]') : null;
  const output = root ? root.querySelector('[data-scrubber-out]') : null;
  const asof = document.querySelector('[data-asof]');
  const asofText = asof ? asof.querySelector('[data-asof-text]') : null;
  const asofReset = asof ? asof.querySelector('[data-asof-reset]') : null;
  const facts = document.querySelector('#now [data-facts]');
  const then = document.querySelector('#now [data-then]');
  const records = Array.isArray(timeline) ? timeline : [];

  const noop = { setYear: () => false, reset: () => false, year: () => MAX_YEAR, applyHash: () => false };
  if (!root || !input || !output) return noop;

  // Live-state snapshot, restored exactly at 2026.
  const rows = [...document.querySelectorAll('#talks .row[data-year], #writing .row[data-year], #cv .row[data-year]')];
  const live = new Map();
  for (const row of rows) {
    const date = row.querySelector('.row__date');
    live.set(row, { current: row.classList.contains('row--current'), date: date ? date.textContent : null });
  }
  const metas = new Map();
  for (const id of ['now', 'talks', 'writing']) {
    const meta = document.querySelector(`#${id} [data-pane-meta]`);
    if (meta) metas.set(id, meta.textContent);
  }
  const summaries = [...document.querySelectorAll('#talks [data-more] summary')].map((summary) => ({
    summary,
    closed: summary.dataset.closedLabel,
    open: summary.dataset.openLabel,
  }));
  // The talks pane shows only its first 6 rows outside the collapsed
  // "show N more" details; every talk before 2019 sits inside it. Force it
  // open for a past year whose talks are only reachable there, and remember
  // whatever the visitor's own open/closed state was so reset() can put it
  // back exactly when the scrubber returns to 2026.
  const talksDetails = document.querySelector('#talks details[data-more]');
  let talksPreScrubOpen = null;

  let current = MAX_YEAR;
  let timer = null;

  input.min = String(MIN_YEAR);
  input.max = String(MAX_YEAR);
  input.value = String(MAX_YEAR);
  input.setAttribute('aria-valuetext', `${MAX_YEAR}, now`);
  output.textContent = String(MAX_YEAR);
  output.dataset.year = String(MAX_YEAR);
  root.hidden = false;

  input.addEventListener('input', () => {
    setYear(parseInt(input.value, 10));
  });

  if (asofReset) {
    asofReset.addEventListener('click', () => {
      reset();
      input.focus({ preventScroll: true });
    });
  }

  /** Render the panes as of `year`. Returns false for a year outside the range. */
  function setYear(year) {
    const y = parseInt(year, 10);
    if (Number.isNaN(y) || y < MIN_YEAR || y > MAX_YEAR) return false;
    const changed = y !== current;
    current = y;
    const past = y < MAX_YEAR;
    const end = `${y}-12-31`;
    const start = `${y}-01-01`;

    if (input.value !== String(y)) input.value = String(y);
    input.setAttribute('aria-valuetext', past ? String(y) : `${MAX_YEAR}, now`);
    output.textContent = String(y);
    output.dataset.year = String(y);

    // Rows: hide what came later, mark the role that brackets the year.
    for (const row of rows) {
      const snapshot = live.get(row);
      const rowYear = parseInt(row.dataset.year, 10);
      row.classList.toggle('scrubber-hidden', past && rowYear > y);
      const date = row.querySelector('.row__date');
      if (!past) {
        row.classList.toggle('row--current', snapshot.current);
        if (date && snapshot.date != null) date.textContent = snapshot.date;
        continue;
      }
      if (row.dataset.from == null) continue;
      const from = row.dataset.from;
      const to = row.dataset.to;
      const holds = from <= end && (!to || to >= start);
      row.classList.toggle('row--current', holds);
      if (date && snapshot.date != null) date.textContent = holds ? `since ${from}` : snapshot.date;
    }

    const talkCount = countTalks(y, past);
    const postCount = countPosts(y, past);

    // Metas and the talks disclosure label carry the as-of counts.
    setMeta('talks', past ? `${talkCount} sourced as of ${y}` : null);
    setMeta('writing', past ? `${postCount} posts as of ${y}` : null);
    setMeta('now', past ? `as of ${y}` : null);
    for (const { summary, closed, open } of summaries) {
      const details = summary.closest('details');
      const list = details ? details.querySelector('.more__body') : null;
      const remaining = list
        ? [...list.querySelectorAll('.row[data-status]:not([data-status="lead"])')].filter((r) => !r.classList.contains('scrubber-hidden')).length
        : 0;
      const label = !past ? closed : remaining > 0 ? `show ${remaining} more` : 'archive leads';
      summary.dataset.closedLabel = label;
      summary.dataset.openLabel = open;
      if (!(details && details.open)) summary.textContent = label;
    }

    // A past year can have sourced talks that are only reachable inside the
    // collapsed "show N more" details (every talk before 2019 does). If the
    // year has talks but none are visible in the primary list, force the
    // details open so every year from 2013 to 2026 actually shows its talks;
    // restore whatever the visitor's own state was once back at 2026.
    if (talksDetails) {
      if (past && talkCount > 0) {
        const primaryVisible = [...document.querySelectorAll('#talks .row[data-status]:not([data-status="lead"])')]
          .some((row) => !row.closest('details') && !row.classList.contains('scrubber-hidden'));
        if (!primaryVisible) {
          if (talksPreScrubOpen === null) talksPreScrubOpen = talksDetails.open;
          talksDetails.open = true;
        }
      } else if (talksPreScrubOpen !== null) {
        talksDetails.open = talksPreScrubOpen;
        talksPreScrubOpen = null;
      }
    }

    // Now pane: facts at 2026, one "then" line for a past year.
    if (facts) facts.hidden = past;
    if (then) {
      const entry = past ? latestRecord(end) : null;
      if (entry) {
        renderThen(then, entry);
        then.hidden = false;
      } else {
        then.replaceChildren();
        then.hidden = true;
      }
    }

    // Banner.
    if (asof && asofText) {
      if (past) {
        asofText.textContent = `as of ${y}: ${plural(talkCount, 'sourced talk')}, ${plural(postCount, 'post')}`;
        asof.hidden = false;
      } else {
        asofText.textContent = '';
        asof.hidden = true;
      }
    }

    if (changed) schedule(y, talkCount, postCount);
    return true;
  }

  function reset() {
    return setYear(MAX_YEAR);
  }

  function year() {
    return current;
  }

  /** #2013 to #2026 in the address bar renders that year. */
  function applyHash() {
    const m = /^#(20\d\d)$/.exec(location.hash);
    if (!m) return false;
    const y = parseInt(m[1], 10);
    if (y < MIN_YEAR || y > MAX_YEAR) return false;
    return setYear(y);
  }

  // Debounced side effects while dragging: one terminal line and the hash.
  function schedule(y, talkCount, postCount) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const past = y < MAX_YEAR;
      const who = past ? `as of ${y}` : 'as of now';
      term.print(`${who}: ${plural(talkCount, 'sourced talk')}, ${plural(postCount, 'post')}`, { className: 'scrollback__line--dim' });
      const hash = location.hash;
      if (hash === '' || hash === '#' || /^#20\d\d$/.test(hash)) {
        const url = past ? `#${y}` : location.pathname + location.search;
        history.replaceState(null, '', url);
      }
    }, DEBOUNCE_MS);
  }

  function countTalks(y, past) {
    const sourced = document.querySelectorAll('#talks .row[data-status]:not([data-status="lead"])');
    if (!past) return sourced.length;
    let n = 0;
    for (const row of sourced) {
      if (row.dataset.year && parseInt(row.dataset.year, 10) <= y) n++;
    }
    return n;
  }

  function countPosts(y, past) {
    const posts = document.querySelectorAll('#writing .row[data-year]');
    if (!past) return posts.length;
    let n = 0;
    for (const row of posts) {
      if (parseInt(row.dataset.year, 10) <= y) n++;
    }
    return n;
  }

  function setMeta(id, text) {
    const meta = document.querySelector(`#${id} [data-pane-meta]`);
    if (!meta) return;
    meta.textContent = text == null ? metas.get(id) : text;
  }

  /** Latest dated record at or before `end` (ISO prefix compare); ties prefer cv, then talk, then post. */
  function latestRecord(end) {
    let best = null;
    for (const entry of records) {
      if (!entry.date || entry.level === 'warn' || !(entry.kind in KIND_RANK)) continue;
      if (entry.date > end) continue;
      if (!best || entry.date > best.date || (entry.date === best.date && KIND_RANK[entry.kind] < KIND_RANK[best.kind])) best = entry;
    }
    return best;
  }

  function renderThen(el, entry) {
    el.replaceChildren();
    const label = document.createElement('span');
    label.className = 'then__label';
    label.textContent = 'then';
    const date = document.createElement('span');
    date.className = 'then__date';
    date.dataset.year = String(entry.date).slice(0, 4);
    date.textContent = entry.label;
    // entry.detail can carry a full caveat sentence ("...Program listing
    // only; no dated slot survives, so delivery is not claimed."); only the
    // venue or the detail's first sentence belongs on this one-line fact.
    const text = entry.kind === 'talk' && entry.detail ? `${entry.text}, ${venueOrFirstSentence(entry.detail)}` : entry.text;
    el.append(label, ' ', date, ' ', document.createTextNode(text));
  }

  /** The venue phrase or, when detail is a longer note, just its first sentence. */
  function venueOrFirstSentence(detail) {
    const end = detail.indexOf('. ');
    return end === -1 ? detail : detail.slice(0, end);
  }

  return { setYear, reset, year, applyHash };
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
