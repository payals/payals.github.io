/**
 * palette.js: the fuzzy palette (P1 to P3) and the which-key tray.
 *
 * Contract (scratchpad/phase2/PLAN.md, module table):
 *   setupPalette({ term, zoom, panes, reducedMotion, posts, talks }) ->
 *     { open(query), close(), isOpen(), toggleKeys(), closeKeys(), search(query) }
 *
 * The index is built once from the DOM at setup: commands (term.registry),
 * posts (#writing rows plus the inline posts data: subtitle, tags, series),
 * talks (#talks rows plus the inline talks data: venue, date, status,
 * evidence), now facts, cv headline, roles, education and every line of the
 * full cv, links, and pane jumps. Every entry remembers the pane element it
 * points at, so the selected result tints that row behind the dialog
 * (.is-hit), opening a collapsed disclosure first when the row sits inside
 * one and closing it again when the palette closes.
 *
 * Matching: every query token must match some field. Substring matches score
 * highest with a word-start bonus; subsequence matches apply to titles only.
 * A type word (talks, posts, cv, links, commands, now) filters the kind and a
 * year or keyword narrows it, so "talks 2018" and "postgres posts" resolve.
 * Enter on no match closes the palette and runs the text as a command.
 *
 * Keys: `/` outside a field and Cmd+K or Ctrl+K anywhere open it. Inside:
 * arrows or Ctrl+N and Ctrl+P move, Enter acts, Cmd+Enter or Ctrl+Enter
 * prints the record into the terminal instead, Tab stays in the dialog,
 * Escape clears the query and then closes. Focus returns to the opener.
 *
 * `/` is a bare single-character shortcut (WCAG 2.1.4), so besides the
 * dialog-open check it also goes through shortcuts.js's isShortcutTarget()
 * (never fires from a link, button, form control or other interactive
 * element) and shortcutsEnabled() (the visitor's keys on/off switch).
 * Cmd/Ctrl+K is a modified chord, outside 2.1.4's scope, and always works.
 * The which-key tray carries a "keys: on/off" toggle button that calls
 * setShortcutsEnabled(); the statusbar hint reflects the current state.
 */

import { registerPhase2Commands } from './commands.js';
import { isShortcutTarget, shortcutsEnabled, setShortcutsEnabled, onShortcutsChange } from './shortcuts.js';

const MAX_RESULTS = 30;
const KIND_LABEL = { now: 'now', talk: 'talk', post: 'post', cv: 'cv', link: 'link', cmd: 'cmd', pane: 'pane', topic: 'topic' };
const KIND_PLURAL = { now: 'now facts', talk: 'talks', post: 'posts', cv: 'cv lines', link: 'links', cmd: 'commands', pane: 'panes', topic: 'topics' };
const KIND_WORDS = {
  talk: ['talk', 'talks', 'speaking', 'speak', 'spoke', 'conference', 'conferences', 'session', 'sessions', 'presentation'],
  post: ['post', 'posts', 'writing', 'blog', 'article', 'articles', 'essay', 'essays', 'wrote'],
  cv: ['cv', 'resume', 'role', 'roles', 'career', 'experience', 'education'],
  link: ['link', 'links', 'profile', 'profiles'],
  cmd: ['command', 'commands', 'cmd', 'run'],
  now: ['now', 'currently', 'today'],
  topic: ['topic', 'topics', 'filter', 'filters'],
};
const FILLER = new Set(['about', 'on', 'in', 'from', 'the', 'a', 'an', 'show', 'me', 'all', 'of', 'for', 'with', 'what', 'which', 'any', 'list', 'find', 'search', 'her', 'your', 'she', 'you', 'is', 'are', 'did', 'does', 'do', 'to', 'and', 'at']);
const PANE_OF_KIND = { now: 'now', talk: 'talks', post: 'writing', cv: 'cv', link: 'links', cmd: 'terminal' };
const BROWSE_ORDER = ['now', 'talk', 'post', 'cv', 'topic', 'link', 'pane', 'cmd'];
const BROWSE_PER_KIND = 4;
const DEFAULT_RANK = { now: 60, talk: 50, post: 50, cv: 30, topic: 25, link: 20, cmd: 15, pane: 10 };

