/**
 * chart-cv.js: the cv lanes, the now LEDs and the career uptime line
 * (CV1, CV2, N1, N2).
 *
 * The complete CV and now facts stay in the server-rendered lists. This
 * module adds one data portrait over those lists from the same records:
 * roles, talks and posts on a shared career axis, plus a summary computed
 * from those records. Nothing is fetched and nothing here runs on a timer.
 */

import {
  bindTip,
  dateOf,
  el,
  hitRow,
  iso,
  mark,
  on,
  pct,
  showTip,
  topicLabel,
  touchPrimer,
  yearsBetween,
} from './chart-util.js';

const AXIS_TO = dateOf('2027-01-01');
const AXIS_LABEL_MIN_PX = 320;
const ROLE_LABEL_PAD_PX = 14;
const TICK_COLLISION_PX = 5;
const TICK_MARK_PX = 6;
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

/**
 * @param {Object} opts
 * @param {Object} opts.term
 * @param {Array} opts.talks
 * @param {Array} opts.posts
 * @param {Object} opts.topics
 * @param {boolean} opts.reducedMotion
 * @returns {{ scrubTo(date: Date|null): void, hitRole(id: string): boolean,
 *             refresh(): void }}
 */
export function setupChartCv({ term, talks, posts, topics, reducedMotion } = {}) {
  void term;

  const consoleEl = document.querySelector('.console[data-career-start]');
  const pane = document.getElementById('cv');
  const plot = pane && pane.querySelector('[data-career]');
  const rolesTrack = plot && plot.querySelector('[data-career-roles]');
  const talksTrack = plot && plot.querySelector('[data-career-talks]');
  const postsTrack = plot && plot.querySelector('[data-career-posts]');
  const axis = plot && plot.querySelector('[data-career-axis]');
  const hairline = plot && plot.querySelector('[data-career-scrub]');
  const summary = pane && pane.querySelector('[data-career-sum]');
  const uptime = document.querySelector('#now [data-uptime]');
  const startValue = consoleEl && consoleEl.dataset.careerStart;
  const axisFrom = validDate(startValue);
  const today = dateOf(iso(new Date()));

  const noop = {
    scrubTo() {},
    hitRole() { return false; },
    refresh() {},
    applyAsOf() {},
    applyTopicFilter() {},
  };

  if (!pane || !plot || !rolesTrack || !talksTrack || !postsTrack || !axis || !hairline || !summary || !axisFrom) {
    const chart = pane && pane.querySelector('[data-chart="cv"]');
    if (chart) chart.hidden = true;
    fillUptime(uptime, axisFrom, today);
    return noop;
  }

  fillUptime(uptime, axisFrom, today);
  plot.classList.add('career');

  const roleRecords = readRoles(pane, today, axisFrom);
  const talkRecords = readTalks(talks, topics, axisFrom);
  const postRecords = readPosts(posts, topics, axisFrom);
  const roleButtons = new Map();
  const tickSets = [];
  let scrubDate = null;
  // MB13/SB5: shared with the writing and talks charts -- an outside tap,
  // a cancelled touch or a phone/desktop breakpoint change drops the prime.
  const primer = touchPrimer({
    root: rolesTrack,
    onClear(el) {
      el.classList.remove('is-touch-selected');
      el.removeAttribute('aria-current');
    },
  });
  let pendingTouch = null;
  let pendingTouchActivates = false;

  rolesTrack.replaceChildren();
  talksTrack.replaceChildren();
  postsTrack.replaceChildren();
  axis.replaceChildren();
  summary.replaceChildren();
  hairline.hidden = true;
  rolesTrack.setAttribute(
    'aria-label',
    `Role spans on the shared ${axisFrom.getFullYear()} to ${AXIS_TO.getFullYear()} axis. Use Tab to reach a role, then press Enter to highlight its CV row.`,
  );

  for (const role of roleRecords) {
    const lines = roleTip(role);
    const accessibleName = role.org ? `${role.title}, ${role.org}` : role.title;
    const label = el('span', {
      class: 'career__seglabel',
      text: role.title,
      'aria-hidden': 'true',
      hidden: true,
    });
    const button = el('button', {
      type: 'button',
      class: 'career__seg chart-mark chart-fill',
      'data-topic': role.topic,
      'data-year': String(role.from.getFullYear()),
      'data-role-id': role.id,
      'aria-label': `${accessibleName}. ${role.range}. Topic: ${topicLabel(role.topic)}. Press Enter to highlight the matching role row.`,
    }, label);
    button.style.left = `${axisPct(role.from, axisFrom)}%`;
    button.style.width = `${Math.max(0, axisPct(role.to, axisFrom) - axisPct(role.from, axisFrom))}%`;
    bindTip(button, () => lines, role.topic);

    button.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
        pendingTouch = null;
        primer.clear();
        return;
      }
      pendingTouch = button;
      pendingTouchActivates = primer.get() === button;
    });
    button.addEventListener('pointercancel', () => {
      pendingTouch = null;
      pendingTouchActivates = false;
    });
    button.addEventListener('click', (event) => {
      if (pendingTouch === button) {
        const activates = pendingTouchActivates;
        pendingTouch = null;
        pendingTouchActivates = false;
        if (!activates) {
          primer.set(button);
          button.classList.add('is-touch-selected');
          button.setAttribute('aria-current', 'true');
          // A touch pointer leaves at the end of the tap, after bindTip's
          // pointerenter. Reassert the selected tooltip on the next frame so
          // the first tap remains an inspect action and the second activates.
          requestAnimationFrame(() => {
            if (primer.get() === button) showTip(button, lines, role.topic);
          });
          event.preventDefault();
          return;
        }
      }
      primer.clear();
      activateRole(role.id, button);
    });

    rolesTrack.appendChild(button);
    roleButtons.set(role.id, { button, label, role, lines });

    // A pane body may scroll the newly focused button into view after the
    // shared focus handler has shown its tooltip. The shared scroll listener
    // then hides it, so restore it once layout settles while focus remains.
    button.addEventListener('focus', () => {
      requestAnimationFrame(() => {
        if (document.activeElement === button) showTip(button, lines, role.topic);
      });
    });
    button.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse') showTip(button, lines, role.topic);
    });
  }

  // The career log scrolls inside the terminal for up to two seconds after
  // ready. The shared tooltip correctly hides on every scroll, including
  // that unrelated one, so restore a role tooltip after the scroll when its
  // own control is still hovered, focused or touch-selected.
  let tipFrame = 0;
  window.addEventListener('scroll', () => {
    const owner = [...roleButtons.values()].find(({ button }) => (
      button === document.activeElement || button === primer.get() || button.matches(':hover')
    ));
    if (!owner) return;
    cancelAnimationFrame(tipFrame);
    tipFrame = requestAnimationFrame(() => {
      const { button, lines, role } = owner;
      if (button === document.activeElement || button === primer.get() || button.matches(':hover')) {
        showTip(button, lines, role.topic);
      }
    });
  }, { capture: true, passive: true });

  // The remainder of the fixed career-to-2027 axis is deliberately empty.
  // Draw its extent, but do not assign it a topic or imply another role.
  const lastRoleEnd = roleRecords.reduce((latest, role) => role.to > latest ? role.to : latest, axisFrom);
  if (lastRoleEnd < AXIS_TO) {
    const future = el('span', { class: 'career__future', 'aria-hidden': 'true' });
    future.style.left = `${axisPct(lastRoleEnd, axisFrom)}%`;
    future.style.width = `${Math.max(0, 100 - axisPct(lastRoleEnd, axisFrom))}%`;
    rolesTrack.appendChild(future);
  }

  tickSets.push(renderTicks(talksTrack, talkRecords));
  tickSets.push(renderTicks(postsTrack, postRecords));
  renderSummary(summary, axisFrom, today, talkRecords, postRecords);

  function activateRole(id, button = roleButtons.get(id)?.button || null) {
    const role = roleButtons.get(String(id));
    return hitRow('cv', role ? role.role.row : null, button, Boolean(reducedMotion));
  }

  function scrubTo(date) {
    const next = date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    scrubDate = next;
    positionHairline();
  }

  function positionHairline() {
    if (!scrubDate) {
      hairline.hidden = true;
      return;
    }
    const plotRect = plot.getBoundingClientRect();
    const trackRect = rolesTrack.getBoundingClientRect();
    if (!plotRect.width || !trackRect.width) {
      hairline.hidden = true;
      return;
    }
    const position = clamp(axisPct(scrubDate, axisFrom), 0, 100);
    hairline.style.left = `${trackRect.left - plotRect.left + (position / 100) * trackRect.width}px`;
    hairline.hidden = false;
  }

  function refresh() {
    const plotHeight = plot.getBoundingClientRect().height;
    if (!plotHeight) return;

    // Read the token-resolved plot height, then divide what remains after
    // the axis and grid gaps among the three lanes. No viewport-specific
    // chart height is repeated here.
    const style = getComputedStyle(plot);
    const axisHeight = axis.getBoundingClientRect().height;
    const parsedGap = parseFloat(style.rowGap);
    const gap = Number.isFinite(parsedGap) ? parsedGap : 0;
    const laneHeight = Math.max(TICK_MARK_PX, Math.floor((plotHeight - axisHeight - 3 * gap) / 3));
    plot.style.setProperty('--career-lane-h', `${laneHeight}px`);

    renderAxis(axis, rolesTrack.clientWidth, axisFrom);
    layoutRoleLabels(roleButtons);
    for (const ticks of tickSets) layoutTicks(ticks, laneHeight, axisFrom, rolesTrack.clientWidth);
    positionHairline();
  }

  refresh();
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(refresh);
    observer.observe(plot);
  } else {
    window.addEventListener('resize', refresh, { passive: true });
  }

  /**
   * SB6: the generic scrubber treatment (an .is-after opacity class alone)
   * misrepresents a role that spans the cutoff -- a 2013-to-2026 bar stayed
   * fully bright and fully wide under a #2018 scrub, claiming the role
   * continued past the year being viewed. As of `year`, a role's bar ends
   * at that year's close instead of its real end; a role that starts
   * entirely after the cutoff is hidden outright (matching its row, which
   * the plain per-row scrub already hides) and taken out of tab order.
   * Talk/post ticks keep the plain .is-after dim: a point in time past the
   * cutoff does not misstate a duration the way an unclipped bar does.
   * `year` null (or any non-finite value) restores every role to its real
   * span.
   */
  // adversarial-review-4 finding 4: a role button can also point at a row
  // the phone-forced topic filter has hidden (features.scss §16), a
  // second, independent reason it can be unavailable alongside the
  // scrubbed-year cutoff above. `cutoffYear` and `topicFilter` are tracked
  // separately and recomposed together in updateAvailability() so
  // applyAsOf() (the scrubber) and applyTopicFilter() (topics.js's
  // `console:topic` event) never clobber each other's exclusions. Topic
  // mismatch never touches the bar's own geometry (left/width stay keyed
  // to the scrub cutoff only), because `hidden` alone already removes it
  // from layout, click and Tab order.
  let cutoffYear = null;
  let topicFilter = null;

  function isPhoneHideScope() {
    return document.documentElement.classList.contains('console-forced')
      && Boolean(window.matchMedia) && window.matchMedia('(max-width: 767px)').matches;
  }

  function updateAvailability() {
    const cutoffEnd = cutoffYear ? dateOf(`${cutoffYear}-12-31`) : null;
    for (const { button, role } of roleButtons.values()) {
      const startsAfter = Boolean(cutoffEnd && role.from > cutoffEnd);
      const topicHidden = Boolean(topicFilter) && isPhoneHideScope() && role.topic !== topicFilter;
      const unavailable = startsAfter || topicHidden;
      if (unavailable) {
        if (primer.get() === button) primer.clear();
        if (document.activeElement === button) button.blur();
      }
      button.hidden = unavailable;
      button.tabIndex = unavailable ? -1 : 0;
      button.classList.toggle('is-topic-hidden', topicHidden);
      const to = cutoffEnd && role.to > cutoffEnd ? cutoffEnd : role.to;
      const left = axisPct(role.from, axisFrom);
      const width = startsAfter ? 0 : Math.max(0, axisPct(to, axisFrom) - left);
      button.style.left = `${left}%`;
      button.style.width = `${width}%`;
    }
    for (const ticks of tickSets) {
      for (const tick of ticks) {
        tick.el.classList.toggle('is-after', Boolean(cutoffYear != null && tick.record.year > cutoffYear));
      }
    }
    refresh();
  }

  function applyAsOf(year) {
    cutoffYear = Number.isFinite(year) ? year : null;
    updateAvailability();
  }

  function applyTopicFilter(topic) {
    topicFilter = topic || null;
    updateAvailability();
  }

  on('console:topic', (event) => applyTopicFilter(event && event.detail && event.detail.topic));

  return {
    scrubTo,
    hitRole(id) { return activateRole(String(id)); },
    refresh,
    applyAsOf,
    applyTopicFilter,
  };
}

