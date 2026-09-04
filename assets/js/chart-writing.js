import {
  bindTip,
  dateOf,
  el,
  hitRow,
  iso,
  mark,
  on,
  roving,
  showTip,
  topicLabel,
  touchPrimer,
} from './chart-util.js';

/**
 * chart-writing.js: the writing calendar (W1) and the reading-time bars
 * (W2). Worker W.
 *
 * The calendar is one cell a day from the month of the first post to the
 * end of the current month, laid out the way a contribution graph is: a
 * column a week, a row a weekday, short month labels above. A day with a
 * post is a native button carrying the post's topic hue in the topic's
 * shape, shaded by how long the day's reading is; a day without one is the
 * bare surface; a day still to come is a hairline. Two posts on one day get
 * a count badge and one cell that steps through both rows.
 *
 * Everything it draws comes from the DOM the site already renders: the post
 * rows Liquid wrote (`#writing .row[data-slug][data-topic]`, their
 * `<time datetime>` and their `.row__aside[data-minutes]`) and the
 * `#posts-data` block for the titles. It owns no content, invents no date
 * or minute, makes no request and starts no timer.
 *
 * Sizing is a contract with features/chart-writing.css: the plot height is
 * the `--chart-h` family of tokens, and `refresh()` measures the plot and
 * writes `--cal-cell` from it after subtracting the month row, the gaps and
 * the viewport halo it reads back from the stylesheet. No height is
 * hard-coded here, so the calendar follows the token at every width.
 *
 * @param {Object} opts
 * @param {Object} opts.term            the terminal, unused by this module
 * @param {Array}  opts.posts           parsed #posts-data, newest first
 * @param {Object} opts.topics          parsed #topics-data
 * @param {boolean} opts.reducedMotion
 * @returns {{ hit(slug: string): boolean, refresh(): void, cells(): Element[] }}
 */
