/**
 * panes.js: pane navigation. Keys 0 to 4 and ? while the prompt is not
 * focused, the statusbar's current item, fragment deep links, and the
 * focus management for the "show more" disclosures.
 */

const KEY_TO_PANE = { 0: 'now', 1: 'talks', 2: 'writing', 3: 'cv', 4: 'links' };
const PANE_IDS = new Set(['about', 'now', 'talks', 'writing', 'cv', 'links', 'terminal']);

export function setupPanes({ term, reducedMotion, onHelp }) {
  const statusbar = document.querySelector('[data-statusbar]');
  const help = typeof onHelp === 'function' ? onHelp : () => { focusTerminal(); term.run('help'); };

  /** The statusbar key and the pane's .is-active class follow the focused pane. */
  function setCurrent(id) {
    for (const pane of document.querySelectorAll('.pane')) {
      pane.classList.toggle('is-active', pane.id === id);
    }
    if (!statusbar) return;
    for (const item of statusbar.querySelectorAll('[data-pane]')) {
      if (item.dataset.pane === id) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    }
  }

  /** Scroll a pane into view and focus it. Returns false when it does not exist. */
  function focusPane(id) {
    const el = document.getElementById(id);
    if (!el) return false;
    el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
    setCurrent(id);
    return true;
  }

  function focusTerminal() {
    const pane = document.getElementById('terminal');
    if (pane) pane.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'end' });
    term.focus();
    setCurrent('terminal');
  }

  // Keys while nothing editable has focus.
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (isEditable(e.target)) return;
    if (Object.prototype.hasOwnProperty.call(KEY_TO_PANE, e.key)) {
      e.preventDefault();
      focusPane(KEY_TO_PANE[e.key]);
    } else if (e.key === '?') {
      e.preventDefault();
      help();
    }
  });

  // Track which pane holds focus so the statusbar key reflects it.
  document.addEventListener('focusin', (e) => {
    const pane = e.target.closest('.pane, .topbar');
    if (pane && pane.id) setCurrent(pane.id);
  });

  // The help item runs help as well as focusing the terminal.
  const helpItem = statusbar && statusbar.querySelector('[data-help]');
  if (helpItem) {
    helpItem.addEventListener('click', (e) => {
      e.preventDefault();
      help();
    });
  }

  // Fragment navigation: the browser scrolls; this focuses so the ring shows.
  // main.js owns the hashchange listener and calls this last in its chain
  // (zoom, scrubber, then panes). Returns true when the id was a pane.
  function applyHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!PANE_IDS.has(id)) return false;
    return focusPane(id);
  }

  // Disclosures: swap the label and move focus to the first revealed row.
  for (const details of document.querySelectorAll('[data-more]')) {
    const summary = details.querySelector('summary');
    details.addEventListener('toggle', () => {
      if (!summary) return;
      summary.textContent = details.open ? summary.dataset.openLabel : summary.dataset.closedLabel;
      if (details.open) {
        const target = details.querySelector('.more__body [tabindex="-1"]') || details.querySelector('.more__body');
        if (target) target.focus({ preventScroll: true });
      }
    });
  }

  return { focusPane, focusTerminal, applyHash, setCurrent };
}

function isEditable(el) {
  if (!el || el === document || el === window) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}
