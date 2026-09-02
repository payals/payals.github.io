/**
 * main.js: entry point for the landing console. The panes are rendered by
 * Jekyll at build time; this file only wires the terminal, the boot
 * sequence, and pane navigation.
 */

import { Terminal } from './terminal.js';
import { runBoot } from './boot.js';
import { buildCommands } from './commands.js';
import { setupPanes } from './panes.js';

document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const consoleEl = document.querySelector('.console');
  const scrollback = document.querySelector('[data-scrollback]');
  const input = document.querySelector('[data-input]');
  const prompt = document.querySelector('[data-prompt]');
  const mirror = document.querySelector('[data-mirror]');
  const cursor = document.querySelector('[data-cursor]');
  const tagline = document.querySelector('.topbar__tagline');

  if (!consoleEl || !scrollback || !input || !prompt || !mirror || !cursor) {
    console.error('console: required elements not found');
    return;
  }

  const registry = buildCommands({ tagline: tagline ? tagline.textContent.replace(/\s+/g, ' ').trim() : 'Payal Singh' });
  const term = new Terminal({
    scrollback,
    input,
    prompt,
    mirror,
    cursor,
    registry,
    ps1: prompt.querySelector('.prompt__ps1').textContent.trim(),
  });
  term.enableMirror();

  const panes = setupPanes({ term, reducedMotion });

  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    window.terminal = term;
  }

  // Any key or click before boot finishes skips the remaining delays.
  const skip = new AbortController();
  const triggerSkip = () => skip.abort();
  document.addEventListener('keydown', triggerSkip, { once: true });
  document.addEventListener('click', triggerSkip, { once: true });

  runBoot({ term, console: consoleEl, skipSignal: skip.signal, reducedMotion }).then(() => {
    document.removeEventListener('keydown', triggerSkip);
    document.removeEventListener('click', triggerSkip);
    term.showCursor();

    // The prompt is not focused after boot. The ready line offers keys 0 to
    // 4, which only work while the prompt is unfocused; a visitor who wants
    // to type clicks the prompt or tabs to it, and Escape leaves it again.
    if (location.hash) panes.applyHash();
  });
});
