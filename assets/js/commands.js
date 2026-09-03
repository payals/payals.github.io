/**
 * commands.js: the command registry. Pane commands print the pane's
 * contents into the scrollback, read from the server-rendered DOM so the
 * terminal and the panes can never disagree. Link commands print the URL
 * and open it. Everything prints inside the terminal pane.
 */

import { markdownToLines } from './mdlines.js';
import { setShortcutsEnabled } from './shortcuts.js';

const PANE_COMMANDS = ['now', 'talks', 'writing', 'cv', 'about', 'links'];
const DATE_COL = 16;

export function buildCommands({ tagline }) {
  const commands = {

    help: {
      description: 'list commands',
      handler(_args, term) {
        const names = term.names;
        const width = Math.max(...names.map((n) => n.length)) + 2;
        const lines = ['commands:'];
        for (const name of names) {
          lines.push(`  ${name.padEnd(width)}${term.registry[name].description}`);
        }
        lines.push('');
        lines.push('tab completes, up and down recall history, ctrl+l clears.');
        lines.push('press 0 to 4 with the prompt unfocused to jump to a pane. esc leaves the prompt.');
        term.printLines(lines);
      },
    },

    now: {
      description: 'what is true this month',
      handler(_args, term) {
        const dl = document.querySelector('#now [data-facts]');
        const lines = [];
        if (!dl) return term.print('now: nothing on record', { className: 'scrollback__line--dim' });
        const terms = dl.querySelectorAll('dt');
        const width = Math.max(...[...terms].map((t) => t.textContent.trim().length)) + 2;
        for (const dt of terms) {
          const dd = dt.nextElementSibling;
          const label = `${dt.textContent.trim()}:`.padEnd(width + 1);
          lines.push({ segments: [{ text: label }, ...nodeSegments(dd)] });
        }
        lines.push(dimLine(`updated ${document.querySelector('.console').dataset.nowUpdated || 'unknown'}`));
        term.printLines(lines);
      },
    },

    talks: {
      description: 'talks, upcoming first, with evidence links',
      handler(_args, term) {
        const lines = [];
        for (const list of document.querySelectorAll('#talks [data-talks]')) {
          lines.push(...rowsToLines(list));
        }
        const leads = document.querySelector('#talks [data-leads]');
        if (leads) {
          lines.push('');
          lines.push('archive leads (under reconstruction):');
          lines.push(...rowsToLines(leads));
        }
        const caveat = document.querySelector('#talks [data-talks-caveat]');
        if (caveat) {
          lines.push('');
          lines.push({ className: 'scrollback__line--dim', segments: nodeSegments(caveat) });
        }
        if (lines.length === 0) lines.push(dimLine('no sourced talks on record yet.'));
        term.printLines(lines);
      },
    },

    writing: {
      description: 'latest posts',
      handler(_args, term) {
        const list = document.querySelector('#writing [data-posts]');
        const lines = list ? rowsToLines(list) : [];
        lines.push('');
        lines.push({ segments: [{ text: 'all posts: ' }, { text: '/blog/', href: '/blog/' }, { text: '  rss: ' }, { text: '/feed.xml', href: '/feed.xml' }] });
        term.printLines(lines);
      },
    },

    cv: {
      description: 'the full cv from data/cv.md',
      handler(_args, term) {
        return fetchText('/data/cv.md').then((md) => {
          const lines = markdownToLines(md);
          lines.push('');
          lines.push({ segments: [{ text: 'pdf: ' }, { text: '/data/cv.pdf', href: '/data/cv.pdf' }] });
          term.printLines(lines);
        });
      },
    },

    about: {
      description: 'who this is',
      handler(_args, term) {
        return fetchText('/data/about.md').then((md) => term.printLines(markdownToLines(md)));
      },
    },

    links: {
      description: 'profiles and feeds',
      handler(_args, term) {
        const anchors = document.querySelectorAll('#links [data-links] a');
        const width = Math.max(...[...anchors].map((a) => a.dataset.link.length)) + 2;
        const lines = [];
        for (const a of anchors) {
          lines.push({ segments: [{ text: a.dataset.link.padEnd(width) }, { text: a.href, href: a.href }] });
        }
        term.printLines(lines);
      },
    },

    ls: {
      description: 'list what cat can read',
      handler(_args, term) {
        term.print(PANE_COMMANDS.slice().sort().join('  '));
      },
    },

    cat: {
      description: 'cat <now|talks|writing|cv|about|links>',
      handler(args, term) {
        const target = (args[0] || '').toLowerCase();
        if (!target) return term.print('usage: cat <now|talks|writing|cv|about|links>', { className: 'scrollback__line--dim' });
        if (!PANE_COMMANDS.includes(target)) {
          return term.print(`cat: ${target}: No such file or directory`, { className: 'scrollback__line--err' });
        }
        return commands[target].handler([], term);
      },
    },

    portrait: {
      description: 'ascii portrait',
      handler(_args, term) {
        return fetchText('/assets/img/portrait.txt').then((text) => {
          const lines = text.replace(/\s+$/, '').split('\n').map((l) => ({ text: l, className: 'scrollback__line--pre' }));
          term.printLines(lines);
        });
      },
    },

    whoami: {
      description: 'who is at this prompt',
      handler(_args, term) {
        term.printLines(['payal', tagline]);
      },
    },

    clear: {
      description: 'clear the scrollback',
      handler(_args, term) {
        term.clear();
      },
    },

    sudo: {
      description: '',
      hidden: true,
      handler(_args, term) {
        term.print('nice try.', { className: 'scrollback__line--dim' });
      },
    },
  };

  // Link commands come from the links pane so there is one list of URLs.
  for (const a of document.querySelectorAll('#links [data-links] a')) {
    const name = a.dataset.link;
    const url = a.href;
    commands[name] = {
      description: a.textContent.replace(/\s+/g, ' ').trim(),
      handler(_args, term) {
        term.print({ segments: [{ text: 'opening ' }, { text: url, href: url }] }, { className: 'scrollback__line--dim' });
        if (/^https?:/.test(url)) window.open(url, '_blank', 'noopener');
        else window.location.href = url;
      },
    };
  }

  commands.blog = {
    description: '/blog/',
    handler(_args, term) {
      term.print('opening /blog/', { className: 'scrollback__line--dim' });
      window.location.href = '/blog/';
    },
  };

  // ---- phase 2: fact commands (worker B) ----
  // `cat talks/<id>`, `cat writing/<slug>`, `cat cv/<id>`, `cat now/<fact>`
  // print one fact with its kind prefix, read from the pane row that carries
  // the matching data-cmd plus the inline JSON (#talks-data, #posts-data).
  // `ls <dir>` lists what each directory holds. `talks <year|word>` and
  // `writing <year|word>` filter their pane's rows. Clicking a fact in a
  // pane runs the same cat command (clicks.js), so the click and the typed
  // command print the same thing.
  const factData = {
    talks: readInlineJson('talks-data'),
    posts: readInlineJson('posts-data'),
  };

  const baseCat = commands.cat.handler;
  commands.cat.description = 'cat <pane>, or cat <talks|writing|cv|now>/<id>';
  commands.cat.handler = (args, term) => {
    const target = args[0] || '';
    const m = target.match(/^(talks|writing|cv|now)\/(.+)$/i);
    if (!m) return baseCat(args, term);
    const dir = m[1].toLowerCase();
    const id = m[2];
    const lines = FACT_PRINTERS[dir](id, factData);
    if (!lines) return term.print(`cat: ${target}: No such file or directory`, { className: 'scrollback__line--err' });
    term.printLines(lines);
    return undefined;
  };

  const baseLs = commands.ls.handler;
  commands.ls.description = 'list what cat can read, or ls <talks|writing|cv|now>';
  commands.ls.handler = (args, term) => {
    const dir = (args[0] || '').toLowerCase().replace(/\/$/, '');
    if (!dir) {
      term.print(['about', 'cv/', 'links', 'now/', 'talks/', 'writing/'].join('  '));
      return;
    }
    if (!FACT_DIRS.includes(dir)) {
      term.print(`ls: ${dir}: No such file or directory`, { className: 'scrollback__line--err' });
      return;
    }
    const entries = listFactDir(dir);
    if (entries.length === 0) return term.print(dimLine(`${dir}/: empty`));
    const width = Math.max(...entries.map((e) => e.id.length)) + 2;
    term.printLines(entries.map((e) => ({ segments: [
      { text: `${dir}/${e.id}`.padEnd(width + dir.length + 1), className: `seg--${KIND_OF_DIR[dir]}` },
      { text: e.label },
    ] })));
    return undefined;
  };

  const baseTalks = commands.talks.handler;
  commands.talks.description = 'talks, upcoming first, with evidence links; talks <year|word> filters';
  commands.talks.handler = (args, term) => (args.length ? printFiltered('talks', args, term) : baseTalks(args, term));

  const baseWriting = commands.writing.handler;
  commands.writing.description = 'latest posts; writing <year|word> filters';
  commands.writing.handler = (args, term) => (args.length ? printFiltered('writing', args, term) : baseWriting(args, term));
  // ---- end phase 2: fact commands ----

  return commands;
}

