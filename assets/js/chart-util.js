/**
 * chart-util.js: the small shared helpers every phase-3 chart needs.
 * Owned by the ARCHITECT and finished. Frozen: no feature worker edits
 * this file. If a worker needs something here that is missing, it goes
 * in that worker's OPEN ISSUES, not in this file.
 *
 * Nothing here touches the network, storage, or a timer. Every function
 * is synchronous and side-effect free except where the name says
 * otherwise (showTip, hideTip, emit, setHashPart).
 *
 * Contents
 *   el, mark, esc            DOM construction, always textContent
 *   TOPICS, topicShape       the six topics, in data/topics.json order
 *   readInlineJson           the inline <script type="application/json"> blocks
 *   dateOf, iso, pct, pad2   date maths shared by three charts
 *   showTip/hideTip/bindTip  the one shared tooltip
 *   roving                   roving tabindex plus arrows, Home, End
 *   hitRow                   point a chart mark at its record row
 *   emit, on                 the cross-module event bus
 *   hashParts, firstHashPart, setHashPart, getHashPart   the shared hash grammar
 */

/* ------------------------------------------------------------------ DOM */

/**
 * Build an element. `text` sets textContent; there is no `html` option
 * and no innerHTML anywhere in this file, so no string from a data file
 * or the DOM is ever parsed as markup.
 *
 * @param {string} tag
 * @param {Object<string, string|number|boolean|null|Function>} [attrs]
 *   `class` sets className, `text` sets textContent, a key starting with
 *   `on` adds the matching event listener, anything else is setAttribute.
 *   null, undefined and false are skipped; true sets an empty attribute.
 * @param {Node|string|Array<Node|string|null>} [children]
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = String(v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

/** The six topics, in data/topics.json order. Shape is never optional. */
export const TOPICS = [
  { id: 'postgres', label: 'postgres', shape: 'circle' },
  { id: 'reliability', label: 'reliability', shape: 'square' },
  { id: 'security', label: 'security', shape: 'diamond' },
  { id: 'platform', label: 'platform', shape: 'hexagon' },
  { id: 'ai', label: 'ai', shape: 'triangle' },
  { id: 'other', label: 'other', shape: 'ring' },
];

const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

/** The topic record for an id, falling back to `other`. */
export function topicOf(id) {
  return TOPIC_BY_ID.get(id) || TOPIC_BY_ID.get('other');
}

/** The shape class for a topic id: `mark--circle`, `mark--square`, ... */
export function topicShape(id) {
  return `mark--${topicOf(id).shape}`;
}

/** The label for a topic id, for a tooltip or an aria-label. */
export function topicLabel(id) {
  return topicOf(id).label;
}

/**
 * A decorative topic mark: colour plus shape, hidden from assistive tech
 * because the text beside it always says the same thing.
 */
export function mark(topic, extraClass = '') {
  return el('span', {
    class: `mark ${topicShape(topic)}${extraClass ? ` ${extraClass}` : ''}`,
    'data-topic': topic,
    'aria-hidden': 'true',
  });
}

/** Read one of the inline <script type="application/json"> blocks. */
export function readInlineJson(id, fallback = null) {
  const node = document.getElementById(id);
  if (!node) return fallback;
  try {
    return JSON.parse(node.textContent);
  } catch (err) {
    console.error(`chart-util: could not parse #${id}`, err);
    return fallback;
  }
}

/* ----------------------------------------------------------------- dates */

export const pad2 = (n) => String(n).padStart(2, '0');

/** Parse a YYYY-MM-DD or YYYY-MM or YYYY string at local noon, so a
 *  timezone offset can never move a date across a day boundary. */
export function dateOf(s) {
  const t = String(s);
  const full = t.length === 4 ? `${t}-01-01` : t.length === 7 ? `${t}-01` : t;
  return new Date(`${full}T12:00:00`);
}

