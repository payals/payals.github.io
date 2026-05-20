/**
 * now.js — render the "now" panel.
 * Fetches data/now.json (static hand-edited fields) plus two live signals:
 *   • GitHub events API  → latest push commit
 *   • /feed.xml → latest blog post
 * Live signals are non-blocking; panel renders immediately with static content.
 */

import { esc } from './panels.js';

const GITHUB_EVENTS_URL = 'https://api.github.com/users/payals/events/public';
const BLOG_FEED_URL     = '/feed.xml';
const API_TIMEOUT_MS    = 4000;

/**
 * @param {HTMLElement} containerEl — the .panel-body element to render into
 */
export async function renderNow(containerEl) {
  // 1. Fetch static now.json first — required content
  let nowData;
  try {
    const r = await fetch('data/now.json');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    nowData = await r.json();
  } catch {
    nowData = {};
  }

  // 2. Render static section immediately
  renderStatic(nowData, containerEl);

  // 3. Render live-signals section (placeholder slots) — fill async
  const liveSection = renderLiveSignalsShell(containerEl);

  // 4. Kick off both live fetches in parallel, non-blocking
  const [commitResult, postResult] = await Promise.allSettled([
    withTimeout(fetchLatestCommit(), API_TIMEOUT_MS),
    withTimeout(fetchLatestPost(), API_TIMEOUT_MS),
  ]);

  fillCommitSlot(liveSection, commitResult);
  fillPostSlot(liveSection, postResult);
}

// ── Static section ────────────────────────────────────────────────────────

function renderStatic(data, containerEl) {
  // Header row with "last updated"
  if (data.updated) {
    const updated = document.createElement('p');
    updated.className = 'now-updated terminal-line--muted';
    updated.textContent = `last updated: ${data.updated}`;
    containerEl.appendChild(updated);
  }

  addDivider(containerEl);

  const sectionTitle = makeAccentHeading("what's true this month");
  containerEl.appendChild(sectionTitle);

  const fields = [
    { key: 'reading',  label: 'reading'  },
    { key: 'shipping', label: 'shipping' },
    { key: 'city',     label: 'city'     },
  ];

  let anyField = false;
  for (const { key, label } of fields) {
    if (data[key]) {
      containerEl.appendChild(makeField(label, data[key]));
      anyField = true;
    }
  }

  if (!anyField) {
    const placeholder = document.createElement('p');
    placeholder.className = 'terminal-line--muted';
    placeholder.textContent = '(fields coming soon)';
    containerEl.appendChild(placeholder);
  }
}

// ── Live signals section ──────────────────────────────────────────────────

function renderLiveSignalsShell(containerEl) {
  addDivider(containerEl);
  containerEl.appendChild(makeAccentHeading('live signals'));

  const wrapper = document.createElement('div');
  wrapper.className = 'now-live-signals';

  // Commit slot
  const commitSlot = document.createElement('div');
  commitSlot.className = 'now-signal now-signal--commit';
  const commitLoading = document.createElement('p');
  commitLoading.className = 'terminal-line--muted now-signal-loading';
  commitLoading.textContent = 'latest commit  ·  loading…';
  commitSlot.appendChild(commitLoading);
  wrapper.appendChild(commitSlot);

  // Post slot
  const postSlot = document.createElement('div');
  postSlot.className = 'now-signal now-signal--post';
  const postLoading = document.createElement('p');
  postLoading.className = 'terminal-line--muted now-signal-loading';
  postLoading.textContent = 'latest post  ·  loading…';
  postSlot.appendChild(postLoading);
  wrapper.appendChild(postSlot);

  containerEl.appendChild(wrapper);
  return wrapper;
}

function fillCommitSlot(wrapper, result) {
  const slot = wrapper.querySelector('.now-signal--commit');
  slot.innerHTML = '';

  if (result.status === 'rejected' || !result.value) {
    slot.appendChild(unavailable('latest commit'));
    return;
  }

  const { repo, message, time } = result.value;
  const line = document.createElement('p');
  line.className = 'now-signal-line';

  const label = document.createElement('span');
  label.className = 'now-signal-label';
  label.textContent = 'latest commit';

  const sep = document.createTextNode('  ·  ');

  const repoSpan = document.createElement('span');
  repoSpan.className = 'now-signal-value';
  repoSpan.textContent = repo;

  const timeSep = document.createTextNode('  ·  ');

  const timeSpan = document.createElement('span');
  timeSpan.className = 'terminal-line--muted';
  timeSpan.textContent = relativeTime(time);

  line.appendChild(label);
  line.appendChild(sep);
  line.appendChild(repoSpan);
  line.appendChild(timeSep);
  line.appendChild(timeSpan);
  slot.appendChild(line);

  if (message) {
    const msg = document.createElement('p');
    msg.className = 'now-signal-message terminal-line--muted';
    // Truncate to 72 chars per panel mockup spec
    msg.textContent = message.length > 72 ? message.slice(0, 72) + '…' : message;
    slot.appendChild(msg);
  }
}

