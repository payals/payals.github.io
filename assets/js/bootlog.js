/**
 * bootlog.js: the boot sequence and the career boot log (B1).
 *
 * Two parts, one clock, and the clock starts at navigation, not at
 * DOMContentLoaded. Every deadline below is measured against
 * performance.now(), which is already relative to the document's time origin,
 * so parse and script-load time is spent inside the 800ms budget rather than
 * added on top of it (.omc/design/motion.md). The boot header (five lines
 * plus one inline progress bar) lands the READY state at 700ms from
 * navigation, leaving 100ms of headroom inside the 800ms budget: measured
 * ready times ran up to about 53ms past their nominal deadline (accumulated
 * setTimeout lateness across the chained header events), so a 750ms nominal
 * ready landed at 803ms on at least one run — over budget. 700ms nominal
 * keeps observed ready under 800ms with margin. On a slow connection the
 * header deadlines that have already passed print at once and ready still
 * lands close to on time. The promise resolves at ready; the career log
 * then keeps printing into the scrollback at 40ms a line and ends under 2s
 * total. It never blocks the prompt: the panes are complete at first paint
 * and nothing here touches them.
 *
 * Every career line is a record from data/timeline.json (inlined as
 * #timeline-data): a year-temperature date column, a kind-coloured column
 * (talk, post, role or next), then neutral text that wraps inside its own
 * grid cell. Talk and post titles use the record's real href. Facts only;
 * entries without a date print last as "undated". The now.json audit entry
 * is not a career event, so it stays in the data but not in this log.
 *
 * Skip: the skipSignal (any key or click, wired in main.js) prints every
 * remaining line at once. Reduced motion prints the whole log immediately.
 * `replay` (replayBootLog) clears the scrollback and runs the same log with
 * its own skip listeners and no ready handoff.
 *
 * Lines are appended straight to the scrollback element rather than through
 * Terminal.print: the log needs data-year on a segment, aria-hidden on the
 * progress bar, and in-place updates to the bar, none of which the terminal's
 * line queue carries. Output the visitor types during the career log goes
 * through the terminal queue and may interleave, which is what a background
 * log does.
 *
 * Accessibility: the scrollback is role="log" aria-live="polite" so a
 * visitor's own typed commands are announced. That would also mean the
 * whole career log gets read out unprompted the moment it lands, so
 * this module flips aria-live to "off" for the duration of the boot (header
 * plus career log) and back to "polite" once the very last line has
 * printed, whether that happens on schedule, via skip, or (synchronously)
 * under reduced motion.
 */

// Deadlines in milliseconds from navigation start (the boot run) or from the
// call (a replay), scaled down from an earlier 750ms-ready schedule (factor
// 700/750) to buy back the headroom the measurement above needed. Ready at
// 700 keeps 100ms of the 800ms budget for timer lateness; the career log
// ends with its computed summary at 740 + 25 * 40 = 1740, inside 2s.
const HEADER_AT_MS = [0, 100, 220, 335];
const BAR_AT_MS = 390;
const READY_AT_MS = 700;
const CAREER_START_MS = 740;
const CAREER_LINE_MS = 40;
const BAR_CELLS = 10;
const BAR_STEP_MS = 30;

const CAREER_KINDS = new Set(['cv', 'talk', 'post']);

// Only one direct-to-scrollback playback may own the log at a time. A replay
// retires the still-running initial career tail (or an earlier replay) before
// clearing, so two clocks can never interleave their lines.
let cancelActivePlayback = null;

/**
 * @param {object} opts
 * @param {import('./terminal.js').Terminal} opts.term
 * @param {HTMLElement} opts.console   main.console with the data-* counts
 * @param {AbortSignal} opts.skipSignal
 * @param {boolean} opts.reducedMotion
 * @param {Array<object>} opts.timeline   parsed data/timeline.json
 * @returns {Promise<void>} resolves at the ready state
 */