/** YYYY-MM-DD for a Date, in local time. */
export function iso(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Position of `d` on an axis from `from` to `to`, as a 0 to 100 percent. */
export function pct(d, from, to) {
  return ((d - from) / (to - from)) * 100;
}

/** Whole years between two Dates, as a float. */
export const MS_YEAR = 365.25 * 24 * 3600 * 1000;
export function yearsBetween(a, b) {
  return (b - a) / MS_YEAR;
}

/* --------------------------------------------------------------- tooltip */

let tipEl = null;
let tipTarget = null;

function tip() {
  if (tipEl) return tipEl;
  tipEl = el('div', { class: 'tip', role: 'presentation', 'aria-hidden': 'true', hidden: true });
  document.body.appendChild(tipEl);
  // Scroll follows the anchor rather than dismissing the tooltip. Focusing a
  // chart control scrolls it into view, and this listener is in the capture
  // phase, so hiding here meant a calendar cell inside the plot's horizontal
  // scroller could never show its tooltip on focus: showTip ran, the scroll
  // that the focus caused fired straight after it, and the tooltip went back
  // to hidden with its text already written. The tooltip is dismissed only
  // once its anchor has actually left the viewport.
  window.addEventListener('scroll', followTip, { capture: true, passive: true });
  window.addEventListener('resize', followTip, { passive: true });
  return tipEl;
}

/** Re-anchor a visible tooltip, or drop it once its anchor is off screen. */
function followTip() {
  if (!tipEl || tipEl.hidden || !tipTarget) return;
  if (!tipTarget.isConnected) { hideTip(); return; }
  const r = tipTarget.getBoundingClientRect();
  const onScreen = r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
  if (!onScreen) { hideTip(); return; }
  positionTip(tipTarget);
}

/** Place the tooltip beside `target`, clamped into the viewport. */
function positionTip(target) {
  const node = tipEl;
  const r = target.getBoundingClientRect();
  const w = node.offsetWidth;
  const h = node.offsetHeight;
  let x = r.left + r.width / 2 - w / 2;
  x = Math.max(8, Math.min(x, window.innerWidth - w - 8));
  let y = r.bottom + 8;
  if (y + h > window.innerHeight - 8) y = r.top - h - 8;
  node.style.left = `${x}px`;
  node.style.top = `${Math.max(8, y)}px`;
}

/**
 * Show the shared tooltip beside `target`.
 *
 * @param {Element} target
 * @param {Array<{class: string, text: string}>} lines  one paragraph each;
 *   the text is set with textContent, never parsed as markup.
 * @param {string} [topic]  sets the tooltip's left rule to the topic hue.
 */
export function showTip(target, lines, topic) {
  const node = tip();
  node.textContent = '';
  for (const line of lines) {
    if (!line || !line.text) continue;
    node.appendChild(el('p', { class: line.class || 'tip__meta', text: line.text }));
  }
  if (topic) node.setAttribute('data-topic', topic);
  else node.removeAttribute('data-topic');
  node.hidden = false;
  tipTarget = target;
  positionTip(target);
}

/** Hide the tooltip. With a target, only if that target still owns it. */
export function hideTip(target) {
  if (!tipEl) return;
  if (target && tipTarget !== target) return;
  tipEl.hidden = true;
  tipTarget = null;
}

/**
 * Wire hover and focus on a chart control to the shared tooltip.
 * MB13: on a touch device the first tap shows the tooltip and the second
 * activates, which falls out of pointerdown for `touch` plus the caller's
 * own click handler, so nothing here is hover-only.
 *
 * @param {Element} node
 * @param {() => Array<{class: string, text: string}>} build
 * @param {string} [topic]
 */
export function bindTip(node, build, topic) {
  node.addEventListener('pointerenter', () => showTip(node, build(), topic));
  node.addEventListener('pointerleave', () => hideTip(node));
  node.addEventListener('focus', () => showTip(node, build(), topic));
  node.addEventListener('blur', () => hideTip(node));
}

/* -------------------------------------------------------- roving tabindex */

/**
 * Roving tabindex over an ordered list of chart controls: one tab stop,
 * arrows walk, Home and End jump. Arrow keys, Home and End are functional
 * keys, outside WCAG 2.1.4, and they only fire from a focused control in
 * this list, so they never go through shortcuts.js.
 *
 * @param {Element[]} nodes  in reading order
 * @returns {{focusAt(i: number): void, nodes: Element[]}}
 */
export function roving(nodes) {
  nodes.forEach((n, i) => { n.tabIndex = i === 0 ? 0 : -1; });

  function focusAt(i) {
    if (!nodes.length) return;
    const j = Math.max(0, Math.min(nodes.length - 1, i));
    for (const n of nodes) n.tabIndex = -1;
    nodes[j].tabIndex = 0;
    nodes[j].focus();
  }

  for (const node of nodes) {
    node.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const i = nodes.indexOf(node);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); focusAt((i + 1) % nodes.length); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); focusAt((i - 1 + nodes.length) % nodes.length); }
      else if (e.key === 'Home') { e.preventDefault(); focusAt(0); }
      else if (e.key === 'End') { e.preventDefault(); focusAt(nodes.length - 1); }
    });
  }

  return { focusAt, nodes };
}