export function setupPalette({ term, zoom, panes, reducedMotion, posts, talks }) {
  const root = document.querySelector('[data-palette]');
  const input = document.querySelector('[data-palette-input]');
  const results = document.querySelector('[data-palette-results]');
  const count = document.querySelector('[data-palette-count]');
  const tray = document.querySelector('[data-keytray]');
  const hint = document.querySelector('[data-hint]');
  const openers = [...document.querySelectorAll('[data-open-palette]')];

  if (!root || !input || !results || !count) {
    return { open() { return false; }, close() { return false; }, isOpen() { return false; }, toggleKeys() { return false; }, closeKeys() { return false; }, search() { return []; } };
  }

  const api = { open, close, isOpen, toggleKeys, closeKeys, search };

  // Commands that need the palette, zoom or panes are registered here so the
  // index below sees them. The plain-phrase resolver falls back to search().
  registerPhase2Commands({ registry: term.registry, palette: api, zoom, panes, search });

  const INDEX = buildIndex({ term, posts, talks });

  let items = [];
  let sel = 0;
  let restoreFocus = null;
  let hitEl = null;
  let openedDetails = [];
  let scrolledBodies = new Map();
  let lastMouse = { x: -1, y: -1 };

  // ---- dialog -----------------------------------------------------------

  function isOpen() {
    return !root.hidden;
  }

  function open(query = '') {
    closeKeys();
    if (!root.hidden) {
      if (query) { input.value = query; sel = 0; render(); }
      input.focus();
      return true;
    }
    restoreFocus = document.activeElement;
    root.hidden = false;
    input.value = query || '';
    sel = 0;
    render();
    input.focus();
    if (query) input.select();
    return true;
  }

  /** Close. With keep=false (Escape, click outside) the panes scroll back to where they were. */
  function close(keep = false) {
    if (root.hidden) return false;
    root.hidden = true;
    clearHit();
    for (const d of openedDetails) d.open = false;
    openedDetails = [];
    if (!keep) for (const [body, top] of scrolledBodies) body.scrollTop = top;
    scrolledBodies = new Map();
    const target = restoreFocus;
    restoreFocus = null;
    if (target && target !== document.body && document.contains(target) && typeof target.focus === 'function' && !target.hidden) {
      target.focus({ preventScroll: true });
    } else {
      const main = document.querySelector('.console');
      if (main) main.focus({ preventScroll: true });
    }
    return true;
  }

  // ---- results ----------------------------------------------------------

  function render() {
    const q = input.value;
    const found = search(q);
    items = found.slice(0, MAX_RESULTS);
    results.replaceChildren();
    if (items.length === 0) {
      const empty = h('li', { class: 'palette__empty', role: 'presentation' });
      const shown = q.trim();
      empty.append(
        shown ? `no match for "${shown}". ` : 'nothing to show. ',
        h('kbd', { class: 'kbd', text: 'enter' }),
        shown ? ' runs it as a command. try a year like ' : ' runs it as a command. try a year like ',
        h('code', { text: '2018' }), ', a tag like ', h('code', { text: 'agents' }), ', or ', h('code', { text: 'talks scale' }), '.',
      );
      results.append(empty);
      input.removeAttribute('aria-activedescendant');
      count.textContent = shown ? 'no match' : '';
      clearHit();
      return;
    }

    // Group by kind, groups ordered by their best hit, options in score order.
    const groups = [];
    const byKind = new Map();
    for (const r of items) {
      if (!byKind.has(r.e.kind)) { byKind.set(r.e.kind, []); groups.push(r.e.kind); }
      byKind.get(r.e.kind).push(r);
    }
    const ordered = [];
    for (const kind of groups) {
      const head = h('li', { class: 'palette__group', role: 'presentation', 'data-kind': kind === 'pane' ? 'cmd' : kind });
      head.append(h('span', { class: 'palette__badge', text: KIND_LABEL[kind] }), h('span', { class: 'palette__groupname', text: KIND_PLURAL[kind] }));
      results.append(head);
      for (const r of byKind.get(kind)) {
        const i = ordered.length;
        ordered.push(r);
        const li = h('li', { class: 'palette__r', role: 'option', id: `pr-${i}`, 'data-kind': kind === 'pane' ? 'cmd' : kind, 'aria-selected': 'false' });
        li.addEventListener('click', () => { sel = i; execute(r.e, false); });
        li.addEventListener('mousemove', (ev) => {
          if (ev.clientX === lastMouse.x && ev.clientY === lastMouse.y) return;
          lastMouse = { x: ev.clientX, y: ev.clientY };
          if (sel !== i) { sel = i; select(); }
        });
        if (r.e.topic) li.dataset.topic = r.e.topic;
        li.append(h('span', { class: 'palette__badge', text: KIND_LABEL[kind] }));
        const title = h('span', { class: 'palette__title' });
        // A topic entry carries its shape as well as its hue and its word,
        // so the three encodings of K3a hold inside the palette too.
        if (r.e.shape) title.append(h('span', { class: `mark mark--${r.e.shape}`, 'data-topic': r.e.topic, 'aria-hidden': 'true' }));
        title.append(markTitle(r.e.title, r.pos));
        li.append(title);
        const meta = h('span', { class: 'palette__meta', text: r.e.meta || '' });
        if (r.e.year) meta.dataset.year = r.e.year;
        li.append(meta);
        if (r.e.sub) li.append(h('span', { class: 'palette__sub', text: r.e.sub }));
        results.append(li);
      }
    }
    items = ordered;
    sel = Math.min(sel, items.length - 1);
    const kindFilter = parseQuery(q).kind;
    count.textContent = kindFilter
      ? `${items.length} ${KIND_PLURAL[kindFilter]}`
      : `${items.length} result${items.length === 1 ? '' : 's'}`;
    select();
  }

  function select() {
    const lis = results.querySelectorAll('.palette__r');
    lis.forEach((li, i) => li.setAttribute('aria-selected', i === sel ? 'true' : 'false'));
    const li = lis[sel];
    if (!li) return;
    input.setAttribute('aria-activedescendant', li.id);
    li.scrollIntoView({ block: 'nearest' });
    tint(items[sel].e);
  }

  /** Row tint behind the palette: the selected result's pane row. */
  function tint(e) {
    clearHit();
    const el = e.el;
    if (!el || !document.contains(el)) return;
    const details = el.closest('details');
    if (details && !details.open) {
      // panes.js moves focus into a disclosure when it opens (its own
      // "show more" focus management); the toggle event is queued, so take
      // focus back once it has run.
      details.addEventListener('toggle', () => { if (isOpen()) input.focus({ preventScroll: true }); }, { once: true });
      details.open = true;
      openedDetails.push(details);
    }
    el.classList.add('is-hit');
    hitEl = el;
    const body = el.closest('.pane__body');
    if (body && window.matchMedia('(min-width: 1024px)').matches) scrollWithin(body, el);
  }

  function clearHit() {
    if (hitEl) hitEl.classList.remove('is-hit');
    hitEl = null;
  }

  function scrollWithin(container, el) {
    const c = container.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.top < c.top || r.bottom > c.bottom) {
      if (!scrolledBodies.has(container)) scrolledBodies.set(container, container.scrollTop);
      const top = container.scrollTop + (r.top - c.top) - c.height / 3;
      if (reducedMotion || typeof container.scrollTo !== 'function') container.scrollTop = top;
      else container.scrollTo({ top, behavior: 'smooth' });
    }
  }

  // ---- actions ----------------------------------------------------------

  function execute(e, toTerminal) {
    close(true);
    if (toTerminal && e.print) {
      panes.focusTerminal();
      term.run(e.print);
      return;
    }
    switch (e.kind) {
      case 'cmd':
        panes.focusTerminal();
        term.run(e.cmd);
        return;
      case 'pane':
        if (e.zoom) { if (!zoom.zoom(e.pane)) panes.focusPane(e.pane); } else panes.focusPane(e.pane);
        return;
      case 'now':
      case 'talk':
        panes.focusTerminal();
        term.run(e.print);
        return;
      case 'post':
        openPost(e);
        return;
      case 'cv':
        if (e.href) { follow(e.href); return; }
        revealCv(e);
        return;
      case 'link':
        follow(e.href);
        return;
      case 'topic':
        applyTopic(e);
        return;
      default:
        return;
    }
  }

  function openPost(e) {
    let result;
    try {
      result = zoom.openPost(e.slug);
    } catch (err) {
      result = false;
    }
    Promise.resolve(result).then((ok) => {
      if (ok === false) follow(e.href);
    }).catch(() => follow(e.href));
  }

  /** A cv line: zoom the cv pane, open the full cv when the line is inside it, flash the line. */
  function revealCv(e) {
    if (!zoom.zoom('cv')) panes.focusPane('cv');
    const el = e.el;
    if (!el) return;
    const details = el.closest('details');
    if (details && !details.open) details.open = true;
    el.classList.add('is-hit');
    el.scrollIntoView({ block: 'center', behavior: 'auto' });
    setTimeout(() => el.classList.remove('is-hit'), 2500);
  }

  /**
   * A topic entry (T3): run the same `filter <id>` the terminal runs, so
   * topics.js stays the only owner of the filter state, the hash and the
   * announcement. Focus lands on the matching legend chip rather than the
   * prompt, because the answer is the page lighting up, not a printed line,
   * and a phone must not get the keyboard here (MB12).
   */
  function applyTopic(e) {
    term.run(`filter ${e.topic}`);
    const chip = document.querySelector(`[data-legend-btn="${e.topic}"]`);
    if (chip) chip.focus();
  }

  function follow(href) {
    if (!href) return;
    if (/^https?:/.test(href)) window.open(href, '_blank', 'noopener');
    else if (href.startsWith('#')) { location.hash = href; }
    else location.href = href;
  }

  /** Enter with no match: the query becomes a terminal command. */
  function fallThrough(q) {
    close(true);
    panes.focusTerminal();
    term.run(q);
  }

  // ---- search -----------------------------------------------------------

  function search(query) {
    const { kind, tokens } = parseQuery(query);
    if (tokens.length === 0 && !kind) return browse();
    const out = [];
    for (const e of INDEX) {
      // A kind word filters to that kind; the pane jump for that kind rides
      // along so "zoom cv" and "talks" both offer the pane.
      if (kind && e.kind !== kind && !(e.kind === 'pane' && e.pane === PANE_OF_KIND[kind])) continue;
      if (tokens.length === 0) {
        if (!e.deep) out.push({ e, score: rank(e), pos: [] });
        continue;
      }
      let total = 0;
      let pos = [];
      let ok = true;
      for (const tok of tokens) {
        const inTitle = fuzzy(tok, e.title, true);
        const inSub = e.sub ? fuzzy(tok, e.sub, false) : null;
        const inKw = fuzzy(tok, e.kw, false);
        const best = Math.max(inTitle ? inTitle.score : -1, inSub ? inSub.score * 0.6 : -1, inKw ? inKw.score * 0.7 : -1);
        if (best < 0) { ok = false; break; }
        total += best;
        if (inTitle && inTitle.score >= best) pos = pos.concat(inTitle.pos);
      }
      if (!ok) continue;
      // Lines from the full cv rank below the rows a visitor can see.
      out.push({ e, score: (e.deep ? total * 0.5 - 8 : total) + rank(e) * 0.15, pos: [...new Set(pos)].sort((a, b) => a - b) });
    }
    out.sort((a, b) => b.score - a.score);
    return out;
  }

  /** Empty query: a short tour, a few of each kind in pane order. */
  function browse() {
    const out = [];
    for (const kind of BROWSE_ORDER) {
      let n = 0;
      for (const e of INDEX) {
        if (e.kind !== kind || e.deep) continue;
        out.push({ e, score: 0, pos: [] });
        if (++n >= BROWSE_PER_KIND) break;
      }
    }
    return out;
  }

  function parseQuery(query) {
    const raw = query.toLowerCase().replace(/[?!.,;:]/g, ' ').trim().split(/\s+/).filter(Boolean);
    let kind = null;
    const tokens = [];
    for (const t of raw) {
      const k = kind ? null : kindOfWord(t);
      if (k) { kind = k; continue; }
      if (FILLER.has(t)) continue;
      tokens.push(t);
    }
    return { kind, tokens };
  }

  // ---- keys -------------------------------------------------------------

  input.addEventListener('input', () => { sel = 0; render(); });

  input.addEventListener('keydown', (e) => {
    const n = items.length;
    if (e.key === 'ArrowDown' || (e.ctrlKey && (e.key === 'n' || e.key === 'j'))) {
      e.preventDefault();
      if (n) { sel = (sel + 1) % n; select(); }
    } else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
      e.preventDefault();
      if (n) { sel = (sel - 1 + n) % n; select(); }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[sel]) execute(items[sel].e, e.metaKey || e.ctrlKey);
      else if (input.value.trim()) fallThrough(input.value.trim());
    } else if (e.key === 'Home' && !input.value) {
      e.preventDefault();
      sel = 0; select();
    } else if (e.key === 'End' && !input.value) {
      e.preventDefault();
      sel = Math.max(0, n - 1); select();
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      if (n) { sel = Math.min(n - 1, sel + 8); select(); }
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      if (n) { sel = Math.max(0, sel - 8); select(); }
    }
  });

  // Dialog-level keys: Escape clears then closes; Tab stays inside (the
  // input is the only focusable control, so it keeps focus).
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (input.value) { input.value = ''; sel = 0; render(); } else close();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      input.focus();
    }
  });

  root.addEventListener('mousedown', (e) => {
    if (e.target === root) { e.preventDefault(); close(); }
  });

  // Openers. `/` only when no field has focus; Cmd+K / Ctrl+K anywhere.
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (isOpen()) close(); else open();
      return;
    }
    if (isOpen()) return;
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && shortcutsEnabled() && isShortcutTarget(e.target)) {
      e.preventDefault();
      open();
    }
  }, { capture: true });

  // Both openers ship hidden; the statusbar item's label span gives way to
  // the key alone below 480px (its aria-label keeps the name).
  for (const b of openers) {
    b.hidden = false;
    b.addEventListener('click', (e) => {
      e.preventDefault();
      open();
    });
  }

  // The base hint text ships in the markup ("keys work while the prompt is
  // not focused"); / to search is appended once. Both states are computed
  // up front so toggling never re-reads (and re-appends to) live text.
  const HINT_ON = hint ? `${hint.textContent.trim()} · / to search` : '';
  const HINT_OFF = 'keys are off · use the search button or type "keys on"';

  function refreshHint() {
    if (!hint) return;
    hint.textContent = shortcutsEnabled() ? HINT_ON : HINT_OFF;
  }
  refreshHint();
  onShortcutsChange(refreshHint);

  // ---- which-key tray ---------------------------------------------------

  function toggleKeys() {
    if (!tray) return false;
    if (tray.hidden) {
      if (isOpen()) close();
      tray.hidden = false;
    } else {
      tray.hidden = true;
    }
    return true;
  }

  function closeKeys() {
    if (!tray || tray.hidden) return false;
    tray.hidden = true;
    return true;
  }

  // A user control for the keys on/off switch (WCAG 2.1.4's "turn off"
  // option), reached without any single-character shortcut: Tab from the
  // opener, or a click. Injected rather than shipped in the tray's static
  // markup so this file is the one place both the state and its control
  // live.
  let keysToggle = null;
  if (tray) {
    const list = tray.querySelector('.keytray__list');
    if (list) {
      const li = h('li', { class: 'keytray__toggle' });
      keysToggle = h('button', { type: 'button', class: 'btn btn--small', 'data-keys-toggle': '' });
      li.appendChild(keysToggle);
      list.appendChild(li);
      keysToggle.addEventListener('click', () => setShortcutsEnabled(!shortcutsEnabled()));
      const refreshToggle = () => {
        const on = shortcutsEnabled();
        keysToggle.textContent = `single-key shortcuts: ${on ? 'on' : 'off'}`;
        keysToggle.setAttribute('aria-pressed', String(on));
      };
      refreshToggle();
      onShortcutsChange(refreshToggle);
    }
  }

  if (tray) {
    // The tray closes on the next key (the key still does its job, except
    // Escape and q which the tray consumes itself) or click, except a click
    // on the keys toggle itself, which stays open so its new state is
    // visible. This listener is capture-phase on document, so it runs
    // before zoom.js's own Escape/q handling (a bubble-phase document
    // listener); stopping propagation for both keys here means zoom.js
    // never also restores a zoomed pane for the same keypress that closed
    // the tray.
    document.addEventListener('keydown', (e) => {
      if (tray.hidden) return;
      if (e.key === '?' || e.key === 'Shift' || e.key === 'Meta' || e.key === 'Control' || e.key === 'Alt') return;
      closeKeys();
      if (e.key === 'Escape' || e.key === 'q') {
        e.preventDefault();
        e.stopPropagation();
      }
    }, { capture: true });
    document.addEventListener('click', (e) => {
      if (tray.hidden) return;
      if (e.target.closest && e.target.closest('[data-help], [data-keys-toggle]')) return;
      closeKeys();
    }, { capture: true });
  }

  return api;
}