export function runBootLog({ term, console: consoleEl, skipSignal, reducedMotion, timeline }) {
  void term;
  const out = document.querySelector('[data-scrollback]');
  if (!out) return Promise.resolve();
  const events = buildEvents(out, consoleEl, timeline);
  // Silence the live region for the boot burst; restored once the very last
  // line (the career log's last entry) has printed, not just at ready.
  out.setAttribute('aria-live', 'off');
  const restoreLive = () => out.setAttribute('aria-live', 'polite');
  if (reducedMotion) {
    for (const ev of events) ev.run();
    restoreLive();
    return Promise.resolve();
  }
  // origin 0: performance.now() is already measured from navigation start, so
  // the deadlines above are navigation-relative and the time spent parsing
  // HTML and loading modules comes out of the 800ms budget instead of being
  // added to it.
  return play(events, skipSignal, { origin: 0, onDone: restoreLive });
}

/**
 * The `replay` command: the same log from a cleared scrollback. Resolves when
 * the whole log has printed. Any key or click prints the rest at once.
 */
export function replayBootLog({ term, console: consoleEl, timeline }) {
  const out = document.querySelector('[data-scrollback]');
  if (!out) return Promise.resolve();
  if (cancelActivePlayback) cancelActivePlayback(false);
  term.clear();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const events = buildEvents(out, consoleEl, timeline);
  out.setAttribute('aria-live', 'off');
  const restoreLive = () => out.setAttribute('aria-live', 'polite');
  if (reduced) {
    for (const ev of events) ev.run();
    restoreLive();
    return Promise.resolve();
  }
  const skip = new AbortController();
  const abort = () => skip.abort();
  // Registered after the current event finishes dispatching, so the Enter
  // that ran `replay` does not skip its own replay.
  setTimeout(() => {
    if (skip.signal.aborted) return;
    document.addEventListener('keydown', abort, { once: true });
    document.addEventListener('click', abort, { once: true });
  }, 0);
  return play(events, skip.signal, { resolveAtEnd: true, onDone: restoreLive }).finally(() => {
    document.removeEventListener('keydown', abort);
    document.removeEventListener('click', abort);
  });
}

/**
 * Build the timed event list: { at, run, ready }. `ready` marks the event
 * whose deadline resolves the boot promise.
 */
function buildEvents(out, consoleEl, timeline) {
  const d = consoleEl ? consoleEl.dataset : {};
  const records = Array.isArray(timeline)
    ? timeline.filter((entry) => entry && CAREER_KINDS.has(entry.kind))
    : [];
  const ok = { text: '[ ok ]', className: 'seg--ok' };
  const events = [];

  const header = [
    [HEADER_AT_MS[0], [{ text: 'payalsingh.me console' }]],
    [HEADER_AT_MS[1], [ok, { text: ` now.json     updated ${d.nowUpdated || 'unknown'}` }]],
    [HEADER_AT_MS[2], [ok, { text: ` talks.json   ${d.talksSourced || 0} sourced, ${d.talksLeads || 0} archive leads` }]],
    [HEADER_AT_MS[3], [ok, { text: ` writing      ${d.posts || 0} posts` }]],
  ];
  for (const [at, segments] of header) events.push({ at, run: () => appendLine(out, { segments }) });

  // One inline progress bar: the visible cells are aria-hidden and a plain
  // "done" lands in the live region when the bar fills.
  let bar = null;
  let done = null;
  const barAt = BAR_AT_MS;
  events.push({
    at: barAt,
    run() {
      const el = appendLine(out, {
        segments: [
          { text: `indexing ${records.length} records ` },
          { text: '░'.repeat(BAR_CELLS), className: 'seg--bar bootlog__bar', attrs: { 'aria-hidden': 'true' } },
          { text: ' ' },
          { text: '', className: 'seg--ok bootlog__done' },
        ],
      });
      bar = el.querySelector('.bootlog__bar');
      done = el.querySelector('.bootlog__done');
    },
  });
  for (let step = 1; step <= BAR_CELLS / 2; step++) {
    const filled = step * 2;
    events.push({
      at: barAt + step * BAR_STEP_MS,
      run() {
        if (bar) bar.textContent = '▓'.repeat(filled) + '░'.repeat(BAR_CELLS - filled);
        if (done && filled === BAR_CELLS) done.textContent = 'done';
      },
    });
  }

  // Readiness is the cursor/prompt handoff at 700ms. The visible ready
  // summary belongs at the end of the career log, which may keep printing
  // in the background without blocking input.
  events.push({ at: READY_AT_MS, ready: true, run() {} });

  // Career log: dated records ascending, undated last, one line each.
  records.sort((a, b) => {
    if (a.date === b.date) return 0;
    if (a.date == null) return 1;
    if (b.date == null) return -1;
    return a.date < b.date ? -1 : 1;
  });
  records.forEach((entry, i) => {
    events.push({ at: CAREER_START_MS + i * CAREER_LINE_MS, run: () => appendLine(out, careerLine(entry)) });
  });

  const summary = careerSummary(d, records);
  events.push({
    at: CAREER_START_MS + records.length * CAREER_LINE_MS,
    run: () => appendLine(out, {
      className: 'bootlog__summary',
      segments: [
        { text: '[ ok ]', className: 'seg--ok' },
        { text: ` ready. ${plural(summary.years, 'year')}, ${plural(summary.talks, 'sourced talk')}, ${plural(summary.posts, 'post')}. type help, replay, or drag the timeline.` },
      ],
    }),
  });

  return events;
}