// ---- phase 2: console commands that need the other modules (worker B) ----
// Called by palette.js once the palette exists, because `search` opens it,
// `zoom` needs zoom.js, `keys` toggles the tray, and the plain-phrase
// resolver falls back to the palette's fuzzy index.

const PHRASE_WORDS = ['what', 'where', 'who', 'which', 'when', 'how', 'show', 'list', 'find', 'next', 'latest', 'tell', 'give', 'posts', 'post', 'talk', 'read', 'reading', 'is', 'are', 'do', 'does', 'any'];

export function registerPhase2Commands({ registry, palette, zoom, panes, search }) {
  const linkNames = [...document.querySelectorAll('#links [data-links] a')].map((a) => a.dataset.link);

  registry.search = {
    description: 'search <words>: open the palette with a query',
    handler(args) {
      palette.open(args.join(' '));
    },
  };

  registry.zoom = {
    description: 'zoom <now|talks|writing|cv>: fill the console with one pane',
    handler(args, term) {
      const id = (args[0] || '').toLowerCase();
      if (!['now', 'talks', 'writing', 'cv'].includes(id)) {
        return term.print(`zoom: ${id || '(nothing)'}: try now, talks, writing, cv`, { className: 'scrollback__line--err' });
      }
      if (!zoom.zoom(id)) panes.focusPane(id);
      return undefined;
    },
  };

  registry.open = {
    description: `open <${linkNames.join('|')}>`,
    handler(args, term) {
      const name = (args[0] || '').toLowerCase();
      if (!linkNames.includes(name)) {
        return term.print(`open: ${name || '(nothing)'}: not a known link. try: ${linkNames.join(', ')}`, { className: 'scrollback__line--err' });
      }
      return registry[name].handler([], term);
    },
  };

  registry.keys = {
    description: 'keys: show the key tray. keys on|off: turn single-key shortcuts on or off',
    handler(args, term) {
      const arg = (args[0] || '').toLowerCase();
      if (arg === 'on' || arg === 'off') {
        setShortcutsEnabled(arg === 'on');
        term.print(`keys: single-key shortcuts ${arg}`, { className: 'scrollback__line--dim' });
        return;
      }
      if (arg) {
        return term.print(`keys: ${arg}: try "keys", "keys on" or "keys off"`, { className: 'scrollback__line--err' });
      }
      palette.toggleKeys();
    },
  };

  // Plain phrases: "what are you reading", "next talk", "posts about agents".
  // Dispatch is by first word, so each opening word is a hidden command that
  // hands the whole line to the resolver.
  for (const word of PHRASE_WORDS) {
    if (registry[word]) continue;
    registry[word] = {
      description: '',
      hidden: true,
      handler(args, term) {
        return resolvePhrase(`${word} ${args.join(' ')}`, term, { registry, search });
      },
    };
  }
}