// ---- index --------------------------------------------------------------

function buildIndex({ term, posts, talks }) {
  const index = [];
  const add = (e) => { index.push(e); return e; };
  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

  // Posts: the writing pane rows plus the inline data.
  for (const row of document.querySelectorAll('#writing .row[data-slug]')) {
    const slug = row.dataset.slug;
    const p = posts.find((x) => x.slug === slug) || {};
    const a = row.querySelector('.row__title');
    const date = p.date || text(row.querySelector('.row__date'));
    add({
      kind: 'post', id: `post:${slug}`, slug, el: row,
      title: p.title || text(a),
      sub: p.subtitle || '',
      meta: date, year: row.dataset.year || date.slice(0, 4),
      kw: `post posts writing blog article read ${(p.tags || []).join(' ')} ${p.series || ''} ${date} ${p.minutes ? `${p.minutes} min` : ''}`,
      href: p.url || (a && a.getAttribute('href')) || '/blog/',
      print: `cat writing/${slug}`,
    });
  }

  // Talks: the talks pane rows plus the inline data.
  for (const row of document.querySelectorAll('#talks .row[data-id]')) {
    const id = row.dataset.id;
    const t = talks.find((x) => x.id === id) || {};
    const a = row.querySelector('.row__title');
    const lead = t.record_type === 'archive_lead' || row.dataset.status === 'lead';
    const date = t.date || t.date_label || t.era || text(row.querySelector('.row__date'));
    const evidence = (t.evidence_level || '').replace(/_/g, ' ');
    add({
      kind: 'talk', id: `talk:${id}`, el: row,
      title: lead ? (t.label || text(a)) : (t.title || text(a)),
      sub: lead ? (t.detail || '') : (t.venue || ''),
      meta: date, year: row.dataset.year || '',
      kw: `talk talks speaking conference session ${lead ? 'archive lead under reconstruction' : (t.status || row.dataset.status || '')} ${t.venue || ''} ${venueWords(t.venue || '')} ${evidence} ${t.slides_url ? 'slides' : ''} ${date}`,
      href: t.event_url || (a && a.getAttribute('href')) || undefined,
      upcoming: t.status === 'upcoming',
      print: `cat talks/${id}`,
    });
  }

  // Now facts.
  for (const dd of document.querySelectorAll('#now dd[data-fact]')) {
    const fact = dd.dataset.fact;
    const dt = dd.previousElementSibling;
    const label = dt && dt.tagName === 'DT' ? text(dt) : fact;
    const words = {
      role: 'now role job work company employer title current',
      speaking: 'now next upcoming talk speaking conference',
      'latest-post': 'now latest newest recent post writing',
      shipping: 'now shipping building working on projects side',
      reading: 'now reading book books read',
      location: 'now location where based live lives city state timezone',
    }[fact] || 'now';
    add({ kind: 'now', id: `now:${fact}`, el: dd, title: text(dd), sub: label, meta: label, kw: words, print: `cat now/${fact}`, pane: 'now' });
  }

  // CV: headline, roles, education, then every line of the full cv (deep:
  // shown only for a non-empty query, ranked a little lower).
  const headline = document.querySelector('#cv [data-cv-headline]');
  if (headline) add({ kind: 'cv', id: 'cv:headline', el: headline, title: text(headline), sub: 'cv headline', meta: 'cv', kw: 'cv resume about who summary headline staff platform engineer', print: 'cat cv/headline' });
  for (const row of document.querySelectorAll('#cv .row[data-id]')) {
    const id = row.dataset.id;
    add({
      kind: 'cv', id: `cv:${id}`, el: row,
      title: text(row.querySelector('.row__title')),
      sub: text(row.querySelector('.row__note')),
      meta: text(row.querySelector('.row__date')), year: row.dataset.year || '',
      kw: `cv resume role job experience career ${row.classList.contains('row--current') ? 'current' : 'past'} postgres postgresql ${row.dataset.from || ''} ${row.dataset.to || ''}`,
      print: `cat cv/${id}`,
    });
  }
  const education = document.querySelector('#cv [data-cmd="cat cv/education"]');
  if (education) add({ kind: 'cv', id: 'cv:education', el: education, title: text(education), sub: 'education', meta: 'education', kw: 'cv resume education degree school university umbc panjab', print: 'cat cv/education' });
  const full = document.querySelector('#cv [data-cv-full]');
  if (full) {
    let section = 'full cv';
    let n = 0;
    for (const el of full.querySelectorAll('h3, h4, p, li')) {
      const t = text(el);
      if (!t) continue;
      if (el.tagName === 'H3' || el.tagName === 'H4') { section = t; continue; }
      if (el.tagName === 'P' && el.querySelector('strong') && t.length < 60) { section = t; }
      add({ kind: 'cv', id: `cv:line-${n++}`, el, title: t.length > 110 ? `${t.slice(0, 107)}...` : t, sub: section, meta: 'full cv', kw: `cv resume ${section}`, deep: true, print: 'cv' });
    }
  }
  add({ kind: 'cv', id: 'cv:pdf', title: 'download the cv as pdf', sub: '/data/cv.pdf', meta: 'pdf', kw: 'cv resume pdf download', href: '/data/cv.pdf' });

  // Links.
  for (const a of document.querySelectorAll('#links a[data-link]')) {
    const name = a.dataset.link;
    const extra = { email: 'contact mail hire reach', older: 'blog blogspot penning pence archive', rss: 'feed subscribe atom', github: 'code repos', codeberg: 'code repos', linkedin: 'profile work', medium: 'writing posts' }[name] || '';
    add({ kind: 'link', id: `link:${name}`, el: a.closest('li') || a, title: text(a), sub: a.href.replace(/^mailto:/, ''), meta: 'link', kw: `link links profile open ${name} ${extra}`, href: a.href, print: name });
  }
  add({ kind: 'link', id: 'link:blog', title: 'all posts', sub: '/blog/', meta: 'link', kw: 'link blog writing posts index archive', href: '/blog/', print: 'blog' });

  // Topics (T3). One entry per legend chip, which is the server-rendered
  // list of topics that actually have records; `off` is deliberately not an
  // entry, because esc and `filter off` already clear and a palette full of
  // "off" rows would rank against the six that matter.
  if (term.registry.filter && typeof term.registry.filter.complete === 'function') {
    const known = new Set(term.registry.filter.complete('').filter((id) => id !== 'off'));
    for (const btn of document.querySelectorAll('[data-legend-btn]')) {
      const id = btn.dataset.legendBtn;
      if (!known.has(id)) continue;
      const shapeClass = [...(btn.querySelector('.mark') || { classList: [] }).classList].find((c) => c.startsWith('mark--'));
      const count = text(btn.querySelector('.legend__count'));
      add({
        kind: 'topic',
        id: `topic:${id}`,
        el: btn,
        topic: id,
        shape: shapeClass ? shapeClass.slice(6) : 'ring',
        title: `filter ${id}`,
        sub: (btn.getAttribute('aria-label') || '').split('.')[0].replace(`${id}: `, ''),
        meta: count ? `${count} records` : 'topic',
        kw: `topic topics filter dim highlight ${id}`,
        print: `filter ${id}`,
      });
    }
  }

  // Pane jumps.
  for (const id of ['now', 'talks', 'writing', 'cv']) {
    add({ kind: 'pane', id: `pane:${id}`, title: `zoom ${id}`, sub: 'fill the console with this pane', meta: `key ${['now', 'talks', 'writing', 'cv'].indexOf(id)} twice`, kw: `pane jump go zoom focus ${id}`, pane: id, zoom: true, print: `zoom ${id}` });
  }
  add({ kind: 'pane', id: 'pane:links', title: 'go to links', sub: 'focus the links pane', meta: 'key 4', kw: 'pane jump go focus links', pane: 'links' });
  add({ kind: 'pane', id: 'pane:terminal', title: 'go to the terminal', sub: 'focus the prompt', meta: 'key :', kw: 'pane jump go focus terminal prompt type', pane: 'terminal' });

  // Commands.
  for (const name of term.names) {
    const c = term.registry[name];
    add({ kind: 'cmd', id: `cmd:${name}`, title: name, sub: c.description || '', meta: 'run', kw: `command run ${name}`, cmd: name });
  }

  return index;
}

