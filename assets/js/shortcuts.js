/**
 * shortcuts.js: shared gating for the console's single-character keyboard
 * shortcuts (WCAG 2.1.4, Character Key Shortcuts). The affected keys are
 * `z`, `q`, `j`, `k`, `:`, the pane digits `0` to `4`, `/` and `?` -- every
 * bare, unmodified character key bound at the document level in zoom.js,
 * panes.js and palette.js. `Escape`, `Enter` and the `Ctrl+B z` chord are
 * functional/modified keys, outside 2.1.4's scope, and are not gated here.
 *
 * Two independent guards apply to every one of those keys:
 *
 *  - isShortcutTarget(el): true only when the keydown target is the
 *    document body itself, or a non-interactive element inside a `.pane`.
 *    A link, button, input, textarea, select, summary or contenteditable
 *    element -- anywhere, not just form fields -- never has its own keys
 *    stolen by a global shortcut, and nothing outside the body/pane surface
 *    (the topbar, the palette, the key tray) responds to these keys either.
 *
 *  - shortcutsEnabled(): a visitor-level on/off switch, persisted in
 *    localStorage (the only localStorage key this site writes), so a
 *    keyboard or screen-reader user who does not want single letters to do
 *    anything can turn the whole set off. The terminal command `keys on` /
 *    `keys off` (commands.js) and a toggle button inside the `?` key tray
 *    (palette.js) both call setShortcutsEnabled(); onShortcutsChange lets
 *    any module react (the tray toggle label, the statusbar hint). With
 *    keys off, the palette button, the statusbar's own links and Escape
 *    still work -- they are clicks/links or a functional key, not a
 *    character shortcut.
 */

const STORAGE_KEY = 'console.keysEnabled';

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'textarea',
  'select',
  'summary',
  '[contenteditable=""]',
  '[contenteditable="true"]',
].join(', ');

function readStored() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw !== 'off';
  } catch (err) {
    // Private mode, disabled storage, or no window.localStorage: default on.
    return true;
  }
}

let enabled = readStored();
const listeners = new Set();

export function shortcutsEnabled() {
  return enabled;
}

export function setShortcutsEnabled(next) {
  const value = Boolean(next);
  if (value === enabled) return;
  enabled = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch (err) {
    // Storage may be unavailable; the in-memory state still holds for this load.
  }
  for (const fn of listeners) fn(enabled);
}

/** Subscribe to on/off changes. Returns an unsubscribe function. */
export function onShortcutsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * True when a bare single-character shortcut may act on this keydown
 * target: the document body, or a non-interactive descendant of a `.pane`.
 * Everything interactive (links, buttons, form controls including the year
 * scrubber's range input, summary, contenteditable) is excluded regardless
 * of where it sits, and so is everything that is neither the body nor
 * inside a pane (the topbar, the palette dialog, the key tray).
 */
export function isShortcutTarget(el) {
  if (!el || el === document || el === window) return false;
  if (typeof el.closest !== 'function') return false;
  if (el.closest(INTERACTIVE_SELECTOR)) return false;
  if (el === document.body) return true;
  return Boolean(el.closest('.pane'));
}