function fillUptime(node, start, end) {
  if (!node || !start || !end || end < start) return false;
  const { years, months } = wholeYearsMonths(start, end);
  node.textContent = `${years}y ${months}m`;
  node.hidden = false;
  return true;
}

function readRoles(pane, today, axisFrom) {
  const roles = [];
  for (const row of pane.querySelectorAll('[data-cv-roles] .row[data-id][data-from]')) {
    const from = validDate(row.dataset.from);
    const parsedTo = validDate(row.dataset.to);
    const to = parsedTo || today;
    if (!from || !to || to <= from || to <= axisFrom || from >= AXIS_TO) continue;
    const fullTitle = cleanText(row.querySelector('.row__title')) || row.dataset.id;
    const comma = fullTitle.indexOf(',');
    const title = comma === -1 ? fullTitle : fullTitle.slice(0, comma).trim();
    const org = comma === -1 ? '' : fullTitle.slice(comma + 1).trim();
    const range = cleanText(row.querySelector('.row__date')) || `${row.dataset.from} to ${row.dataset.to || 'now'}`;
    roles.push({
      id: row.dataset.id,
      row,
      from: from < axisFrom ? axisFrom : from,
      to: to > AXIS_TO ? AXIS_TO : to,
      title,
      org,
      range,
      note: cleanText(row.querySelector('.row__note')),
      topic: row.dataset.topic || 'other',
    });
  }
  return roles.sort((a, b) => a.from - b.from);
}

