/**
 * clicks.js: click writes the command (C1, C2).
 *
 * Contract (scratchpad/phase2/PLAN.md, module table):
 *   setupClicks({ term, panes, reducedMotion }) -> { runFor(el), toast(text) }
 *
 * Every fact in a pane carries data-cmd (talk rows `cat talks/<id>`, post
 * rows `cat writing/<slug>`, cv rows `cat cv/<id>`, now values
 * `cat now/<fact>`). One delegated click listener on .console finds the
 * closest [data-cmd] and runs it through the terminal, so the prompt echoes
 * `$ cat talks/<id>` and the detail prints below it. Clicks on links,
 * buttons, fields, disclosure summaries, the reader and the terminal itself
 * are left alone, as is a click that ends a text selection.
 *
 * After running, the scrollback is at its end (terminal.js scrolls on
 * append). When the terminal pane is not on screen (stacked layout with the
 * terminal below the fold, or collapsed behind a zoomed pane), a one-line
 * toast in the statusbar says what ran and links to the terminal. It clears
 * itself after a few seconds; under reduced motion it simply appears and
 * disappears, which the zeroed transitions in tokens.css already ensure.
 */

const TOAST_MS = 4000;
const IGNORE = 'a, button, input, textarea, select, label, summary, canvas, [data-no-zoom], [data-reader], [data-prompt]';

export function setupClicks({ term, panes, reducedMotion }) {
  void reducedMotion;
  const consoleEl = document.querySelector('.console');
  const terminal = document.getElementById('terminal');
  const scrollback = document.querySelector('[data-scrollback]');
  const toastEl = document.querySelector('[data-toast]');
  const statusbar = document.querySelector('[data-statusbar]');
  let toastTimer = null;

  function runFor(el) {
    const target = el && typeof el.closest === 'function' ? el.closest('[data-cmd]') : null;
    if (!target || !target.dataset.cmd) return false;
    const cmd = target.dataset.cmd;
    term.run(cmd);
    afterRun(cmd);
    return true;
  }

  function afterRun(cmd) {
    if (scrollback) scrollback.scrollTop = scrollback.scrollHeight;
    if (terminalOnScreen()) return;
    toast(cmd);
  }

  /** True when the prompt row of the terminal pane is inside the viewport. */
  function terminalOnScreen() {
    if (!terminal || terminal.hidden) return false;
    const box = terminal.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return false;
    const prompt = terminal.querySelector('[data-prompt]') || terminal;
    const r = prompt.getBoundingClientRect();
    const barH = statusbar ? statusbar.getBoundingClientRect().height : 0;
    return r.top >= 0 && r.bottom <= window.innerHeight - barH;
  }

  function toast(text) {
    if (!toastEl) return false;
    clearTimeout(toastTimer);
    toastEl.replaceChildren();
    const glyph = document.createElement('span');
    glyph.className = 'seg--cmd';
    glyph.textContent = '$';
    const label = document.createElement('span');
    label.className = 'statusbar__toast-text';
    label.textContent = text;
    const link = document.createElement('a');
    link.className = 'statusbar__toast-link';
    link.href = '#terminal';
    link.textContent = 'see terminal';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      hideToast();
      panes.focusTerminal();
    });
    toastEl.append(glyph, ' ', label, ' ', link);
    toastEl.hidden = false;
    toastTimer = setTimeout(hideToast, TOAST_MS);
    return true;
  }

  function hideToast() {
    clearTimeout(toastTimer);
    if (toastEl) toastEl.hidden = true;
  }

  if (consoleEl) {
    consoleEl.addEventListener('click', (e) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest(IGNORE)) return;
      if (target.closest('#terminal')) return;
      const selection = window.getSelection();
      if (selection && selection.type === 'Range' && !selection.isCollapsed) return;
      runFor(target);
    });
  }

  return { runFor, toast };
}
