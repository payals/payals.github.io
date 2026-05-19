/**
 * boot.js — boot sequence (~800ms, skippable, reduced-motion aware).
 * Timing from .omc/design/motion.md.
 */

const BOOT_LINES = [
  { text: 'PayalOS v1.0 booting...', delay: 0 },
  { text: '[  OK  ] mounting /links', delay: 120 },
  { text: '[  OK  ] loading bio', delay: 140 },
  { text: '[  OK  ] indexing talks', delay: 130 },
  { text: '[  OK  ] fetching now.json', delay: 200 },
  { text: 'Welcome, visitor. Type `help` to begin.', delay: 210 },
];

/**
 * @param {object} opts
 * @param {HTMLElement} opts.outputEl  — terminal output container
 * @param {AbortSignal} [opts.skipSignal] — abort = skip remaining delays
 * @returns {Promise<void>} resolves when boot is complete
 */
export function runBoot({ outputEl, skipSignal }) {
  return new Promise((resolve) => {
    let skipped = false;
    let lineIdx = 0;
    let timeoutId = null;

    function skip() {
      if (skipped) return;
      skipped = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
      // Flush remaining lines immediately
      for (let i = lineIdx; i < BOOT_LINES.length; i++) {
        appendLine(BOOT_LINES[i].text);
      }
      resolve();
    }

    // Wire skip signal if provided
    if (skipSignal) {
      if (skipSignal.aborted) {
        // Already signalled — flush everything at once and return
        for (const { text } of BOOT_LINES) appendLine(text);
        resolve();
        return;
      }
      skipSignal.addEventListener('abort', skip, { once: true });
    }

    function appendLine(text) {
      const el = document.createElement('div');
      el.className = 'terminal-line terminal-line--boot';
      // Mark [OK] lines with accent class for green colour
      if (text.startsWith('[  OK  ]')) {
        el.classList.add('terminal-line--ok');
      }
      el.textContent = text;
      outputEl.appendChild(el);
      outputEl.scrollTop = outputEl.scrollHeight;
    }

    function printNext() {
      if (skipped) return;
      if (lineIdx >= BOOT_LINES.length) {
        resolve();
        return;
      }
      const { text, delay } = BOOT_LINES[lineIdx];
      lineIdx++;

      if (delay === 0) {
        appendLine(text);
        printNext();
      } else {
        timeoutId = setTimeout(() => {
          if (skipped) return;
          appendLine(text);
          printNext();
        }, delay);
      }
    }

    printNext();
  });
}
