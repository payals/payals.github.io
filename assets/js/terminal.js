/**
 * terminal.js — command-line input, output, history, tab-complete.
 * No DOM queries — caller passes refs in constructor.
 */

export class Terminal {
  /**
   * @param {HTMLElement} outputEl  — [data-terminal-output]
   * @param {HTMLInputElement} inputEl — [data-terminal-input]
   * @param {Object} registry — map of name → {description, handler}
   */
  constructor(outputEl, inputEl, registry) {
    this._out = outputEl;
    this._input = inputEl;
    this._registry = registry;

    this._history = [];
    this._histIdx = -1;  // -1 = not navigating
    this._draft = '';    // saved draft while navigating history

    this._bindInput();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Append a line of output. className is optional extra CSS class. */
  print(line, { className = '' } = {}) {
    const el = document.createElement('div');
    el.className = ['terminal-line', className].filter(Boolean).join(' ');
    // textContent — never innerHTML — keeps output safe
    el.textContent = line;
    this._out.appendChild(el);
    this._scrollToBottom();
  }

  /** Print "$ <cmd>" echo line before command output. */
  printPrompt(cmd) {
    this.print(`$ ${cmd}`, { className: 'terminal-line--prompt' });
  }

  /** Look up cmd in registry and call its handler. */
  runCommand(name, rawInput) {
    const key = name.trim().toLowerCase();
    const args = rawInput.trim().split(/\s+/).slice(1);

    // sudo <anything>
    if (key === 'sudo') {
      this.print('nice try.', { className: 'terminal-line--muted' });
      return;
    }

    const entry = this._registry[key];
    if (!entry) {
      this.print(`${key}: command not found`, { className: 'terminal-line--err' });
      return;
    }
    entry.handler(args, this);
  }

  /** Focus the input element. */
  focus() {
    this._input.focus();
  }

  /** Clear all output lines. */
  clear() {
    this._out.innerHTML = '';
  }

  /** Replace the command registry (used during setup to add commands). */
  setRegistry(registry) {
    this._registry = registry;
  }

  // ── Input handling ────────────────────────────────────────────────────────

  _bindInput() {
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
        case 'l':
          if (e.ctrlKey) {
            e.preventDefault();
            this.clear();
          }
          break;
      }
    });
  }

  _handleEnter() {
    const raw = this._input.value.trim();
    if (!raw) return;

    // Push to history; reset navigation state
    this._history.push(raw);
    this._histIdx = -1;
    this._draft = '';

    this._input.value = '';

    // First token is command name
    const tokens = raw.split(/\s+/);
    const name = tokens[0].toLowerCase();
    this.printPrompt(raw);
    this.runCommand(name, raw);
    this._scrollToBottom();
  }

  _historyUp() {
    if (this._history.length === 0) return;
    if (this._histIdx === -1) {
      // Save whatever the user was typing
      this._draft = this._input.value;
      this._histIdx = this._history.length - 1;
    } else if (this._histIdx > 0) {
      this._histIdx--;
    }
    this._input.value = this._history[this._histIdx];
    this._moveCursorToEnd();
  }

  _historyDown() {
    if (this._histIdx === -1) return;
    if (this._histIdx < this._history.length - 1) {
      this._histIdx++;
      this._input.value = this._history[this._histIdx];
    } else {
      // Back to draft
      this._histIdx = -1;
      this._input.value = this._draft;
    }
    this._moveCursorToEnd();
  }

  _tabComplete() {
    const val = this._input.value;
    const names = Object.keys(this._registry);

    // "cat " prefix — complete panel names
    if (val.startsWith('cat ')) {
      const partial = val.slice(4);
      const panels = ['about', 'now', 'talks', 'resume'];
      const matches = panels.filter(p => p.startsWith(partial));
      if (matches.length === 1) {
        this._input.value = `cat ${matches[0]}`;
      } else if (matches.length > 1) {
        this.print(matches.join('  '), { className: 'terminal-line--muted' });
      }
      return;
    }

    const matches = names.filter(n => n.startsWith(val.toLowerCase()));
    if (matches.length === 1) {
      this._input.value = matches[0];
    } else if (matches.length > 1) {
      this.print(matches.join('  '), { className: 'terminal-line--muted' });
    }
  }

  _moveCursorToEnd() {
    const len = this._input.value.length;
    this._input.setSelectionRange(len, len);
  }

  _scrollToBottom() {
    this._out.scrollTop = this._out.scrollHeight;
  }
}
