/* =============================================================
   command.js: behaviour for the command layout, which every page on the
   site uses (home, /talks/, /cv/, the blog, posts, /reading/, evidence,
   404). Everything here is an enhancement over server-rendered HTML that
   reads fine without it (rules in _layouts/command.html).

   Every page: theme toggle, "/" palette (Ctrl/Cmd-K too), "?" keys sheet
   with a switch that turns single-key shortcuts off (WCAG 2.1.4; stored as
   console.keysEnabled, the key the old console used), digit keys, topic
   filters on any [data-list], row fade-in, open-all before print.
   Home only (#cmd present): the prompt, the drawers the four sections lift
   into, door clicks that type their command first, hash routing.
   /talks/ only: expand all, and #talk-<id> opens that row.
   Posts with a contents list: the section in view is marked current.
   404: the requested path is written into the page (textContent).
   Single-key shortcuts never fire while focus is in a text field.
   ============================================================= */
(() => {
'use strict';
const d = document, root = d.documentElement;
const $ = (s, el = d) => el.querySelector(s);
const $$ = (s, el = d) => Array.from(el.querySelectorAll(s));
const mq = (q) => (window.matchMedia ? matchMedia(q) : { matches: false, addEventListener() {} });
const reduce = mq('(prefers-reduced-motion: reduce)');
const phone = mq('(max-width: 767.98px)');
const SECTIONS = ['writing', 'talks', 'cv', 'now'];
/* other words a visitor types for a section; the prompt and the palette both accept them */
const SECTION_ALIAS = { resume: 'cv', blog: 'writing', posts: 'writing', writings: 'writing', post: 'writing', talk: 'talks' };
const aliasesOf = (name) => Object.keys(SECTION_ALIAS).filter((k) => SECTION_ALIAS[k] === name);
const LABEL = { talks: 'Talks', writing: 'Writing', cv: 'CV', now: 'Now' };
const PAGE_FOR = { talks: '/talks/', writing: '/blog/', cv: '/cv/', now: '/#now' };
const TOPIC_ORDER = ['ai', 'postgres', 'security', 'platform', 'reliability', 'other'];
const TOPIC_LABEL = { ai: 'AI', postgres: 'Postgres', security: 'Security', platform: 'Platform', reliability: 'Reliability', other: 'Other' };
const TOPIC_ALIAS = { ai: 'ai', postgres: 'postgres', postgresql: 'postgres', pg: 'postgres', security: 'security', sec: 'security', platform: 'platform', reliability: 'reliability', rel: 'reliability', other: 'other', all: 'all' };
const SHAPE = { ai: 'triangle', postgres: 'circle', security: 'diamond', platform: 'hexagon', reliability: 'square', other: 'ring' };
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode: per-visit only */ } }
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shapeSvg = (shape) => `<svg aria-hidden="true" focusable="false"><use href="#s-${esc(shape)}"/></svg>`;
const inRect = (r, x, y) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
const isHome = !!d.getElementById('cmd');

/* Hero "latest" fact: re-run the build's pick (_includes/command/featured.html)
   against the visitor's clock so it never goes stale between deploys. */
(function pickFeatured() {
  const els = {};
  $$('[data-feat]').forEach((el) => { els[el.dataset.feat] = el; });
  if (!Object.keys(els).length) return;
  const DAY = 86400, now = Math.floor(Date.now() / 1000);
  const when = (k) => (els[k] ? +els[k].dataset.when || 0 : 0);
  const upS = when('up'), pastS = when('past'), postS = when('post');
  const upLive = upS > 0 && upS + DAY > now;
  let lt = 'past', ltS = pastS;
  if (upS > 0 && !upLive && upS > pastS) { lt = 'up'; ltS = upS; }
  const newer = ltS > postS ? lt : 'post', newerS = Math.max(ltS, postS);
  let pick;
  if (upLive && upS <= now + 14 * DAY) pick = 'up';
  else if (newerS > 0 && newerS >= now - 45 * DAY) pick = newer;
  else if (upLive) pick = 'up';
  else pick = newer;
  if (!els[pick]) return;
  Object.entries(els).forEach(([k, el]) => { el.hidden = k !== pick; });
  if (els.up && !upLive) { const dt = els.up.querySelector('dt'); if (dt && dt.dataset.pastLabel) dt.textContent = dt.dataset.pastLabel; }
})();

/* Size each hero fact list to its first item plus a small peek of the next,
   and drop the bottom fade once the list is scrolled to its end. */
(function factScrolls() {
  const lists = $$('.fact-scroll');
  if (!lists.length) return;
  const PEEK = 22;
  const fit = () => lists.forEach((ol) => {
    const first = ol.firstElementChild;
    if (!first || !ol.offsetParent) return;
    ol.style.setProperty('--fact-h', `${first.offsetHeight + PEEK}px`);
    mark(ol);
  });
  const mark = (ol) => ol.classList.toggle('at-end', ol.scrollTop + ol.clientHeight >= ol.scrollHeight - 2);
  lists.forEach((ol) => ol.addEventListener('scroll', () => mark(ol), { passive: true }));
  fit();
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(fit);
  let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fit, 120); });
})();

/* ---------- theme ---------- */
const themeBtns = $$('[data-act="theme"]');
const lightMq = mq('(prefers-color-scheme: light)');
const effectiveTheme = () => root.dataset.theme || (lightMq.matches ? 'light' : 'dark');
function syncThemeBtns() {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  themeBtns.forEach((b) => b.setAttribute('aria-label', `Theme: switch to ${next}`));
}
/* browser toolbar colour: the two media-query metas follow the OS; a picked
   theme puts one unconditional meta (#theme-pick) first, so it wins. The
   pre-paint script in command.html does the same for a stored pick. */
