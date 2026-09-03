/**
 * terminal.js: the terminal pane. Input, scrollback, history, tab completion,
 * the mirrored text span that carries the block cursor, and command dispatch
 * with "command not found" plus a did-you-mean suggestion.
 *
 * Output lines are objects: { text } or { segments: [{ text, href, className,
 * year }] } with an optional className. A segment with `year` is a date column:
 * it gets the seg--year class and data-year so the year token colours it.
 * Lines print through a queue so the 30ms per-line stagger from
 * .omc/design/motion.md never interleaves two commands.
 */

const STAGGER_MS = 30;
const STAGGER_MAX_LINES = 12;
const TYPING_HOLD_MS = 500;
const PANE_NAMES = ['about', 'cv', 'links', 'now', 'talks', 'writing'];
const FACT_DIRS = ['cv/', 'now/', 'talks/', 'writing/'];
const ZOOM_NAMES = ['cv', 'now', 'talks', 'writing'];

export class Terminal {
  /**
   * @param {object} refs
   * @param {HTMLElement} refs.scrollback   role="log" container
   * @param {HTMLInputElement} refs.input   the real input
   * @param {HTMLElement} refs.prompt       .prompt wrapper
   * @param {HTMLElement} refs.mirror       .prompt__mirror
   * @param {HTMLElement} refs.cursor       .cursor
   * @param {object} refs.registry          name -> { description, handler, hidden }
   * @param {string} refs.ps1               prompt string echoed before commands
   */
  constructor({ scrollback, input, prompt, mirror, cursor, registry, ps1 }) {
    this._out = scrollback;
    this._input = input;
    this._prompt = prompt;
    this._mirror = mirror;
    this._cursor = cursor;
    this._registry = registry;
    this._ps1 = ps1;

    this._history = [];
    this._histIdx = -1;
    this._draft = '';

    this._pending = [];
    this._draining = false;
    this._typingTimer = null;
    this._reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._bindInput();
  }

  // Public API

  /** Print one line. Accepts a string or a line object. */
  print(line, opts = {}) {
    this.printLines([normalise(line, opts)]);
  }

  /** Print several lines with the per-line stagger for short batches. */
  printLines(lines) {
    this._pending.push(lines.map((l) => normalise(l)));
    this._drain();
  }

  /** Echo the prompt and the command the visitor ran. */
  printPrompt(raw) {
    this.print(`${this._ps1} ${raw}`, { className: 'scrollback__line--echo' });
  }

  /** Run a raw command string as if typed. */
  run(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    this.printPrompt(trimmed);
    this.runCommand(trimmed);
  }

  /** Dispatch a trimmed command string to the registry. */
  runCommand(raw) {
    const tokens = raw.split(/\s+/);
    const name = tokens[0].toLowerCase();
    const args = tokens.slice(1);
    const entry = this._registry[name];

    // Observers (the visitor top strip) count commands without a hook into
    // the registry. Detail carries the raw line and whether it resolved.
    document.dispatchEvent(new CustomEvent('console:command', { detail: { raw, name, known: Boolean(entry) } }));

    if (!entry) {
      this.print(`bash: ${name}: command not found`, { className: 'scrollback__line--err' });
      const guess = this.suggest(name);
      if (guess) this.print(`did you mean: ${guess}`, { className: 'scrollback__line--dim' });
      return;
    }

    try {
      const result = entry.handler(args, this);
      if (result && typeof result.catch === 'function') {
        result.catch((err) => this.print(`${name}: ${err.message}`, { className: 'scrollback__line--err' }));
      }
    } catch (err) {
      this.print(`${name}: ${err.message}`, { className: 'scrollback__line--err' });
    }
  }