/** One timeline entry as a scrollback line. */
function careerLine(entry) {
  const year = entry.date ? String(entry.date).slice(0, 4) : null;
  const next = entry.kind === 'talk' && entry.status === 'upcoming';
  return {
    career: true,
    className: 'bootlog__entry',
    year,
    date: careerDate(entry),
    kind: entry.kind,
    kindLabel: entry.kind === 'cv' ? 'role' : next ? 'next' : entry.kind,
    text: String(entry.text || ''),
    detail: entry.detail ? String(entry.detail) : '',
    href: (entry.kind === 'talk' || entry.kind === 'post') ? safeHref(entry.href) : null,
  };
}

/** Month precision keeps the date column compact; years and circa years
 * retain the evidence precision recorded in timeline.json. */
function careerDate(entry) {
  if (!entry.date) return 'undated';
  const year = String(entry.date).slice(0, 4);
  if (entry.precision === 'circa') return `c.${year}`;
  if (entry.precision === 'year') return year;
  return String(entry.date).slice(0, 7);
}

/** Summary values come from the same rendered/data sources as the panes. */
function careerSummary(dataset, records) {
  const start = String(dataset.careerStart || records.find((entry) => entry.kind === 'cv' && entry.date)?.date || '');
  const startYear = parseInt(start.slice(0, 4), 10);
  const now = new Date();
  let years = Number.isFinite(startYear) ? now.getFullYear() - startYear : 0;
  if (Number.isFinite(startYear)) {
    const anniversary = new Date(now.getFullYear(), 0, 1);
    const startMonth = /^\d{4}-\d{2}/.test(start) ? parseInt(start.slice(5, 7), 10) - 1 : 0;
    const startDay = /^\d{4}-\d{2}-\d{2}/.test(start) ? parseInt(start.slice(8, 10), 10) : 1;
    anniversary.setMonth(startMonth, startDay);
    if (anniversary > now) years--;
  }

  const sourcedTalks = Number(dataset.talksSourced);
  const postCount = Number(dataset.posts);
  return {
    years: Math.max(0, years),
    talks: Number.isFinite(sourcedTalks)
      ? sourcedTalks
      : records.filter((entry) => entry.kind === 'talk' && entry.level !== 'warn').length,
    posts: Number.isFinite(postCount)
      ? postCount
      : records.filter((entry) => entry.kind === 'post').length,
  };
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Only navigation schemes already used by the site can become anchors. */
function safeHref(value) {
  const href = String(value || '').trim();
  if ((href.startsWith('/') && !href.startsWith('//')) || href.startsWith('#') || /^https?:\/\//i.test(href)) return href;
  return null;
}

/**
 * Print events on their absolute deadlines, measured from `origin` on the
 * performance.now() timeline: 0 for the boot run (navigation start), the call
 * time for a replay. Deadlines already in the past run at once. Resolves at
 * the `ready` event (or, with resolveAtEnd, after the last event). The skip
 * signal runs every remaining event at once. `onDone`, if given, always fires
 * once every event has run (naturally, via skip, or after resolveAtEnd),
 * independent of when the returned promise settles.
 */
function play(events, skipSignal, { resolveAtEnd = false, origin = null, onDone = null } = {}) {
  return new Promise((resolve) => {
    const start = origin === null ? performance.now() : origin;
    const elapsed = () => performance.now() - start;
    let idx = 0;
    let timer = null;
    let finished = false;
    let resolved = false;

    const settle = () => {
      if (resolved) return;
      resolved = true;
      resolve();
    };

    const runEvent = (ev) => {
      ev.run();
      if (ev.ready && !resolveAtEnd) settle();
    };

    const finish = (flush = true) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (flush) for (; idx < events.length; idx++) runEvent(events[idx]);
      settle();
      if (onDone) onDone();
      if (cancelActivePlayback === cancel) cancelActivePlayback = null;
    };

    const cancel = (flush = false) => finish(flush);
    cancelActivePlayback = cancel;

    const step = () => {
      if (finished) return;
      while (idx < events.length) {
        const wait = events[idx].at - elapsed();
        if (wait > 0) {
          timer = setTimeout(step, wait);
          return;
        }
        runEvent(events[idx]);
        idx++;
      }
      finish(false);
    };

    if (skipSignal && skipSignal.aborted) {
      finish();
      return;
    }
    if (skipSignal) skipSignal.addEventListener('abort', () => finish(), { once: true });
    step();
  });
}

/**
 * Append one line to the scrollback. Segments: { text, className, href,
 * attrs }. Returns the element so the progress bar can update in place.
 */
function appendLine(out, line) {
  const el = document.createElement('p');
  el.className = ['scrollback__line', line.className].filter(Boolean).join(' ');
  if (line.career) {
    appendCareerLine(el, line);
    out.appendChild(el);
    out.scrollTop = out.scrollHeight;
    return el;
  }
  for (const seg of line.segments) {
    let node;
    if (seg.href) {
      node = document.createElement('a');
      node.href = seg.href;
      if (/^https?:/.test(seg.href)) {
        node.target = '_blank';
        node.rel = 'noopener';
      }
    } else if (seg.className || seg.attrs) {
      node = document.createElement('span');
    } else {
      el.appendChild(document.createTextNode(seg.text));
      continue;
    }
    if (seg.className) node.className = seg.className;
    if (seg.attrs) for (const [k, v] of Object.entries(seg.attrs)) node.setAttribute(k, v);
    node.textContent = seg.text;
    el.appendChild(node);
  }
  if (line.segments.length === 0) el.textContent = ' ';
  out.appendChild(el);
  out.scrollTop = out.scrollHeight;
  return el;
}

function appendCareerLine(el, line) {
  if (line.year) el.dataset.year = line.year;
  const asof = parseInt(document.body.dataset.asof, 10);
  if (line.year && Number.isFinite(asof) && Number(line.year) > asof) el.classList.add('is-after');

  const date = document.createElement('span');
  date.className = line.year ? 'bootlog__date seg--year' : 'bootlog__date seg--dim';
  if (line.year) date.dataset.year = line.year;
  date.textContent = line.date;

  const kind = document.createElement('span');
  kind.className = 'bootlog__kind';
  kind.dataset.kind = line.kind;
  kind.textContent = line.kindLabel;

  const message = document.createElement('span');
  message.className = 'bootlog__message';
  if (line.href) {
    const anchor = document.createElement('a');
    anchor.href = line.href;
    anchor.textContent = line.text;
    if (/^https?:\/\//i.test(line.href)) {
      anchor.target = '_blank';
      anchor.rel = 'noopener';
    }
    message.appendChild(anchor);
  } else {
    message.appendChild(document.createTextNode(line.text));
  }
  if (line.detail) {
    const detail = document.createElement('span');
    detail.className = 'bootlog__detail';
    detail.textContent = ` · ${line.detail}`;
    message.appendChild(detail);
  }
  el.append(date, kind, message);
}