function venueWords(v) {
  const w = v.toLowerCase();
  const out = [];
  if (/scale/.test(w)) out.push('scale socal linux expo pasadena');
  if (/pgcon /.test(w) || /^pgcon/.test(w)) out.push('pgcon ottawa');
  if (/pgconf|postgresconf|postgres conference/.test(w)) out.push('pgconf postgresconf');
  if (/summit/.test(w)) out.push('summit pgsummit');
  if (/new york/.test(w)) out.push('nyc');
  if (/phil/.test(w)) out.push('philly philadelphia');
  return out.join(' ');
}

function kindOfWord(t) {
  for (const [kind, words] of Object.entries(KIND_WORDS)) {
    if (words.includes(t)) return kind;
  }
  return null;
}

function rank(e) {
  let r = DEFAULT_RANK[e.kind] || 0;
  if (e.kind === 'talk' && e.upcoming) r += 30;
  // Newer talks and posts sit a little higher; ties keep DOM order.
  if ((e.kind === 'talk' || e.kind === 'post') && e.year) r += Math.min(10, Math.max(0, Number(e.year) - 2016));
  if (e.kind === 'now' && e.id === 'now:role') r += 5;
  return r;
}

/**
 * Fuzzy match: substring first (word-start bonus), then a subsequence with
 * word-start and run bonuses. Returns { score, pos } or null.
 */
