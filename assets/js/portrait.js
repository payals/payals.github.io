/**
 * portrait.js — line-by-line ASCII portrait reveal.
 * Timing from .omc/design/motion.md: 55ms/line delay, 80ms ease-out fade.
 */

/**
 * @param {object} opts
 * @param {HTMLElement} opts.containerEl — the <pre data-portrait> element
 * @param {string} [opts.source]         — URL of the portrait text file
 * @param {number} [opts.perLineDelay]   — ms between lines (default 55)
 * @param {number} [opts.fadeMs]         — fade-in duration per line in ms (default 80)
 * @returns {Promise<void>} resolves when all lines are drawn
 */
export function drawPortrait({
  containerEl,
  source = '/assets/img/portrait.txt',
  perLineDelay = 55,
  fadeMs = 80,
}) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return fetch(source)
    .then((r) => {
      if (!r.ok) throw new Error(`portrait fetch failed: ${r.status}`);
      return r.text();
    })
    .then((text) => {
      // Clear placeholder content that Agent A may have placed in the <pre>
      containerEl.textContent = '';

      const lines = text.split('\n');

      if (reducedMotion) {
        // Render everything at once — no animation
        for (const line of lines) {
          containerEl.appendChild(makeLine(line, 0));
        }
        containerEl.dataset.state = 'drawn';
        return;
      }

      return new Promise((resolve) => {
        let idx = 0;

        function drawNext() {
          if (idx >= lines.length) {
            containerEl.dataset.state = 'drawn';
            resolve();
            return;
          }
          const span = makeLine(lines[idx], fadeMs);
          containerEl.appendChild(span);
          idx++;
          setTimeout(drawNext, perLineDelay);
        }

        drawNext();
      });
    })
    .catch(() => {
      // Portrait missing — leave whatever placeholder Agent A put in the <pre>
      containerEl.dataset.state = 'drawn';
    });
}

/** Create a <span> for one portrait line with optional CSS fade-in. */
function makeLine(text, fadeMs) {
  const span = document.createElement('span');
  span.className = 'portrait-line';
  span.textContent = text + '\n';

  if (fadeMs > 0) {
    span.style.cssText = `opacity:0; transition:opacity ${fadeMs}ms ease-out`;
    // Force reflow so the transition actually fires
    span.getBoundingClientRect();
    span.style.opacity = '1';
  }

  return span;
}