const THEME_BG = { light: '#f6f5fa', dark: '#15141f' };
function syncThemeColor() {
  let m = $('#theme-pick');
  const t = root.dataset.theme;
  if (!THEME_BG[t]) { if (m) m.remove(); return; }
  if (!m) {
    m = d.createElement('meta'); m.name = 'theme-color'; m.id = 'theme-pick';
    const first = $('meta[name="theme-color"]');
    if (first) first.before(m); else d.head.append(m);
  }
  m.content = THEME_BG[t];
}
function setTheme(t) {
  if (t === 'system') { delete root.dataset.theme; store.set('ps-theme', null); }
  else { root.dataset.theme = t; store.set('ps-theme', t); }
  syncThemeBtns();
  syncThemeColor();
}
if (lightMq.addEventListener) lightMq.addEventListener('change', syncThemeBtns);
themeBtns.forEach((b) => b.addEventListener('click', () => setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark')));
syncThemeBtns();

/* ---------- details: fade the body in on open (opacity + 4px, no height animation) ---------- */
d.addEventListener('toggle', (e) => {
  const det = e.target;
  if (!(det instanceof HTMLDetailsElement) || !det.open) return;
  const body = det.querySelector(':scope > .row-body, :scope > .more-body');
  if (!body) return;
  body.classList.add('pre');
  requestAnimationFrame(() => requestAnimationFrame(() => body.classList.remove('pre')));
}, true);

/* ---------- filters (L3): topic tags on every [data-list] ---------- */
const lists = {};
function buildTools(box) {
  const name = box.dataset.list;
  const tools = $('[data-tools]', box);
  if (!tools) return;
  const items = $$('.rows > li', box);
  const counts = {};
  items.forEach((li) => { counts[li.dataset.topic] = (counts[li.dataset.topic] || 0) + 1; });
  const btn = (topic, label, n, shape) => `<button type="button" class="ftag" data-topic="${topic}" aria-pressed="${topic === 'all'}">${shape ? `<svg class="shape" aria-hidden="true" focusable="false"><use href="#s-${shape}"/></svg>` : ''}${label}<span class="n">${n}</span></button>`;
  /* two groups: the topic filters (.ftags, wrapping onto a second line on phones, never scrolling sideways)
     and the view controls (.tools-end, right-aligned; their own row on phones) */
  let html = `<div class="ftags" role="group" aria-label="Filter ${(LABEL[name] || name).toLowerCase()} by topic">${btn('all', 'All', items.length)}`;
  TOPIC_ORDER.forEach((t) => { if (counts[t]) html += btn(t, TOPIC_LABEL[t], counts[t], SHAPE[t]); });
  html += '</div>';
  const hasPlot = name === 'talks' && $('.plot', box) && $('#talk-data');
  if (box.hasAttribute('data-expandable') || hasPlot) {
    html += '<div class="tools-end" role="group" aria-label="View">';
    if (box.hasAttribute('data-expandable')) html += '<button type="button" class="ftag expand-btn" aria-pressed="false"><svg aria-hidden="true" focusable="false"><use href="#i-expand"/></svg><span>Expand all</span></button>';
    if (hasPlot) html += '<button type="button" class="ftag plot-btn" aria-pressed="false"><svg aria-hidden="true" focusable="false"><use href="#i-plot"/></svg>Timeline</button>';
    html += '</div>';
  }
  tools.innerHTML = html;
  // on home, the prompt names what the open drawer shows, so a filter chip rewrites it
  const echoFilter = (topic) => {
    if (!cmdInput || current !== name) return;
    typingToken++; cmdInput.value = topic === 'all' ? name : `${name} ${topic}`; renderGhost();
  };
  $$('.ftag[data-topic]', tools).forEach((b) => b.addEventListener('click', () => { applyFilter(name, b.dataset.topic); echoFilter(b.dataset.topic); }));
  const empty = d.createElement('p');
  empty.className = 'empty'; empty.hidden = true;
  empty.innerHTML = '<span></span><button type="button">Show everything</button>';
  // the button hides its own container, so hand focus to the All chip rather than dropping it to <body>
  $('button', empty).addEventListener('click', () => {
    applyFilter(name, 'all'); echoFilter('all');
    const all = $('.ftag[data-topic="all"]', tools);
    if (all) all.focus({ preventScroll: !!box.closest('dialog') });
  });
  $('.rows', box).after(empty);
  const exp = $('.expand-btn', tools);
  if (exp) {
    const sync = () => {
      const rows = $$('.rows > li:not([hidden]) > details.row', box);
      const all = rows.length > 0 && rows.every((r) => r.open);
      exp.setAttribute('aria-pressed', String(all));
      $('span', exp).textContent = all ? 'Collapse all' : 'Expand all';
    };
    exp.addEventListener('click', () => {
      const open = exp.getAttribute('aria-pressed') !== 'true';
      $$('.rows > li:not([hidden]) > details.row', box).forEach((r) => { r.open = open; });
      sync();
    });
    box.addEventListener('toggle', sync, true);
    box._syncExpand = sync;
  }
  const plotBtn = $('.plot-btn', tools);
  if (plotBtn) plotBtn.addEventListener('click', () => {
    const plot = $('.plot', box);
    const on = plotBtn.getAttribute('aria-pressed') !== 'true';
    if (on && !plot.firstChild) buildPlot(box);
    plot.hidden = !on;
    plotBtn.setAttribute('aria-pressed', String(on));
    // the drawer's tools are sticky, so Timeline can be pressed with the list scrolled;
    // scroll anchoring would then keep the new chart above the viewport. Bring it in, instantly.
    const dlg = on && box.closest('dialog');
    if (dlg) {
      const head = $('.panel-head', dlg);
      const top = head && getComputedStyle(head).position === 'sticky' ? head.getBoundingClientRect().bottom : dlg.getBoundingClientRect().top;
      const gap = plot.getBoundingClientRect().top - top - 8;
      if (gap < 0) dlg.scrollTop += gap;
    }
  });
  lists[name] = box;
}
function applyFilter(name, topic) {
  const box = lists[name];
  if (!box) return;
  const items = $$('.rows > li', box);
  $$('.ftag[data-topic]', box).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.topic === topic)));
  let shown = 0;
  items.forEach((li) => { const ok = topic === 'all' || li.dataset.topic === topic; li.hidden = !ok; if (ok) shown++; });
  const status = $('.filter-status', box);
  if (status) status.textContent = topic === 'all' ? '' : `Showing ${shown} of ${items.length} on ${TOPIC_LABEL[topic] || topic}`;
  const empty = $('.empty', box);
  if (empty) { empty.hidden = shown > 0; $('span', empty).textContent = `Nothing on ${TOPIC_LABEL[topic] || topic} yet.`; }
  const plot = $('.plot', box);
  if (plot) $$('.pm', plot).forEach((m) => m.classList.toggle('dim', topic !== 'all' && m.dataset.topic !== topic));
  if (box._syncExpand) box._syncExpand();
}

