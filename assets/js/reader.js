/**
 * reader.js: the less-style post reader inside the zoomed writing pane
 * (R1, R2).
 *
 * Contract (scratchpad/phase2/PLAN.md, module table):
 *   setupReader({ term, reducedMotion, posts }) ->
 *     { open(slug, opener?), close(), isOpen(), current(), onClose(fn) }
 *
 * open(slug, opener) fetches the post's own page (same origin), parses it
 * with DOMParser, takes .page__header and main .prose, and renders title,
 * date, body and a persistent "open on blog" link into #writing
 * [data-reader]. The whole writing archive -- all three post lists (the
 * visible one, the phone-fold batch and the hidden tail, phase 3 split
 * across a <details> disclosure) plus the all-posts/rss actions row nested
 * inside it -- is one hideable region while a post is open: everything in
 * it is unreachable by tab or click, and each piece's own `hidden` state
 * is snapshotted first and restored exactly on close, not just forced back
 * to visible. `opener`, when the caller has the actual link that was
 * activated, is who gets focus back on close; without it (a palette or
 * `cat writing/<slug>` open, a hash deep link) close() falls back to
 * searching the whole archive for the post's own link. A status line at
 * the bottom reads "<slug> line x of y NN%" from the real rendered height
 * (aria-live off).
 *
 * Cancellation contract: each open() call gets its own AbortController.
 * Opening a second post while the first is still fetching aborts the
 * first's request; closing the reader (or the pane it lives in) while a
 * fetch is in flight aborts it too. open()'s returned promise always
 * resolves, never rejects, to one of four distinct values so a caller can
 * tell a real failure from a load that simply stopped mattering:
 *   - true       the post rendered.
 *   - false      a genuine failure of *this* request (not found, network
 *                error, non-2xx response, or no post body in the page) --
 *                the only case in which a caller should fall back to
 *                navigating to the post's own URL.
 *   - 'stale'    superseded by a later open() call before this one finished.
 *   - 'cancelled' the reader (or its pane) was closed before this one finished.
 * Both 'stale' and 'cancelled' are truthy but !== true and !== false, so
 * `result === false` is the only correct failure check and `result === true`
 * the only correct success check; callers must not use `if (result)`.
 *
 * Keys inside the region only: j/k and arrows one line, space/b and
 * PageDown/PageUp one page, g/G and Home/End the ends, q or Esc back to the
 * list. The region is focused on open but never traps focus: Tab leaves it
 * through the post's links to the rest of the page and the statusbar.
 *
 * From 1024px the reader scrolls inside the pane; below that the page
 * scrolls and the status line sticks above the statusbar. Reduced motion:
 * every scroll is instant.
 */

const LINE_FALLBACK_PX = 28;

