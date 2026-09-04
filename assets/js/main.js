/**
 * main.js: entry point for the landing console. The panes are rendered by
 * Jekyll at build time and are complete at first paint; this file wires the
 * terminal, the boot log, pane navigation, and the phase-2 modules. Module
 * boundaries and the order below are fixed in scratchpad/phase2/PLAN.md.
 *
 * Wiring order: terminal -> panes -> topics -> reader -> zoom -> palette ->
 * clicks -> topstats -> chart-cv -> chart-talks -> chart-writing -> mobile ->
 * scrubber -> constellation -> boot log.
 *
 * Four orderings are load bearing, and phase-3 workers must not change them:
 *
 *   1. topics before palette. The palette indexes the topic entries.
 *   2. chart-cv before chart-talks. The talks hairline mirrors into the cv
 *      lanes through the onScrub callback passed in below, so the two chart
 *      modules never import each other.
 *   3. mobile before scrubber. mobile.js subscribes to console:asof and
 *      console:topic, and both can fire from the first applyHash().
 *   4. every chart before scrubber. The scrubber dims chart marks beyond the
 *      scrubbed year and needs them to exist.
 *
 * Hash handling runs the chain topics -> zoom -> scrubber -> panes. topics
 * composes rather than consuming (it always returns false), so a year and a
 * topic can be in the hash at once: #2018&topic=security.
 */

import { Terminal } from './terminal.js';
import { buildCommands } from './commands.js';
import { setupPanes } from './panes.js';
import { setupReader } from './reader.js';
import { setupZoom } from './zoom.js';
import { setupPalette } from './palette.js';
import { setupClicks } from './clicks.js';
import { setupTopstats } from './topstats.js';
import { setupTopics } from './topics.js';
import { setupChartTalks } from './chart-talks.js';
import { setupChartWriting } from './chart-writing.js';
import { setupChartCv } from './chart-cv.js';
import { setupMobile } from './mobile.js';
import { setupScrubber } from './scrubber.js';
import { setupConstellation } from './constellation.js';
import { runBootLog, replayBootLog } from './bootlog.js';

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

  // Inline data (no fetch at boot). Same records as data/*.json.
  const timeline = readJson('timeline-data', []);
  const talks = readJson('talks-data', []);
  const posts = readJson('posts-data', []);
  // The topic key (phase 3): the six topic definitions in their fixed order
  // plus id-to-topic maps for talks, posts and the now facts. Same records as
  // data/topics.json. The rendered panes already carry data-topic on every
  // row, so nothing recomputes a topic from tags at runtime.
  const topics = readJson('topics-data', { topics: [], talks: {}, posts: {}, facts: {} });

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

  // `replay` replays the career boot log (B2). Registered here because the
  // log needs the console element and the timeline, not the registry.
  registry.replay = {
    description: 'replay the boot log',
    handler() {
      return replayBootLog({ term, console: consoleEl, timeline });
    },
  };

  // panes is created first because every module navigates through it; the
  // palette is assigned below, so onHelp reads it lazily.
  let palette = null;
  const panes = setupPanes({
    term,
    reducedMotion,
    // `?` opens the which-key tray when palette.js provides one; until then
    // it runs `help` in the terminal as in phase 1.
    onHelp() {
      if (palette && palette.toggleKeys()) return;
      panes.focusTerminal();
      term.run('help');
    },
  });

  // Topics owns the legend, the filter and the topic hash segment. It is
  // created before the palette because the palette indexes its entries, and
  // before every chart because a chart mark is dimmed by the same attribute.
  const topics2 = setupTopics({ term, registry, reducedMotion });

  const reader = setupReader({ term, reducedMotion, posts });
  // The constellation is created last (below); zoom tells it to refit after
  // the grid changes, because its wrapper is display:none while the terminal
  // is collapsed into the tab strip between 768px and 1279px.
  let constellation = null;
  const zoom = setupZoom({
    term,
    panes,
    reader,
    reducedMotion,
    onChange() {
      if (constellation) constellation.refresh();
    },
  });
  palette = setupPalette({ term, zoom, panes, reducedMotion, posts, talks });

  const clicks = setupClicks({ term, panes, reducedMotion });
  const topstats = setupTopstats({ term, talks, timeline, reducedMotion });

  // Charts. cv first: its scrubTo is what the talks hairline mirrors into.
  const chartCv = setupChartCv({ term, talks, posts, topics, reducedMotion });
  const chartTalks = setupChartTalks({
    term,
    talks,
    topics,
    reducedMotion,
    onScrub(date) { chartCv.scrubTo(date); },
  });
  const chartWriting = setupChartWriting({ term, posts, topics, reducedMotion });

  // Mobile listens on the bus, so it subscribes before the scrubber can emit.
  const mobile = setupMobile({ term, panes, palette, reducedMotion });

  const scrubber = setupScrubber({ term, timeline, reducedMotion });
  constellation = setupConstellation({ term, posts, talks, reducedMotion });

  // Hash chain: topics (#...&topic=security, composes and never consumes) ->
  // zoom (#cv, #writing/<slug>) -> scrubber (#2018) -> panes (#about, #links,
  // #terminal, and any pane id the others left alone).
  function applyHash() {
    if (!location.hash) return;
    topics2.applyHash();
    if (zoom.applyHash()) return;
    if (scrubber.applyHash()) return;
    panes.applyHash();
  }
  window.addEventListener('hashchange', applyHash);

  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    window.terminal = term;
    window.console2 = {
      panes, zoom, reader, palette, clicks, topstats, scrubber, constellation,
      topics: topics2, chartTalks, chartWriting, chartCv, mobile,
    };
  }

  // Any key or click before the log finishes prints the rest at once.
  const skip = new AbortController();
  const triggerSkip = () => skip.abort();
  document.addEventListener('keydown', triggerSkip, { once: true });
  document.addEventListener('click', triggerSkip, { once: true });

  runBootLog({ term, console: consoleEl, skipSignal: skip.signal, reducedMotion, timeline }).then(() => {
    term.showCursor();

    // The prompt is not focused after boot. The ready line offers keys 0 to
    // 4, which only work while the prompt is unfocused; a visitor who wants
    // to type clicks the prompt or tabs to it, and Escape leaves it again.
    applyHash();
  });
});

function readJson(id, fallback) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  try {
    return JSON.parse(el.textContent);
  } catch (err) {
    console.error(`console: could not parse #${id}`, err);
    return fallback;
  }
}