/* ------------------------------------------------------------------ hits */

/**
 * Point a chart mark at its record row: clear the previous hit in that
 * pane, mark this row, tell mobile.js to open any closed disclosure the
 * row sits inside (via the `console:hit` event), then scroll it into view.
 *
 * @param {string} paneId  'talks' | 'writing' | 'cv'
 * @param {Element|null} row
 * @param {Element|null} [markEl]  the control that was activated
 * @param {boolean} [reducedMotion]
 * @returns {boolean} whether a row was found
 */
export function hitRow(paneId, row, markEl = null, reducedMotion = false) {
  const pane = document.getElementById(paneId);
  if (!pane) return false;
  for (const r of pane.querySelectorAll('.row--hit')) r.classList.remove('row--hit');
  for (const m of pane.querySelectorAll('.chart-mark[aria-current]')) m.removeAttribute('aria-current');
  if (!row) return false;
  row.classList.add('row--hit');
  if (markEl) markEl.setAttribute('aria-current', 'true');
  emit('console:hit', { pane: paneId, el: row });
  row.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
  return true;
}

/* ------------------------------------------------------------- event bus */

/**
 * The cross-module bus. Modules that must not import each other talk
 * through these three events on `document`:
 *
 *   console:topic  { topic: string|null }        topics.js, after applying
 *   console:asof   { year: number, past: bool }  scrubber.js, after applying
 *   console:hit    { pane: string, el: Element } a chart, before scrolling
 *
 * Listeners must be attached before the emitter's setup runs; main.js
 * fixes that order (topics, charts, mobile, then scrubber).
 */
export function emit(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

/** Subscribe. Returns an unsubscribe function. */
export function on(name, fn) {
  document.addEventListener(name, fn);
  return () => document.removeEventListener(name, fn);
}

/* ------------------------------------------------------------------ hash */

/**
 * The landing hash grammar. Phase 1 and 2 used one segment: `#cv`,
 * `#writing/<slug>`, `#2018`, `#links`. Phase 3 composes a year with a
 * topic, so segments are joined with `&`:
 *
 *   #cv                  zoom the cv pane
 *   #2018                the console as of 2018
 *   #topic=security      the security filter
 *   #2018&topic=security both at once
 *
 * The first segment stays exactly what phase 2 wrote, so panes.js,
 * zoom.js and scrubber.js keep reading it with firstHashPart().
 */
export function hashParts() {
  return location.hash.slice(1).split('&').filter(Boolean);
}

/** The leading segment: the pane, post or year phase 2 already understood. */
export function firstHashPart() {
  return decodeURIComponent(hashParts()[0] || '');
}

/** The value of a `key=value` segment, or null. */
export function getHashPart(key) {
  const prefix = `${key}=`;
  for (const part of hashParts()) {
    if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length));
  }
  return null;
}

/**
 * Set or remove one `key=value` segment, keeping every other segment and
 * its order. replaceState, so the hash never adds a history entry and
 * never fires hashchange.
 */
export function setHashPart(key, value) {
  const prefix = `${key}=`;
  const parts = hashParts().filter((p) => !p.startsWith(prefix));
  if (value) parts.push(`${key}=${encodeURIComponent(value)}`);
  const hash = parts.join('&');
  const url = `${location.pathname}${location.search}${hash ? `#${hash}` : ''}`;
  history.replaceState(null, '', url);
}
