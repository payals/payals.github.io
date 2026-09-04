/**
 * scrubber.js: the year scrubber (B2, SB1 to SB4). A range input in the
 * topbar, 2013 to a live-state sentinel, that shows the panes as of a year.
 * The rightmost value is rendered as "now" and shows every record. Nothing
 * here runs during boot:
 * the panes are complete at first paint and change only on user input (the
 * range's input event, the "back to now" button) or a #<year> hash.
 *
 *   setupScrubber({ term, timeline, reducedMotion, charts }) ->
 *     { setYear(year), reset(), year(), applyHash() }
 *
 * `charts` is the [chartCv, chartTalks, chartWriting] array main.js already
 * builds them into; each one's own applyAsOf(year) (year, or null for
 * live) owns how it represents "as of" for its marks, replacing a single
 * generic per-element class toggle that could not mask a role's bar width
 * or pull a mark out of a chart's own keyboard roving set.
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
 * visitor's own open/closed state once back at now); a persistent status
 * bar line reads "as of <year>: N talks, M posts, ROLE." beside "back to
 * now", and one dim line goes to the terminal (debounced 150ms while
 * dragging). The rightmost value restores the live state exactly from a
 * snapshot taken at setup.
 *
 * The hash mirrors the year (#2018, replaceState, so no history entries and
 * no hashchange loop) while nothing owns the leading segment. A topic-only
 * hash gains the year in front; once a pane or post owns the leading
 * segment (#cv, #writing/slug), the year moves to its own `year=` key
 * instead, composing the same way topic= does, so scrubbing while zoomed
 * neither overwrites the pane nor silently drops the year. Nothing
 * animates, so reduced motion needs no branch here.
 */

import { emit, firstHashPart, getHashPart, hashParts, setHashPart } from './chart-util.js';
import { isShortcutTarget, shortcutsEnabled } from './shortcuts.js';

const MIN_YEAR = 2013;
const MAX_YEAR = 2026;
const DEBOUNCE_MS = 150;
const KIND_RANK = { cv: 0, talk: 1, post: 2 };