/* timeline: one mark per talk record, built on first open */
function buildPlot(box) {
  let recs = [];
  try { recs = JSON.parse($('#talk-data').textContent); } catch (e) { recs = []; }
  const plot = $('.plot', box);
  if (!recs.length) { plot.innerHTML = '<p class="plot-cap">No talk records to plot.</p>'; return; }
  const years = recs.map((r) => r.year).filter(Boolean);
  const y0 = Math.min(...years), y1 = Math.max(...years);
  const n = y1 - y0 + 1;
  const byYear = {};
  recs.slice().sort((a, b) => String(a.date || a.year).localeCompare(String(b.date || b.year))).forEach((r) => (byYear[r.year] = byYear[r.year] || []).push(r));
  let cols = '', labels = '', lastShort = -Infinity;
  for (let y = y0; y <= y1; y++) {
    const rs = byYear[y] || [];
    cols += `<div class="plot-col">${rs.map((r) => `<span class="pm${r.status === 'upcoming' ? ' up' : ''}" data-topic="${esc(r.topic)}" title="${esc(r.title)}, ${esc(r.event)}">${shapeSvg(r.shape)}</span>`).join('')}</div>`;
    /* phones show the short label ('17) of every other year in a run, since
       two adjacent short labels are wider than their columns and read as one */
    const crowd = rs.length && y - lastShort < 2;
    if (rs.length && !crowd) lastShort = y;
    labels += `<span class="mono${rs.length ? '' : ' gap'}${crowd ? ' crowd' : ''}"><span class="y-full">${y}</span><span class="y-short">’${String(y).slice(2)}</span></span>`;
  }
  const summary = Object.keys(byYear).map((y) => `${byYear[y].length} in ${y}`).join(', ');
  const gaps = [];
  for (let y = y0; y <= y1; y++) if (!byYear[y]) { const g = gaps[gaps.length - 1]; if (g && g[1] === y - 1) g[1] = y; else gaps.push([y, y]); }
  const gapTxt = gaps.length ? ` None in ${gaps.map((g) => g[0] === g[1] ? g[0] : `${g[0]} to ${g[1]}`).join(' or ')}.` : '';
  plot.innerHTML = `<div role="img" aria-label="Talk records by year: ${esc(summary)}.${gapTxt}"><div class="plot-grid" style="--n:${n}">${cols}</div><div class="plot-years" style="--n:${n}" aria-hidden="true">${labels}</div></div><p class="plot-cap">One mark per talk record. Shapes are topics; the coloured mark is upcoming.</p>`;
  const active = $('.ftag[data-topic][aria-pressed="true"]', box);
  if (active && active.dataset.topic !== 'all') applyFilter(box.dataset.list, active.dataset.topic);
}

$$('[data-list]').forEach(buildTools);

/* a row a hash, "open <slug>" or the palette can reveal: a talk's <details>
   row, or a post's link row in the home Writing drawer (.pl-row[data-slug]) */
const ROW = 'details.row, .pl-row[data-slug]';
const isRow = (el) => !!(el && el.matches && el.matches(ROW));
/* reveal one row in place: open it, scroll to it, focus its summary (or its
   link), flash it */
function revealRow(row) {
  const li = row.closest('li');
  const box = row.closest('[data-list]');
  if (li && li.hidden && box) applyFilter(box.dataset.list, 'all');
  if (row instanceof HTMLDetailsElement) row.open = true;
  requestAnimationFrame(() => {
    const dlg = row.closest('dialog');
    const head = dlg && $('.panel-head', dlg);
    row.style.scrollMarginTop = head && getComputedStyle(head).position === 'sticky' ? `${head.offsetHeight + 8}px` : '28px';
    row.scrollIntoView({ block: 'start', behavior: 'auto' });
    const sum = $('summary, .pl-link', row);
    if (sum) sum.focus({ preventScroll: true });
    row.classList.add('flash');
    setTimeout(() => row.classList.remove('flash'), 1600);
  });
}

/* ---------- home: prompt + drawers ---------- */
let openDrawer = null, closeDrawer = null, current = null, lastTrigger = null, cmdInput = null, typingToken = 0, renderGhost = () => {};
let promptOnScreen = false;
const doors = $$('.door');
const doorFor = (name) => doors.find((x) => x.dataset.section === name);

