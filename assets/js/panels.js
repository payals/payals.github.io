/**
 * panels.js — cat-as-canvas: open/close content panels below the terminal.
 * Includes a tiny inline markdown renderer (no deps, no eval, no innerHTML
 * from raw fetched strings without escaping first).
 */

import { renderNow } from './now.js';

// Single-panel-at-a-time state
let _currentId = null;
let _suppressHashChange = false;

const PANEL_AREA = () => document.querySelector('[data-panel-area]');

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Open a panel by id. Closes any current panel first.
 * @param {string} id — 'about' | 'now' | 'talks' | 'cv'
 */
export async function openPanel(id) {
  const area = PANEL_AREA();
  if (!area) return;

  // If same panel already open, just scroll to it
  if (_currentId === id) {
    const existing = area.querySelector(`[data-panel-id="${id}"]`);
    if (existing) { smoothScrollTo(existing); return; }
  }

  closePanel();

  _currentId = id;
  _suppressHashChange = true;
  location.hash = id;
  // Allow the hashchange listener one tick to fire, then clear the suppress flag
  setTimeout(() => { _suppressHashChange = false; }, 50);

  const panel = buildPanelShell(id);
  area.appendChild(panel);

  // Trigger open animation (CSS handles opacity + translateY via .panel--open)
  requestAnimationFrame(() => panel.classList.add('panel--open'));

  // Scroll after a short delay so panel has started animating
  setTimeout(() => smoothScrollTo(panel), 50);

  // Load content
  await loadPanelContent(id, panel);
}

/** Close the active panel (instant, no exit animation per spec). */
export function closePanel() {
  const area = PANEL_AREA();
  if (!area) return;
  const existing = area.querySelector('.panel');
  if (existing) existing.remove();
  _currentId = null;
}

/**
 * Returns true when a hashchange should be ignored because we set it ourselves.
 * Used by main.js hash router.
 */
export function isSuppressingHash() {
  return _suppressHashChange;
}

// ── Panel shell ───────────────────────────────────────────────────────────

function buildPanelShell(id) {
  const section = document.createElement('section');
  section.className = 'panel';
  section.dataset.panelId = id;
  section.setAttribute('role', 'region');
  section.setAttribute('aria-label', id);

  const header = document.createElement('div');
  header.className = 'panel-header';

  const title = document.createElement('span');
  title.className = 'panel-title';
  title.innerHTML = '<span class="panel-accent" aria-hidden="true">▸</span> ';
  title.appendChild(document.createTextNode(id));

  const closeBtn = document.createElement('button');
  closeBtn.className = 'panel-close';
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', `Close ${id} panel`);
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => {
    closePanel();
    // Clear hash without triggering hashchange
    _suppressHashChange = true;
    history.replaceState(null, '', location.pathname);
    setTimeout(() => { _suppressHashChange = false; }, 50);
  });

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'panel-body';
  body.setAttribute('aria-live', 'polite');

  const loading = document.createElement('p');
  loading.className = 'panel-loading terminal-line--muted';
  loading.textContent = 'loading…';
  body.appendChild(loading);

  section.appendChild(header);
  section.appendChild(body);
  return section;
}

// ── Content loading ───────────────────────────────────────────────────────

async function loadPanelContent(id, panelEl) {
  const body = panelEl.querySelector('.panel-body');

  try {
    if (id === 'now') {
      body.innerHTML = '';
      await renderNow(body);
    } else if (id === 'talks') {
      const data = await fetchJSON(`data/talks.json`);
      body.innerHTML = '';
      renderTalks(data, body);
    } else {
      // about, cv — markdown
      const md = await fetchText(`data/${id}.md`);
      body.innerHTML = '';

      // CV: probe for PDF and prepend the download button BEFORE markdown.
      if (id === 'cv') {
        maybeAddPdfButton(body);
      }

      // Wrap markdown in .panel-prose so existing h1/h2/h3/p/ul/li/hr/code/strong
      // styles apply. Renderer outputs raw elements; the wrapper gives them context.
      const prose = document.createElement('div');
      prose.className = 'panel-prose';
      renderMarkdown(md, prose);
      body.appendChild(prose);
    }
  } catch (err) {
    body.innerHTML = '';
    const errEl = document.createElement('p');
    errEl.className = 'terminal-line--err';
    errEl.textContent = `failed to load ${id}: ${err.message}`;
    body.appendChild(errEl);
  }
}

