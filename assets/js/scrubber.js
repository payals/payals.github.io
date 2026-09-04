/**
 * scrubber.js: the year scrubber (B2, SB1 to SB4). A range input in the
 * topbar, 2013 to a live-state sentinel, that shows the panes as of a year.
 * The rightmost value is rendered as "now" and shows every record. Nothing
 * here runs during boot:
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
 * visitor's own open/closed state once back at now); a persistent status
 * bar line reads "as of <year>: N talks, M posts, ROLE." beside "back to
 * now", and one dim line goes to the terminal (debounced 150ms while
 * dragging). The rightmost value restores the live state exactly from a
 * snapshot taken at setup.
 *
 * The hash mirrors the year (#2018, replaceState, so no history entries and
 * no hashchange loop) while the hash has no pane/reader owner. A topic-only
 * hash gains the year in front; a zoomed pane's #cv is never overwritten.
 * Nothing animates, so reduced motion needs no branch here.
 */

import { emit, firstHashPart, hashParts } from './chart-util.js';
import { isShortcutTarget, shortcutsEnabled } from './shortcuts.js';

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

    // SB3/SB4: the career log and chart geometry stay in place. Only their
    // later records dim, while pane list rows retain phase 2's hide/show
    // behaviour above.
    for (const line of document.querySelectorAll('.bootlog__entry[data-year]')) {
      line.classList.toggle('is-after', past && Number(line.dataset.year) > y);
    }
    for (const mark of document.querySelectorAll('.chart-mark[data-year]')) {
      mark.classList.toggle('is-after', past && Number(mark.dataset.year) > y);
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

  /** #2013 to #2026 in the address bar renders that year. The hash may
   *  carry a topic segment too (#2018&topic=security), so this reads the
   *  leading segment only. */
  function applyHash() {
    const m = /^(20\d\d)$/.exec(firstHashPart());
    if (!m) return false;
    const y = parseInt(m[1], 10);
    if (y < MIN_YEAR || y > MAX_YEAR) return false;
    const applied = setYear(y);
    if (y === MAX_YEAR) {
      // The numeric maximum is an implementation sentinel, not a historical
      // view. Normalize stale #2026 links to the live hash while retaining
      // every composable key=value segment such as the topic filter.
      const kept = hashParts().filter((part) => part.includes('='));
      const hash = kept.join('&');
      history.replaceState(null, '', `${location.pathname}${location.search}${hash ? `#${hash}` : ''}`);
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
      // segment yet, so the scrubber may prepend its year. A pane/reader
      // hash such as #cv or #writing/slug remains owned by that feature.
      if (lead === '' || /^20\d\d$/.test(lead) || lead.includes('=')) {
        const kept = hashParts().filter((p) => p.includes('='));
        const parts = past ? [String(y), ...kept] : kept;
        const hash = parts.join('&');
        const url = hash ? `#${hash}` : location.pathname + location.search;
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
