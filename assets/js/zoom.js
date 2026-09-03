/**
 * zoom.js: pane zoom (Z1 to Z6). One pane fills the console; the others
 * collapse into a tab strip whose numbers stay valid.
 *
 * Contract (scratchpad/phase2/PLAN.md, module table):
 *   setupZoom({ term, panes, reader, reducedMotion, onChange }) ->
 *     { zoom(id), restore(), toggle(id), current(), openPost(slug), applyHash() }
 *
 * onChange (optional) is called after every zoom or restore once the DOM
 * has changed; main.js uses it to refit the constellation canvas, whose
 * wrapper is display:none while the terminal is collapsed into the tab strip.
 *
 * State is one class pair: .console.is-zoomed and .pane.is-zoom. From 768px
 * the stylesheet hides every other pane and shows [data-zoomtabs]; from
 * 1280px the terminal keeps its column. Below 768px the panes already stack,
 * so the same state only expands the pane's content (all posts, the full cv
 * with its print and copy controls, talks regrouped by year) and focuses it.
 * The hash mirrors the state (#cv, #talks, #writing, #now, #writing/<slug>)
 * through replaceState so restoring adds no history entries. Composing with
 * the scrubber's own #<year> hash: starting a zoom while the hash is a bare
 * year (scrubber.js's format) remembers it, so it overwrites the hash while
 * zoomed (the same as any other zoom) but restore() puts the year back
 * instead of clearing the hash, so a #2018 deep link survives zooming a pane
 * and returning to the grid.
 *
 * Triggers: pane title click (toggle), click on a non-interactive area of a
 * pane (zoom), z or Enter on a focused pane, a pane number pressed twice
 * within 600ms, Ctrl+B then z (preventDefault alias). Esc, q, the same
 * number again, or a click on the tab strip restores. j and k move between
 * panes in statusbar order; : focuses the prompt.
 *
 * Single-character shortcuts (z, q, j, k, :, the pane digits) go through
 * shortcuts.js's isShortcutTarget() and shortcutsEnabled() gates (WCAG
 * 2.1.4): they fire only when the visitor has not turned keys off and focus
 * is on the document body or a non-interactive part of a pane, never a
 * link, button, form control or other interactive element, and never while
 * a dialog is open. Escape is a functional key, not a character shortcut,
 * so it stays active regardless of the keys switch; it still steps aside
 * for a focused form field so that field's own Escape handling runs
 * instead. Enter only ever acts when the event target is the pane element
 * itself (never a link or button inside it), which already satisfies the
 * same intent, so it is not run through the extra gate either.
 */

import { isShortcutTarget, shortcutsEnabled } from './shortcuts.js';

const ZOOMABLE = ['now', 'talks', 'writing', 'cv'];
const ORDER = ['now', 'talks', 'writing', 'cv', 'links', 'terminal'];
const KEY_TO_PANE = { 0: 'now', 1: 'talks', 2: 'writing', 3: 'cv', 4: 'links' };
const PANE_TO_KEY = { now: '0', talks: '1', writing: '2', cv: '3', links: '4' };
const DOUBLE_MS = 600;
const PREFIX_MS = 1000;
const COPY_LABEL_MS = 1500;

// Clicks inside these never zoom: they are interactive, or they are facts
// that clicks.js turns into a command (C1), or they are the reader.
const IGNORE_CLICK = 'a, button, input, textarea, select, label, summary, details, [data-no-zoom], [data-cmd], [data-reader]';