export function setupReader({ term, reducedMotion, posts }) {
  const region = document.querySelector('#writing [data-reader]');
  const pane = region ? region.closest('.pane') : null;
  const body = pane ? pane.querySelector(':scope > .pane__body') : null;
  // The whole archive: every top-level post list plus the phone disclosure,
  // which nests the fold's own tail list and the all-posts/rss actions.
  // Hiding these two elements hides everything a post's own list, fold or
  // action link could offer while the reader owns the pane.
  const archive = body
    ? [...body.querySelectorAll(':scope > ul.rows[data-posts], :scope > details.disclose[data-mobile-more]')]
    : [];
  const statusbar = document.querySelector('[data-statusbar]');
  const innerScroll = window.matchMedia('(min-width: 1024px)');

  const closeHandlers = new Set();
  const cache = new Map();
  let current = null;
  let opener = null;
  let archiveState = null;
  let token = 0;
  // The fetch currently in flight, if any: { controller, reason }. reason is
  // set to 'stale' or 'cancelled' immediately before controller.abort() is
  // called, so the load's own catch block can report why it was aborted
  // without relying on `token`, which a *later* load may have already
  // advanced past this one's reason by the time the catch block runs.
  let inflight = null;
  let scroller = null;
  let statusEl = null;
  let proseEl = null;
  let ticking = false;
  let resizeObserver = null;

  if (!region || !pane || !body || archive.length === 0) {
    return {
      open() { return Promise.resolve(false); },
      close() { return false; },
      isOpen() { return false; },
      current() { return null; },
      onClose() { return () => {}; },
    };
  }

  const behavior = reducedMotion ? 'auto' : 'smooth';

  /** Abort whatever fetch is in flight (if any), tagging it with why. */
  function abortInflight(reason) {
    if (!inflight) return;
    const load = inflight;
    inflight = null;
    load.reason = reason;
    load.controller.abort();
  }

  /* ----------------------------------------------------------------- open */

  async function open(slug, openerEl = null) {
    const post = posts.find((p) => p.slug === slug);
    if (!post) {
      term.print(`reader: no post named ${slug}`, { className: 'scrollback__line--err' });
      return false;
    }
    // A new open() supersedes whatever load is still in flight.
    abortInflight('stale');
    const my = ++token;
    show(post, openerEl);
    renderShell(post, 'loading');

    let html = cache.get(slug);
    if (!html) {
      const controller = new AbortController();
      const load = { controller, reason: null };
      inflight = load;
      try {
        const res = await fetch(post.url, { credentials: 'same-origin', signal: controller.signal });
        if (!res.ok) throw new Error(`http ${res.status}`);
        html = await res.text();
        cache.set(slug, html);
      } catch (err) {
        if (inflight === load) inflight = null;
        if (load.reason) return load.reason;
        renderShell(post, 'error', err.message);
        term.print(`reader: could not load ${post.url} (${err.message})`, { className: 'scrollback__line--err' });
        return false;
      }
      if (inflight === load) inflight = null;
    }
    // Reached only when nothing aborted this load's fetch (or it came from
    // cache, with no fetch at all): a later open() may still have advanced
    // past it synchronously, which abortInflight() cannot see when there was
    // no controller to abort.
    if (my !== token) return 'stale';

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const header = doc.querySelector('.page__header');
    const prose = doc.querySelector('main .prose');
    if (!prose) {
      renderShell(post, 'error', 'no post body in the page');
      term.print(`reader: ${post.url} has no post body`, { className: 'scrollback__line--err' });
      return false;
    }
    renderPost(post, header, prose);
    return true;
  }

  function show(post, openerEl) {
    // Snapshot each archive element's own hidden state before forcing it
    // hidden, and restore that exact state on close rather than assuming
    // every one of them was visible to begin with. But only on the
    // closed -> first-open transition: `current` is null exactly then,
    // since close() is the only thing that resets it. Switching from one
    // open post to another (palette, deep link, or a click on another
    // archive link) must keep reading from that original snapshot -- the
    // archive is already hidden at this point, so re-snapshotting here
    // would capture [true, true, ...] and "restore" to the reader's own
    // hidden state on close, stranding the archive unreachable.
    const wasClosed = current === null;
    current = post.slug;
    opener = openerEl && document.contains(openerEl) ? openerEl : null;
    if (wasClosed) {
      archiveState = archive.map((el) => el.hidden);
      for (const el of archive) el.hidden = true;
    }
    pane.classList.add('is-reading');
    region.hidden = false;
  }

  /* --------------------------------------------------------------- render */

  function renderShell(post, state, detail) {
    region.replaceChildren(bar(post));
    const p = document.createElement('p');
    p.className = 'meta reader__note';
    if (state === 'loading') {
      p.textContent = `loading ${post.url}`;
    } else {
      p.textContent = `could not load this post here (${detail}). `;
      const a = document.createElement('a');
      a.href = post.url;
      a.textContent = 'open it on the blog';
      p.appendChild(a);
    }
    region.appendChild(p);
    region.appendChild(status(post, 'line 0 of 0 0%'));
    focusRegion();
  }

  function renderPost(post, header, prose) {
    const scroll = document.createElement('div');
    scroll.className = 'reader__scroll';
    scroll.dataset.readerScroll = '';

    const head = document.createElement('header');
    head.className = 'reader__head';
    const title = document.createElement('h3');
    title.className = 'reader__title';
    title.textContent = textOf(header, '.page__title') || post.title;
    head.appendChild(title);
    const subtitle = textOf(header, '.page__subtitle') || post.subtitle;
    if (subtitle) {
      const sub = document.createElement('p');
      sub.className = 'reader__sub';
      sub.textContent = subtitle;
      head.appendChild(sub);
    }
    head.appendChild(meta(post));
    scroll.appendChild(head);

    const article = document.createElement('article');
    article.className = 'prose reader__prose';
    for (const node of prose.querySelectorAll('script, iframe, object, embed')) node.remove();
    sanitizeAttributes(prose);
    demoteHeadings(prose);
    while (prose.firstChild) article.appendChild(prose.firstChild);
    scroll.appendChild(article);

    const end = document.createElement('p');
    end.className = 'reader__end';
    const endLink = document.createElement('a');
    endLink.href = post.url;
    endLink.textContent = 'open on blog';
    const endBack = document.createElement('button');
    endBack.type = 'button';
    endBack.className = 'btn';
    endBack.dataset.readerBack = '';
    endBack.textContent = 'back to list';
    end.append('end of post. ', endLink, ' ', endBack);
    scroll.appendChild(end);

    region.replaceChildren(bar(post), scroll, status(post, ''));
    scroller = scroll;
    proseEl = article;
    if (innerScroll.matches) scroll.scrollTop = 0;
    watch();
    focusRegion();
    requestAnimationFrame(updateStatus);
  }

  function bar(post) {
    const el = document.createElement('div');
    el.className = 'reader__bar';
    const badge = document.createElement('span');
    badge.className = 'badge reader__badge';
    badge.textContent = 'post';
    const file = document.createElement('span');
    file.className = 'reader__file';
    file.textContent = `writing/${post.slug}`;
    const blog = document.createElement('a');
    blog.className = 'reader__blog';
    blog.href = post.url;
    blog.textContent = 'open on blog';
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'btn reader__back';
    back.dataset.readerBack = '';
    back.textContent = 'back to list';
    el.append(badge, file, blog, back);
    return el;
  }

  function meta(post) {
    const p = document.createElement('p');
    p.className = 'meta reader__meta';
    const time = document.createElement('time');
    time.dateTime = post.date;
    time.dataset.year = String(post.date).slice(0, 4);
    time.textContent = post.date;
    p.append(time, ` \u00b7 ${post.minutes} min read`);
    if (Array.isArray(post.tags) && post.tags.length) {
      p.append(' \u00b7 ');
      for (const tag of post.tags) {
        const a = document.createElement('a');
        a.className = 'tag-chip';
        a.href = `/blog/topics/#${slugify(tag)}`;
        a.textContent = tag;
        p.appendChild(a);
      }
    }
    if (post.series && post.part) {
      p.append(` \u00b7 part ${post.part} of ${post.series}`);
    }
    return p;
  }

  function status(post, text) {
    const p = document.createElement('p');
    p.className = 'reader__status';
    p.setAttribute('aria-live', 'off');
    const pos = document.createElement('span');
    pos.className = 'reader__pos';
    pos.textContent = text;
    const keys = document.createElement('span');
    keys.className = 'reader__keys';
    keys.textContent = 'j k space scroll \u00b7 q back';
    // The slug is its own element (integrator) so it can be the part that
    // truncates on a phone: the line number and percent must stay readable.
    const slug = document.createElement('span');
    slug.className = 'reader__slug';
    slug.textContent = post.slug;
    p.append(slug, pos, keys);
    statusEl = pos;
    return p;
  }

  /**
   * Focus the region. Below 1024px the page scrolls, so the pane top is
   * brought to the viewport top instantly: the post is new content, not a
   * movement to animate, and an instant jump also defeats scroll anchoring,
   * which otherwise keeps whatever was on screen in place while the post's
   * height lands above it.
   */
  function focusRegion() {
    region.focus({ preventScroll: true });
    if (!innerScroll.matches) {
      const top = pane.getBoundingClientRect().top + window.scrollY - 8;
      window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
    }
  }

  /* ------------------------------------------------------------ scrolling */

  /** The element that scrolls the post: the inner scroller from 1024px, else the page. */
  function scrollTarget() {
    if (scroller && innerScroll.matches && scroller.scrollHeight > scroller.clientHeight) return scroller;
    return null;
  }

  function lineHeight() {
    const el = proseEl || region;
    const lh = parseFloat(getComputedStyle(el).lineHeight);
    return Number.isFinite(lh) && lh > 0 ? lh : LINE_FALLBACK_PX;
  }

  function viewport() {
    const el = scrollTarget();
    if (el) return { top: el.scrollTop, height: el.clientHeight, total: el.scrollHeight };
    const rect = (scroller || region).getBoundingClientRect();
    const barH = statusbar && getComputedStyle(statusbar).position === 'sticky' ? statusbar.getBoundingClientRect().height : 0;
    const height = window.innerHeight - barH;
    return { top: Math.max(0, -rect.top), height, total: Math.max(rect.height, 1) };
  }

  function scrollBy(px, smooth) {
    const el = scrollTarget();
    const opts = { top: px, behavior: smooth && !reducedMotion ? 'smooth' : 'auto' };
    if (el) el.scrollBy(opts);
    else window.scrollBy(opts);
  }

  /** g and G jump like less does: instantly, whatever the distance. */
  function scrollToEdge(end) {
    const el = scrollTarget();
    const opts = { behavior: 'auto' };
    if (el) {
      el.scrollTo({ top: end ? el.scrollHeight : 0, ...opts });
      return;
    }
    const rect = (scroller || region).getBoundingClientRect();
    const target = end ? window.scrollY + rect.bottom : window.scrollY + rect.top - 8;
    window.scrollTo({ top: target, ...opts });
  }

  function updateStatus() {
    ticking = false;
    if (!statusEl || !current) return;
    const { top, height, total } = viewport();
    const lh = lineHeight();
    const lines = Math.max(1, Math.round(total / lh));
    const shown = Math.min(lines, Math.max(1, Math.round((top + height) / lh)));
    const pct = Math.min(100, Math.max(0, Math.round(((top + height) / total) * 100)));
    statusEl.textContent = `line ${shown} of ${lines} ${pct}%`;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateStatus);
  }

  function watch() {
    unwatch();
    if (scroller) scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    if ('ResizeObserver' in window && proseEl) {
      resizeObserver = new ResizeObserver(onScroll);
      resizeObserver.observe(proseEl);
    }
  }

  function unwatch() {
    if (scroller) scroller.removeEventListener('scroll', onScroll);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  }

  /* ----------------------------------------------------------------- keys */

  region.addEventListener('keydown', (e) => {
    if (!current || e.altKey || e.ctrlKey || e.metaKey) return;
    if (isEditable(e.target)) return;
    const lh = lineHeight();
    const page = Math.max(lh, viewport().height - 2 * lh);
    switch (e.key) {
      case 'j':
      case 'ArrowDown':
        scrollBy(lh, false);
        break;
      case 'k':
      case 'ArrowUp':
        scrollBy(-lh, false);
        break;
      case ' ':
      case 'PageDown':
        scrollBy(page, true);
        break;
      case 'b':
      case 'PageUp':
        scrollBy(-page, true);
        break;
      case 'g':
      case 'Home':
        scrollToEdge(false);
        break;
      case 'G':
      case 'End':
        scrollToEdge(true);
        break;
      case 'q':
      case 'Escape':
        close();
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  });

  region.addEventListener('click', (e) => {
    if (e.target.closest('[data-reader-back]')) {
      e.preventDefault();
      close();
    }
  });

  /* ---------------------------------------------------------------- close */

  function close(opts = {}) {
    if (!current) return false;
    const slug = current;
    const openerEl = opener;
    token++;
    abortInflight('cancelled');
    unwatch();
    current = null;
    opener = null;
    scroller = null;
    proseEl = null;
    statusEl = null;
    region.hidden = true;
    region.replaceChildren();
    // Restore each archive element to exactly the hidden state it had
    // before this post opened -- not just forced back to visible -- so
    // the archive's own state (whatever set it before the reader touched
    // it) survives a read.
    archive.forEach((el, i) => { el.hidden = archiveState ? archiveState[i] : false; });
    archiveState = null;
    pane.classList.remove('is-reading');
    if (!opts.silent) {
      focusTarget(slug, openerEl).focus({ preventScroll: true });
      if (!innerScroll.matches) pane.scrollIntoView({ behavior, block: 'start' });
    }
    for (const fn of closeHandlers) fn(slug);
    return true;
  }

  /**
   * Where focus goes on close: the link that actually opened this post
   * when it is still reachable, else the same post's link found anywhere
   * in the (now-restored) archive -- the post can live in any of the
   * three lists, not just the first -- else the pane itself.
   */
  function focusTarget(slug, openerEl) {
    if (isReachable(openerEl)) return openerEl;
    const row = body.querySelector(`a[data-post="${cssEscape(slug)}"]`);
    if (isReachable(row)) return row;
    return pane;
  }

  /**
   * Whether `el` can actually take focus right now: in the document, not
   * itself or an ancestor `hidden`, not display:none or visibility:hidden.
   * A link's own computed display never reports "none" just because a
   * `<details>` it sits inside is closed -- that display:none lives on the
   * ancestor, not the link -- so checking only the element's own style
   * (as this used to) passes a link that a phone's closed archive fold
   * has made unreachable, and .focus() on it silently does nothing.
   * offsetParent catches that: it is null for anything not actually laid
   * out, ancestor-hidden included, fixed-position elements excepted.
   */
  function isReachable(el) {
    if (!el || !document.contains(el)) return false;
    if (el.closest('[hidden]')) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return el.offsetParent !== null || style.position === 'fixed';
  }

  function onClose(fn) {
    closeHandlers.add(fn);
    return () => closeHandlers.delete(fn);
  }

  return {
    open,
    close,
    isOpen: () => current !== null,
    current: () => current,
    onClose,
  };
}

