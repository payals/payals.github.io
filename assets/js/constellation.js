/**
 * constellation.js: the signature canvas in the terminal pane's idle area.
 *
 * Contract (scratchpad/phase2/PLAN.md, module table):
 *   setupConstellation({ term, posts, talks, reducedMotion }) ->
 *     { pause(), resume(), refresh(), destroy() }
 * refresh() refits the wrapper (show or hide by the space it has); zoom.js
 * calls it through main.js after the grid changes.
 *
 * Nodes are the posts (squares, --kind-post) and the sourced talks
 * (circles, --kind-talk), one ring per year, oldest ring innermost, each
 * ring turning at its own pace of at most 2.4 degrees per second. Edges
 * join two items that share a tag (posts) or a year (any). Hover shows the
 * title in [data-constellation-tip] and lights the item's edges and
 * neighbours; click runs the item's `cat` command through term.run (C1).
 *
 * The wrapper [data-constellation] sits between the scrollback and the
 * prompt and takes what the scrollback leaves (flex rules in
 * features/constellation.css). It hides itself under 120px and below
 * 768px, and comes back when the scrollback is cleared. One static frame
 * under reduced motion, when the tab is hidden, or while the wrapper is
 * hidden. The canvas is never focusable and never reads keys.
 */

const MIN_HEIGHT = 120;
const HIT_RADIUS = 12;

export function setupConstellation({ term, posts, talks, reducedMotion }) {
  const wrap = document.querySelector('[data-constellation]');
  const canvas = wrap && wrap.querySelector('[data-constellation-canvas]');
  const tip = wrap && wrap.querySelector('[data-constellation-tip]');
  const scrollback = wrap && wrap.parentElement.querySelector('[data-scrollback]');
  const ctx = canvas && canvas.getContext && canvas.getContext('2d');
  if (!wrap || !tip || !scrollback || !ctx) return { pause: () => false, resume: () => false, refresh: () => false, destroy: () => false };

  const token = (name) => getComputedStyle(wrap).getPropertyValue(name).trim();
  const font = `12px ${token('--font-mono')}`;
  const ink = { line: token('--line'), strong: token('--line-strong'), dim: token('--ink-3') };

  const nodes = buildNodes(posts || [], talks || [], { post: token('--kind-post'), talk: token('--kind-talk') });
  const rings = buildRings(nodes);
  const edges = []; const adjacent = nodes.map(() => new Set());
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].year !== nodes[j].year && ![...nodes[i].tags].some((t) => nodes[j].tags.has(t))) continue;
      edges.push([i, j]); adjacent[i].add(j); adjacent[j].add(i);
    }
  }

  let size = { w: 0, h: 0 }; let raf = 0; let hovered = -1;
  const t0 = performance.now();

  function draw(now) {
    const { w, h } = size;
    const t = reducedMotion ? 0 : (now - t0) / 1000;
    const R = Math.min(w, h) / 2 - 20;
    for (const n of nodes) {
      const ring = rings[n.year];
      const a = ring.base + (n.slot * Math.PI * 2) / ring.count + ring.speed * t;
      n.x = w / 2 + R * ring.scale * Math.cos(a); n.y = h / 2 + R * ring.scale * Math.sin(a);
    }
    ctx.clearRect(0, 0, w, h);
    ctx.font = font; ctx.textBaseline = 'bottom'; ctx.lineWidth = 1;
    ctx.strokeStyle = ink.line; ctx.fillStyle = ink.dim;
    const years = Object.keys(rings);
    years.forEach((year, k) => {
      const r = Math.max(0, R * rings[year].scale);
      ctx.beginPath(); ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2); ctx.stroke();
      // Label a ring only when the next ring out leaves room for 12px text.
      if (k === years.length - 1 || R * (rings[years[k + 1]].scale - rings[year].scale) >= 14) ctx.fillText(year, w / 2 + 4, h / 2 - r - 2);
    });
    for (const [i, j] of edges) {
      const lit = hovered === i || hovered === j;
      ctx.strokeStyle = lit ? nodes[hovered].colour : ink.strong;
      ctx.globalAlpha = hovered < 0 ? 0.5 : lit ? 0.95 : 0.15;
      ctx.lineWidth = lit ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
    }
    nodes.forEach((n, i) => {
      const s = i === hovered ? 6 : 4;
      ctx.globalAlpha = hovered < 0 || i === hovered || adjacent[hovered].has(i) ? 1 : 0.35;
      ctx.fillStyle = n.colour; ctx.beginPath();
      if (n.kind === 'talk') ctx.arc(n.x, n.y, s, 0, Math.PI * 2);
      else ctx.rect(n.x - s, n.y - s, s * 2, s * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function frame(now) { draw(now); raf = requestAnimationFrame(frame); }
  function pause() { if (!raf) return false; cancelAnimationFrame(raf); raf = 0; return true; }
  function resume() {
    if (wrap.hidden || document.hidden || !size.w) return false;
    if (reducedMotion) draw(t0); else if (!raf) raf = requestAnimationFrame(frame);
    return true;
  }

  /** Show the wrapper when the pane leaves it at least MIN_HEIGHT, else hide it. */
  function fit() {
    wrap.hidden = window.innerWidth < 768;
    if (!wrap.hidden && wrap.clientHeight < MIN_HEIGHT) wrap.hidden = true;
    if (wrap.hidden) { pause(); hover(-1); }
  }

  function hitAt(e) {
    const box = canvas.getBoundingClientRect(); const x = e.clientX - box.left; const y = e.clientY - box.top;
    let best = -1; let bestD = HIT_RADIUS;
    nodes.forEach((n, i) => { const d = Math.hypot(n.x - x, n.y - y); if (d < bestD) { best = i; bestD = d; } });
    return best;
  }

  function hover(i) {
    if (i === hovered) return;
    hovered = i;
    canvas.classList.toggle('is-hot', i >= 0);
    tip.hidden = i < 0;
    if (i >= 0) {
      const n = nodes[i];
      tip.replaceChildren(span(`seg--${n.kind}`, `[${n.kind}] `), span('seg--year', n.when, n.year), ` ${n.title}${n.where ? ` · ${n.where}` : ''}`);
      const left = n.x + 12 + tip.offsetWidth > size.w ? n.x - 12 - tip.offsetWidth : n.x + 12;
      const top = n.y + 12 + tip.offsetHeight > size.h ? n.y - 12 - tip.offsetHeight : n.y + 12;
      tip.style.left = `${Math.max(0, left)}px`; tip.style.top = `${Math.max(0, top)}px`;
    }
    if (reducedMotion && size.w) draw(t0);
  }

  const ro = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (height < MIN_HEIGHT) { fit(); return; }
    const dpr = window.devicePixelRatio || 1;
    size = { w: width, h: height };
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!resume()) draw(t0);
  });
  const mo = new MutationObserver(fit);
  const listeners = [
    [canvas, 'mousemove', (e) => hover(hitAt(e))],
    [canvas, 'mouseleave', () => hover(-1)],
    [canvas, 'click', (e) => { const i = hitAt(e); if (i >= 0) term.run(nodes[i].cmd); }],
    [document, 'visibilitychange', () => (document.hidden ? pause() : resume())],
    [window, 'resize', fit],
  ];
  for (const [el, type, fn] of listeners) el.addEventListener(type, fn);
  mo.observe(scrollback, { childList: true });
  ro.observe(wrap);
  fit();

  function destroy() {
    pause(); ro.disconnect(); mo.disconnect(); wrap.hidden = true;
    for (const [el, type, fn] of listeners) el.removeEventListener(type, fn);
    return true;
  }
  return { pause, resume, refresh: fit, destroy };
}

