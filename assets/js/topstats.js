/**
 * topstats.js: topbar telemetry and the visitor top strip (V1).
 *
 *   setupTopstats({ term, talks, timeline, reducedMotion }) -> { record(kind, id), refresh() }
 *
 * Topbar [data-topstats], three real facts and no clock:
 *   [data-stat-role]       "at Lore since 2026-06" from the timeline's open
 *                          cv entry, with the LED span already in the markup
 *   [data-stat-next-talk]  "next talk in 28d 04h" from the upcoming record
 *                          in talks.json, days and hours only, refreshed
 *                          once a minute and when the tab becomes visible;
 *                          never on a timer under reduced motion
 *   [data-stat-uptime]     "up 13y 244d since 2013" computed once from the
 *                          earliest cv entry (the cv says 2013; the epoch is
 *                          taken as 2013-01-01)
 *
 * Top strip [data-top] at the bottom of the terminal pane: viewport size,
 * seconds on page, panes viewed, commands run, keys pressed, and one line
 * saying nothing is stored or sent. Everything is counted from events on
 * this page (resize, keydown, focusin on a pane, the console:command event
 * terminal.js dispatches); counting a keydown never reads layout, and the
 * render it triggers (which does, via window.innerWidth/innerHeight) is
 * throttled to at most once per 250ms so a fast run of keystrokes forces at
 * most one immediate render plus one trailing one, not one per key. Elapsed
 * time refreshes every 10s, or only on events under reduced motion. An open
 * strip at 1024px and up, a collapsed disclosure below; the toggle works in
 * both. Nothing is stored or sent anywhere.
 *
 * Both intervals live only while the tab is visible: visibilitychange clears
 * them when the tab is hidden and starts them again when it comes back, so a
 * backgrounded tab neither re-renders nor reads window.innerWidth for layout.
 */

const ELAPSED_MS = 10000;
const MINUTE_MS = 60000;
const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const DESKTOP = '(min-width: 1024px)';