if (isHome) {
  const cmd = $('#cmd'), ghost = $('#ghost'), out = $('#cmd-out'), ps1Path = $('#ps1-path'), slPath = $('#sl-path');
  cmdInput = cmd;
  const COMMANDS = ['help', 'ls', 'talks', 'writing', 'cv', 'now', 'open', 'theme', 'clear', 'cat', 'about', 'contact', 'email', ...Object.keys(SECTION_ALIAS)];
  let slugs = [];
  const hist = []; let histIdx = 0;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { const e = es[es.length - 1]; promptOnScreen = e.isIntersecting && e.intersectionRatio >= 0.6; },
      { threshold: [0, 0.6, 1], rootMargin: '0px 0px -44px 0px' }).observe($('.prompt'));
  }
  const complete = (v) => {
    if (!v || /\s{2,}/.test(v)) return '';
    const parts = v.split(' ');
    const low = parts.map((p) => p.toLowerCase());
    const pick = (pool, w) => { if (!w) return ''; const m = pool.find((p) => p.startsWith(w) && p !== w); return m ? m.slice(w.length) : ''; };
    if (parts.length === 1) return pick(COMMANDS, low[0]);
    let c = low[0], i = 1;
    if (c === 'cat') { if (parts.length === 2) return pick(SECTIONS, low[1]); c = low[1]; i = 2; }
    if (parts.length !== i + 1) return '';
    const pool = (c === 'talks' || c === 'writing') ? TOPIC_ORDER : c === 'theme' ? ['light', 'dark', 'system'] : c === 'open' ? slugs : [];
    return pick(pool, low[i]);
  };
  renderGhost = () => {
    const v = cmd.value;
    const focused = d.activeElement === cmd;
    const rest = ghost.children[2];
    ghost.children[0].textContent = v;
    const hint = !focused && !v;
    rest.textContent = focused ? complete(v) : hint ? 'type help' : '';
    rest.classList.toggle('hint', hint);
  };
  const say = (text, echo) => {
    out.textContent = '';
    if (!text) return;
    if (echo) { const e = d.createElement('span'); e.className = 'echo'; e.textContent = `~$ ${echo}\n`; out.append(e); }
    out.append(d.createTextNode(text));
    // output can land below the fold, behind the fixed status line (html scroll-padding-bottom clears it)
    if (out.offsetParent) out.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  };
  const setPath = (name) => {
    if (name) {
      ps1Path.innerHTML = `~/<span class="p-sec" style="--hue:var(--${name})">${name}</span>`;
      slPath.innerHTML = `~/<span class="sec" style="--hue:var(--${name})">${name}</span>`;
    } else { ps1Path.textContent = '~'; slPath.textContent = '~'; }
  };
  /* the signature: a door or chip click types its command first (<=180ms total).
     Characters are placed against the clock (performance.now), not by summing
     timer delays, so timer drift cannot push the total past the budget: the
     last character lands by TYPE_MS and the action fires by TOTAL_MS.
     Resolves true when the text landed, false when a newer action canceled it;
     callers act only on true so a canceled click never fires its stale action. */
  const TYPE_MS = 130, TOTAL_MS = 150;
  const now = () => (window.performance && performance.now ? performance.now() : Date.now());
  const typeInto = (text, animate) => {
    const token = ++typingToken;
    if (!animate) { cmd.value = text; renderGhost(); return Promise.resolve(true); }
    const len = Math.max(1, text.length);
    const per = Math.min(20, TYPE_MS / len);
    const t0 = now();
    cmd.value = ''; renderGhost();
    return new Promise((res) => {
      const tick = () => {
        if (token !== typingToken) return res(false);
        const el = now() - t0;
        const i = Math.min(len, Math.max(1, Math.floor(el / per)));
        cmd.value = text.slice(0, i); renderGhost();
        if (i >= len) return setTimeout(() => res(token === typingToken), Math.max(0, Math.min(16, TOTAL_MS - (now() - t0))));
        setTimeout(tick, Math.max(0, (i + 1) * per - el));
      };
      setTimeout(tick, per);
    });
  };
  const HELP = [
    'talks [topic]     open talks, e.g. talks security',
    'writing [topic]   open writing, e.g. writing postgres',
    'cv, now           open the CV or what I am doing now',
    'open <slug>       open one talk or post',
    'about, contact    jump to the intro, list contact links',
    'theme light|dark|system',
    'ls, clear         list sections, clear this output',
    'Topics: ai, postgres, security, platform, reliability, other'
  ].join('\n');
  const findSlug = (s) => {
    const all = $$(ROW).filter((x) => x.dataset.slug);
    const hit = all.find((x) => x.dataset.slug === s) || all.find((x) => x.dataset.slug.startsWith(s)) || all.find((x) => x.dataset.slug.includes(s));
    if (!hit) return null;
    return { el: hit, section: hit.classList.contains('talk') ? 'talks' : 'writing' };
  };

  const drawers = {};
  let booting = true;
  let pushed = false, ignorePop = false, taught = false, openedByDoor = false, lastVia = 'key';
  const syncDoors = () => doors.forEach((x) => x.setAttribute('aria-expanded', String(x.dataset.section === current)));
  const afterClose = (name, dlg) => {
    if (dlg._silent) { dlg._silent = false; return; }
    if (current !== name) return;
    current = null; syncDoors(); setPath(null);
    /* the command line is the visitor's: closing a drawer never edits it */
    typingToken++; renderGhost();
    if (pushed) { pushed = false; ignorePop = true; history.back(); }
    else if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    /* a drawer opened by typing or by mouse hands focus back to the prompt;
       one opened from the keyboard (a door, a digit, the palette) returns to
       its opener, so keyboard users land where they were */
    const backToPrompt = !phone.matches && cmd.offsetParent && (lastTrigger === cmd || lastVia === 'pointer');
    let t = backToPrompt ? cmd : lastTrigger;
    if (!t || !t.isConnected || t.closest('dialog:not([open])') || !t.offsetParent) t = doorFor(name);
    if (t) t.focus({ preventScroll: true });
    lastTrigger = null;
    if (openedByDoor && !taught && promptOnScreen) { taught = true; say('Tip: everything the doors do, you can type here. Try talks security.'); }
    openedByDoor = false;
  };
  openDrawer = (name, opts = {}) => {
    const dlg = drawers[name];
    if (!dlg) return;
    const via = opts.via || 'key';
    lastVia = via;
    if (opts.trigger) lastTrigger = opts.trigger;
    openedByDoor = !!opts.fromDoor;
    /* on a wide screen the drawer is a side panel and the page stays live, so
       the prompt keeps the keyboard when the visitor typed the command or
       used the mouse; on a phone it is a modal sheet and the prompt is hidden */
    const modal = phone.matches;
    const keepPrompt = !modal && cmd.offsetParent && (opts.trigger === cmd || via === 'pointer');
    const fresh = !dlg.open || current !== name;
    // a drawer already showing owns the current history entry, even one this script did not push
    // (a load-time or Back/Forward hash): replace it, or a later close's back() lands on the old hash
    const onEntry = pushed || !!(current && drawers[current] && drawers[current].open);
    if (current && current !== name) {
      const old = drawers[current];
      old._silent = true; old.classList.add('instant'); old.close();
      current = null;
    }
    if (!dlg.open) {
      dlg.classList.toggle('instant', via !== 'pointer');
      dlg.scrollTop = 0;
      if (modal) dlg.showModal(); else dlg.show();
      dlg._modal = modal;
    }
    current = name; syncDoors(); setPath(name);
    if (!cmd.value) cmd.value = opts.row ? `open ${opts.row.dataset.slug}` : `cat ${name}`;
    renderGhost();
    /* a plain open (door, digit key, palette, #name) shows everything, like
       "cat <name>"; only "talks <topic>" sets a filter */
    if (opts.filter) applyFilter(name, opts.filter);
    else if (fresh) applyFilter(name, 'all');
    if (opts.row) revealRow(opts.row);
    else if (!keepPrompt) {
      const h = $(`#${name}-h`);
      h.focus({ preventScroll: true });
      /* a load-time hash: Chrome's fragment scroll at load drops that focus */
      if (booting) settle(() => { if (current === name && dlg.open && dlg.contains(h) && !dlg.contains(d.activeElement)) h.focus({ preventScroll: true }); });
    }
    if (keepPrompt) cmd.focus({ preventScroll: true });
    const hash = '#' + (opts.row ? opts.row.id : name);
    if (location.hash !== hash) {
      if (onEntry) history.replaceState({ ps: 1 }, '', hash);
      else { history.pushState({ ps: 1 }, '', hash); pushed = true; }
    }
  };
  closeDrawer = (opts = {}) => {
    if (!current) return;
    const dlg = drawers[current];
    dlg.classList.toggle('instant', opts.via === 'key');
    dlg.close();
  };
  const run = (line, via, trigger) => {
    const raw = line.trim();
    if (!raw) return;
    if (hist[hist.length - 1] !== raw) hist.push(raw);
    histIdx = hist.length;
    const args = raw.split(/\s+/);
    let c = args.shift().toLowerCase();
    if (c === 'cat') { c = (args.shift() || '').toLowerCase(); if (!c) { say('cat what? Try cat talks.', raw); return; } }
    if (SECTION_ALIAS[c]) c = SECTION_ALIAS[c];
    const a0 = (args[0] || '').toLowerCase();
    const done = () => { cmd.value = ''; renderGhost(); };
    switch (c) {
      case 'help': say(HELP, raw); done(); break;
      case 'ls': say('writing  talks  cv  now', raw); done(); break;
      case 'talks': case 'writing': {
        let topic = 'all';
        if (a0) { topic = TOPIC_ALIAS[a0]; if (!topic) { say(`No topic called "${args[0]}". Topics: ai, postgres, security, platform, reliability, other.`, raw); return; } }
        say(''); openDrawer(c, { via, filter: topic, trigger: trigger || cmd }); break;
      }
      case 'cv': case 'now': say(''); openDrawer(c, { via, trigger: trigger || cmd }); break;
      case 'open': {
        if (!a0) { say('Usage: open <slug>. Try open securing-your-data.', raw); return; }
        const sec0 = SECTION_ALIAS[a0] || a0;
        if (SECTIONS.includes(sec0)) { say(''); openDrawer(sec0, { via, trigger: trigger || cmd }); break; }
        const hit = findSlug(a0);
        if (!hit) { say(`Nothing called "${args[0]}". Press / to search by title instead.`, raw); return; }
        say(''); openDrawer(hit.section, { via, row: hit.el, trigger: trigger || cmd }); break;
      }
      case 'theme': {
        if (!['light', 'dark', 'system'].includes(a0)) { say('Usage: theme light, theme dark, or theme system.', raw); return; }
        setTheme(a0); say(`Theme set to ${a0}.`, raw); done(); break;
      }
      case 'about': {
        say(''); done();
        const hero = d.getElementById('about');
        if (hero) { hero.scrollIntoView({ block: 'start', behavior: 'auto' }); hero.focus({ preventScroll: true }); }
        break;
      }
      case 'contact': case 'email': {
        const links = $$('#about .contact a');
        if (!links.length) { say('No contact links on this page.', raw); done(); break; }
        say('Contact:', raw);
        links.forEach((a, i) => { out.append(d.createTextNode(i ? '  ' : ' ')); const l = a.cloneNode(true); l.className = ''; out.append(l); });
        done(); break;
      }
      case 'clear': say(''); done(); break;
      default: say(`command not found: ${c}. Type help to see what works.`, raw);
    }
  };
  cmd.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    const g = () => complete(cmd.value);
    if (e.key === 'Enter') { e.preventDefault(); typingToken++; run(cmd.value, 'key', cmd); }
    else if (e.key === 'Tab' && !e.shiftKey) { const s = g(); if (s) { e.preventDefault(); cmd.value += s; renderGhost(); } }
    else if (e.key === 'ArrowRight' && cmd.selectionStart === cmd.value.length) { const s = g(); if (s) { e.preventDefault(); cmd.value += s; renderGhost(); } }
    else if (e.key === 'ArrowUp') { if (hist.length) { e.preventDefault(); histIdx = Math.max(0, histIdx - 1); cmd.value = hist[histIdx]; renderGhost(); } }
    else if (e.key === 'ArrowDown') { if (hist.length) { e.preventDefault(); histIdx = Math.min(hist.length, histIdx + 1); cmd.value = hist[histIdx] || ''; renderGhost(); } }
    else if (e.key === 'Escape') { e.preventDefault(); if (current) closeDrawer({ via: 'key' }); else if (cmd.value) { cmd.value = ''; renderGhost(); } else cmd.blur(); }
  });
  cmd.addEventListener('input', () => { typingToken++; renderGhost(); });
  cmd.addEventListener('focus', () => { cmd.placeholder = 'type help'; renderGhost(); });
  cmd.addEventListener('blur', () => { cmd.placeholder = ''; renderGhost(); });
  $('#prompt-form').addEventListener('submit', (e) => e.preventDefault());
  /* the whole prompt line reads as the text field (cursor:text), so a click anywhere on it focuses the input */
  $('#prompt-form').addEventListener('click', (e) => { if (!e.target.closest('input, button, a') && d.activeElement !== cmd) cmd.focus(); });
  $$('.cmd-chip').forEach((chip) => chip.addEventListener('click', (e) => {
    e.preventDefault();
    const via = e.detail === 0 ? 'key' : 'pointer';
    const text = chip.dataset.cmd;
    typeInto(text, via === 'pointer' && !reduce.matches).then((ok) => { if (ok) run(text, via, chip); });
  }));

  const doorActivate = (door, via) => {
    const name = door.dataset.section;
    if (current === name) { lastTrigger = door; closeDrawer({ via }); return; }
    const animate = via === 'pointer' && !reduce.matches && promptOnScreen;
    typeInto(`cat ${name}`, animate).then((ok) => { if (ok) openDrawer(name, { via, trigger: door, fromDoor: via === 'pointer' }); });
  };
  doors.forEach((door) => door.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    doorActivate(door, e.detail === 0 ? 'key' : 'pointer');
  }));

  /* bottom-sheet drag (phone): 1:1 tracking, rubber-band past the top, velocity-projected dismiss */
  const rubber = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * over);
  const project = (v, rate = 0.99) => (v / 1000) * rate / (1 - rate);
  const attachDrag = (dlg, zones) => {
    let st = null;
    const down = (e) => {
      if (!phone.matches || e.button > 0 || e.target.closest('button, a, input')) return;
      st = { y0: e.clientY, y: 0, drag: false, id: e.pointerId, zone: e.currentTarget, samples: [{ y: e.clientY, t: e.timeStamp }] };
    };
    const move = (e) => {
      if (!st || e.pointerId !== st.id) return;
      const dy = e.clientY - st.y0;
      if (!st.drag) { if (Math.abs(dy) < 8) return; st.drag = true; st.zone.setPointerCapture(e.pointerId); dlg.classList.add('dragging'); }
      const h = dlg.offsetHeight;
      st.y = dy < 0 ? -rubber(-dy, h) : dy;
      dlg.style.transform = `translateY(${st.y}px)`;
      st.samples.push({ y: e.clientY, t: e.timeStamp });
      while (st.samples.length > 2 && e.timeStamp - st.samples[0].t > 100) st.samples.shift();
    };
    const up = (e) => {
      if (!st || e.pointerId !== st.id) return;
      const s = st; st = null;
      if (!s.drag) return;
      dlg.classList.remove('dragging');
      const a = s.samples[0], b = s.samples[s.samples.length - 1];
      const v = ((b.y - a.y) / Math.max(1, b.t - a.t)) * 1000;
      const h = dlg.offsetHeight;
      const dismiss = s.y + project(v) > h * 0.5;
      const remaining = dismiss ? h - s.y : Math.abs(s.y);
      const dur = reduce.matches ? 0 : Math.round(Math.max(140, Math.min(260, dismiss && v > 0 ? (remaining / v) * 1000 : 260)));
      dlg.style.transition = dur ? `transform ${dur}ms var(--ease-drawer)` : 'none';
      requestAnimationFrame(() => { dlg.style.transform = dismiss ? 'translateY(100%)' : 'translateY(0px)'; });
      setTimeout(() => {
        if (dismiss) { dlg.classList.add('instant'); lastTrigger = lastTrigger || doorFor(dlg.dataset.section); dlg.close(); }
        dlg.style.transition = ''; dlg.style.transform = '';
      }, dur + 20);
    };
    zones.forEach((z) => {
      z.addEventListener('pointerdown', down);
      z.addEventListener('pointermove', move);
      z.addEventListener('pointerup', up);
      z.addEventListener('pointercancel', up);
    });
  };

  const canDialog = typeof HTMLDialogElement === 'function' && 'showModal' in HTMLDialogElement.prototype;
  if (canDialog) {
    SECTIONS.forEach((name) => {
      const sec = d.getElementById(name);
      if (!sec) return;
      const dlg = d.createElement('dialog');
      dlg.className = 'drawer';
      dlg.dataset.section = name;
      dlg.setAttribute('aria-labelledby', `${name}-h`);
      dlg.style.setProperty('--hue', `var(--${name})`);
      const grab = d.createElement('div');
      grab.className = 'grab';
      grab.setAttribute('aria-hidden', 'true');
      const head = $('.panel-head', sec);
      const close = d.createElement('button');
      close.type = 'button';
      close.className = 'icon-btn close-btn';
      close.setAttribute('aria-label', `Close ${LABEL[name]}`);
      close.innerHTML = '<svg aria-hidden="true" focusable="false"><use href="#i-close"/></svg>';
      close.addEventListener('click', (e) => closeDrawer({ via: e.detail === 0 ? 'key' : 'pointer' }));
      head.append(close);
      dlg.append(grab, sec);
      d.body.append(dlg);
      dlg.addEventListener('cancel', () => dlg.classList.add('instant'));
      dlg.addEventListener('close', () => afterClose(name, dlg));
      dlg.addEventListener('click', (e) => {
        if (e.target !== dlg || inRect(dlg.getBoundingClientRect(), e.clientX, e.clientY)) return;
        const door = doors.find((x) => inRect(x.getBoundingClientRect(), e.clientX, e.clientY));
        if (door) doorActivate(door, 'pointer');
        else closeDrawer({ via: 'pointer' });
      });
      drawers[name] = dlg;
      attachDrag(dlg, [grab, head]);
    });
    /* a non-modal drawer has no backdrop: a click outside it, and outside the
       prompt, the doors and the status line, closes it */
    d.addEventListener('click', (e) => {
      if (!current) return;
      const dlg = drawers[current];
      if (!dlg || dlg._modal || dlg.contains(e.target)) return;
      if (e.target.closest('.prompt, .try, .door, .statusline, dialog, a[href^="#"]')) return;
      closeDrawer({ via: 'pointer' });
    });
    root.classList.add('drawers-ready');
  } else {
    /* no <dialog>: sections stay in the page; doors and chips scroll to them */
    openDrawer = (name, opts = {}) => {
      if (opts.filter) applyFilter(name, opts.filter);
      if (opts.row) revealRow(opts.row);
      else { const h = $(`#${name}-h`); if (h) { h.scrollIntoView({ block: 'start' }); h.focus({ preventScroll: true }); } }
    };
    closeDrawer = () => {};
  }
  slugs = $$(ROW).filter((x) => x.dataset.slug).map((x) => x.dataset.slug);

  /* routing: hash <-> drawer, the back button closes */
  const route = (hash, via) => {
    let id = (hash || '').replace(/^#/, '');
    try { id = decodeURIComponent(id); } catch (e) { return false; }
    id = id.split('&')[0].split('/')[0];
    if (SECTIONS.includes(id)) { openDrawer(id, { via }); return true; }
    if (/^(talk|post)-/.test(id)) {
      const el = d.getElementById(id);
      if (isRow(el)) { openDrawer(id.startsWith('talk-') ? 'talks' : 'writing', { via, row: el }); return true; }
    }
    if (id === 'links') { const l = $('.elsewhere'); if (l) l.scrollIntoView({ block: 'center' }); return true; }
    return legacy(id, via);
  };
  /* ids the old console home exposed: a talk record id, the CV sections,
     #terminal. An old bookmark or shared /#<id> lands on the same content:
     the talk's family row, the CV drawer at that section, the prompt. The
     hash is rewritten to the current one first, so Back does not reopen it. */
  const LEGACY = {
    'terminal': 'prompt', 'terminal-input': 'prompt', 'terminal-title': 'prompt',
    'now-title': 'now', 'talks-title': 'talks', 'writing-title': 'writing', 'links-label': 'links',
    'talks-leads-title': 'leads', 'additional-appearances-under-reconstruction': 'leads',
    'earlier-nyc-postgresql-conference': 'leads', 'cposc-automation-talk': 'leads', 'nyc-philadelphia-meetups': 'leads',
    'cv-title': 'cv', 'professional-record': 'cv-roles', 'role-lore': 'cv-roles', 'role-dbre': 'cv-roles',
    'staff-data-engineer-lore': 'cv-roles', 'senior-database-reliability-engineer-omniti-to-credativ-to-instaclustr-netapp': 'cv-roles',
    'selected-independent-work': 'cv-work', 'selected-writing': 'cv-writing', 'speaking': 'cv-speaking', 'education': 'cv-edu'
  };
  const rehash = (h) => history.replaceState(history.state, '', location.pathname + location.search + h);
  /* on first load the prompt is still hidden (.js-only until c-ready) and the
     browser's own fragment scroll runs at load, so the scroll and focus wait
     for load and two frames */
  const settle = (fn) => { const run = () => requestAnimationFrame(() => requestAnimationFrame(fn)); if (d.readyState === 'complete') run(); else addEventListener('load', run, { once: true }); };
  const legacy = (id, via) => {
    let row = $$('details.row[data-records]').find((x) => x.dataset.records.split(' ').includes(id));
    if (!row) { const el = d.getElementById(`talk-${id}`); if (el && el.matches('details.row')) row = el; }
    if (row) { rehash(`#${row.id}`); openDrawer('talks', { via, row }); return true; }
    const to = LEGACY[id];
    if (!to) return false;
    if (to === 'prompt') { rehash(''); settle(() => { $('.prompt').scrollIntoView({ block: 'center' }); cmd.focus({ preventScroll: true }); }); return true; }
    if (to === 'links') return route('#links', via);
    const name = to === 'leads' ? 'talks' : to.split('-')[0];
    rehash(`#${name}`);
    openDrawer(name, { via });
    const target = to === 'leads' ? $('#talks details.leads') : to.startsWith('cv-') ? d.getElementById(`home-${to}-h`) : null;
    if (target) {
      if (target.matches('details')) target.open = true;
      settle(() => target.scrollIntoView({ block: 'center' }));
    }
    return true;
  };
  addEventListener('popstate', () => {
    if (ignorePop) { ignorePop = false; return; }
    pushed = false;
    if (!route(location.hash, 'nav') && current) { lastTrigger = null; closeDrawer({ via: 'nav' }); }
  });
  d.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const hash = a.getAttribute('href');
    const id = hash.slice(1);
    if (!SECTIONS.includes(id) && !/^(talk|post)-/.test(id)) return;
    if (!SECTIONS.includes(id) && !isRow(d.getElementById(id))) return;
    e.preventDefault();
    const via = e.detail === 0 ? 'key' : 'pointer';
    lastTrigger = a;
    const text = SECTIONS.includes(id) ? `cat ${id}` : `open ${id.replace(/^(talk|post)-/, '')}`;
    const animate = via === 'pointer' && !reduce.matches && !a.closest('dialog') && promptOnScreen;
    typeInto(text, animate).then((ok) => { if (ok) route(hash, via); });
  });
  renderGhost();
  if (location.hash) route(location.hash, 'key');
  /* the prompt is the page's one input, so it takes focus once the page has
     loaded, unless a hash is routing somewhere else. Phones never: the
     prompt is hidden there and a keyboard would pop. */
  else if (!phone.matches) {
    settle(() => { if (!current && !isTyping(d.activeElement) && cmd.offsetParent) cmd.focus({ preventScroll: true }); });
  }
  booting = false;
} else {
  /* /talks/ and /cv/: a #talk-<id> (or any row id) opens that row in place */
  const openFromHash = () => {
    let id = (location.hash || '').slice(1);
    try { id = decodeURIComponent(id); } catch (e) { return; }
    const el = id && d.getElementById(id);
    if (isRow(el)) revealRow(el);
  };
  addEventListener('hashchange', openFromHash);
  openFromHash();
}