export function setupChartWriting({ term, posts, topics, reducedMotion } = {}) {
  void term;

  const pane = document.getElementById('writing');
  const plot = pane && pane.querySelector('[data-cal]');
  const noop = {
    hit() { return false; },
    refresh() {},
    cells() { return []; },
    applyAsOf() {},
    applyTopicFilter() {},
  };
  if (!pane || !plot) return noop;

  const sourceBySlug = new Map(
    (Array.isArray(posts) ? posts : [])
      .filter((post) => post && post.slug)
      .map((post) => [String(post.slug), post]),
  );
  const topicBySlug = topics && topics.posts ? topics.posts : {};
  const rowBySlug = new Map();
  const records = [];

  for (const row of pane.querySelectorAll('.row[data-slug]')) {
    const slug = row.dataset.slug;
    const source = sourceBySlug.get(slug) || {};
    const time = row.querySelector('time[datetime]');
    const aside = row.querySelector('.row__aside[data-minutes]');
    const titleEl = row.querySelector('.row__title');
    const rawDate = (time && time.getAttribute('datetime')) || source.date || '';
    const date = String(rawDate).slice(0, 10);
    const minutes = Number(aside ? aside.dataset.minutes : source.minutes);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(minutes) || minutes < 0) continue;

    const topic = row.dataset.topic || topicBySlug[slug] || 'other';
    rowBySlug.set(slug, row);
    records.push({
      slug,
      row,
      aside,
      date,
      minutes,
      topic,
      title: String(source.title || (titleEl && titleEl.textContent) || slug).trim(),
    });
  }

  if (!records.length) {
    const chart = plot.closest('[data-chart="writing"]');
    if (chart) chart.hidden = true;
    return noop;
  }

  const byDate = new Map();
  for (const record of records) {
    if (!byDate.has(record.date)) byDate.set(record.date, []);
    byDate.get(record.date).push(record);
  }

  const dates = [...byDate.keys()].sort();
  const firstPost = dateOf(dates[0]);
  const first = new Date(firstPost.getFullYear(), firstPost.getMonth(), 1, 12);
  const today = dateOf(iso(new Date()));
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0, 12);
  const dayTotals = [...byDate.values()].map((day) => day.reduce((sum, post) => sum + post.minutes, 0));
  const cuts = lengthCuts(dayTotals);

  const layout = el('div', { class: 'cal__layout' });
  const viewport = el('div', { class: 'cal__viewport' });
  const grid = el('div', {
    class: 'cal__grid',
    role: 'group',
    'aria-label': `Writing calendar, ${MONTHS[first.getMonth()]} ${first.getFullYear()} to ${MONTHS[last.getMonth()]} ${last.getFullYear()}, one cell a day.`,
  });
  layout.append(viewport, buildLegend());
  viewport.appendChild(grid);
  plot.replaceChildren(layout);

  const startOffset = first.getDay();
  const days = [];
  for (const cursor = new Date(first); cursor <= last; cursor.setDate(cursor.getDate() + 1)) {
    days.push(new Date(cursor));
  }
  const weeks = Math.floor((startOffset + days.length - 1) / 7) + 1;
  grid.style.setProperty('--cal-weeks', String(weeks));

  for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
    if (days[dayIndex].getDate() !== 1) continue;
    const label = el('span', {
      class: 'cal__month',
      text: MONTHS[days[dayIndex].getMonth()],
      'aria-hidden': 'true',
    });
    label.style.gridColumn = String(Math.floor((startOffset + dayIndex) / 7) + 2);
    label.style.gridRow = '1';
    grid.appendChild(label);
  }

  for (let weekday = 0; weekday < 7; weekday++) {
    if (!WEEKDAYS[weekday]) continue;
    const label = el('span', {
      class: 'cal__weekday',
      text: WEEKDAYS[weekday],
      'aria-hidden': 'true',
    });
    label.style.gridColumn = '1';
    label.style.gridRow = String(weekday + 2);
    grid.appendChild(label);
  }

  const cellNodes = [];
  const cellBySlug = new Map();
  const postsByCell = new Map();

  /* MB13: on a touch screen the first tap on a cell selects it and shows
     the tooltip, the second tap opens the row, so nothing here is
     hover-only. A mouse click opens the row on the first press. The
     primed state is shared with the talks and cv charts (SB5): an
     unrelated tap outside the calendar, a cancelled touch or a
     phone/desktop breakpoint change drops it, so a later tap that happens
     to land back on the same cell reads as a fresh first tap. */
  const primer = touchPrimer({ root: plot, onClear(cell) { cell.removeAttribute('aria-current'); } });
  let pendingTouch = null;
  let pendingTouchActivates = false;
  /* A day with two posts steps through them: each activation of the same
     cell lands on the next of its rows. */
  let steppedCell = null;
  let steppedIndex = 0;

  for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
    const date = days[dayIndex];
    const key = iso(date);
    const dayPosts = byDate.get(key);
    let cell;

    if (!dayPosts) {
      cell = el('span', {
        class: `cal__cell${date > today ? ' cal__cell--future' : ''}`,
        'aria-hidden': 'true',
      });
    } else {
      const minutes = dayPosts.reduce((sum, post) => sum + post.minutes, 0);
      const topic = dayPosts[0].topic;
      const tipLines = () => buildTipLines(key, dayPosts, minutes, topic);
      cell = el('button', {
        class: 'cal__cell cal__cell--post chart-mark',
        type: 'button',
        'data-topic': topic,
        'data-year': String(date.getFullYear()),
        'data-date': key,
        'data-length': lengthStep(minutes, cuts),
        'aria-label': cellLabel(key, dayPosts, minutes, topic),
      }, mark(topic, 'cal__topic-mark'));

      if (dayPosts.length > 1) {
        cell.appendChild(el('span', {
          class: 'cal__count',
          text: dayPosts.length,
          'aria-hidden': 'true',
        }));
      }

      bindTip(cell, tipLines, topic);
      cell.addEventListener('pointerdown', (event) => {
        if (event.pointerType !== 'touch') {
          pendingTouch = null;
          return;
        }
        pendingTouch = cell;
        pendingTouchActivates = primer.get() === cell;
      });
      cell.addEventListener('pointercancel', () => {
        pendingTouch = null;
        pendingTouchActivates = false;
      });
      cell.addEventListener('click', (event) => {
        if (pendingTouch === cell) {
          const activate = pendingTouchActivates;
          pendingTouch = null;
          pendingTouchActivates = false;
          if (!activate) {
            primer.set(cell);
            cell.setAttribute('aria-current', 'true');
            showTip(cell, tipLines(), topic);
            event.preventDefault();
            return;
          }
        }
        primer.clear();
        activateCell(cell);
      });

      cellNodes.push(cell);
      postsByCell.set(cell, dayPosts);
      for (const post of dayPosts) cellBySlug.set(post.slug, cell);
    }

    cell.style.gridColumn = String(Math.floor((startOffset + dayIndex) / 7) + 2);
    cell.style.gridRow = String(date.getDay() + 2);
    grid.appendChild(cell);
  }

  const rover = roving(cellNodes);

  const maxMinutes = Math.max(...records.map((post) => post.minutes), 1);
  for (const post of records) addReadingBar(post, maxMinutes);

  /* Rows past the fifth are hidden until the pane is zoomed (phase 2). A
     cell may point at one, so it is revealed for as long as it is the hit
     row and put back when the hit moves on or the zoom ends. */
  const transientRows = new Set();
  let wasZoomed = pane.classList.contains('is-zoom');
  const zoomObserver = new MutationObserver(() => {
    const zoomed = pane.classList.contains('is-zoom');
    if (wasZoomed && !zoomed) clearTransientRows();
    wasZoomed = zoomed;
  });
  zoomObserver.observe(pane, { attributes: true, attributeFilter: ['class'] });

  function clearTransientRows(except = null) {
    for (const row of [...transientRows]) {
      if (row === except) continue;
      row.hidden = true;
      transientRows.delete(row);
    }
  }

  /** Land on one named post, whichever cell holds it. This is `hit()`. */
  function activatePost(slug, cell = cellBySlug.get(slug)) {
    const row = rowBySlug.get(slug);
    if (!row) return false;
    clearTransientRows(row);
    if (row.hasAttribute('data-rest') && row.hidden) {
      row.hidden = false;
      transientRows.add(row);
    }
    return hitRow('writing', row, cell || null, reducedMotion);
  }

  /** Land on the next post of the day this cell stands for. */
  function activateCell(cell) {
    const dayPosts = postsByCell.get(cell);
    if (!dayPosts) return false;
    steppedIndex = cell === steppedCell ? (steppedIndex + 1) % dayPosts.length : 0;
    steppedCell = cell;
    return activatePost(dayPosts[steppedIndex].slug, cell);
  }

  /**
   * SB6: as of a scrubbed year, a cell past the cutoff points at a row the
   * scrubber has hidden. Dim it (the existing .is-after treatment) and
   * take it out of the roving set so Tab, the arrows and Home/End all skip
   * it -- hitRow() itself also refuses a scrubber-hidden row, so a stray
   * mouse click on a dimmed cell still does nothing. `year` null (or any
   * non-finite value) resets every cell to live.
   *
   * adversarial-review-4 finding 4: a cell can also point at a row (or,
   * for a two-post day, at more than one) the phone-forced topic filter
   * has hidden. `asOfCutoff` and `topicFilter` are tracked separately and
   * recomposed in updateAvailability() so applyAsOf() (the scrubber) and
   * applyTopicFilter() (topics.js's `console:topic` event) never clobber
   * each other's exclusions. A two-post cell stays available as long as
   * any one of its days' posts still matches the filter -- hiding the
   * whole cell over one non-matching post would strand the other.
   */
  let asOfCutoff = null;
  let topicFilter = null;

  function isPhoneHideScope() {
    return document.documentElement.classList.contains('console-forced')
      && Boolean(window.matchMedia) && window.matchMedia('(max-width: 767px)').matches;
  }

  function updateAvailability() {
    for (const cell of cellNodes) {
      const after = asOfCutoff != null && Number(cell.dataset.year) > asOfCutoff;
      const dayPosts = postsByCell.get(cell) || [];
      const topicHidden = Boolean(topicFilter) && isPhoneHideScope()
        && !dayPosts.some((post) => post.topic === topicFilter);
      const unavailable = after || topicHidden;
      cell.classList.toggle('is-after', after);
      cell.classList.toggle('is-topic-hidden', topicHidden);
      rover.setAvailable(cell, !unavailable);
      if (unavailable) {
        if (primer.get() === cell) primer.clear();
        if (document.activeElement === cell) cell.blur();
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

  /**
   * Size the cells to whatever the plot token is at this width. Every
   * number subtracted here is read back from the stylesheet, so the plot
   * height, the month row, the gaps and the halo the selection ring needs
   * stay single-sourced in CSS.
   */
  function refresh() {
    const gridStyle = getComputedStyle(grid);
    const boxStyle = getComputedStyle(viewport);
    const plotHeight = plot.getBoundingClientRect().height;
    const halo = numberToken(boxStyle, 'padding-top', 3) + numberToken(boxStyle, 'padding-bottom', 3);
    const monthRow = numberToken(gridStyle, '--cal-month-row', 11);
    const gap = numberToken(gridStyle, '--cal-gap', 1);
    // One gap after the month row plus six gaps between the seven day rows.
    const cell = Math.max(3, Math.floor((plotHeight - halo - monthRow - 7 * gap) / 7));
    grid.style.setProperty('--cal-cell', `${cell}px`);
  }

  refresh();
  if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(plot);

  return {
    hit: activatePost,
    refresh,
    cells() { return cellNodes.slice(); },
    applyAsOf,
    applyTopicFilter,
  };
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAYS = ['', 'mon', '', 'wed', '', 'fri', ''];
const LENGTHS = ['short', 'medium', 'long'];

/**
 * The two boundaries of the three reading-length steps, as terciles of the
 * real per-day totals. Data derived, so the steps stay meaningful as the
 * archive grows instead of being pinned to invented minute counts.
 */
function lengthCuts(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return {
    short: sorted[Math.max(0, Math.ceil(sorted.length / 3) - 1)],
    medium: sorted[Math.max(0, Math.ceil((sorted.length * 2) / 3) - 1)],
  };
}

function lengthStep(minutes, cuts) {
  if (minutes <= cuts.short) return 'short';
  if (minutes <= cuts.medium) return 'medium';
  return 'long';
}

/** The shade key. Three words, so a shade is never unlabelled. */
function buildLegend() {
  const legend = el('div', { class: 'cal__legend' });
  legend.appendChild(el('span', { class: 'cal__legend-title', text: 'length' }));
  for (const length of LENGTHS) {
    legend.appendChild(el('span', { class: 'cal__legend-item' }, [
      el('span', { class: 'cal__legend-swatch', 'data-length': length, 'aria-hidden': 'true' }),
      length,
    ]));
  }
  return legend;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function cellLabel(date, dayPosts, totalMinutes, topic) {
  const titles = dayPosts.map((post) => `${post.title}, ${plural(post.minutes, 'minute')}`).join('; ');
  const action = dayPosts.length === 1
    ? 'Press to show the matching row in the writing list.'
    : `Press to step through the ${dayPosts.length} matching rows in the writing list.`;
  return `${date}. ${plural(dayPosts.length, 'post')}: ${titles}. ${plural(totalMinutes, 'minute')} total. Topic ${topicLabel(topic)}. ${action}`;
}

function buildTipLines(date, dayPosts, totalMinutes, topic) {
  const lines = [{ class: 'tip__title', text: date }];
  for (const post of dayPosts) {
    lines.push({ class: 'tip__meta', text: `${post.title} · ${post.minutes} min` });
  }
  lines.push({
    class: 'tip__kv',
    text: `${plural(dayPosts.length, 'post')} · ${totalMinutes} min total · ${topicLabel(topic)}`,
  });
  return lines;
}

/**
 * W2: a bar in the post's topic hue, proportional to its reading time,
 * inside the aside that already prints the number. Decorative, so it is
 * hidden from assistive technology.
 */
function addReadingBar(post, maxMinutes) {
  if (!post.aside) return;
  const old = post.aside.querySelector('.reading-bar');
  if (old) old.remove();
  const bar = el('span', {
    class: 'reading-bar',
    'data-topic': post.topic,
    'aria-hidden': 'true',
  });
  bar.style.setProperty('--reading-ratio', String(post.minutes / maxMinutes));
  post.aside.prepend(bar);
}

function numberToken(styles, name, fallback) {
  const value = parseFloat(styles.getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}