function fillPostSlot(wrapper, result) {
  const slot = wrapper.querySelector('.now-signal--post');
  slot.innerHTML = '';

  if (result.status === 'rejected' || !result.value) {
    slot.appendChild(unavailable('latest post'));
    return;
  }

  const { title, url, date } = result.value;
  const line = document.createElement('p');
  line.className = 'now-signal-line';

  const label = document.createElement('span');
  label.className = 'now-signal-label';
  label.textContent = 'latest post';

  const sep = document.createTextNode('  ·  ');

  const link = document.createElement('a');
  link.className = 'now-signal-value';
  const validated = esc(url || '');
  link.href = validated === '#' ? '/blog/' : validated;
  link.textContent = title;

  const timeSep = document.createTextNode('  ·  ');

  const timeSpan = document.createElement('span');
  timeSpan.className = 'terminal-line--muted';
  timeSpan.textContent = relativeTime(date);

  line.appendChild(label);
  line.appendChild(sep);
  line.appendChild(link);
  line.appendChild(timeSep);
  line.appendChild(timeSpan);
  slot.appendChild(line);
}

function unavailable(label) {
  const p = document.createElement('p');
  p.className = 'terminal-line--muted';
  p.textContent = `${label}  ·  (unavailable)`;
  return p;
}

// ── Live fetch: GitHub ────────────────────────────────────────────────────

async function fetchLatestCommit() {
  const r = await fetch(GITHUB_EVENTS_URL);
  if (!r.ok) throw new Error(`GitHub API ${r.status}`);
  const events = await r.json();

  // First PushEvent in the timeline
  const push = events.find((e) => e.type === 'PushEvent');
  if (!push) return null;

  const repo = push.repo?.name ?? 'unknown';
  // Repo name is "owner/name" — strip the owner prefix for display
  const shortRepo = repo.includes('/') ? repo.split('/')[1] : repo;
  const commits = push.payload?.commits ?? [];
  const message = commits.length > 0 ? commits[commits.length - 1].message : null;

  return { repo: shortRepo, message, time: push.created_at };
}

// ── Live fetch: RSS/Atom ──────────────────────────────────────────────────

async function fetchLatestPost() {
  const r = await fetch(BLOG_FEED_URL);
  if (!r.ok) throw new Error(`feed ${r.status}`);
  const xml = await r.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  // Support both Atom (<entry>) and RSS (<item>)
  const entry = doc.querySelector('entry, item');
  if (!entry) return null;

  const title = entry.querySelector('title')?.textContent?.trim() ?? '(untitled)';

  // Atom uses <link href="…">, RSS uses <link>text</link>
  const linkEl = entry.querySelector('link');
  const url = linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || '/blog/';

  // Atom: <published> or <updated>; RSS: <pubDate>
  const dateStr =
    entry.querySelector('published')?.textContent ||
    entry.querySelector('updated')?.textContent ||
    entry.querySelector('pubDate')?.textContent ||
    null;

  return { title, url, date: dateStr };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

/** Human-readable relative time from an ISO date string or Date. */
function relativeTime(value) {
  if (!value) return '';
  const then = new Date(value);
  if (isNaN(then)) return String(value);
  const diffMs = Date.now() - then.getTime();
  const secs   = Math.floor(diffMs / 1000);
  const mins   = Math.floor(secs  / 60);
  const hours  = Math.floor(mins  / 60);
  const days   = Math.floor(hours / 24);
  const weeks  = Math.floor(days  / 7);
  const months = Math.floor(days  / 30);

  if (secs  <  60) return 'just now';
  if (mins  <  60) return `${mins}m ago`;
  if (hours <  24) return `${hours}h ago`;
  if (days  <   7) return `${days}d ago`;
  if (weeks <   5) return `${weeks}w ago`;
  return `${months}mo ago`;
}

function addDivider(containerEl) {
  const hr = document.createElement('hr');
  hr.className = 'panel-divider';
  containerEl.appendChild(hr);
}

function makeAccentHeading(text) {
  // The "▸ " prefix is added via CSS ::before on .panel-section-heading.
  const h = document.createElement('h3');
  h.className = 'panel-section-heading';
  h.appendChild(document.createTextNode(text));
  return h;
}

function makeField(label, value) {
  const p = document.createElement('p');
  p.className = 'now-field';
  const labelEl = document.createElement('span');
  labelEl.className = 'now-field-label terminal-line--muted';
  labelEl.textContent = `${label}: `;
  const valueEl = document.createElement('span');
  valueEl.className = 'now-field-value';
  valueEl.textContent = value;
  p.appendChild(labelEl);
  p.appendChild(valueEl);
  return p;
}