  /** Closest known command within Levenshtein distance 2, or null. */
  suggest(name) {
    let best = null;
    let bestDist = Infinity;
    for (const candidate of Object.keys(this._registry)) {
      if (this._registry[candidate].hidden) continue;
      const d = levenshtein(name, candidate);
      // The distance must also be smaller than the candidate itself, so a
      // stray digit does not "mean" a two-letter command.
      if (d <= 2 && d < candidate.length && d < bestDist) {
        best = candidate;
        bestDist = d;
      }
    }
    return best;
  }

  focus() {
    this._input.focus({ preventScroll: true });
  }

  /** Move focus off the prompt so the pane keys work again. */
  leave() {
    const pane = this._input.closest('.pane');
    if (pane) pane.focus({ preventScroll: true });
    else this._input.blur();
  }

  clear() {
    this._pending.length = 0;
    this._out.replaceChildren();
  }

  /** Replace the input value and keep the mirror in sync. */
  setValue(value) {
    this._input.value = value;
    const len = value.length;
    this._input.setSelectionRange(len, len);
    this._syncMirror();
  }

  /** Switch the prompt to the mirrored block-cursor mode. */
  enableMirror() {
    this._prompt.classList.add('prompt--mirrored');
    this._syncMirror();
  }

  showCursor() {
    this._cursor.classList.add('cursor--active');
  }

  get names() {
    return Object.keys(this._registry).filter((n) => !this._registry[n].hidden).sort();
  }

  get registry() {
    return this._registry;
  }

  // Input handling

  _bindInput() {
    this._input.addEventListener('input', () => this._syncMirror());

    this._input.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Enter':
          this._handleEnter();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this._historyUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this._historyDown();
          break;
        case 'Tab':
          // An empty prompt lets Tab move focus on to the statusbar, so
          // keyboard users are never held in the field. Completion only
          // runs once there is something to complete.
          if (e.shiftKey || !this._input.value) break;
          e.preventDefault();
          this._tabComplete();
          break;
        case 'Escape':
          e.preventDefault();
          this.leave();
          break;
        case 'l':
          if (e.ctrlKey) {
            e.preventDefault();
            this.clear();
          }
          break;
        case 'c':
          if (e.ctrlKey) {
            e.preventDefault();
            this.printPrompt(`${this._input.value}^C`);
            this.setValue('');
            this._histIdx = -1;
          }
          break;
        default:
          break;
      }
    });
  }

  _syncMirror() {
    this._mirror.textContent = this._input.value;
    this._prompt.classList.add('prompt--typing');
    clearTimeout(this._typingTimer);
    this._typingTimer = setTimeout(() => this._prompt.classList.remove('prompt--typing'), TYPING_HOLD_MS);
  }

  _handleEnter() {
    const raw = this._input.value.trim();
    this.setValue('');
    if (!raw) {
      this.printPrompt('');
      return;
    }
    this._history.push(raw);
    this._histIdx = -1;
    this._draft = '';
    this.printPrompt(raw);
    this.runCommand(raw);
  }

  _historyUp() {
    if (this._history.length === 0) return;
    if (this._histIdx === -1) {
      this._draft = this._input.value;
      this._histIdx = this._history.length - 1;
    } else if (this._histIdx > 0) {
      this._histIdx--;
    }
    this.setValue(this._history[this._histIdx]);
  }

  _historyDown() {
    if (this._histIdx === -1) return;
    if (this._histIdx < this._history.length - 1) {
      this._histIdx++;
      this.setValue(this._history[this._histIdx]);
    } else {
      this._histIdx = -1;
      this.setValue(this._draft);
    }
  }

  _tabComplete() {
    const value = this._input.value;
    const argMatch = value.match(/^(cat|open|zoom)(\s+)(\S*)$/i);

    let prefix = '';
    let partial = value.toLowerCase();
    let pool = this.names;

    if (argMatch) {
      prefix = `${argMatch[1].toLowerCase()}${argMatch[2]}`;
      partial = argMatch[3].toLowerCase();
      pool = argumentPool(argMatch[1].toLowerCase(), partial);
    }

    const matches = pool.filter((n) => n.startsWith(partial));
    if (matches.length === 0) return;

    if (matches.length === 1) {
      // A directory completes without the trailing space so the next Tab
      // lists what it holds.
      this.setValue(`${prefix}${matches[0]}${matches[0].endsWith('/') ? '' : ' '}`);
      return;
    }

    const common = commonPrefix(matches);
    if (common.length > partial.length) {
      this.setValue(`${prefix}${common}`);
    } else {
      this.print(matches.join('  '), { className: 'scrollback__line--dim' });
    }
  }

  // Output queue

  async _drain() {
    if (this._draining) return;
    this._draining = true;
    while (this._pending.length) {
      const batch = this._pending.shift();
      const stagger = !this._reduced && batch.length > 1 && batch.length <= STAGGER_MAX_LINES;
      for (let i = 0; i < batch.length; i++) {
        if (stagger && i > 0) await sleep(STAGGER_MS);
        this._append(batch[i]);
      }
    }
    this._draining = false;
  }

  _append(line) {
    const el = document.createElement('p');
    el.className = ['scrollback__line', line.className].filter(Boolean).join(' ');
    for (const seg of line.segments) {
      if (seg.href) {
        const a = document.createElement('a');
        a.href = seg.href;
        a.textContent = seg.text;
        if (seg.className) a.className = seg.className;
        if (/^https?:/.test(seg.href)) {
          a.target = '_blank';
          a.rel = 'noopener';
        }
        el.appendChild(a);
      } else if (seg.className || seg.year) {
        const span = document.createElement('span');
        if (seg.className) span.className = seg.className;
        if (seg.year) {
          span.classList.add('seg--year');
          span.dataset.year = String(seg.year);
        }
        span.textContent = seg.text;
        el.appendChild(span);
      } else {
        el.appendChild(document.createTextNode(seg.text));
      }
    }
    // An empty line still needs height.
    if (line.segments.length === 0) el.textContent = ' ';
    this._out.appendChild(el);
    this._out.scrollTop = this._out.scrollHeight;
  }
}

