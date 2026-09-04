/**
 * chart-talks.js: the talks timeline strip (TL1, TL2).
 * The plot is a progressive enhancement over the complete record list:
 * every position comes from talks.json, and every control points back to
 * the matching row that already carries the evidence links and caveats.
 *
 * ---------------------------------------------------------------------
 * DOM HOOKS, ALREADY IN index.html
 *
 *   #talks .chart[data-chart="talks"]
 *     > .chart__plot[data-tl]          the reserved plot, height --chart-h
 *     > .chart__hint[data-tl-hint]     one line, two variants (lg and sm)
 *
 *   #talks .row[data-id="<talk id>"][data-topic][data-year][data-status]
 *     every sourced talk and every archive lead, in the pane list. Rows
 *     past the sixth sit inside the phase-2 <details data-more>; rows past
 *     the third also sit inside <details class="disclose" data-mobile-more>.
 *     Both are native details, so a row inside a closed one is still in
 *     the DOM and still queryable.
 *
 * DATA
 *   #talks-data   the full data/talks.json array (id, record_type, status,
 *                 date or date_label or era, title, venue, evidence_level,
 *                 event_url, archive_url, slides_url, note, label, detail)
 *   #topics-data  { topics: [{id,label,shape,token,note}],
 *                   talks: { "<id>": "<topic id>" },
 *                   posts: { "<slug>": "<topic id>" },
 *                   facts: { "<fact>": "<topic id>" } }
 *   Read both with readInlineJson() from chart-util.js. main.js already
 *   passes the parsed talks and topics into setupChartTalks.
 *
 * ---------------------------------------------------------------------
 * WHAT WORKER TL BUILDS
 *
 * TL1  The strip. Axis 2014-01-01 to 2027-01-01 (pct() from chart-util).
 *      One mark per SOURCED talk: a native <button class="chart-mark">
 *      carrying data-topic and data-year, containing mark(topic) from
 *      chart-util, positioned with `left: <pct>%`. Two talks whose marks
 *      would collide (less than about 15px apart) take separate lanes by
 *      setting a `--lane` custom property that shifts them up; the plot's
 *      own height never changes, because features/charts.css reserved it.
 *      Recompute lanes on resize (the plot width changes).
 *
 *      Archive leads: hollow marks (mark(topic, 'mark--ring')) on a dashed
 *      span under the axis. The span comes from the record's `era` text,
 *      which is prose, not a date: parse the four-digit years out of it,
 *      one year means a one-year span, two mean the range between them,
 *      and an era with no year at all ("dates under reconstruction") gets
 *      NO span and NO mark. A mark there would claim a date the record
 *      explicitly does not have, and the talks pane's whole point is that
 *      it never claims one.
 *
 *      Year labels under the axis: every year at wide widths, every second
 *      year when the plot is under about 700px.
 *
 * TL2  Interaction.
 *      - Pointer over the plot shows a year-month hairline in --accent
 *        with the label (`2018-03`), and calls onScrub(date) so the cv
 *        lanes mirror it. Call onScrub(null) on pointerleave.
 *      - Hover or focus on a mark shows the shared tooltip via bindTip():
 *        title, venue and date, then topic, "upcoming" when it is, and the
 *        "program listing only" caveat when evidence_level says so.
 *      - Every mark is a real button with the same information in its
 *        aria-label, so the tooltip is decoration only.
 *      - roving(marks) from chart-util gives one tab stop, arrows, Home
 *        and End. Those are functional keys and do not go through
 *        shortcuts.js.
 *      - Click or Enter calls hitRow('talks', row, markEl, reducedMotion)
 *        from chart-util, which clears the old hit, marks the row, emits
 *        console:hit (so mobile.js can open a closed disclosure) and
 *        scrolls the row into view.
 *
 * RULES
 *   - No innerHTML. Build with el() from chart-util; text goes in as text.
 *   - Read the plot height from the CSS token, never hard-code it.
 *   - Topic hues on marks and lead spans only. Amber is state only.
 *   - Real records only. No filler marks, no invented dates.
 *   - Reduced motion: no transitions, hairline and every control still work.
 *
 * @param {Object} opts
 * @param {Object} opts.term
 * @param {Array} opts.talks        parsed #talks-data
 * @param {Object} opts.topics      parsed #topics-data
 * @param {boolean} opts.reducedMotion
 * @param {(date: Date|null) => void} opts.onScrub  mirrors into the cv lanes
 * @returns {{ hit(id: string): boolean, refresh(): void, marks(): Element[] }}
 */