function readTalks(talks, topics, axisFrom) {
  const records = [];
  const topicMap = topics && topics.talks ? topics.talks : {};
  for (const talk of Array.isArray(talks) ? talks : []) {
    const topic = mappedTopic(topicMap, talk.id);
    if (talk.record_type === 'sourced') {
      const date = talkDate(talk);
      if (!date || date < axisFrom || date > AXIS_TO) continue;
      records.push({ id: talk.id, date, year: date.getFullYear(), topic, lead: false });
      continue;
    }
    if (talk.record_type !== 'archive_lead') continue;
    const span = leadSpan(talk.era, axisFrom.getFullYear(), AXIS_TO.getFullYear() - 1);
    if (!span) continue;
    records.push({
      id: talk.id,
      date: new Date((span.from.getTime() + span.to.getTime()) / 2),
      year: span.endYear,
      topic,
      lead: true,
    });
  }
  return records.sort((a, b) => a.date - b.date || Number(a.lead) - Number(b.lead));
}

function readPosts(posts, topics, axisFrom) {
  const topicMap = topics && topics.posts ? topics.posts : {};
  const records = [];
  for (const post of Array.isArray(posts) ? posts : []) {
    const date = validDate(post.date);
    if (!date || date < axisFrom || date > AXIS_TO) continue;
    records.push({
      id: post.slug || post.url || post.date,
      date,
      year: date.getFullYear(),
      topic: mappedTopic(topicMap, post.slug),
      lead: false,
    });
  }
  return records.sort((a, b) => a.date - b.date);
}