/** Intent rules first, then the palette's fuzzy index. */
function resolvePhrase(raw, term, { registry, search }) {
  const s = raw.toLowerCase().replace(/[?!.,]/g, ' ').replace(/\s+/g, ' ').trim();
  const has = (re) => re.test(s);
  const year = (s.match(/\b(20\d{2})\b/) || [])[1];
  const run = (name, args = []) => registry[name].handler(args, term);

  if (has(/\b(read|reading|book)\b/) && !has(/\b(post|blog|writ)/)) return run('cat', ['now/reading']);
  if (has(/\b(ship|shipping|building|working on|side projects?)\b/) && !has(/\b(talk|post)/)) return run('cat', ['now/shipping']);
  if (has(/\b(where|based|live|lives|location|timezone|city|state)\b/) && !has(/\b(talk|post|speak)/)) return run('cat', ['now/location']);
  if (has(/\b(role|job|title|employer|company|work at|working at)\b/)) return run('cat', ['now/role']);
  if (has(/\b(next|upcoming|soon)\b/) && has(/\b(talk|speak|conference|present|session)/)) return run('cat', ['now/speaking']);
  if (has(/\b(latest|newest|recent|last|new)\b/) && has(/\b(post|blog|writ|article|wrote)/)) return run('cat', ['now/latest-post']);
  if (has(/\b(email|contact|reach|hire|hiring|mail)\b/)) return run('cat', ['now/email']);
  if (has(/\b(cv|resume|pdf)\b/)) return run('cv');
  if (has(/\b(who|about|bio|yourself|introduce)\b/) && !has(/\b(post|talk)/)) return run('about');
  if (has(/\b(post|posts|blog|writing|write|wrote|article|articles|essays?)\b/)) {
    const words = phraseKeywords(s, year);
    return run('writing', words);
  }
  if (has(/\b(talk|talks|speak|speaking|spoke|speaker|conference|conferences|present|presentation|sessions?)\b/)) {
    const words = phraseKeywords(s, year);
    return run('talks', words);
  }

  const hits = search(s).slice(0, 6);
  if (hits.length === 0) {
    term.print(`nothing matched "${raw}". press / to search, or type help.`, { className: 'scrollback__line--dim' });
    return undefined;
  }
  const lines = hits.map(({ e }) => ({ segments: [
    { text: `[${e.kind === 'pane' ? 'cmd' : e.kind}]`.padEnd(7), className: `seg--${e.kind === 'pane' ? 'cmd' : e.kind}` },
    { text: e.meta ? `${e.meta}  ` : '' },
    { text: e.title, href: e.href },
  ] }));
  lines.push(dimLine('closest matches. press / to search everything.'));
  term.printLines(lines);
  return undefined;
}