import {
  bindTip,
  dateOf,
  el,
  hitRow,
  mark,
  on,
  pad2,
  pct,
  roving,
  showTip,
  topicLabel,
  touchPrimer,
} from './chart-util.js';

const AXIS_FROM = dateOf('2014-01-01');
const AXIS_TO = dateOf('2027-01-01');
const AXIS_LABEL_GAP_PX = 6;
const FIRST_YEAR = 2014;
const LAST_YEAR = 2027;
const COLLISION_PX = 15;
const MAX_LANE_STEP_PX = 14;
const GLYPH_PX = 12;
const WIDE_AXIS_PX = 700;

const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export function setupChartTalks({ term, talks, topics, reducedMotion, onScrub } = {}) {
  void term;
  const plot = document.querySelector('#talks .chart[data-chart="talks"] [data-tl]');
  const records = Array.isArray(talks) ? talks : [];
  const topicMap = topics && topics.talks ? topics.talks : {};
  const noop = {
    hit() { return false; },
    refresh() {},
    marks() { return []; },
    applyAsOf() {},
    applyTopicFilter() {},
  };
  if (!plot) return noop;

  const rows = new Map();
  for (const row of document.querySelectorAll('#talks .row[data-id]')) {
    if (!rows.has(row.dataset.id)) rows.set(row.dataset.id, row);
  }

  const root = el('div', {
    class: 'talks-timeline',
    role: 'group',
    'aria-label': 'Talks timeline from 2014 through 2027. Use the arrow keys to move between records, then press Enter to highlight the matching row.',
  });
  const track = el('div', { class: 'talks-timeline__track' });
  const axis = el('div', { class: 'talks-timeline__axis' });
  const baseline = el('span', { class: 'talks-timeline__baseline', 'aria-hidden': 'true' });
  const hairlineLabel = el('span', { class: 'talks-timeline__scrub-label' });
  const hairline = el('span', {
    class: 'talks-timeline__scrub',
    'aria-hidden': 'true',
    hidden: true,
  }, hairlineLabel);
  track.append(baseline, hairline);
  root.append(track, axis);
  plot.replaceChildren(root);

  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    const tick = el('span', { class: 'talks-timeline__tick', 'aria-hidden': 'true' });
    tick.style.left = `${axisPct(dateOf(`${year}-01-01`))}%`;
    track.appendChild(tick);
  }

  const specs = [];
  for (const record of records) {
    const entry = topicMap[record.id];
    const topic = typeof entry === 'string' ? entry : entry && entry.topic ? entry.topic : 'other';
    if (record.record_type === 'sourced') {
      const when = talkDate(record);
      if (!when || when < AXIS_FROM || when > AXIS_TO) continue;
      specs.push({ record, topic, when, lead: false, year: when.getFullYear() });
      continue;
    }
    if (record.record_type !== 'archive_lead') continue;
    const span = leadSpan(record.era);
    if (!span) continue;
    specs.push({
      record,
      topic,
      when: new Date((span.from.getTime() + span.to.getTime()) / 2),
      lead: true,
      year: span.endYear,
      span,
    });
  }
  specs.sort((a, b) => a.when - b.when || Number(a.lead) - Number(b.lead));

  const markerRecords = [];
  const markerById = new Map();
  // MB13/SB5: shared with the writing and cv charts -- an outside tap, a
  // cancelled touch or a phone/desktop breakpoint change drops the prime.
  const primer = touchPrimer({ root, onClear(el) { el.classList.remove('is-touch-selected'); } });
  let rover = null;
  let suppressCompatibilityClick = false;

  for (const spec of specs) {
    if (spec.lead) {
      const spanEl = el('span', {
        class: 'talks-timeline__span',
        'data-topic': spec.topic,
        'data-year': String(spec.year),
        'aria-hidden': 'true',
      });
      const left = axisPct(spec.span.from);
      const right = axisPct(spec.span.to);
      spanEl.style.left = `${left}%`;
      spanEl.style.width = `${Math.max(0, right - left)}%`;
      axis.appendChild(spanEl);
    }

    const lines = tooltipLines(spec);
    const button = el('button', {
      type: 'button',
      class: `chart-mark talks-timeline__mark${spec.lead ? ' talks-timeline__mark--lead' : ''}`,
      'data-topic': spec.topic,
      'data-year': String(spec.year),
      'data-talk-id': spec.record.id,
      'data-record-type': spec.lead ? 'archive-lead' : 'sourced',
      'aria-label': ariaLabel(spec),
    }, mark(spec.topic, spec.lead ? 'mark--ring' : ''));
    button.style.left = `${axisPct(spec.when)}%`;

    const parent = spec.lead ? axis : track;
    parent.appendChild(button);
    bindTip(button, () => lines, spec.topic);

    button.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') primer.clear();
    });
    button.addEventListener('click', () => {
      primer.clear();
      activate(spec.record.id, button);
    });

    const item = { el: button, spec, lines };
    markerRecords.push(item);
    markerById.set(spec.record.id, button);
  }

  rover = roving(markerRecords.map((item) => item.el));

  // On a phone, four records can occupy a few days of the same year. Their
  // native 44px buttons necessarily overlap inside the 60px plot, so DOM
  // stacking alone would make the top button steal every tap. Route a touch
  // to the nearest visible glyph instead. This preserves exact x positions,
  // gives each lane a reachable region, and keeps the controls themselves
  // native buttons for keyboard and assistive technology.
  root.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
      suppressCompatibilityClick = false;
      return;
    }
    const item = nearestTouch(event.clientX, event.clientY);
    if (!item) {
      primer.clear();
      return;
    }
    suppressCompatibilityClick = true;
    event.preventDefault();
    event.stopPropagation();
    if (primer.get() === item.el) {
      primer.clear();
      activate(item.spec.record.id, item.el);
      return;
    }
    primer.set(item.el);
    item.el.classList.add('is-touch-selected');
    rover.focusAt(markerRecords.indexOf(item));
    showTip(item.el, item.lines, item.spec.topic);
  }, { capture: true });

  // A cancelled pointerdown can still synthesize a compatibility click in
  // some engines. The touch work already happened above, so never let that
  // second event activate a different overlapping button.
  root.addEventListener('click', (event) => {
    if (!suppressCompatibilityClick && event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    suppressCompatibilityClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, { capture: true });

  function nearestTouch(x, y) {
    let best = null;
    let bestDistance = Infinity;
    for (const item of markerRecords) {
      const box = item.el.getBoundingClientRect();
      const dx = x - (box.left + box.width / 2);
      const dy = y - (box.top + box.height / 2);
      if (Math.abs(dx) > box.width / 2 || Math.abs(dy) > box.height / 2) continue;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        best = item;
        bestDistance = distance;
      }
    }
    return best;
  }

  function activate(id, button = markerById.get(id) || null) {
    const row = rows.get(id) || null;
    if (row) {
      // The record list deliberately keeps its long tail in native details.
      // A chart hit must make that row visible before hitRow scrolls to it.
      let details = row.closest('details');
      while (details && details.closest('#talks')) {
        if (!details.open) {
          // panes.js moves focus into a phase-2 disclosure on toggle. Keep
          // the roving timeline control as the keyboard anchor while leaving
          // the revealed row at the scroll position hitRow chooses.
          details.addEventListener('toggle', () => {
            if (button && button.isConnected) button.focus({ preventScroll: true });
          }, { once: true });
          details.open = true;
        }
        details = details.parentElement ? details.parentElement.closest('details') : null;
      }
    }
    return hitRow('talks', row, button, Boolean(reducedMotion));
  }

  function scrubAt(clientX) {
    const rect = root.getBoundingClientRect();
    if (!rect.width) return;
    const fraction = clamp((clientX - rect.left) / rect.width, 0, 1);
    const when = new Date(AXIS_FROM.getTime() + fraction * (AXIS_TO - AXIS_FROM));
    hairline.style.left = `${fraction * 100}%`;
    hairlineLabel.textContent = `${when.getFullYear()}-${pad2(when.getMonth() + 1)}`;
    hairline.classList.toggle('talks-timeline__scrub--flip', fraction > 0.8);
    hairline.hidden = false;
    if (typeof onScrub === 'function') onScrub(when);
  }

  function clearScrub() {
    hairline.hidden = true;
    if (typeof onScrub === 'function') onScrub(null);
    const primedEl = primer.get();
    if (primedEl) {
      const item = markerRecords.find((candidate) => candidate.el === primedEl);
      if (item) showTip(item.el, item.lines, item.spec.topic);
    }
  }

  /**
   * SB6: as of a scrubbed year, a mark past the cutoff points at a row the
   * scrubber has hidden. Dim it (the existing .is-after treatment) and
   * take it out of the roving set so Tab, the arrows and Home/End all skip
   * it -- hitRow() itself also refuses a scrubber-hidden row, so a stray
   * mouse click on a dimmed mark still does nothing. `year` null (or any
   * non-finite value) resets every mark to live.
   *
   * adversarial-review-4 finding 4: a mark can also point at a row the
   * phone-forced topic filter has hidden (features.scss §16), a second,
   * independent reason a mark can be unavailable. `asOfCutoff` and
   * `topicFilter` are tracked separately and recomposed together in
   * updateAvailability() below, so applyAsOf() and applyTopicFilter() --
   * called independently, from the scrubber and from topics.js's
   * `console:topic` event -- never clobber each other's exclusions the
   * way two independent `rover.setAvailable()` callers over the same
   * boolean would.
   */
  let asOfCutoff = null;
  let topicFilter = null;

  function isPhoneHideScope() {
    return document.documentElement.classList.contains('console-forced')
      && Boolean(window.matchMedia) && window.matchMedia('(max-width: 767px)').matches;
  }

  function updateAvailability() {
    for (const item of markerRecords) {
      const after = asOfCutoff != null && item.spec.year > asOfCutoff;
      const topicHidden = Boolean(topicFilter) && isPhoneHideScope() && item.spec.topic !== topicFilter;
      const unavailable = after || topicHidden;
      item.el.classList.toggle('is-after', after);
      item.el.classList.toggle('is-topic-hidden', topicHidden);
      rover.setAvailable(item.el, !unavailable);
      if (unavailable) {
        if (primer.get() === item.el) primer.clear();
        if (document.activeElement === item.el) item.el.blur();
      }
    }
  }

  function applyAsOf(year) {
    asOfCutoff = Number.isFinite(year) ? year : null;
    updateAvailability();
  }

  function applyTopicFilter(topic) {
    topicFilter = topic || null;
    updateAvailability();
  }

  on('console:topic', (event) => applyTopicFilter(event && event.detail && event.detail.topic));

  root.addEventListener('pointermove', (event) => scrubAt(event.clientX));
  root.addEventListener('pointerleave', clearScrub);
  root.addEventListener('pointercancel', clearScrub);

  function refresh() {
    for (const label of axis.querySelectorAll('.talks-timeline__year')) label.remove();
    const everyYear = plot.clientWidth >= WIDE_AXIS_PX;
    for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
      if (!everyYear && (year - FIRST_YEAR) % 2 !== 0 && year !== LAST_YEAR) continue;
      const label = el('span', {
        class: `talks-timeline__year${year === FIRST_YEAR ? ' is-first' : ''}${year === LAST_YEAR ? ' is-last' : ''}`,
        text: String(year),
        'aria-hidden': 'true',
      });
      label.style.left = `${axisPct(dateOf(`${year}-01-01`))}%`;
      axis.appendChild(label);
    }

    // Thin the axis by measurement, not by a width guess. At 320 and 390px
    // the every-second-year rule still puts 2014 on top of 2016 and 2026 on
    // top of 2027, because the first label is left-aligned, the last is
    // right-aligned and the rest are centred. Walk the labels left to right
    // and drop any that would touch the one before it; when the collision is
    // with the last label, the earlier one goes instead, so the axis always
    // keeps the year it starts at and the year it ends at.
    const placed = [...axis.querySelectorAll('.talks-timeline__year')];
    const kept = [];
    for (const label of placed) {
      const box = label.getBoundingClientRect();
      let dropped = false;
      while (kept.length) {
        const prev = kept[kept.length - 1].getBoundingClientRect();
        if (box.left >= prev.right + AXIS_LABEL_GAP_PX) break;
        if (label.classList.contains('is-last')) { kept.pop().remove(); continue; }
        label.remove();
        dropped = true;
        break;
      }
      if (!dropped) kept.push(label);
    }

    const source = markerRecords.filter((item) => !item.spec.lead);
    const width = track.clientWidth;
    const lastX = [];
    let maxLane = 0;
    for (const item of source) {
      const x = (axisPct(item.spec.when) / 100) * width;
      let lane = 0;
      while (lastX[lane] !== undefined && x - lastX[lane] < COLLISION_PX) lane++;
      lastX[lane] = x;
      item.lane = lane;
      maxLane = Math.max(maxLane, lane);
    }

    // The track is the CSS-token plot height minus the axis band. Read the
    // rendered height so the same lane calculation works for all three
    // chart-height tokens without restating any of them here.
    const usable = Math.max(0, track.clientHeight - GLYPH_PX);
    const laneStep = maxLane ? Math.min(MAX_LANE_STEP_PX, usable / maxLane) : 0;
    for (const item of source) {
      item.el.style.setProperty('--lane', `${-(item.lane * laneStep).toFixed(2)}px`);
    }
  }

  refresh();
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(refresh);
    observer.observe(plot);
  } else {
    window.addEventListener('resize', refresh, { passive: true });
  }

  return {
    hit(id) { return activate(String(id)); },
    refresh,
    marks() { return markerRecords.map((item) => item.el); },
    applyAsOf,
    applyTopicFilter,
  };
}