function renderTicks(track, records) {
  const ticks = [];
  for (const record of records) {
    const tick = el('span', {
      class: `career__tick chart-mark${record.lead ? ' career__tick--lead' : ''}`,
      'data-topic': record.topic,
      'data-year': String(record.year),
      'data-record-id': record.id,
      'aria-hidden': 'true',
    }, mark(record.topic, 'career__tick-mark'));
    track.appendChild(tick);
    ticks.push({ el: tick, record, lane: 0 });
  }
  return ticks;
}

function renderSummary(node, axisFrom, today, talkRecords, postRecords) {
  const sourced = talkRecords.filter((record) => !record.lead);
  const speakingYears = new Set(sourced.map((record) => record.year)).size;
  const years = yearsBetween(axisFrom, today).toFixed(1);
  // Two lengths of the same four facts. The full sentence needs 431px and a
  // 390px phone leaves the summary 348px, so the two widest words are marked
  // wide-only: the phone reads "13.7 years, 12 talks, 8 posts, 5 speaking"
  // and every wider viewport reads the whole thing. The aria-label is always
  // the full sentence, so nothing is lost to a screen reader either way.
  const wide = (t) => el('span', { class: 'wide-only', text: t });
  const fields = [
    [years, [' years,']],
    [String(sourced.length), [' ', wide('sourced '), 'talks,']],
    [String(postRecords.length), [' posts,']],
    [String(speakingYears), [' speaking', wide(' years')]],
  ];
  node.setAttribute(
    'aria-label',
    `${years} years, ${sourced.length} sourced talks, ${postRecords.length} posts, ${speakingYears} speaking years`,
  );
  for (const [value, parts] of fields) {
    node.appendChild(el('span', {}, [el('strong', { text: value }), ...parts]));
  }
}

