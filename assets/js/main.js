/**
 * main.js — entrypoint. Wires boot, portrait, terminal, chips, panels, router.
 */

import { Terminal }   from './terminal.js';
import { runBoot }    from './boot.js';
import { drawPortrait } from './portrait.js';
import { commands }   from './commands.js';
import { openPanel, closePanel, isSuppressingHash } from './panels.js';

document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const outputEl    = document.querySelector('[data-terminal-output]');
  const inputEl     = document.querySelector('[data-terminal-input]');
  const inputRow    = document.querySelector('[data-terminal-input-row]');
  const portraitEl  = document.querySelector('[data-portrait]');
  const chipMenu    = document.querySelector('[data-chip-menu]');

  if (!outputEl || !inputEl) {
    console.error('terminal: required DOM elements not found');
    return;
  }

  // ── Terminal ──────────────────────────────────────────────────────────────
  const term = new Terminal(outputEl, inputEl, commands);

  // Expose for debugging on localhost only
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    window.terminal = term;
  }

  // Hide input row during boot; shown after
  if (inputRow) inputRow.hidden = true;

  // ── Skip controller ───────────────────────────────────────────────────────
  // Any keydown or click before boot completes resolves the boot immediately.
  const skipController = new AbortController();

  function triggerSkip() {
    skipController.abort();
  }

  document.addEventListener('keydown', triggerSkip, { once: true });
  document.addEventListener('click',   triggerSkip, { once: true });

  // ── Boot + portrait ───────────────────────────────────────────────────────
  async function init() {
    if (reducedMotion) {
      // Instant reveal: skip boot animation, render portrait static
      if (portraitEl) {
        drawPortrait({ containerEl: portraitEl }).catch(() => {});
      }
      afterBoot();
      return;
    }

    // Run boot sequence and portrait draw in parallel
    const bootPromise = runBoot({ outputEl, skipSignal: skipController.signal });
    const portraitPromise = portraitEl
      ? drawPortrait({ containerEl: portraitEl })
      : Promise.resolve();

    await bootPromise;
    // Portrait may still be drawing (it's ~825ms, boot is ~800ms) — don't await
    portraitPromise.catch(() => {}); // swallow; portrait is decorative

    afterBoot();
  }

  function afterBoot() {
    // Remove one-time skip listeners (may already be gone but harmless)
    document.removeEventListener('keydown', triggerSkip);
    document.removeEventListener('click',   triggerSkip);

    // Show input row, activate cursor blink, focus terminal
    if (inputRow) inputRow.hidden = false;
    document.querySelector('[data-cursor]')?.classList.add('cursor--active');
    term.focus();

    // Wire chips
    setupChips(term);

    // Hash router
    setupHashRouter();

    // If page loaded with a hash, open that panel
    const initial = location.hash.slice(1);
    if (initial) openPanelByHash(initial);
  }

  init();
});

// ── Chip wiring ───────────────────────────────────────────────────────────

function setupChips(term) {
  const buttons = document.querySelectorAll('[data-chip-menu] [data-command]');
  buttons.forEach((btn) => {
    // Skip <a> chips that are pure navigation links (chip--link) — they work without JS
    if (btn.tagName === 'A') return;

    btn.addEventListener('click', () => {
      const cmd = btn.dataset.command;
      if (!cmd) return;
      // Simulate typing + Enter: echo prompt, run command
      term.printPrompt(cmd);
      term.runCommand(cmd, cmd);
      term.focus();
    });
  });
}

// ── Hash router ───────────────────────────────────────────────────────────

function setupHashRouter() {
  window.addEventListener('hashchange', () => {
    // Ignore hash changes we set ourselves (panels.js sets them)
    if (isSuppressingHash()) return;

    const id = location.hash.slice(1);
    if (id) {
      openPanelByHash(id);
    } else {
      closePanel();
    }
  });
}

const PANEL_IDS = new Set(['about', 'now', 'talks', 'resume']);

function openPanelByHash(id) {
  if (PANEL_IDS.has(id)) {
    openPanel(id);
  }
}