function axisPct(when) {
  return clamp(pct(when, AXIS_FROM, AXIS_TO), 0, 100);
}

/** Exact dates stay exact. A program's published date range is placed at
 * its documented first day; the accessible label keeps the full range and
 * says that no session slot or delivery is claimed. */
function talkDate(record) {
  if (record.date) {
    const exact = dateOf(record.date);
    return Number.isNaN(exact.getTime()) ? null : exact;
  }
  const match = String(record.date_label || '').match(/\b([A-Za-z]{3,9})\s+(\d{1,2})(?:\s*[-–]\s*\d{1,2})?,\s*(\d{4})\b/);
  if (!match) return null;
  const month = MONTHS[match[1].slice(0, 3).toLowerCase()];
  if (!month) return null;
  const parsed = dateOf(`${match[3]}-${pad2(month)}-${pad2(Number(match[2]))}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Turn prose such as "circa 2016-2018" into the full documented year
 * span. No four-digit year means no geometry and therefore no claim. */
function leadSpan(era) {
  const years = (String(era || '').match(/\b(?:19|20)\d{2}\b/g) || []).map(Number);
  if (!years.length) return null;
  const startYear = Math.max(FIRST_YEAR, Math.min(...years));
  const endYear = Math.min(LAST_YEAR - 1, Math.max(...years));
  if (startYear > endYear) return null;
  return {
    from: dateOf(`${startYear}-01-01`),
    to: dateOf(`${endYear + 1}-01-01`),
    startYear,
    endYear,
  };
}

function tooltipLines(spec) {
  const record = spec.record;
  if (spec.lead) {
    return [
      { class: 'tip__title', text: record.label || record.id },
      { class: 'tip__meta', text: record.era || 'Date under reconstruction' },
      { class: 'tip__kv', text: `Topic: ${topicLabel(spec.topic)}. Archive lead. ${record.detail || 'The record is under reconstruction.'}` },
    ];
  }
  return [
    { class: 'tip__title', text: record.title || record.id },
    { class: 'tip__meta', text: `${record.venue || 'Venue not recorded'}, ${record.date || record.date_label}` },
    { class: 'tip__kv', text: `Topic: ${topicLabel(spec.topic)}. ${evidenceCaveat(record)}` },
  ];
}

function ariaLabel(spec) {
  const record = spec.record;
  if (spec.lead) {
    return `${record.label || record.id}. ${record.era}. Topic: ${topicLabel(spec.topic)}. Archive lead. ${record.detail || 'The record is under reconstruction.'} Press Enter to highlight the matching archive lead.`;
  }
  return `${record.title || record.id}. ${record.venue || 'Venue not recorded'}. ${record.date || record.date_label}. Topic: ${topicLabel(spec.topic)}. ${evidenceCaveat(record)} Press Enter to highlight the matching talk record.`;
}

function evidenceCaveat(record) {
  if (record.evidence_level === 'official_program_listing') {
    return 'Program listing only. No dated session slot survives, so delivery is not claimed.';
  }
  if (record.evidence_level === 'scheduled_upcoming' || record.status === 'upcoming') {
    return 'Upcoming. The official schedule lists this session.';
  }
  return 'The official schedule provides the date. Scheduling is not independent proof of delivery.';
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