function renderAxis(axis, width, axisFrom) {
  axis.replaceChildren();
  const firstYear = axisFrom.getFullYear();
  const lastYear = AXIS_TO.getFullYear();
  const step = width >= AXIS_LABEL_MIN_PX ? 1 : 2;
  for (let year = firstYear; year <= lastYear; year += step) {
    appendYear(axis, year, firstYear, lastYear, axisFrom);
  }
  if ((lastYear - firstYear) % step !== 0) appendYear(axis, lastYear, firstYear, lastYear, axisFrom);
}

function appendYear(axis, year, firstYear, lastYear, axisFrom) {
  const edge = year === firstYear ? ' is-first' : year === lastYear ? ' is-last' : '';
  const label = el('span', {
    class: `career__year${edge}`,
    text: String(year).slice(-2),
    'aria-hidden': 'true',
  });
  label.style.left = `${axisPct(dateOf(`${year}-01-01`), axisFrom)}%`;
  axis.appendChild(label);
}

function layoutRoleLabels(records) {
  for (const { button, label, role } of records.values()) {
    const available = button.clientWidth - ROLE_LABEL_PAD_PX;
    label.hidden = available < textWidth(role.title, label);
  }
}

function layoutTicks(ticks, laneHeight, axisFrom, width) {
  const lastX = [];
  let maxLane = 0;
  for (const tick of ticks) {
    const position = axisPct(tick.record.date, axisFrom);
    const x = (position / 100) * width;
    let lane = 0;
    while (lastX[lane] !== undefined && x - lastX[lane] < TICK_COLLISION_PX) lane++;
    lastX[lane] = x;
    tick.lane = lane;
    maxLane = Math.max(maxLane, lane);
    tick.el.style.left = `${position}%`;
  }
  const room = Math.max(0, laneHeight - TICK_MARK_PX);
  const step = maxLane > 0 ? room / maxLane : 0;
  for (const tick of ticks) {
    tick.el.style.setProperty('--career-tick-offset', `${(tick.lane * step).toFixed(2)}px`);
  }
}

function roleTip(role) {
  const meta = role.org ? `${role.org}. ${role.range}.` : `${role.range}.`;
  const detail = role.note ? `Topic: ${topicLabel(role.topic)}. ${role.note}` : `Topic: ${topicLabel(role.topic)}.`;
  return [
    { class: 'tip__title', text: role.title },
    { class: 'tip__meta', text: meta },
    { class: 'tip__kv', text: detail },
  ];
}

function talkDate(record) {
  if (record.date) return validDate(record.date);
  const match = String(record.date_label || '').match(/\b([A-Za-z]{3,9})\s+(\d{1,2})(?:\s*[-–]\s*\d{1,2})?,\s*(\d{4})\b/);
  if (!match) return null;
  const month = MONTHS[match[1].slice(0, 3).toLowerCase()];
  if (!month) return null;
  return validDate(`${match[3]}-${String(month).padStart(2, '0')}-${String(Number(match[2])).padStart(2, '0')}`);
}

function leadSpan(era, minYear, maxYear) {
  const years = (String(era || '').match(/\b(?:19|20)\d{2}\b/g) || []).map(Number);
  if (!years.length) return null;
  const startYear = Math.max(minYear, Math.min(...years));
  const endYear = Math.min(maxYear, Math.max(...years));
  if (startYear > endYear) return null;
  return {
    from: dateOf(`${startYear}-01-01`),
    to: dateOf(`${endYear + 1}-01-01`),
    endYear,
  };
}

function mappedTopic(map, id) {
  const entry = map && map[id];
  return typeof entry === 'string' ? entry : entry && entry.topic ? entry.topic : 'other';
}

function validDate(value) {
  if (!value) return null;
  const date = dateOf(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function axisPct(date, axisFrom) {
  return clamp(pct(date, axisFrom, AXIS_TO), 0, 100);
}

function wholeYearsMonths(from, to) {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
  if (to.getDate() < from.getDate()) months--;
  months = Math.max(0, months);
  return { years: Math.floor(months / 12), months: months % 12 };
}

function textWidth(text, node) {
  const canvas = textWidth.canvas || (textWidth.canvas = document.createElement('canvas'));
  const context = canvas.getContext('2d');
  if (!context) return Number.POSITIVE_INFINITY;
  context.font = getComputedStyle(node).font;
  return context.measureText(text).width;
}

function cleanText(node) {
  return node ? node.textContent.replace(/\s+/g, ' ').trim() : '';
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