const PHRASE_FILLER = /\b(what|which|show|list|find|me|all|the|your|her|have|has|you|posts?|blog|writing|written|wrote|articles?|essays?|about|on|there|are|is|any|do|does|did|of|for|talks?|speak|speaking|spoke|speaker|conferences?|presentations?|sessions?|give|tell|at|in|from|by|a|an|and|were|was|she|did)\b/g;

function phraseKeywords(s, year) {
  const words = s.replace(PHRASE_FILLER, ' ').trim().split(/\s+/).filter(Boolean);
  if (year && !words.includes(year)) words.push(year);
  return words;
}

// Fact printers. Each returns scrollback lines or null when the id is unknown.

const FACT_DIRS = ['talks', 'writing', 'cv', 'now'];
const KIND_OF_DIR = { talks: 'talk', writing: 'post', cv: 'cv', now: 'now' };
const PREFIX_W = 7; // "[talk] "

const FACT_PRINTERS = {
  talks(id, data) {
    const row = document.querySelector(`#talks .row[data-id="${cssEscape(id)}"]`);
    const rec = data.talks.find((t) => t.id === id);
    if (!row && !rec) return null;
    const lines = [];
    const prefix = { text: '[talk] ', className: 'seg--talk' };
    if (rec && rec.record_type === 'archive_lead') {
      lines.push({ segments: [prefix, { text: `${rec.era || 'undated'}  ` }, { text: rec.label || id }] });
      if (rec.detail) lines.push(indented(rec.detail, 'scrollback__line--dim'));
      lines.push(indented('archive lead: remembered, not yet sourced. no title or date is claimed without a recovered record.', 'scrollback__line--warn'));
      return lines;
    }
    const date = rec ? (rec.date || rec.date_label || '') : textOf(row, '.row__date');
    const title = rec ? rec.title : textOf(row, '.row__title');
    const href = rec ? rec.event_url : (row.querySelector('.row__title[href]') || {}).href;
    lines.push({ segments: [prefix, dateSeg(date, row), { text: title, href }] });
    if (rec) {
      const status = rec.status === 'upcoming' ? { text: '[upcoming]', className: 'seg--ok' } : { text: rec.status || '' };
      lines.push({ className: 'scrollback__line--dim', segments: [{ text: ' '.repeat(PREFIX_W) }, { text: `${rec.venue}  ` }, status] });
      const evidence = rec.evidence_level === 'official_program_listing' ? 'program listing' : (rec.evidence_level || 'evidence').replace(/_/g, ' ');
      lines.push({ segments: [{ text: ' '.repeat(PREFIX_W) }, { text: `${evidence}: ` }, { text: rec.event_url, href: rec.event_url, className: 'seg--link' }] });
      if (rec.archive_url) lines.push({ segments: [{ text: ' '.repeat(PREFIX_W) }, { text: `${rec.archive_label || 'archive'}: ` }, { text: rec.archive_url, href: rec.archive_url, className: 'seg--link' }] });
      if (rec.slides_url) lines.push({ segments: [{ text: ' '.repeat(PREFIX_W) }, { text: 'slides: ' }, { text: rec.slides_url, href: rec.slides_url, className: 'seg--link' }] });
      if (rec.note) lines.push(indented(rec.note, 'scrollback__line--dim'));
    } else if (row) {
      const aside = row.querySelector('.row__aside');
      if (aside) lines.push({ className: 'scrollback__line--dim', segments: [{ text: ' '.repeat(PREFIX_W) }, ...nodeSegments(aside)] });
    }
    return lines;
  },

  writing(slug, data) {
    const post = data.posts.find((p) => p.slug === slug);
    const row = document.querySelector(`#writing .row[data-slug="${cssEscape(slug)}"]`);
    if (!post && !row) return null;
    const title = post ? post.title : textOf(row, '.row__title');
    const url = post ? post.url : (row.querySelector('.row__title[href]') || {}).href;
    const date = post ? post.date : textOf(row, '.row__date');
    const lines = [{ segments: [{ text: '[post] ', className: 'seg--post' }, dateSeg(date, row), { text: title, href: url }] }];
    if (post) {
      if (post.subtitle) lines.push(indented(post.subtitle, 'scrollback__line--dim'));
      const facts = [`${post.minutes} min`];
      if (post.tags && post.tags.length) facts.push(`tags: ${post.tags.join(', ')}`);
      if (post.series) facts.push(`series: ${post.series}${post.part ? ` part ${post.part}` : ''}`);
      lines.push(indented(facts.join('  ·  '), 'scrollback__line--dim'));
      lines.push({ segments: [{ text: ' '.repeat(PREFIX_W) }, { text: 'read here: ' }, { text: `#writing/${slug}`, href: `#writing/${slug}` }, { text: '   on the blog: ' }, { text: url, href: url, className: 'seg--link' }] });
    }
    return lines;
  },

  cv(id) {
    const prefix = { text: '[cv]   ', className: 'seg--cv' };
    if (id === 'headline') {
      const el = document.querySelector('#cv [data-cv-headline]');
      return el ? [{ segments: [prefix, { text: textOf(el) }] }] : null;
    }
    if (id === 'education') {
      const el = document.querySelector('#cv [data-cmd="cat cv/education"]');
      return el ? [{ segments: [prefix, { text: textOf(el) }] }] : null;
    }
    const row = document.querySelector(`#cv .row[data-id="${cssEscape(id)}"]`);
    if (!row) return null;
    const lines = [{ segments: [prefix, dateSeg(textOf(row, '.row__date'), row), { text: textOf(row, '.row__title') }] }];
    const note = row.querySelector('.row__note');
    if (note) lines.push(indented(textOf(note), 'scrollback__line--dim'));
    lines.push({ segments: [{ text: ' '.repeat(PREFIX_W) }, { text: 'full cv: type cv, or ' }, { text: '/data/cv.pdf', href: '/data/cv.pdf', className: 'seg--link' }] });
    return lines;
  },

  now(fact) {
    const prefix = { text: '[now]  ', className: 'seg--now' };
    if (fact === 'email') {
      const a = document.querySelector('#links a[data-link="email"]');
      if (!a) return null;
      return [{ segments: [prefix, { text: 'email: ' }, { text: a.href.replace(/^mailto:/, ''), href: a.href, className: 'seg--link' }] }];
    }
    const dd = document.querySelector(`#now dd[data-fact="${cssEscape(fact)}"]`);
    if (!dd) return null;
    const dt = dd.previousElementSibling;
    const label = dt && dt.tagName === 'DT' ? `${textOf(dt)}: ` : '';
    return [{ segments: [prefix, { text: label }, ...nodeSegments(dd)] }];
  },
};

