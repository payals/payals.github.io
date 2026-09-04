/**
 * topics.js: the topic legend and the cross-pane topic filter (T1 to T4).
 * Wires the server-rendered legend to one body attribute, the terminal
 * command registry, the shared hash grammar and the cross-module event bus.
 *
 * ---------------------------------------------------------------------
 * WHAT ALREADY EXISTS, DO NOT REBUILD IT
 *
 * The legend bar is server-rendered by Liquid in index.html from
 * data/topics.json, with the right counts, shapes, labels and
 * aria-labels, and it renders with JavaScript off. The markup is:
 *
 *   <div class="legendbar" data-legendbar>
 *     <span class="legendbar__label" id="legend-label">topics</span>
 *     <ul class="legend" role="group" aria-labelledby="legend-label" data-legend>
 *       <li><button class="legend__btn" type="button"
 *                   data-legend-btn="security" data-topic="security"
 *                   aria-pressed="false" aria-label="security: 4 talks and posts...">
 *             <span class="mark mark--diamond" data-topic="security" aria-hidden="true"></span>
 *             security<span class="legend__count">4</span>
 *           </button></li>
 *       ...one per topic that has at least one record...
 *     </ul>
 *     <p class="legendbar__hint" data-legend-hint>press a topic to light it up
 *        across every pane. esc clears.</p>
 *     <p class="sr-only" data-topic-live role="status" aria-live="polite"></p>
 *   </div>
 *
 * The dimming is pure CSS and is already written: features/charts.css §3
 * reacts to `document.body.dataset.topicFilter`. Non-matching marks go to
 * --dim-mark (0.28), non-matching rows and now facts to --dim-row (0.55),
 * hover and focus restore full ink, and the topbar, legend, status bar,
 * terminal and links row are never dimmed. DO NOT write a per-element dim
 * class; setting and deleting that one attribute is the whole of T2.
 *
 * Every row and now fact already carries data-topic, written by Liquid.
 * Never recompute a topic from tags in JavaScript.
 *
 * ---------------------------------------------------------------------
 * IMPLEMENTATION CONTRACT
 *
 * T1  Wire the chips. Click toggles: pressing the lit topic clears it.
 *     Keep aria-pressed correct on all six. Update [data-legend-hint] to
 *     "showing N talks and M posts about security. esc clears." while a
 *     filter is on and back to the resting sentence when it clears.
 *     Announce the same fact into [data-topic-live] (clear it, then set it
 *     on a 30ms timeout so a repeat announcement is spoken).
 *     Counts come from the DOM: `#talks .row[data-topic="x"]` and
 *     `#writing .row[data-topic="x"]`. Every talk row counts, archive
 *     leads included, because the filter lights a lead row like any
 *     other and the Liquid chip count on the same bar counts all
 *     fifteen records. (Corrected: the first draft excluded leads and
 *     the hint then contradicted the chip beside it.)
 * T2  One line: set or delete body.dataset.topicFilter. Nothing else.
 * T3  The `filter <topic>` and `filter off` command. Register it on the
 *     `registry` object exactly the way main.js registers `replay`:
 *       registry.filter = { description, usage, complete(prefix), handler(args) }
 *     Look at how commands.js shapes a command before writing yours, and
 *     match it. Tab completion offers the six topic ids plus `off`.
 *     Unknown topic prints an error line and lists the ids. Also add a
 *     `topic` kind to palette.js: one entry per topic, badge word "topic",
 *     Enter applies the filter and closes the palette.
 * T4  The hash. Read with getHashPart('topic') in applyHash(), write with
 *     setHashPart('topic', id) on every change. Both are in chart-util.js
 *     and both preserve the leading segment, so a year and a topic compose
 *     (#2018&topic=security). applyHash() must return false always: it
 *     composes, it never consumes the hash, so main.js keeps walking the
 *     chain to zoom, scrubber and panes.
 *
 * Escape clears the filter. Escape is a functional key, outside WCAG
 * 2.1.4, so bind it on document directly. There is no new single-character
 * shortcut here; if you add one it MUST go through isShortcutTarget and
 * shortcutsEnabled from shortcuts.js.
 *
 * Emit `console:topic` with { topic } after every change, so mobile.js can
 * open a closed disclosure that holds a match. Use emit() from chart-util.
 *
 * Reduced motion: features/charts.css already drops the opacity transition.
 * The live region uses the required one-shot 30ms repeat-announcement reset;
 * there is no ticker or repeating timer.
 *
 * @param {Object} opts
 * @param {Object} opts.term        the Terminal instance
 * @param {Object} opts.registry    the command registry (add `filter` to it)
 * @param {boolean} opts.reducedMotion
 * @returns {{ setTopic(id: string|null): boolean, topic(): string|null,
 *             clear(): boolean, applyHash(): boolean, ids(): string[] }}
 */