function fuzzy(q, text, subseq) {
  if (!q || !text) return null;
  const t = text.toLowerCase();
  const idx = t.indexOf(q);
  if (idx >= 0) {
    const wordStart = idx === 0 || /[^a-z0-9]/.test(t[idx - 1]);
    return { score: 60 + (wordStart ? 25 : 0) + Math.max(0, 15 - idx * 0.3) + (t.length === q.length ? 40 : 0), pos: Array.from({ length: q.length }, (_, i) => idx + i) };
  }
  if (!subseq || q.length < 3) return null;
  const pos = [];
  let ti = 0;
  let score = 0;
  let run = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const j = t.indexOf(q[qi], ti);
    if (j < 0) return null;
    const wordStart = j === 0 || /[^a-z0-9]/.test(t[j - 1]);
    run = j === ti ? run + 1 : 0;
    score += 4 + (wordStart ? 6 : 0) + run * 3 - Math.min(6, (j - ti) * 0.5);
    pos.push(j);
    ti = j + 1;
  }
  return { score: Math.max(1, score), pos };
}

/** Title text with matched characters wrapped in <mark>. */
function markTitle(title, pos) {
  const frag = document.createDocumentFragment();
  if (!pos || pos.length === 0) { frag.append(title); return frag; }
  const set = new Set(pos);
  let buf = '';
  let marked = false;
  const flush = () => {
    if (!buf) return;
    if (marked) frag.append(h('mark', { text: buf })); else frag.append(buf);
    buf = '';
  };
  for (let i = 0; i < title.length; i++) {
    const m = set.has(i);
    if (m !== marked) { flush(); marked = m; }
    buf += title[i];
  }
  flush();
  return frag;
}

function h(tag, attrs = {}) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') el.textContent = v;
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v);
  }
  return el;
}