function listFactDir(dir) {
  const out = [];
  if (dir === 'talks') {
    for (const row of document.querySelectorAll('#talks .row[data-id]')) {
      out.push({ id: row.dataset.id, label: `${textOf(row, '.row__date')}  ${textOf(row, '.row__title')}` });
    }
  } else if (dir === 'writing') {
    for (const row of document.querySelectorAll('#writing .row[data-slug]')) {
      out.push({ id: row.dataset.slug, label: `${textOf(row, '.row__date')}  ${textOf(row, '.row__title')}` });
    }
  } else if (dir === 'cv') {
    out.push({ id: 'headline', label: textOf(document.querySelector('#cv [data-cv-headline]')) });
    for (const row of document.querySelectorAll('#cv .row[data-id]')) {
      out.push({ id: row.dataset.id, label: `${textOf(row, '.row__date')}  ${textOf(row, '.row__title')}` });
    }
    out.push({ id: 'education', label: textOf(document.querySelector('#cv [data-cmd="cat cv/education"]')) });
  } else if (dir === 'now') {
    for (const dd of document.querySelectorAll('#now dd[data-fact]')) {
      out.push({ id: dd.dataset.fact, label: textOf(dd) });
    }
  }
  return out.filter((e) => e.label);
}

/** talks <year|word> and writing <year|word>: rows whose year or text matches every token. */
function printFiltered(pane, args, term) {
  const tokens = args.map((a) => a.toLowerCase()).filter(Boolean);
  const kind = KIND_OF_DIR[pane];
  const posts = pane === 'writing' ? readInlineJson('posts-data') : [];
  const talks = pane === 'talks' ? readInlineJson('talks-data') : [];
  const rows = [...document.querySelectorAll(`#${pane} .row[data-cmd]`)].filter((row) => {
    // The row text plus what the inline data knows: tags, subtitle and
    // series for a post, venue and note for a talk.
    const rec = pane === 'writing'
      ? posts.find((x) => x.slug === row.dataset.slug)
      : talks.find((x) => x.id === row.dataset.id);
    const extra = rec ? [rec.subtitle, (rec.tags || []).join(' '), rec.series, rec.venue, rec.note].filter(Boolean).join(' ') : '';
    const text = `${row.textContent} ${extra}`.replace(/\s+/g, ' ').toLowerCase();
    const year = row.dataset.year || '';
    return tokens.every((t) => year === t || text.includes(t));
  });
  if (rows.length === 0) {
    term.print(`${pane}: nothing matches "${args.join(' ')}". press / to search everything.`, { className: 'scrollback__line--dim' });
    return;
  }
  const lines = [];
  for (const row of rows) {
    const title = row.querySelector('.row__title');
    lines.push({ segments: [
      { text: `[${kind}]`.padEnd(PREFIX_W), className: `seg--${kind}` },
      dateSeg(textOf(row, '.row__date'), row),
      { text: title ? textOf(title) : '', href: title && title.tagName === 'A' ? title.href : undefined },
    ] });
    const aside = row.querySelector('.row__aside');
    if (aside) lines.push({ className: 'scrollback__line--dim', segments: [{ text: ' '.repeat(PREFIX_W) }, ...nodeSegments(aside)] });
  }
  lines.push(dimLine(`${rows.length} of ${document.querySelectorAll(`#${pane} .row[data-cmd]`).length} ${pane === 'talks' ? 'talks' : 'posts'}. cat ${pane}/<id> prints one; ls ${pane} lists ids.`));
  term.printLines(lines);
}

/** A date column segment: the text plus its year so the year token colours it (empty text prints nothing). */
function dateSeg(text, row) {
  if (!text) return { text: '' };
  const year = (row && row.dataset && row.dataset.year) || (String(text).match(/\b(20\d\d)\b/) || [])[1];
  return year ? { text: `${text}  `, year } : { text: `${text}  ` };
}

function indented(text, className) {
  return { className, segments: [{ text: ' '.repeat(PREFIX_W) }, { text }] };
}

function textOf(el, selector) {
  const node = selector ? (el && el.querySelector(selector)) : el;
  return node ? node.textContent.replace(/\s+/g, ' ').trim() : '';
}

function cssEscape(s) {
  return window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/["\\]/g, '\\$&');
}

function readInlineJson(id) {
  const el = document.getElementById(id);
  if (!el) return [];
  try {
    return JSON.parse(el.textContent);
  } catch (err) {
    return [];
  }
}
// ---- end phase 2 console commands ----

// Helpers

function fetchText(url) {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
    return r.text();
  });
}

function dimLine(text) {
  return { text, className: 'scrollback__line--dim' };
}

/** Text and anchors of a node as scrollback segments; other markup flattens. */
function nodeSegments(node) {
  const segments = [];
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent.replace(/\s+/g, ' ');
      if (text.trim() !== '' || segments.length) segments.push({ text });
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      if (child.tagName === 'A') {
        segments.push({ text: child.textContent.replace(/\s+/g, ' ').trim(), href: child.href });
      } else if (child.classList.contains('badge')) {
        segments.push({ text: `[${child.textContent.trim()}]` });
      } else {
        segments.push(...nodeSegments(child));
      }
    }
  }
  return trimSegments(segments);
}