import { TOPICS, emit, getHashPart, setHashPart } from './chart-util.js';
import { registerTopicFilterCommand } from './commands.js';

export function setupTopics({ term, registry, reducedMotion } = {}) {
  void reducedMotion;

  const body = document.body;
  const hint = document.querySelector('[data-legend-hint]');
  const live = document.querySelector('[data-topic-live]');
  const buttons = [...document.querySelectorAll('[data-legend-btn]')];
  const buttonById = new Map(buttons.map((button) => [button.dataset.legendBtn, button]));
  const topicIds = TOPICS.map((entry) => entry.id).filter((id) => buttonById.has(id));
  const allowed = new Set(topicIds);
  const restingHint = hint
    ? hint.textContent.trim()
    : 'press a topic to light it up across every pane. esc clears.';
  let current = allowed.has(body && body.dataset.topicFilter) ? body.dataset.topicFilter : null;
  let announceTimer = null;

  // T1. The count has to be the number of records the filter actually lights,
  // because the chip and the hint sit on the same bar and are read together.
  // The legend chip's own count is written by Liquid over site.data.talks,
  // which is all fifteen records, and features.css lights a lead row exactly
  // like a sourced one, so the archive leads are counted here too. Excluding
  // them made the chip say "reliability 3" beside a hint saying "showing 2
  // talks" for the three topics that own a lead: reliability, platform, other.
  function counts(id) {
    const talks = [...document.querySelectorAll('#talks .row[data-topic]')]
      .filter((row) => row.dataset.topic === id)
      .length;
    const posts = [...document.querySelectorAll('#writing .row[data-topic]')]
      .filter((row) => row.dataset.topic === id)
      .length;
    return { talks, posts };
  }

  function summary(id) {
    const found = counts(id);
    return `showing ${found.talks} talk${found.talks === 1 ? '' : 's'} and ${found.posts} post${found.posts === 1 ? '' : 's'} about ${id}`;
  }

  function announce(text) {
    if (!live) return;
    clearTimeout(announceTimer);
    live.textContent = '';
    announceTimer = setTimeout(() => {
      live.textContent = text;
    }, 30);
  }

  function render(shouldAnnounce) {
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.legendBtn === current));
    }
    const message = current ? summary(current) : 'filter cleared';
    if (hint) hint.textContent = current ? `${message}. esc clears.` : restingHint;
    if (shouldAnnounce) announce(message);
  }

  function applyTopic(id, { writeHash = true, shouldAnnounce = true } = {}) {
    const next = id == null || id === '' ? null : String(id).toLowerCase();
    if (next && !allowed.has(next)) return false;
    const changed = next !== current;
    current = next;

    // T2: this one attribute is the entire JavaScript side of dimming.
    if (current) body.dataset.topicFilter = current;
    else delete body.dataset.topicFilter;

    render(shouldAnnounce && changed);
    if (writeHash) setHashPart('topic', current);
    if (changed) emit('console:topic', { topic: current });
    return true;
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const id = button.dataset.legendBtn;
      applyTopic(current === id ? null : id);
    });
  }

  // Escape is a functional key, not a character shortcut. A field or dialog
  // that already consumed Escape keeps it; otherwise clearing the filter is
  // one discrete step before zoom.js handles a later Escape.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !current) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    applyTopic(null);
  });

  registerTopicFilterCommand({
    registry,
    term,
    ids: topicIds,
    setTopic: (id) => applyTopic(id),
    topic: () => current,
    counts,
  });

  render(false);

  return {
    setTopic(id) { return applyTopic(id); },
    topic() { return current; },
    clear() { return applyTopic(null); },
    applyHash() {
      const requested = getHashPart('topic');
      applyTopic(requested && allowed.has(requested.toLowerCase()) ? requested : null, {
        writeHash: false,
        shouldAnnounce: true,
      });
      return false;
    },
    ids() { return topicIds.slice(); },
  };
}