export function setupScrubber({ term, timeline, reducedMotion, charts = [] }) {
  void reducedMotion;
  const root = document.querySelector('[data-scrubber]');
  const input = root ? root.querySelector('[data-scrubber-input]') : null;
  const output = root ? root.querySelector('[data-scrubber-out]') : null;
  const asof = document.querySelector('[data-asof]');
  const asofText = asof ? asof.querySelector('[data-asof-text]') : null;
  const asofReset = asof ? asof.querySelector('[data-asof-reset]') : null;
  const statusbar = document.querySelector('[data-statusbar]');
  const focusControl = document.querySelector('[data-focus-scrubber]');
  const facts = document.querySelector('#now [data-facts]');
  const then = document.querySelector('#now [data-then]');
  const records = Array.isArray(timeline) ? timeline : [];

  const noop = { setYear: () => false, reset: () => false, year: () => MAX_YEAR, applyHash: () => false };
  if (!root || !input || !output) return noop;

  // The server-rendered control lives in the topbar so the no-JS page keeps
  // the phase-2 structure. With JavaScript active, SB2's persistent line is
  // the last child of the status bar and sits beside the bar's own keys.
  //
  // It used to be an absolute overlay across the whole bar, with every other
  // child set inert while a past year showed. That took the pane keys, the
  // `/` search button, the `t` timeline button, the `?` help item and the C2
  // toast away from a deep link such as #2018, and on a phone the status bar
  // is the only thumb path to search and help (MB7). SB2 asked for a line
  // beside "back to now", not for the bar to be replaced, so the line is now
  // an ordinary flex child: at 1440 it shares the row (the bar keeps its
  // height and the 900px fit), and where there is no room for it the bar
  // wraps it onto its own line. features.css section "as of" owns that.
  if (asof && statusbar && asof.parentElement !== statusbar) {
    asof.classList.remove('topbar__asof');
    asof.classList.add('statusbar__asof');
    statusbar.appendChild(asof);
  }
  if (asof && statusbar) statusbar.classList.add('has-asof');

  // Live-state snapshot, restored exactly at the rightmost "now" value.
  const rows = [...document.querySelectorAll('#talks .row[data-year], #writing .row[data-year], #cv .row[data-year]')];
  const live = new Map();
  for (const row of rows) {
    const date = row.querySelector('.row__date');
    live.set(row, {
      current: row.classList.contains('row--current'),
      dateNodes: date ? [...date.childNodes].map((node) => node.cloneNode(true)) : null,
    });
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
  // back exactly when the scrubber returns to now.
  const talksDetails = document.querySelector('#talks details[data-more]');
  let talksPreScrubOpen = null;

  let current = MAX_YEAR;
  let timer = null;

  input.min = String(MIN_YEAR);
  input.max = String(MAX_YEAR);
  input.value = String(MAX_YEAR);
  input.setAttribute('aria-valuetext', 'now');
  output.textContent = 'now';
  output.dataset.year = String(MAX_YEAR);
  root.hidden = false;

  function focusScrubber() {
    input.focus();
    return document.activeElement === input;
  }

  if (focusControl) {
    focusControl.hidden = false;
    focusControl.addEventListener('click', focusScrubber);
  }

  // TB3/SB3: `t` is the only new bare character shortcut. It uses both
  // shared WCAG 2.1.4 gates, so it never fires from a field or button and
  // honours the visitor's keys-off setting.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 't' || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!shortcutsEnabled() || !isShortcutTarget(event.target)) return;
    event.preventDefault();
    focusScrubber();
  });

  input.addEventListener('input', () => {
    setYear(parseInt(input.value, 10));
  });

  if (asofReset) {
    asofReset.addEventListener('click', () => {
      reset();
      focusScrubber();
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
    input.setAttribute('aria-valuetext', past ? String(y) : 'now');
    output.textContent = past ? String(y) : 'now';
    output.dataset.year = String(y);

    if (past) document.body.dataset.asof = String(y);
    else delete document.body.dataset.asof;

    // Rows: hide what came later, mark the role that brackets the year.
    for (const row of rows) {
      const snapshot = live.get(row);
      const rowYear = parseInt(row.dataset.year, 10);
      row.classList.toggle('scrubber-hidden', past && rowYear > y);
      const date = row.querySelector('.row__date');
      if (!past) {
        row.classList.toggle('row--current', snapshot.current);
        restoreDate(date, snapshot.dateNodes);
        continue;
      }
      if (row.dataset.from == null) continue;
      const from = row.dataset.from;
      const to = row.dataset.to;
      const holds = from <= end && (!to || to >= start);
      row.classList.toggle('row--current', holds);
      if (holds) renderRoleDate(date, snapshot.dateNodes, `since ${from}`);
      else restoreDate(date, snapshot.dateNodes);
    }

    // SB3: the career log stays in place; only its later entries dim.
    for (const line of document.querySelectorAll('.bootlog__entry[data-year]')) {
      line.classList.toggle('is-after', past && Number(line.dataset.year) > y);
    }
    // SB6: each chart owns how it represents "as of `y`" for its own marks
    // -- a plain opacity class alone let a CV role bar that spans the
    // cutoff stay full width, and let post-cutoff marks and cells stay
    // reachable by keyboard and click even though their rows are hidden.
    // applyAsOf(null) means live: every chart resets to its full span.
    for (const chart of charts) {
      if (chart && typeof chart.applyAsOf === 'function') chart.applyAsOf(past ? y : null);
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
    // details open so every historical position actually shows its talks;
    // restore whatever the visitor's own state was once back at now.
    if (talksDetails) {
      if (past && talkCount > 0) {
        const primaryVisible = [...document.querySelectorAll('#talks .row[data-status]:not([data-status="lead"])')]
          .some((row) => !row.closest('details') && !row.classList.contains('scrubber-hidden'));
        if (!primaryVisible) {
          if (talksPreScrubOpen === null) talksPreScrubOpen = talksDetails.open;
          if (!talksDetails.open) {
            const restoreTarget = document.activeElement;
            talksDetails.addEventListener('toggle', () => {
              // panes.js gives focus to newly revealed content for a visitor-
              // initiated disclosure. This open is a scrubber side effect, so
              // keep the slider (and consecutive arrow steps) as the keyboard
              // anchor. If the initiator now sits under the inert status-bar
              // overlay, use the visible reset control instead.
              const target = restoreTarget instanceof HTMLElement
                && restoreTarget.isConnected
                && !restoreTarget.closest('[inert]')
                ? restoreTarget
                : asofReset;
              if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
            }, { once: true });
            talksDetails.open = true;
          }
        }
      } else if (talksPreScrubOpen !== null) {
        talksDetails.open = talksPreScrubOpen;
        talksPreScrubOpen = null;
      }
    }

    // Now pane: live facts at the right edge, one "then" line for a past year.
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
        asofText.textContent = `as of ${y}: ${plural(talkCount, 'talk')}, ${plural(postCount, 'post')}, ${roleTitleAt(y)}.`;
        asof.hidden = false;
      } else {
        asofText.textContent = '';
        asof.hidden = true;
      }
    }

    emit('console:asof', { year: y, past });

    if (changed) schedule(y, talkCount, postCount);
    return true;
  }

  function reset() {
    return setYear(MAX_YEAR);
  }

  function year() {
    return current;
  }

  /**
   * #2013 to #2026 in the address bar renders that year, as long as
   * nothing else owns the leading segment (the hash may carry a topic
   * segment too: #2018&topic=security). Once a pane or post takes the
   * leading segment (#cv&topic=security), the year moves to its own
   * `year=` key instead -- zoom.js writes it there the moment a zoom
   * starts from a bare-year hash, and schedule() below does the same for
   * a mid-scrub year change -- so a composite deep link
   * (#cv&year=2018&topic=security) still restores the year even though
   * main.js's hash chain lets zoom.applyHash() consume the leading
   * segment first.
   *
   * main.js calls this on every hash change unconditionally (a composite
   * deep link carries its year in a key zoom.js does not read), so this
   * function is the sole source of truth for the scrubbed year: it must
   * always leave `current` matching exactly what the hash says, never
   * leave a stale year in place just because this particular hash didn't
   * happen to name a valid one. The leading segment and the `year=` key
   * are therefore validated independently -- each can be present, absent,
   * or out of MIN_YEAR..MAX_YEAR range on its own -- and an in-range
   * leading year wins over the key (matching how zoom.js only ever
   * migrates a bare leading year into the key, never the reverse) while
   * an out-of-range leading segment (#2027&year=2018) does not shadow a
   * still-valid keyed one. Anything left over (empty, missing, or out of
   * range on both -- including a hash that names no year at all, such as
   * #writing/<slug>) resets to the live sentinel and normalizes the hash,
   * so the UI and the as-of banner never linger on a historical year the
   * URL no longer requests. This never no-ops: every hash change resolves
   * to a definite year, because main.js runs this on every one of them
   * regardless of what else the hash names.
   */
  function applyHash() {
    const lead = firstHashPart();
    const leadMatch = /^(20\d\d)$/.exec(lead);
    const keyRaw = getHashPart('year');
    const keyMatch = keyRaw ? /^(20\d\d)$/.exec(keyRaw) : null;

    const leadYear = leadMatch ? parseInt(leadMatch[1], 10) : null;
    const keyYear = keyMatch ? parseInt(keyMatch[1], 10) : null;
    const leadValid = leadYear !== null && leadYear >= MIN_YEAR && leadYear <= MAX_YEAR;
    const keyValid = keyYear !== null && keyYear >= MIN_YEAR && keyYear <= MAX_YEAR;

    const y = leadValid ? leadYear : keyValid ? keyYear : MAX_YEAR;
    const applied = setYear(y);

    // Normalize the hash to match what was actually applied: drop a bare
    // leading year (valid or not) once the result is live, and always
    // clear the year= key once the result is live -- whichever candidate
    // was invalid or empty must not linger in the address bar either.
    if (y === MAX_YEAR) {
      if (leadMatch) {
        const kept = hashParts().filter((part) => part.includes('=') && !part.startsWith('year='));
        const hash = kept.join('&');
        history.replaceState(null, '', `${location.pathname}${location.search}${hash ? `#${hash}` : ''}`);
      } else if (keyRaw != null) {
        setHashPart('year', null);
      }
    }
    return applied;
  }

  // Escape is functional rather than a character shortcut. Other layers
  // get first refusal: a topic filter clears first, a zoom restores first,
  // and Escape in the prompt leaves that field. If nobody consumed it, the
  // historical view returns to now.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented || current === MAX_YEAR) return;
    event.preventDefault();
    reset();
  });

  // Debounced side effects while dragging: one terminal line and the hash.
  function schedule(y, talkCount, postCount) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const past = y < MAX_YEAR;
      const who = past ? `as of ${y}` : 'as of now';
      term.print(`${who}: ${plural(talkCount, 'sourced talk')}, ${plural(postCount, 'post')}`, { className: 'scrollback__line--dim' });
      // Keep every key=value segment (the topic filter) so a scrub never
      // clears a filter and a filter never clears a scrub.
      const lead = firstHashPart();
      // A topic-only hash starts with key=value and has no phase-2 leading
      // segment yet, so the scrubber may prepend its year as the bare
      // leading segment. A pane/reader hash such as #cv or #writing/slug
      // remains owned by that feature -- the year goes into its own
      // `year=` key instead (composing with #cv exactly as topic= does),
      // so scrubbing while zoomed neither overwrites the pane nor silently
      // drops the year from the address bar.
      const leadIsFree = lead === '' || /^20\d\d$/.test(lead) || lead.includes('=');
      if (leadIsFree) {
        const kept = hashParts().filter((p) => p.includes('=') && !p.startsWith('year='));
        const parts = past ? [String(y), ...kept] : kept;
        const hash = parts.join('&');
        const url = hash ? `#${hash}` : location.pathname + location.search;
        history.replaceState(null, '', url);
      } else {
        setHashPart('year', past ? String(y) : null);
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

  function roleTitleAt(y) {
    const end = `${y}-12-31`;
    const start = `${y}-01-01`;
    const roles = records
      .filter((entry) => entry.kind === 'cv' && entry.date && entry.date <= end && (!entry.end || entry.end >= start))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const text = roles[0] ? String(roles[0].text || '') : '';
    return text.split(',')[0].trim() || 'role not on record';
  }

  function restoreDate(date, nodes) {
    if (!date || !nodes) return;
    date.replaceChildren(...nodes.map((node) => node.cloneNode(true)));
  }

  // A role's historical label changes, but its topic shape is part of the
  // record identity and must survive both the scrub and the live restore.
  function renderRoleDate(date, nodes, text) {
    if (!date || !nodes) return;
    const mark = nodes.find((node) => node.nodeType === Node.ELEMENT_NODE && node.classList.contains('row__mark'));
    date.replaceChildren();
    if (mark) date.appendChild(mark.cloneNode(true));
    date.appendChild(document.createTextNode(text));
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
