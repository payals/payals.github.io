/**
 * mobile.js: the phone layout below 768px (MB2 to MB15).
 *
 * The phone page is the desktop page with its tails folded, not a
 * different page. index.html ships four native <details> disclosures,
 * all rendered closed, and features/mobile.css section 1 makes them
 * inert on desktop and with JavaScript off. Nothing collapses after
 * load, so the fold costs no layout shift; this module only reacts.
 *
 * What it owns:
 *
 *   MB2   Opening a closed disclosure when a match lands inside it,
 *         the "show fewer" label while one is open, and making the fold
 *         hold every row its summary counts (the writing tail included).
 *   MB3   The terminal at rest: the prompt plus the tail of the log,
 *         the full scrollback in a 60dvh internal scroller, and the
 *         rule that typing or tapping in the terminal expands it.
 *   MB4   Status-bar keys and deep links expand the pane they land on.
 *   MB7   A zoom control in each zoomable pane title, with a 44px
 *         touch target and aria-pressed following the zoom state.
 *   MB8   The palette as a bottom sheet: a close button, a swipe down,
 *         and focus back to whatever opened it.
 *   MB12  The prompt is never focused by this module; the boot log
 *         prints inside the capped scroller without moving the page.
 *   MB13  Tap-first charts belong to the chart modules, which each own
 *         their own priming; this file adds nothing to that path.
 *
 * The rest of MB is CSS and lives in features/mobile.css.
 *
 * Three rules this file is held to:
 *   - No innerHTML. Every node is built with el() from chart-util and
 *     every string goes in as textContent.
 *   - No new bare single-character shortcut. The one keydown listener
 *     here watches the pane digits that panes.js already owns, purely
 *     to expand the pane it focused, and it runs through
 *     isShortcutTarget/shortcutsEnabled like every other digit.
 *   - No timer. Everything is an event or a MutationObserver.
 */

import { el, on } from './chart-util.js';
import { isShortcutTarget, shortcutsEnabled } from './shortcuts.js';

const PHONE = '(max-width: 767px)';
const KEY_TO_PANE = { 0: 'now', 1: 'talks', 2: 'writing', 3: 'cv', 4: 'links' };
const ZOOMABLE = ['now', 'talks', 'writing', 'cv'];
const PANE_IDS = new Set(['now', 'talks', 'writing', 'cv', 'links', 'terminal']);

