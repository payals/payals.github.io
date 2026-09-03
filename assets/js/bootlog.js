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
 * #timeline-data): the date column carries the entry's label and takes the
 * year token through data-year, the level word is coloured ([ ok ] green,
 * [info] --ink-2, [warn] amber), the kind prefix takes its kind hue, and the
 * text stays --ink. Facts only; entries without a date print last as
 * "undated".
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
 * whole 26-line career log gets read out unprompted the moment it lands, so
 * this module flips aria-live to "off" for the duration of the boot (header
 * plus career log) and back to "polite" once the very last line has
 * printed, whether that happens on schedule, via skip, or (synchronously)
 * under reduced motion.
 */

// Deadlines in milliseconds from navigation start (the boot run) or from the
// call (a replay), scaled down from an earlier 750ms-ready schedule (factor
// 700/750) to buy back the headroom the measurement above needed. Ready at
// 700 keeps 100ms of the 800ms budget for timer lateness; the career log
// ends at 740 + 25 * 40 = 1740, inside 2s.
const HEADER_AT_MS = [0, 100, 220, 335];
const BAR_AT_MS = 390;
const READY_LINE_AT_MS = 600;
const READY_AT_MS = 700;
const CAREER_START_MS = 740;
const CAREER_LINE_MS = 40;
const BAR_CELLS = 10;
const BAR_STEP_MS = 30;
const DATE_COL = 16;
const KIND_COL = 7;

const LEVEL_WORD = { ok: '[ ok ]', info: '[info]', warn: '[warn]' };
const KIND_WORD = { talk: '[talk]', post: '[post]', cv: '[cv]', now: '[now]' };

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
  const records = Array.isArray(timeline) ? timeline.slice() : [];
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

  events.push({
    at: READY_LINE_AT_MS,
    run: () => appendLine(out, { segments: [{ text: 'ready. type help, or press 0 to 4 to jump to a pane.' }] }),
  });
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

  return events;
}

/** One timeline entry as a scrollback line. */
function careerLine(entry) {
  const label = String(entry.label || 'undated');
  const year = entry.date ? String(entry.date).slice(0, 4) : null;
  const dateSeg = year
    ? { text: label.padEnd(DATE_COL), className: 'seg--year', attrs: { 'data-year': year } }
    : { text: label.padEnd(DATE_COL), className: 'seg--dim' };
  const level = LEVEL_WORD[entry.level] || LEVEL_WORD.info;
  const kindWord = KIND_WORD[entry.kind] || `[${entry.kind}]`;
  const segments = [
    dateSeg,
    { text: level, className: `seg--${entry.level in LEVEL_WORD ? entry.level : 'info'}` },
    { text: ' ' },
    { text: kindWord, className: `seg--${entry.kind}` },
    { text: ' '.repeat(Math.max(1, KIND_COL - kindWord.length)) },
    { text: String(entry.text || '') },
  ];
  if (entry.detail) segments.push({ text: ` · ${entry.detail}`, className: 'seg--dim' });
  return { segments };
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

    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      for (; idx < events.length; idx++) runEvent(events[idx]);
      settle();
      if (onDone) onDone();
    };

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
      finish();
    };

    if (skipSignal && skipSignal.aborted) {
      finish();
      return;
    }
    if (skipSignal) skipSignal.addEventListener('abort', finish, { once: true });
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
