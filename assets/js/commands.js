/**
 * commands.js: the command registry. Pane commands print the pane's
 * contents into the scrollback, read from the server-rendered DOM so the
 * terminal and the panes can never disagree. Link commands print the URL
 * and open it. Everything prints inside the terminal pane.
 */

import { markdownToLines } from './mdlines.js';

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

  return commands;
}

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
    lines.push({ segments: [{ text: dateText }, titleSeg] });
    if (aside) lines.push({ className: 'scrollback__line--dim', segments: [{ text: ' '.repeat(DATE_COL) }, ...nodeSegments(aside)] });
    if (note) lines.push({ className: 'scrollback__line--dim', segments: [{ text: ' '.repeat(DATE_COL) }, ...nodeSegments(note)] });
  }
  return lines;
}