// ── Talks renderer ────────────────────────────────────────────────────────

function renderTalks(talks, containerEl) {
  if (!Array.isArray(talks) || talks.length === 0) {
    const p = document.createElement('p');
    p.className = 'terminal-line--muted';
    p.textContent = 'no talks listed yet.';
    containerEl.appendChild(p);
    return;
  }

  const INITIAL_SHOW = 6;
  const intro = document.createElement('p');
  intro.className = 'talks-intro';
  intro.textContent = 'Talks on PostgreSQL, data reliability, and AI systems. Upcoming sessions appear first.';

  const grid = document.createElement('div');
  grid.className = 'talks-grid';

  talks.forEach((talk, i) => {
    const card = buildTalkCard(talk);
    if (i >= INITIAL_SHOW) {
      card.classList.add('talks-card--hidden');
      card.setAttribute('aria-hidden', 'true');
    }
    grid.appendChild(card);
  });

  containerEl.appendChild(intro);
  containerEl.appendChild(grid);

  if (talks.length > INITIAL_SHOW) {
    const more = document.createElement('button');
    more.className = 'chip talks-load-more';
    more.type = 'button';
    more.textContent = 'load more ↓';
    more.addEventListener('click', () => {
      grid.querySelectorAll('.talks-card--hidden').forEach((c) => {
        c.classList.remove('talks-card--hidden');
        c.removeAttribute('aria-hidden');
      });
      more.remove();
    });
    containerEl.appendChild(more);
  }
}

