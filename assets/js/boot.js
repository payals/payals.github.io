/**
 * boot.js: the boot sequence in the terminal pane. At most 800ms, skippable
 * with any key or click, skipped entirely under prefers-reduced-motion.
 * Timing from .omc/design/motion.md: 0, 120, 140, 130, 200, then 190 before
 * the cursor appears (780ms scheduled, 20ms of headroom for timer lateness).
 * Every line is scheduled against an absolute deadline measured from one
 * start timestamp, so setTimeout jitter does not accumulate across lines.
 * The lines report what the page actually rendered.
 */

const READY_DELAY_MS = 190;

/**
 * @param {object} opts
 * @param {import('./terminal.js').Terminal} opts.term
 * @param {HTMLElement} opts.console   the main.console element with data-* counts
 * @param {AbortSignal} opts.skipSignal
 * @param {boolean} opts.reducedMotion
 * @returns {Promise<void>}
 */
export function runBoot({ term, console: consoleEl, skipSignal, reducedMotion }) {
  const d = consoleEl.dataset;
  const ok = { text: '[ ok ]', className: 'ok' };
  const lines = [
    { delay: 0, line: 'payalsingh.me console' },
    { delay: 120, line: { segments: [ok, { text: ` now.json     updated ${d.nowUpdated || 'unknown'}` }] } },
    { delay: 140, line: { segments: [ok, { text: ` talks.json   ${d.talksSourced || 0} sourced, ${d.talksLeads || 0} archive leads` }] } },
    { delay: 130, line: { segments: [ok, { text: ` writing      ${d.posts || 0} posts` }] } },
    { delay: 200, line: 'ready. type help, or press 0 to 4 to jump to a pane.' },
  ];

  if (reducedMotion) {
    for (const { line } of lines) term.print(line);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    // Absolute deadlines (ms after start) for each line and for the handoff.
    let cumulative = 0;
    const deadlines = lines.map(({ delay }) => (cumulative += delay));
    const readyAt = cumulative + READY_DELAY_MS;
    const start = performance.now();
    const elapsed = () => performance.now() - start;

    let idx = 0;
    let timer = null;
    let done = false;

    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      for (; idx < lines.length; idx++) term.print(lines[idx].line);
      resolve();
    }

    // Print every line whose deadline has passed, then sleep until the next
    // deadline. A timer that fires late only delays its own line; the lines
    // after it are still measured from the same start.
    function step() {
      if (done) return;
      while (idx < lines.length) {
        const wait = deadlines[idx] - elapsed();
        if (wait > 0) {
          timer = setTimeout(step, wait);
          return;
        }
        term.print(lines[idx].line);
        idx++;
      }
      timer = setTimeout(finish, Math.max(0, readyAt - elapsed()));
    }

    if (skipSignal.aborted) {
      finish();
      return;
    }
    skipSignal.addEventListener('abort', finish, { once: true });
    step();
  });
}
