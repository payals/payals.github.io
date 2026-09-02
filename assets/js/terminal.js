/**
 * terminal.js: the terminal pane. Input, scrollback, history, tab completion,
 * the mirrored text span that carries the block cursor, and command dispatch
 * with "command not found" plus a did-you-mean suggestion.
 *
 * Output lines are objects: { text } or { segments: [{ text, href, className }] }
 * with an optional className. Lines print through a queue so the 30ms per-line
 * stagger from .omc/design/motion.md never interleaves two commands.
 */

const STAGGER_MS = 30;
const STAGGER_MAX_LINES = 12;
const TYPING_HOLD_MS = 500;
const PANE_NAMES = ['about', 'cv', 'links', 'now', 'talks', 'writing'];

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
    const catMatch = value.match(/^(cat\s+)(\S*)$/);

    let prefix = '';
    let partial = value.toLowerCase();
    let pool = this.names;

    if (catMatch) {
      prefix = catMatch[1];
      partial = catMatch[2].toLowerCase();
      pool = PANE_NAMES;
    }

    const matches = pool.filter((n) => n.startsWith(partial));
    if (matches.length === 0) return;

    if (matches.length === 1) {
      this.setValue(`${prefix}${matches[0]} `);
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
        if (/^https?:/.test(seg.href)) {
          a.target = '_blank';
          a.rel = 'noopener';
        }
        el.appendChild(a);
      } else if (seg.className) {
        const span = document.createElement('span');
        span.className = seg.className;
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