export function setupZoom({ term, panes, reader, reducedMotion, onChange }) {
  const consoleEl = document.querySelector('.console');
  const tabs = document.querySelector('[data-zoomtabs]');
  const statusbar = document.querySelector('[data-statusbar]');
  const palette = document.querySelector('[data-palette]');

  let current = null;
  // Set by a statusbar click so the hash it writes focuses instead of zooming.
  let skipNextHashZoom = false;
  let lastDigit = null;
  let lastDigitAt = 0;
  let prefixAt = 0;
  // The scrubber's #<year> hash, captured the moment a zoom starts from the
  // unzoomed grid so restore() can put it back instead of clearing the hash.
  let yearHashBeforeZoom = null;

  // Per-pane undo records for the content changes zoom makes.
  let undo = null;

  if (!consoleEl || !tabs) {
    return {
      zoom() { return false; },
      restore() { return false; },
      toggle() { return false; },
      current() { return null; },
      openPost() { return Promise.resolve(false); },
      applyHash() { return false; },
    };
  }

  const scrollBehavior = reducedMotion ? 'auto' : 'smooth';

  /* ---------------------------------------------------------------- state */

  function paneEl(id) {
    return document.getElementById(id);
  }

  function isZoomable(id) {
    return ZOOMABLE.includes(id) && Boolean(paneEl(id));
  }

  function setHash(fragment) {
    const base = location.pathname + location.search;
    history.replaceState(null, '', fragment ? `${base}#${fragment}` : base);
  }

  function zoom(id) {
    if (!isZoomable(id)) return false;
    if (current === id) {
      paneEl(id).focus({ preventScroll: true });
      panes.setCurrent(id);
      return true;
    }
    if (current) {
      if (reader.isOpen()) reader.close({ silent: true });
      unzoomDom();
    } else if (/^#20\d\d$/.test(location.hash)) {
      // Starting fresh from the grid with a scrubber year in the hash: keep
      // it so restore() can put it back once this zoom session ends.
      yearHashBeforeZoom = location.hash;
    }

    const pane = paneEl(id);
    current = id;
    consoleEl.classList.add('is-zoomed');
    pane.classList.add('is-zoom');
    undo = expandContent(id, pane);
    renderTabs(id);
    tabs.hidden = false;

    pane.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
    pane.focus({ preventScroll: true });
    panes.setCurrent(id);
    if (!reader.isOpen()) setHash(id);
    notify();
    return true;
  }

  function notify() {
    if (typeof onChange === 'function') onChange(current);
  }

  function restore() {
    if (!current) return false;
    const id = current;
    if (reader.isOpen()) reader.close({ silent: true });
    unzoomDom();
    setHash(yearHashBeforeZoom ? yearHashBeforeZoom.slice(1) : '');
    yearHashBeforeZoom = null;
    panes.focusPane(id);
    notify();
    return true;
  }

  function unzoomDom() {
    const pane = paneEl(current);
    if (undo) undo();
    undo = null;
    if (pane) pane.classList.remove('is-zoom');
    consoleEl.classList.remove('is-zoomed');
    tabs.replaceChildren();
    tabs.hidden = true;
    current = null;
  }

  function toggle(id) {
    if (!id) return false;
    if (current === id) return restore();
    return zoom(id);
  }

  function openPost(slug) {
    if (!zoom('writing')) return Promise.resolve(false);
    return reader.open(slug).then((result) => {
      // Only a real success (=== true, never 'stale' or 'cancelled', which
      // are also truthy) moves the hash to this post.
      if (result === true && current === 'writing') setHash(`writing/${slug}`);
      return result;
    });
  }

  reader.onClose(() => {
    if (current === 'writing') setHash('writing');
  });

  function applyHash() {
    let raw;
    try {
      raw = decodeURIComponent(location.hash.slice(1));
    } catch (err) {
      return false;
    }
    if (!raw) return false;
    if (skipNextHashZoom) {
      // A statusbar click wrote this hash; let panes.js focus it instead.
      skipNextHashZoom = false;
      return false;
    }
    const post = raw.match(/^writing\/([^/]+)$/);
    if (post) {
      openPost(post[1]);
      return true;
    }
    if (isZoomable(raw)) return zoom(raw);
    return false;
  }

  /* ------------------------------------------------------------ tab strip */

  function renderTabs(zoomedId) {
    const frag = document.createDocumentFragment();
    for (const id of ORDER) {
      if (id === zoomedId || !paneEl(id)) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'zoomtabs__tab';
      btn.dataset.pane = id;
      const key = document.createElement('kbd');
      key.className = 'zoomtabs__key';
      key.textContent = PANE_TO_KEY[id] || '$';
      btn.append(key, id);
      frag.appendChild(btn);
    }
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'zoomtabs__tab zoomtabs__restore';
    back.dataset.kind = 'cmd';
    back.dataset.restore = '';
    const backKey = document.createElement('kbd');
    backKey.className = 'zoomtabs__key';
    backKey.textContent = 'esc';
    back.append(backKey, 'grid');
    frag.appendChild(back);

    const hint = document.createElement('span');
    hint.className = 'zoomtabs__hint';
    hint.textContent = 'one pane. esc or q restores the grid';
    frag.appendChild(hint);
    tabs.replaceChildren(frag);
  }

  tabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.zoomtabs__tab');
    const id = tab && tab.dataset.pane;
    restore();
    if (id) panes.focusPane(id);
  });

  /* ------------------------------------------------- pane content changes */

  /** Expand a pane for zoom and return a function that undoes it. */
  function expandContent(id, pane) {
    if (id === 'writing') return expandWriting(pane);
    if (id === 'cv') return expandCv(pane);
    if (id === 'talks') return expandTalks(pane);
    return () => {};
  }

  function expandWriting(pane) {
    const rest = [...pane.querySelectorAll('.row[data-rest][hidden]')];
    for (const row of rest) row.hidden = false;
    return () => {
      for (const row of rest) row.hidden = true;
    };
  }

  function expandCv(pane) {
    const actions = pane.querySelector('[data-cv-zoom-actions]');
    const details = pane.querySelector('details[data-more]');
    const wasOpen = details ? details.open : false;
    if (actions) actions.hidden = false;
    if (details && !wasOpen) {
      // panes.js moves focus into a disclosure when it opens; for a zoom the
      // pane itself is the thing that opened, so focus returns to it after
      // that handler has run (toggle is dispatched after this call returns).
      details.addEventListener('toggle', () => {
        if (current === 'cv') pane.focus({ preventScroll: true });
      }, { once: true });
      details.open = true;
    }
    return () => {
      if (actions) actions.hidden = true;
      if (details) details.open = wasOpen;
    };
  }

  /**
   * Talks: every record in one list, grouped by year, upcoming first, then
   * years descending, archive leads last. Rows are moved, not cloned, so
   * every data hook (data-id, data-cmd, data-year) keeps working for the
   * palette, the scrubber and clicks; the undo puts them back in DOM order.
   */
  function expandTalks(pane) {
    const body = pane.querySelector('[data-pane-body]');
    if (!body) return () => {};
    const rows = [...body.querySelectorAll('.row[data-kind="talk"]')];
    const leadsIntro = body.querySelector('#talks-leads-title + .meta');
    const caveat = body.querySelector('[data-talks-caveat]');
    const details = body.querySelector('details[data-more]');
    const firstList = body.querySelector('ul[data-talks]');
    const moved = [];
    const remember = (node) => moved.push({ node, parent: node.parentNode, next: node.nextSibling });

    const groups = new Map();
    const groupFor = (key) => {
      if (!groups.has(key)) groups.set(key, []);
      return groups.get(key);
    };
    for (const row of rows) {
      const status = row.dataset.status;
      const key = status === 'upcoming' ? 'upcoming' : status === 'lead' ? 'leads' : row.dataset.year || 'undated';
      groupFor(key).push(row);
    }
    const years = [...groups.keys()].filter((k) => /^\d{4}$/.test(k)).sort((a, b) => b.localeCompare(a));
    const order = [];
    if (groups.has('upcoming')) order.push('upcoming');
    order.push(...years);
    if (groups.has('undated')) order.push('undated');
    if (groups.has('leads')) order.push('leads');

    const wrap = document.createElement('div');
    wrap.className = 'zoomtalks';
    wrap.dataset.zoomTalks = '';
    for (const key of order) {
      const section = document.createElement('section');
      section.className = 'zoomtalks__group';
      const h = document.createElement('h3');
      h.className = 'pane__section';
      h.id = `zoomtalks-${key}`;
      h.textContent = key === 'leads' ? 'archive leads' : key;
      section.appendChild(h);
      if (key === 'leads' && leadsIntro) {
        remember(leadsIntro);
        section.appendChild(leadsIntro);
      }
      const ul = document.createElement('ul');
      ul.className = 'rows';
      ul.setAttribute('aria-labelledby', h.id);
      for (const row of groups.get(key)) {
        remember(row);
        ul.appendChild(row);
      }
      section.appendChild(ul);
      wrap.appendChild(section);
    }
    if (caveat) {
      remember(caveat);
      wrap.appendChild(caveat);
    }

    const hidden = [firstList, details].filter(Boolean).filter((el) => !el.hidden);
    for (const el of hidden) el.hidden = true;
    body.insertBefore(wrap, body.firstChild);

    return () => {
      // Reverse document order: each node's original next sibling is
      // already back in place when the node is reinserted.
      for (let i = moved.length - 1; i >= 0; i--) {
        const { node, parent, next } = moved[i];
        parent.insertBefore(node, next && next.parentNode === parent ? next : null);
      }
      for (const el of hidden) el.hidden = false;
      wrap.remove();
    };
  }

  /* ------------------------------------------------------ cv print / copy */

  const cvPane = paneEl('cv');
  const cvFull = cvPane && cvPane.querySelector('[data-cv-full]');
  const cvName = (document.querySelector('.topbar__name') || {}).textContent || 'Payal Singh';
  const printBtn = cvPane && cvPane.querySelector('[data-cv-print]');
  const copyBtn = cvPane && cvPane.querySelector('[data-cv-copy]');

  if (printBtn && cvFull) {
    printBtn.addEventListener('click', () => {
      cvFull.dataset.printName = cvName.trim();
      document.body.classList.add('is-printing-cv');
      const done = () => {
        document.body.classList.remove('is-printing-cv');
        window.removeEventListener('afterprint', done);
      };
      window.addEventListener('afterprint', done);
      window.print();
      // Browsers without afterprint (or a cancelled dialog) still clean up.
      setTimeout(done, 0);
    });
  }

  if (copyBtn && cvFull) {
    const label = copyBtn.textContent;
    let timer = null;
    copyBtn.addEventListener('click', async () => {
      const text = `${cvName.trim()}\n\n${cvFull.innerText.trim()}\n`;
      const lines = text.split('\n').length;
      try {
        if (!navigator.clipboard) throw new Error('clipboard unavailable');
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'copied';
        term.print(`copied cv as text, ${lines} lines`, { className: 'scrollback__line--dim' });
      } catch (err) {
        copyBtn.textContent = 'copy failed';
        term.print(`copy failed: ${err.message}. Select the cv and copy it, or download the pdf.`, { className: 'scrollback__line--err' });
      }
      clearTimeout(timer);
      timer = setTimeout(() => { copyBtn.textContent = label; }, COPY_LABEL_MS);
    });
  }

  /* ---------------------------------------------------------------- clicks */

  consoleEl.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0) return;
    const pane = e.target.closest('.pane');
    if (!pane || !isZoomable(pane.id)) return;

    // A zoomed writing pane opens its posts in the reader (Z4).
    if (pane.id === 'writing' && current === 'writing') {
      const link = e.target.closest('a[data-post]');
      if (link) {
        e.preventDefault();
        openPost(link.dataset.post);
        return;
      }
    }

    if (e.target.closest(IGNORE_CLICK)) return;
    const selection = window.getSelection();
    if (selection && selection.toString()) return; // the click ended a text selection

    if (e.target.closest('.pane__title')) {
      toggle(pane.id);
      return;
    }
    if (current !== pane.id) zoom(pane.id);
  });

  // Statusbar pane items. With nothing zoomed the link keeps its native
  // behaviour: the browser writes the hash, the chain runs, and the pane is
  // focused as in phase 1. Only the zoom step is skipped for that one hash
  // change, so a statusbar click never zooms while an external deep link
  // still does (Z5). While a pane is zoomed the click switches or restores
  // the zoom instead, which needs preventDefault.
  if (statusbar) {
    statusbar.addEventListener('click', (e) => {
      const item = e.target.closest('a[data-pane]');
      if (!item || item.hasAttribute('data-help')) return;
      const id = item.dataset.pane;
      if (current) {
        e.preventDefault();
        if (current !== id) {
          if (isZoomable(id)) zoom(id);
          else {
            restore();
            panes.focusPane(id);
          }
          return;
        }
        panes.focusPane(id);
        return;
      }
      skipNextHashZoom = true;
      if (location.hash === `#${id}`) {
        // Same hash: no hashchange fires, so focus the pane here.
        skipNextHashZoom = false;
        e.preventDefault();
        panes.focusPane(id);
      }
    });
  }

  /* ------------------------------------------------------------------ keys */

  function dialogOpen() {
    return palette && !palette.hidden;
  }

  function focusedPaneId() {
    const active = document.activeElement;
    const pane = active && active.closest ? active.closest('.pane') : null;
    if (pane && isZoomable(pane.id)) return pane.id;
    const marked = document.querySelector('.pane.is-active');
    return marked && isZoomable(marked.id) ? marked.id : null;
  }

  function visiblePanes() {
    return ORDER.filter((id) => {
      const el = paneEl(id);
      return el && getComputedStyle(el).display !== 'none';
    });
  }

  function movePane(step) {
    const list = visiblePanes();
    if (list.length === 0) return;
    const active = document.activeElement;
    const pane = active && active.closest ? active.closest('.pane') : null;
    const marked = document.querySelector('.pane.is-active');
    const fromId = (pane && pane.id) || (marked && marked.id) || null;
    const idx = list.indexOf(fromId);
    const next = idx === -1 ? (step > 0 ? 0 : list.length - 1) : (idx + step + list.length) % list.length;
    panes.focusPane(list[next]);
  }

  // Esc or q restores the grid / closes the reader. Shared so Escape (always
  // active) and q (a gated single-character shortcut, see below) do the
  // same thing.
  function restoreOrCloseReader() {
    // The which-key tray, if open, is closed by palette.js's own
    // capture-phase keydown listener, which stops propagation for Escape
    // and q — this handler never runs for the keypress that closes it.
    if (reader.isOpen()) {
      reader.close();
      return true;
    }
    if (current) {
      restore();
      return true;
    }
    return false;
  }

  document.addEventListener('keydown', (e) => {
    if (dialogOpen()) return;
    const editable = isEditable(e.target);
    const now = Date.now();

    // Ctrl+B prefix, then z within a second. Alias only; nothing else is
    // bound under the prefix, and it is not read inside fields. A modified
    // chord, so outside WCAG 2.1.4's scope -- not run through the
    // shortcuts.js gate below.
    if (e.ctrlKey && !e.altKey && !e.metaKey && !editable && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      prefixAt = now;
      return;
    }
    if (prefixAt) {
      const within = now - prefixAt <= PREFIX_MS;
      prefixAt = 0;
      if (within && !editable && e.key === 'z' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggle(focusedPaneId());
        return;
      }
    }

    if (editable || e.altKey || e.ctrlKey || e.metaKey) return;

    // Escape: a functional key, not a character shortcut, so it stays
    // active regardless of the keys on/off switch and the interactive-
    // target check below -- it is the one thing that keeps working when
    // keys are off (besides the palette button and the statusbar's links).
    if (e.key === 'Escape') {
      if (restoreOrCloseReader()) e.preventDefault();
      return;
    }

    // Enter only ever acts when the target is the pane element itself
    // (never a link or button inside it), so it already can't steal a key
    // from an interactive element; not run through the gate below either.
    if (e.key === 'Enter') {
      if (e.target instanceof Element && e.target.classList.contains('pane') && isZoomable(e.target.id)) {
        e.preventDefault();
        toggle(e.target.id);
      }
      return;
    }

    // Everything past this point is a bare single-character shortcut (z, q,
    // j, k, :, the pane digits): WCAG 2.1.4 gate. Fires only when the
    // visitor has not turned keys off and focus is the body or a
    // non-interactive part of a pane.
    if (!shortcutsEnabled() || !isShortcutTarget(e.target)) return;

    switch (e.key) {
      case 'z':
        e.preventDefault();
        toggle(focusedPaneId());
        return;
      case 'q':
        if (restoreOrCloseReader()) e.preventDefault();
        return;
      case 'j':
        e.preventDefault();
        movePane(1);
        return;
      case 'k':
        e.preventDefault();
        movePane(-1);
        return;
      case ':':
        e.preventDefault();
        panes.focusTerminal();
        return;
      default:
        break;
    }

    if (!Object.prototype.hasOwnProperty.call(KEY_TO_PANE, e.key)) return;
    if (e.repeat) return;
    const id = KEY_TO_PANE[e.key];
    // panes.js has already focused the pane on this same keydown.
    if (current) {
      lastDigit = null;
      if (id === current) restore();
      else if (isZoomable(id)) zoom(id);
      else {
        restore();
        panes.focusPane(id);
      }
      return;
    }
    if (lastDigit === e.key && now - lastDigitAt <= DOUBLE_MS) {
      lastDigit = null;
      if (isZoomable(id)) zoom(id);
      return;
    }
    lastDigit = e.key;
    lastDigitAt = now;
  });

  return {
    zoom,
    restore,
    toggle,
    current: () => current,
    openPost,
    applyHash,
  };
}

function isEditable(el) {
  if (!el || el === document || el === window) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}