export function setupMobile({ term, panes, palette, reducedMotion } = {}) {
  const mq = window.matchMedia(PHONE);
  const isPhone = () => mq.matches;

  const discloses = [...document.querySelectorAll('.disclose[data-mobile-more]')];
  const byPane = new Map(discloses.map((d) => [d.dataset.mobileMore, d]));
  const logBox = byPane.get('terminal') || null;
  const scrollback = document.querySelector('[data-scrollback]');

  /* ------------------------------------------------------ MB2 summaries */

  // The count in each summary is rendered by Liquid from the same records
  // the rows come from, so it is already right. All this does is swap it
  // for "show fewer" while the disclosure is open and put it back after,
  // which is the same contract panes.js gives the phase-2 [data-more].
  for (const d of discloses) {
    const summary = d.querySelector('.disclose__summary');
    if (!summary) continue;
    const closedLabel = summary.textContent.trim();
    const openLabel = d.classList.contains('disclose--log') ? 'hide log' : 'show fewer';
    const label = el('span', { class: 'disclose__label', text: closedLabel });
    const chevron = el('span', { class: 'disclose__chevron', text: '+', 'aria-hidden': 'true' });
    summary.replaceChildren(label, chevron);
    d.addEventListener('toggle', () => {
      label.textContent = d.open ? openLabel : closedLabel;
      chevron.textContent = d.open ? '\u2212' : '+';
      if (d.open) scrollLogToEnd();
    });
  }

  /**
   * MB2, the folded tail. The writing pane keeps posts past its own limit in
   * the DOM with `data-rest hidden`, and on a phone that tail sits inside the
   * writing fold. The summary counts every post below the first three (five
   * of them), so before this the fold promised five and opened onto two: the
   * three oldest posts stayed hidden with nothing on the phone able to reach
   * them. MB2 says the disclosure holds the rest, so at phone widths the
   * folded tail is simply not hidden, and above them it goes back to hidden,
   * where zoom.js keeps the phase-2 reveal to itself. A row a pane's zoom is
   * showing right now is left exactly as zoom.js left it.
   */
  const foldedRest = [...document.querySelectorAll('.disclose[data-mobile-more] .row[data-rest]')];

  function syncFoldedRest() {
    const phone = isPhone();
    for (const row of foldedRest) {
      const pane = row.closest('.pane');
      if (pane && pane.classList.contains('is-zoom')) continue;
      row.hidden = !phone;
    }
  }
  syncFoldedRest();

  /**
   * Open every collapsible ancestor of this element: a phase-3 .disclose
   * and, nested inside the talks and cv tails, phase-2's own
   * <details class="more" data-more>. The two are different elements with
   * different owners, so a row past the phase-2 offset (talks rows beyond
   * six, the full cv) sits behind both, and opening only the outer
   * .disclose leaves it exactly as hidden as it started: the "show more"
   * button appears, but the row a filter or a scrub was trying to reveal
   * is still one summary click away. Walking both keeps the fold-matching
   * path from rejecting a row phase-2's own pagination marked closed.
   */
  function openFor(node) {
    if (!node || !isPhone()) return false;
    let opened = false;
    let d = node.closest ? node.closest('.disclose, details.more[data-more]') : null;
    while (d) {
      if (!d.open) { d.open = true; opened = true; }
      d = d.parentElement ? d.parentElement.closest('.disclose, details.more[data-more]') : null;
    }
    return opened;
  }

  /** Open the disclosure belonging to one pane. */
  function openPane(id) {
    if (!isPhone() || !PANE_IDS.has(id)) return false;
    const d = byPane.get(id);
    if (!d || d.open) return false;
    d.open = true;
    return true;
  }

  /** A row is a live match when the scrubber has not taken it out of the year. */
  function shown(row) {
    return Boolean(row) && !row.classList.contains('scrubber-hidden') && !row.hidden;
  }

  /**
   * Open every closed disclosure that holds a row matching `selector`.
   * `onlyIfNoneOutside` restricts that to the case the fold is the only
   * place the answer is: the pane shows nothing matching above the
   * summary. That is the honest reading for the scrubber, where every
   * row matches at the live end and opening all three folds on the way
   * back to now would be noise; the topic filter uses the plain rule,
   * because a filter with its matches only in the tail should show them.
   */
  function openWhereMatched(selector, onlyIfNoneOutside = false) {
    let opened = false;
    for (const d of discloses) {
      if (d === logBox) continue;
      const matches = [...d.querySelectorAll(selector)].filter(shown);
      if (!matches.length) continue;
      if (onlyIfNoneOutside) {
        const pane = d.closest('.pane');
        if (!pane) continue;
        const outside = [...pane.querySelectorAll(selector)]
          .filter((row) => !d.contains(row))
          .some(shown);
        if (outside) continue;
      }
      // openFor walks every collapsible ancestor of the match, the outer
      // .disclose and, for a talks or cv row past phase-2's own offset, the
      // nested <details class="more"> too, so a match that sits in both
      // opens both rather than only the one this loop is iterating.
      for (const row of matches) {
        if (openFor(row)) opened = true;
      }
    }
    return opened;
  }

  // The three bus events. No chart, filter or scrubber module knows this
  // file exists; they emit, and the fold reacts.
  on('console:topic', (e) => {
    if (!isPhone()) return;
    const topic = e.detail && e.detail.topic;
    if (!topic) return;
    // Every row a chip counts is reachable on a phone, tail included
    // (syncFoldedRest), so the filter only has to open the fold it is in.
    openWhereMatched(`.row[data-topic="${cssEscape(topic)}"]`);
  });

  on('console:asof', (e) => {
    if (!isPhone() || !e.detail || !e.detail.past) return;
    openWhereMatched('.row[data-year]', true);
  });

  // hitRow() emits this before it scrolls, so opening the fold here means
  // its own scrollIntoView measures the open box. Nothing else to do.
  on('console:hit', (e) => {
    if (!isPhone() || !e.detail || !e.detail.el) return;
    openFor(e.detail.el);
  });

  /* ------------------------------------------------- MB4 keys and links */

  // panes.js focuses the pane for a digit; this expands it. It does not
  // preventDefault and it does not add a key of its own, so the two
  // listeners compose. Gated exactly like every other digit (WCAG 2.1.4).
  document.addEventListener('keydown', (e) => {
    if (!isPhone()) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (!shortcutsEnabled() || !isShortcutTarget(e.target)) return;
    const id = KEY_TO_PANE[e.key];
    if (id) openPane(id);
  });

  const statusbar = document.querySelector('[data-statusbar]');
  if (statusbar) {
    statusbar.addEventListener('click', (e) => {
      if (!isPhone()) return;
      const item = e.target.closest('a[data-pane]');
      if (!item || item.hasAttribute('data-help')) return;
      openPane(item.dataset.pane);
    });
  }

  // #talks, #writing, #cv open that pane expanded, on load and on every
  // later hash change. The leading segment is the pane, the same grammar
  // panes.js reads.
  function applyHash() {
    if (!isPhone()) return false;
    const lead = location.hash.replace(/^#/, '').split('&')[0].split('/')[0];
    return openPane(lead);
  }
  window.addEventListener('hashchange', applyHash);
  applyHash();

  /* ---------------------------------------------------- MB3, MB12 the log */

  function scrollLogToEnd() {
    if (!scrollback) return;
    scrollback.scrollTop = scrollback.scrollHeight;
  }

  // MB12: this module never focuses the prompt. `userTyped` is what tells
  // the observer below that a line arriving now is an answer to a tap, not
  // the boot log still printing.
  let userTyped = false;

  // The boot log prints line by line into a scrollback that is capped at
  // three lines while the fold is closed, so the page never grows and
  // never scrolls under it (MB12). Terminal.prototype._print already
  // pins scrollTop to the end; this observer covers the frame after a
  // reflow and the moment the fold opens.
  if (scrollback && 'MutationObserver' in window) {
    const obs = new MutationObserver(() => {
      scrollLogToEnd();
      if (userTyped && logBox && !logBox.open && isPhone()) logBox.open = true;
    });
    obs.observe(scrollback, { childList: true });
  }

  // Expanding on a tap is the visitor's own action, and a command run from
  // a tap elsewhere (clicks.js writes it into the prompt) sets userTyped
  // through the same document-level pointerdown.
  const terminalPane = document.getElementById('terminal');
  if (terminalPane && logBox) {
    const expand = () => {
      if (!isPhone() || logBox.open) return;
      logBox.open = true;
      scrollLogToEnd();
    };
    terminalPane.addEventListener('pointerdown', (e) => {
      // The summary toggles itself, so a tap on it must not set userTyped
      // either. While the boot log is still printing, one more line arrives
      // between this pointerdown and the summary's own click; the observer
      // above would force the fold open on that line and the native toggle
      // would then close it again, and the visitor's tap would look ignored.
      // Leaving userTyped alone here is what keeps `show log` working from
      // the first frame rather than only after the log finishes.
      if (e.target.closest('.disclose__summary')) return;
      userTyped = true;
      expand();
    });
    terminalPane.addEventListener('focusin', (e) => {
      if (e.target.closest('[data-input]')) expand();
    });
  }
  // A tap on a row, a fact or the cv headline runs a command through
  // clicks.js, and MB12 says the terminal opens for that too. Only those
  // taps count: a tap anywhere else on the page must not unfold the log
  // while the boot log is still printing.
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest && e.target.closest('[data-cmd]')) userTyped = true;
  });
  document.addEventListener('keydown', (e) => {
    if (e.target && e.target.closest && e.target.closest('[data-input]')) userTyped = true;
  });

  /* ----------------------------------------------------- MB7 zoom control */

  // The control reaches zoom.js through the click path zoom.js already
  // publishes: a click on a .pane__title toggles that pane's zoom. The
  // button itself is in zoom.js's IGNORE_CLICK list, so a tap on it does
  // not toggle twice; it dispatches one click on the title instead.
  const zoomButtons = [];
  for (const id of ZOOMABLE) {
    const pane = document.getElementById(id);
    if (!pane) continue;
    const title = pane.querySelector('.pane__title');
    if (!title || title.querySelector('.pane__zoom')) continue;
    const btn = el('button', {
      class: 'pane__zoom',
      type: 'button',
      'aria-pressed': 'false',
      'aria-label': `zoom the ${id} pane`,
      text: 'zoom',
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      title.click();
    });
    title.appendChild(btn);
    zoomButtons.push({ id, pane, btn });
  }

  if (zoomButtons.length && 'MutationObserver' in window) {
    const sync = () => {
      for (const z of zoomButtons) {
        z.btn.setAttribute('aria-pressed', z.pane.classList.contains('is-zoom') ? 'true' : 'false');
      }
    };
    const obs = new MutationObserver(sync);
    for (const z of zoomButtons) obs.observe(z.pane, { attributes: true, attributeFilter: ['class'] });
    sync();
  }

  /* --------------------------------------------------- MB8 palette sheet */

  const paletteRoot = document.querySelector('[data-palette]');
  const paletteBox = paletteRoot && paletteRoot.querySelector('.palette__box');
  const paletteHead = paletteRoot && paletteRoot.querySelector('.palette__head');
  if (paletteRoot && paletteBox && paletteHead && palette && typeof palette.close === 'function') {
    paletteBox.insertBefore(el('span', { class: 'palette__grip', 'aria-hidden': 'true' }), paletteBox.firstChild);

    const close = el('button', {
      class: 'palette__close',
      type: 'button',
      'aria-label': 'close search',
      text: 'esc',
    });
    // palette.close() restores focus to whatever opened the palette, so
    // the opener gets the focus back rather than the console (MB8).
    close.addEventListener('click', () => { palette.close(); });
    paletteHead.appendChild(close);

    // MB8, focus returns to the opener. palette.js remembers
    // document.activeElement when it opens, and on macOS a click on a
    // <button> does not move focus to it (the platform convention Chrome
    // and Safari both follow), so the opener was never the active element
    // and close() fell back to the console. Focusing the opener in the
    // capture phase, before palette.js's own click listener on the same
    // button, makes the thing the visitor touched the thing focus comes
    // back to. Capture on document runs before any target-phase listener
    // whatever the module load order is.
    document.addEventListener('click', (e) => {
      const opener = e.target.closest && e.target.closest('[data-open-palette]');
      if (opener && document.activeElement !== opener) opener.focus({ preventScroll: true });
    }, true);

    // Swipe down anywhere on the sheet except inside the scrolling result
    // list, so a flick through results never closes it.
    // The distance is measured from the last pointermove rather than from
    // the pointerup, and pointercancel ends the gesture the same way
    // pointerup does. A real finger drag on a sheet that has a scroller
    // inside it is often taken over by the browser part way down, which
    // fires pointercancel with the drag already 100px long; reading the
    // move keeps that gesture a close instead of dropping it.
    let startY = null;
    let lastY = null;
    paletteBox.addEventListener('pointerdown', (e) => {
      if (!isPhone()) return;
      if (e.target.closest('.palette__results')) return;
      startY = e.clientY;
      lastY = e.clientY;
    });
    paletteBox.addEventListener('pointermove', (e) => {
      if (startY !== null) lastY = e.clientY;
    });
    const endSwipe = () => {
      if (startY === null) return;
      const dy = lastY - startY;
      startY = null;
      lastY = null;
      if (dy > 60) palette.close();
    };
    paletteBox.addEventListener('pointerup', endSwipe);
    paletteBox.addEventListener('pointercancel', endSwipe);
  }

  /* ------------------------------------------------ MB13 tap-first charts */

  // Each chart owns its own first-tap-selects, second-tap-opens machine:
  // chart-talks.js primes on a capture pointerdown, chart-writing.js and
  // chart-cv.js prime on the first click. This module used to swallow the
  // first click on any .chart-mark as well, which stacked two machines on
  // top of each other and cost the calendar and the cv lanes a third tap
  // (the swallowed click never reached the chart, so the chart primed on
  // tap two and opened on tap three). There is one owner now, the chart,
  // and this file only clears a stale selection when the viewport leaves
  // the phone breakpoint.

  /* -------------------------------------------------------------- refresh */

  function refresh() {
    syncFoldedRest();
    if (!isPhone()) return;
    scrollLogToEnd();
  }
  mq.addEventListener('change', refresh);

  return { isPhone, openFor, openPane, refresh };
}

/**
 * Escape a topic id for a CSS attribute selector. The ids come from
 * data/topics.json and are plain lower-case words today; this keeps the
 * selector safe if one ever is not.
 */
function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
  return String(value).replace(/["\\]/g, '\\$&');
}