/* ------------------------------------------------------------- helpers */

function textOf(root, selector) {
  const el = root && root.querySelector(selector);
  return el ? el.textContent.trim() : '';
}

/**
 * Attributes that can carry a URL. Anything here is checked against
 * SAFE_SCHEME before the node is grafted into the live page.
 */
const URL_ATTRS = new Set(['href', 'src', 'srcset', 'action', 'formaction', 'xlink:href', 'ping', 'data']);
/** A scheme at the head of a value: "javascript:", "data:", "https:". */
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
/** The only schemes a post body may name. Everything else must be relative. */
const SAFE_SCHEME = /^(?:https?|mailto):/i;

/**
 * Strip the two attribute classes that would execute or navigate to
 * attacker-chosen code once the fetched post is grafted into this page:
 * inline event handlers (on*) and URL attributes naming a scheme other than
 * http, https or mailto (javascript:, data:, vbscript:). Relative URLs,
 * fragments and protocol-relative URLs keep working. kramdown passes raw
 * HTML through from the markdown, so this runs on every post, cached or not,
 * before the nodes are moved into the article.
 */
function sanitizeAttributes(root) {
  for (const el of [root, ...root.querySelectorAll('*')]) {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (!URL_ATTRS.has(name)) continue;
      // The value can hide the scheme behind whitespace or control characters
      // ("java\tscript:"), which the URL parser ignores; strip them first.
      const value = attr.value.replace(/[\u0000-\u0020]+/g, '');
      if (SCHEME.test(value) && !SAFE_SCHEME.test(value)) el.removeAttribute(attr.name);
    }
  }
}

/** The pane title is an h2 and the post title an h3, so body headings move down one step. */
function demoteHeadings(root) {
  for (const level of [5, 4, 3, 2]) {
    for (const h of root.querySelectorAll(`h${level}`)) {
      const next = document.createElement(`h${Math.min(6, level + 2)}`);
      for (const attr of h.attributes) next.setAttribute(attr.name, attr.value);
      while (h.firstChild) next.appendChild(h.firstChild);
      h.replaceWith(next);
    }
  }
}

function slugify(text) {
  return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function cssEscape(value) {
  return window.CSS && CSS.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, '\\$&');
}

function isEditable(el) {
  if (!el || el === document || el === window) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}