function trimSegments(segments) {
  if (segments.length === 0) return segments;
  const first = segments[0];
  const last = segments[segments.length - 1];
  first.text = first.text.replace(/^\s+/, '');
  last.text = last.text.replace(/\s+$/, '');
  return segments.filter((s) => s.text !== '' || s.href);
}

/** One .rows list to lines: date column, title, then aside and note indented. */
function rowsToLines(list) {
  const lines = [];
  for (const row of list.querySelectorAll('.row')) {
    const date = row.querySelector('.row__date');
    const title = row.querySelector('.row__title');
    const aside = row.querySelector('.row__aside');
    const note = row.querySelector('.row__note');
    const dateText = `${date ? date.textContent.trim() : ''}  `.padEnd(DATE_COL);
    const titleSeg = title
      ? { text: title.textContent.replace(/\s+/g, ' ').trim(), href: title.tagName === 'A' ? title.href : undefined }
      : { text: '' };
    const year = row.dataset.year || (date && date.dataset.year);
    lines.push({ segments: [year ? { text: dateText, year } : { text: dateText }, titleSeg] });
    if (aside) lines.push({ className: 'scrollback__line--dim', segments: [{ text: ' '.repeat(DATE_COL) }, ...nodeSegments(aside)] });
    if (note) lines.push({ className: 'scrollback__line--dim', segments: [{ text: ' '.repeat(DATE_COL) }, ...nodeSegments(note)] });
  }
  return lines;
}