/** Levenshtein edit distance. */
export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

function normalise(line, opts = {}) {
  if (typeof line === 'string') {
    return { className: opts.className || '', segments: line === '' ? [] : [{ text: line, href: opts.href }] };
  }
  if (line.segments) return { className: line.className || '', segments: line.segments };
  return { className: line.className || '', segments: line.text === '' ? [] : [{ text: line.text, href: line.href }] };
}

/**
 * Completion pool for a command argument. `cat` takes the pane names plus
 * the four fact directories, and inside a directory the ids the panes carry
 * (talks/<id>, writing/<slug>, cv/<id>, now/<fact>); `open` takes the link
 * names; `zoom` the four zoomable panes. Read from the DOM so the pool can
 * never disagree with the rows.
 */
function argumentPool(command, partial) {
  if (command === 'open') {
    return [...document.querySelectorAll('#links a[data-link]')].map((a) => a.dataset.link).sort();
  }
  if (command === 'zoom') return ZOOM_NAMES;
  const slash = partial.indexOf('/');
  if (slash === -1) return [...PANE_NAMES, ...FACT_DIRS].sort();
  const dir = partial.slice(0, slash);
  let ids = [];
  if (dir === 'talks') ids = [...document.querySelectorAll('#talks .row[data-id]')].map((r) => r.dataset.id);
  else if (dir === 'writing') ids = [...document.querySelectorAll('#writing .row[data-slug]')].map((r) => r.dataset.slug);
  else if (dir === 'cv') ids = ['headline', ...[...document.querySelectorAll('#cv .row[data-id]')].map((r) => r.dataset.id), 'education'];
  else if (dir === 'now') ids = [...document.querySelectorAll('#now dd[data-fact]')].map((d) => d.dataset.fact);
  return ids.map((id) => `${dir}/${id}`);
}

function commonPrefix(words) {
  let prefix = words[0];
  for (const w of words.slice(1)) {
    while (!w.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