function buildTalkCard(talk) {
  const card = document.createElement('article');
  card.className = 'talks-card';
  if (talk.status === 'upcoming') card.classList.add('talks-card--upcoming');

  if (talk.image) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'talks-card-image';
    const img = document.createElement('img');
    img.src = esc(talk.image);
    img.alt = talk.title || 'Talk presentation';
    img.width = 640;
    img.height = 360;
    img.loading = 'lazy';
    imgWrap.appendChild(img);
    card.appendChild(imgWrap);
  }

  const info = document.createElement('div');
  info.className = 'talks-card-info';

  const titleRow = document.createElement('div');
  titleRow.className = 'talks-card-title-row';

  const titleEl = document.createElement('h3');
  titleEl.className = 'talks-card-title';
  titleEl.textContent = talk.title || '(untitled)';
  titleRow.appendChild(titleEl);

  if (talk.status === 'upcoming') {
    const badge = document.createElement('span');
    badge.className = 'talks-card-badge';
    badge.textContent = 'upcoming';
    titleRow.appendChild(badge);
  }
  info.appendChild(titleRow);

  const meta = document.createElement('p');
  meta.className = 'talks-card-meta terminal-line--muted';
  if (talk.venue) meta.appendChild(document.createTextNode(talk.venue));
  if (talk.date) {
    if (talk.venue) meta.appendChild(document.createTextNode(' · '));
    const time = document.createElement('time');
    time.dateTime = talk.date;
    time.textContent = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${talk.date}T00:00:00Z`));
    meta.appendChild(time);
  }
  info.appendChild(meta);

  if (talk.event_url || talk.slides_url || talk.video_url) {
    const links = document.createElement('div');
    links.className = 'talks-card-links';
    if (talk.event_url) links.appendChild(talkLink('details', talk.event_url, talk.title));
    if (talk.slides_url) links.appendChild(talkLink('slides', talk.slides_url, talk.title));
    if (talk.video_url) links.appendChild(talkLink('video', talk.video_url, talk.title));
    info.appendChild(links);
  }

  card.appendChild(info);
  return card;
}

function talkLink(label, url, title) {
  const a = document.createElement('a');
  a.className = 'chip chip--sm';
  a.href = esc(url);
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = label;
  a.setAttribute('aria-label', `${label}: ${title || '(untitled)'}`);
  return a;
}

// ── PDF button ────────────────────────────────────────────────────────────

function maybeAddPdfButton(containerEl) {
  // Probe with a HEAD request; only show button if file is reachable.
  // Prepended to the container so the button sits at the TOP of the CV panel,
  // before the markdown body.
  fetch('data/cv.pdf', { method: 'HEAD' })
    .then((r) => {
      if (!r.ok) return;
      const wrap = document.createElement('div');
      wrap.className = 'cv-pdf-button-row';
      const btn = document.createElement('a');
      btn.className = 'chip chip--download';
      btn.href = 'data/cv.pdf';
      btn.download = 'payal-singh-cv.pdf';
      btn.textContent = 'download CV PDF ↓';
      wrap.appendChild(btn);
      containerEl.insertBefore(wrap, containerEl.firstChild);
    })
    .catch(() => { /* file absent — silent */ });
}

// ── Tiny markdown renderer ────────────────────────────────────────────────
// Supports: h1/h2/h3, -, [text](url), **bold**, *italic*, `code`, ---, blank line

function renderMarkdown(md, containerEl) {
  const lines = md.split('\n');
  let inList = false;
  let listEl = null;

  function flushList() {
    if (inList) { containerEl.appendChild(listEl); inList = false; listEl = null; }
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Blank line → paragraph break
    if (line === '') {
      flushList();
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(line) || /^\*{3,}$/.test(line) || /^_{3,}$/.test(line)) {
      flushList();
      containerEl.appendChild(document.createElement('hr'));
      continue;
    }

    // Headings
    const hMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (hMatch) {
      flushList();
      const level = hMatch[1].length;
      const el = document.createElement(`h${level}`);
      el.className = `md-h${level}`;
      applyInline(hMatch[2], el);
      containerEl.appendChild(el);
      continue;
    }

    // List item
    if (/^[-*]\s+/.test(line)) {
      if (!inList) { listEl = document.createElement('ul'); listEl.className = 'md-list'; inList = true; }
      const li = document.createElement('li');
      applyInline(line.replace(/^[-*]\s+/, ''), li);
      listEl.appendChild(li);
      continue;
    }

    // Paragraph
    flushList();
    const p = document.createElement('p');
    p.className = 'md-p';
    applyInline(line, p);
    containerEl.appendChild(p);
  }

  flushList();
}

/**
 * Parse inline markdown tokens and append nodes to parentEl.
 * Always escapes raw text — never passes fetched strings to innerHTML.
 */
function applyInline(text, parentEl) {
  // Token pattern: **bold** | *italic* | `code` | [text](url)
  const tokenRe = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m;

  while ((m = tokenRe.exec(text)) !== null) {
    // Text before this match
    if (m.index > last) {
      parentEl.appendChild(document.createTextNode(text.slice(last, m.index)));
    }

    if (m[1] !== undefined) {
      // **bold**
      const b = document.createElement('strong');
      b.textContent = m[1];
      parentEl.appendChild(b);
    } else if (m[2] !== undefined) {
      // *italic*
      const i = document.createElement('em');
      i.textContent = m[2];
      parentEl.appendChild(i);
    } else if (m[3] !== undefined) {
      // `code`
      const code = document.createElement('code');
      code.textContent = m[3];
      parentEl.appendChild(code);
    } else if (m[4] !== undefined && m[5] !== undefined) {
      // [text](url)
      const a = document.createElement('a');
      a.href = esc(m[5]);
      a.textContent = m[4];
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      parentEl.appendChild(a);
    }

    last = m.index + m[0].length;
  }

  // Remaining text
  if (last < text.length) {
    parentEl.appendChild(document.createTextNode(text.slice(last)));
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

/** Escape a string for use in an HTML attribute value (href, src). */
export function esc(str) {
  if (typeof str !== 'string') return '';
  // Allow only http/https/mailto schemes; strip anything suspicious
  const s = str.trim();
  if (/^(https?:|mailto:|\/|#)/.test(s)) return s;
  return '#';
}

function smoothScrollTo(el) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}