/* ---------- post contents: mark the section in view (no motion) ---------- */
const tocLinks = $$('.toc-list a[href^="#"]');
if (tocLinks.length) {
  const heads = [];
  tocLinks.forEach((a) => { let id = a.getAttribute('href').slice(1); try { id = decodeURIComponent(id); } catch (e) { /* keep raw */ } const h = d.getElementById(id); if (h && !heads.includes(h)) heads.push(h); });
  let cur = null, queued = false;
  const mark = () => {
    queued = false;
    const line = Math.min(160, innerHeight * 0.25);
    let hit = null;
    for (const h of heads) { if (h.getBoundingClientRect().top <= line) hit = h; else break; }
    const id = hit ? hit.id : null;
    if (id === cur) return;
    cur = id;
    tocLinks.forEach((a) => { if (id && a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(mark); } }, { passive: true });
  addEventListener('resize', mark);
  mark();
}

/* ---------- 404: say which path was asked for ---------- */
const nfPath = (() => { try { return decodeURI(location.pathname); } catch (e) { return location.pathname; } })() || '/';
$$('[data-nf-path]').forEach((el) => { el.textContent = nfPath; el.classList.add('is-set'); });

/* ---------- palette ( / or Ctrl/Cmd-K ) ---------- */
const pal = $('#palette'), palInput = $('#pal-input'), palList = $('#pal-list');
let items = [], results = [], active = 0, palReturn = null;
function go(url) { location.href = url; }
/* where focus returns after a drawer opened from the palette closes: the element
   that had focus when the palette opened, unless that was inside a drawer
   (then openDrawer keeps the trigger it already has) */
const palTrigger = () => (palReturn && palReturn.isConnected && !palReturn.closest('dialog') ? palReturn : null);
function buildIndex() {
  let idx = { talks: [], posts: [], links: [] };
  try { idx = Object.assign(idx, JSON.parse($('#search-index').textContent)); } catch (e) { /* keep the empty index */ }
  items = [];
  SECTIONS.forEach((name) => {
    const door = doorFor(name);
    const sub = door ? `${$('.door-line', door).textContent}${$('.door-sub', door) ? `. ${$('.door-sub', door).textContent}` : ''}` : (name === 'writing' ? 'All posts' : name === 'now' ? 'What I am doing now' : `The ${LABEL[name]} page`);
    items.push({ kind: 'Section', group: 'Sections', title: LABEL[name], sub, keys: [name, ...aliasesOf(name)].join(' '), hue: name, cmd: isHome ? `cat ${name}` : null,
      run: () => { if (isHome && openDrawer) openDrawer(name, { via: 'key', trigger: palTrigger() || door }); else go(PAGE_FOR[name]); } });
  });
  if (!isHome) items.push({ kind: 'Section', group: 'Sections', title: 'Home', sub: 'payalsingh.me', keys: 'home index start', run: () => go('/') });
  idx.talks.forEach((t) => items.push({ kind: 'Talk', group: 'Talks', title: t.title, sub: t.sub, keys: t.keys, shape: t.shape, cmd: isHome ? `open ${t.slug}` : null,
    run: () => {
      const el = d.getElementById(`talk-${t.slug}`);
      if (el && isHome && openDrawer) openDrawer('talks', { via: 'key', row: el, trigger: palTrigger() });
      else if (el) { history.replaceState(null, '', `#talk-${t.slug}`); revealRow(el); }
      else go(t.url);
    } }));
  idx.posts.forEach((p) => items.push({ kind: 'Post', group: 'Writing', title: p.title, sub: p.sub, keys: p.keys, shape: p.shape, cmd: isHome ? `open ${p.slug}` : null,
    run: () => {
      const el = d.getElementById(`post-${p.slug}`);
      if (el && isHome && openDrawer) openDrawer('writing', { via: 'key', row: el, trigger: palTrigger() });
      else go(p.url);
    } }));
  items.push({ kind: 'Action', group: 'Actions', title: 'Download CV (PDF)', sub: 'payalsingh.me/data/cv.pdf', keys: 'resume cv pdf download', run: () => go('/data/cv.pdf') });
  items.push({ kind: 'Action', group: 'Actions', get title() { return `Switch to ${effectiveTheme() === 'dark' ? 'light' : 'dark'} theme`; }, sub: 'Dark or light, remembered on this device', keys: 'theme dark light mode', run: () => setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark') });
  items.push({ kind: 'Action', group: 'Actions', title: 'Keyboard shortcuts', sub: 'And how to turn single-key shortcuts off', keys: 'help keys shortcuts commands', run: () => openHelp() });
  idx.links.forEach((l) => items.push({ kind: 'Link', group: 'Links', title: l.title, sub: l.url.replace(/^mailto:/, '').replace(/^https?:\/\//, '').replace(/\/$/, ''), keys: l.url, run: () => go(l.url) }));
}
function search(q) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return items.map((it, i) => ({ it, score: 0, i }));
  const res = [];
  items.forEach((it, i) => {
    const title = it.title.toLowerCase();
    const hay = `${title} ${(it.sub || '').toLowerCase()} ${(it.keys || '').toLowerCase()}`;
    let score = 0;
    for (const w of words) {
      const ti = title.indexOf(w);
      if (ti === 0) score += 4;
      else if (ti > 0) score += /[\s:(]/.test(title[ti - 1]) ? 3 : 2;
      else if (hay.includes(w)) score += 1;
      else return;
    }
    res.push({ it, score, i });
  });
  return res.sort((a, b) => b.score - a.score || a.i - b.i);
}
/* match on the raw text, then escape each piece, so a query can never split an
   entity ("amp" in "&amp;") or a tag; one alternation, longest word first */
function hl(text, q) {
  const words = [...new Set(q.toLowerCase().split(/\s+/).filter((w) => w.length > 1))].sort((a, b) => b.length - a.length);
  if (!words.length) return esc(text);
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  return String(text).split(re).map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part))).join('');
}
function renderPal() {
  const q = palInput.value.trim();
  results = search(q);
  active = Math.min(active, Math.max(0, results.length - 1));
  if (!results.length) {
    palList.innerHTML = `<li class="pal-empty" role="presentation">No match for “${esc(q)}”. Try a venue, a city, or a topic like security.</li>`;
    palInput.removeAttribute('aria-activedescendant');
    return;
  }
  let html = '', lastGroup = null;
  results.forEach((r, idx) => {
    const it = r.it;
    if (!q && it.group !== lastGroup) { html += `<li class="pal-group" role="presentation">${esc(it.group)}</li>`; lastGroup = it.group; }
    const ico = it.hue ? `<span class="dot" style="--hue:var(--${it.hue})"></span>` : it.shape ? shapeSvg(it.shape) : '';
    html += `<li class="pal-opt" role="option" id="pal-o-${idx}" data-idx="${idx}" aria-selected="${idx === active}"><span class="pal-ico" aria-hidden="true">${ico}</span><span><span class="pal-title">${hl(it.title, q)}</span>${it.sub ? `<span class="pal-sub">${hl(it.sub, q)}</span>` : ''}</span><span class="pal-kind">${esc(it.kind)}</span></li>`;
  });
  palList.innerHTML = html;
  palInput.setAttribute('aria-activedescendant', `pal-o-${active}`);
}
function setActive(i, scroll) {
  if (!results.length) return;
  active = (i + results.length) % results.length;
  $$('.pal-opt', palList).forEach((o) => o.setAttribute('aria-selected', String(+o.dataset.idx === active)));
  palInput.setAttribute('aria-activedescendant', `pal-o-${active}`);
  if (scroll) { const el = $(`#pal-o-${active}`); if (el) el.scrollIntoView({ block: 'nearest' }); }
}
function choose(i) {
  const r = results[i];
  if (!r) return;
  pal._ran = true;
  pal.close();
  if (r.it.cmd && cmdInput) { typingToken++; cmdInput.value = r.it.cmd; renderGhost(); }
  r.it.run();
}
function openPalette() {
  if (!pal || pal.open || typeof pal.showModal !== 'function') return;
  palReturn = d.activeElement;
  pal._ran = false;
  palInput.value = ''; active = 0;
  renderPal();
  pal.showModal();
  palInput.focus();
}
if (pal) {
  pal.addEventListener('close', () => { if (!pal._ran && palReturn && palReturn.isConnected) palReturn.focus({ preventScroll: true }); });
  pal.addEventListener('click', (e) => { if (e.target === pal && !inRect(pal.getBoundingClientRect(), e.clientX, e.clientY)) pal.close(); });
  $('[data-close]', pal).addEventListener('click', () => pal.close());
  palInput.addEventListener('input', () => { active = 0; renderPal(); palList.scrollTop = 0; });
  palInput.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1, true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1, true); }
    else if (e.key === 'Home' && !palInput.value) { e.preventDefault(); setActive(0, true); }
    else if (e.key === 'End' && !palInput.value) { e.preventDefault(); setActive(results.length - 1, true); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
  });
  palList.addEventListener('pointermove', (e) => { const o = e.target.closest('.pal-opt'); if (o && +o.dataset.idx !== active) setActive(+o.dataset.idx, false); });
  palList.addEventListener('click', (e) => { const o = e.target.closest('.pal-opt'); if (o) choose(+o.dataset.idx); });
}
$$('[data-act="search"]').forEach((b) => b.addEventListener('click', openPalette));

/* ---------- help + shortcut switch (WCAG 2.1.4) ---------- */
const help = $('#help'), keysToggle = $('#keys-toggle');
const KEYS_STORE = 'console.keysEnabled';
let keysOn = store.get(KEYS_STORE) !== 'off';
if (keysToggle) {
  keysToggle.checked = keysOn;
  keysToggle.addEventListener('change', () => { keysOn = keysToggle.checked; store.set(KEYS_STORE, keysOn ? 'on' : 'off'); });
}
/* a page restored from the back/forward cache (or open in another tab) still
   holds the theme and shortcut setting it had; re-read both so a change made
   on another page wins, and the single-key off switch stays off */
function syncStored() {
  const t = store.get('ps-theme');
  if (t === 'light' || t === 'dark') root.dataset.theme = t; else delete root.dataset.theme;
  syncThemeBtns();
  syncThemeColor();
  keysOn = store.get(KEYS_STORE) !== 'off';
  if (keysToggle) keysToggle.checked = keysOn;
}
window.addEventListener('pageshow', (e) => { if (e.persisted) syncStored(); });
window.addEventListener('storage', (e) => { if (e.key === null || e.key === 'ps-theme' || e.key === KEYS_STORE) syncStored(); });
let helpReturn = null;
function openHelp() { if (!help || help.open || typeof help.showModal !== 'function') return; helpReturn = d.activeElement; help.showModal(); }
if (help) {
  help.addEventListener('close', () => { if (helpReturn && helpReturn.isConnected) helpReturn.focus({ preventScroll: true }); });
  $('[data-close]', help).addEventListener('click', () => help.close());
  help.addEventListener('click', (e) => { if (e.target === help && !inRect(help.getBoundingClientRect(), e.clientX, e.clientY)) help.close(); });
}
$$('[data-act="keys"]').forEach((b) => b.addEventListener('click', openHelp));

const isTyping = (t) => !!(t && t.closest && t.closest('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]), textarea, select, [contenteditable=""], [contenteditable="true"]'));
d.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); if (pal && pal.open) pal.close(); else openPalette(); return; }
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
  if (e.key === 'Escape' && isHome && current && !(pal && pal.open) && !(help && help.open) && !isTyping(e.target)) { closeDrawer({ via: 'key' }); return; }
  if (isTyping(e.target) || !keysOn || (pal && pal.open) || (help && help.open)) return;
  const k = e.key;
  if (k === '/') { e.preventDefault(); openPalette(); }
  else if (k === '?') { e.preventDefault(); openHelp(); }
  else if (k === '`' && isHome && cmdInput && cmdInput.offsetParent) { e.preventDefault(); if (current) { lastTrigger = cmdInput; closeDrawer({ via: 'key' }); } cmdInput.focus(); cmdInput.scrollIntoView({ block: 'nearest' }); }
  else if (/^[1-4]$/.test(k)) {
    e.preventDefault();
    const name = SECTIONS[+k - 1];
    if (!isHome) { go(PAGE_FOR[name]); return; }
    if (current === name) closeDrawer({ via: 'key' });
    else { typingToken++; cmdInput.value = `cat ${name}`; renderGhost(); openDrawer(name, { via: 'key', trigger: doorFor(name) }); }
  }
  /* type anywhere: on the home page, with the prompt in view and no drawer
     open, any other printable key focuses the prompt and the browser's own
     default action then inserts it, so Shift, dead keys and IMEs all keep
     working. Space stays a page scroll. */
  else if (isHome && cmdInput && !current && promptOnScreen && k.length === 1 && k !== ' ' && cmdInput.offsetParent) {
    cmdInput.focus({ preventScroll: true });
  }
});

addEventListener('beforeprint', () => $$('details').forEach((x) => { x.open = true; }));

buildIndex();
root.classList.add('c-ready');
})();