export function setupTopstats({ term, talks, timeline, reducedMotion }) {
  void term;
  const records = Array.isArray(timeline) ? timeline : [];
  const talkList = Array.isArray(talks) ? talks : [];

  // ---- Topbar telemetry -------------------------------------------------
  const stats = document.querySelector('[data-topstats]');
  const roleEl = stats ? stats.querySelector('[data-stat-role]') : null;
  const roleWrap = stats ? stats.querySelector('[data-stat="role"]') : null;
  const nextEl = stats ? stats.querySelector('[data-stat-next-talk]') : null;
  const upEl = stats ? stats.querySelector('[data-stat-uptime]') : null;

  const role = records.find((e) => e.kind === 'cv' && e.end == null && e.date);
  if (roleEl && roleWrap) {
    if (role) {
      const org = String(role.text).split(',').pop().trim();
      roleEl.textContent = `at ${org} since ${role.date}`;
    } else {
      roleWrap.hidden = true;
    }
  }

  const nextTalk = talkList
    .filter((t) => t.status === 'upcoming' && t.record_type === 'sourced' && t.date)
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0] || null;

  function refreshNext() {
    if (!nextEl) return;
    const text = nextTalk ? countdown(nextTalk.date, new Date()) : null;
    if (text == null) {
      nextEl.hidden = true;
      nextEl.textContent = '';
    } else {
      nextEl.hidden = false;
      nextEl.textContent = text;
    }
  }
  refreshNext();

  const firstRole = records
    .filter((e) => e.kind === 'cv' && e.date)
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0] || null;
  if (upEl) {
    if (firstRole) {
      const startYear = parseInt(String(firstRole.date).slice(0, 4), 10);
      const { years, days } = uptime(new Date(startYear, 0, 1), new Date());
      upEl.textContent = `up ${years}y ${days}d since ${startYear}`;
    } else {
      upEl.hidden = true;
    }
  }

  if (stats) stats.hidden = false;

  // ---- Visitor top strip ----------------------------------------------
  const top = document.querySelector('[data-top]');
  const toggle = top ? top.querySelector('[data-top-toggle]') : null;
  const body = top ? top.querySelector('[data-top-body]') : null;
  const fields = {
    viewport: top ? top.querySelector('[data-top-viewport]') : null,
    elapsed: top ? top.querySelector('[data-top-elapsed]') : null,
    panes: top ? top.querySelector('[data-top-panes]') : null,
    commands: top ? top.querySelector('[data-top-commands]') : null,
    keys: top ? top.querySelector('[data-top-keys]') : null,
  };

  const startedAt = Date.now();
  const panesViewed = new Set();
  let commands = 0;
  let keys = 0;

  function render() {
    if (!top) return;
    if (fields.viewport) fields.viewport.textContent = `${window.innerWidth}x${window.innerHeight}`;
    if (fields.elapsed) fields.elapsed.textContent = `up ${elapsedText(Date.now() - startedAt)}`;
    if (fields.panes) fields.panes.textContent = plural(panesViewed.size, 'pane');
    if (fields.commands) fields.commands.textContent = plural(commands, 'cmd');
    if (fields.keys) fields.keys.textContent = plural(keys, 'key');
  }

  // record() runs on every keydown, so it must never force a layout read
  // itself; render() does (window.innerWidth/innerHeight), so it is
  // throttled to at most once per RENDER_THROTTLE_MS (leading call for a
  // single keypress to still feel immediate, one trailing call to flush
  // whatever counted during a fast run of keys).
  const RENDER_THROTTLE_MS = 250;
  let renderThrottle = null;
  let renderPending = false;

  function scheduleRender() {
    if (renderThrottle !== null) {
      renderPending = true;
      return;
    }
    render();
    renderThrottle = setTimeout(() => {
      renderThrottle = null;
      if (renderPending) {
        renderPending = false;
        render();
      }
    }, RENDER_THROTTLE_MS);
  }

  function record(kind, id) {
    if (kind === 'pane') panesViewed.add(id || 'pane');
    else if (kind === 'command') commands++;
    else if (kind === 'key') keys++;
    else return false;
    scheduleRender();
    return true;
  }

  if (top && toggle && body) {
    const desktop = window.matchMedia(DESKTOP);
    const setExpanded = (open) => {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      body.hidden = !open;
    };
    setExpanded(desktop.matches);
    desktop.addEventListener('change', (e) => setExpanded(e.matches));
    toggle.addEventListener('click', () => {
      setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
    });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 200);
    });
    document.addEventListener('keydown', () => record('key'));
    document.addEventListener('focusin', (e) => {
      const pane = e.target instanceof Element ? e.target.closest('.pane') : null;
      if (pane && pane.id) record('pane', pane.id);
    });
    document.addEventListener('console:command', () => record('command'));

    render();
    top.hidden = false;
  }

  function refresh() {
    refreshNext();
    render();
    return true;
  }

  // ---- Timers -----------------------------------------------------------
  // Both intervals only exist while the tab is visible: a backgrounded tab
  // must not keep re-rendering, and render() reads window.innerWidth /
  // innerHeight, which forces layout on every tick. Under reduced motion
  // neither timer is ever started and the values move on events only.
  const wantsNext = !reducedMotion && Boolean(nextEl) && Boolean(nextTalk);
  const wantsRender = !reducedMotion && Boolean(top && toggle && body);
  let nextTimer = null;
  let renderTimer = null;

  function startTimers() {
    if (wantsNext && nextTimer === null) nextTimer = setInterval(refreshNext, MINUTE_MS);
    if (wantsRender && renderTimer === null) renderTimer = setInterval(render, ELAPSED_MS);
  }

  function stopTimers() {
    if (nextTimer !== null) { clearInterval(nextTimer); nextTimer = null; }
    if (renderTimer !== null) { clearInterval(renderTimer); renderTimer = null; }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopTimers();
    } else {
      refresh();
      startTimers();
    }
  });
  if (!document.hidden) startTimers();

  return { record, refresh };
}

/** "28d 04h" until local midnight of an ISO day; "today" on the day; null once past. */
function countdown(iso, now) {
  const [y, m, d] = String(iso).split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const diff = target - now;
  if (diff >= 0) {
    const days = Math.floor(diff / DAY_MS);
    const hours = Math.floor((diff % DAY_MS) / HOUR_MS);
    return `next talk in ${days}d ${String(hours).padStart(2, '0')}h`;
  }
  const sameDay = now.getFullYear() === y && now.getMonth() === m - 1 && now.getDate() === d;
  return sameDay ? 'next talk today' : null;
}

/** Full years since `start`, and days since the last anniversary. */
function uptime(start, now) {
  let years = now.getFullYear() - start.getFullYear();
  const anniversary = new Date(start.getFullYear() + years, start.getMonth(), start.getDate());
  if (anniversary > now) {
    years--;
    anniversary.setFullYear(anniversary.getFullYear() - 1);
  }
  const days = Math.floor((now - anniversary) / DAY_MS);
  return { years: Math.max(0, years), days: Math.max(0, days) };
}

function elapsedText(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds}s`;
  const hours = Math.floor(minutes / 60);
  if (hours === 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${hours}h ${String(minutes % 60).padStart(2, '0')}m`;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