function span(className, text, year) {
  const el = Object.assign(document.createElement('span'), { className, textContent: text });
  if (year) el.dataset.year = year;
  return el;
}

function buildNodes(posts, talks, colour) {
  const out = [];
  for (const p of posts) {
    const year = String(p.date || '').slice(0, 4);
    if (/^\d{4}$/.test(year)) out.push({ kind: 'post', year, when: p.date, where: '', title: p.title, tags: new Set(p.tags || []), colour: colour.post, cmd: `cat writing/${p.slug}` });
  }
  for (const t of talks) {
    // Undated program listings carry their year in date_label, as in the talks pane.
    const when = t.date || t.date_label || '';
    const year = String(t.date || when.slice(-4)).slice(0, 4);
    if (t.record_type !== 'sourced' || !/^\d{4}$/.test(year)) continue;
    out.push({ kind: 'talk', year, when, where: t.venue || '', title: t.title, tags: new Set(), colour: colour.talk, cmd: `cat talks/${t.id}` });
  }
  return out;
}

/** One ring per year: oldest innermost, alternating direction, at most 2.4 deg/s. */
function buildRings(list) {
  const years = [...new Set(list.map((n) => n.year))].sort();
  const out = {};
  years.forEach((year, k) => {
    const members = list.filter((n) => n.year === year);
    members.forEach((n, slot) => { n.slot = slot; });
    const scale = years.length === 1 ? 0.6 : 0.28 + (0.72 * k) / (years.length - 1);
    out[year] = { scale, count: members.length, base: k * 1.1, speed: ((k % 2 ? -1 : 1) * (1.2 + 0.3 * k) * Math.PI) / 180 };
  });
  return out;
}
