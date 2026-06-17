/**
 * commands.js — command registry.
 * Each entry: { description, handler(args, term) }
 * Imported by main.js and passed to Terminal constructor.
 */

import { openPanel } from './panels.js';

// URLs hard-coded per supplement spec — edit here to update everywhere
const LINKS = {
  github:   'https://github.com/payals',
  codeberg: 'https://codeberg.org/sillygoose',
  linkedin: 'https://linkedin.com/in/payalsingh',
  medium:   'https://medium.com/@reliable-by-design',
  blog:     '/blog/',
  older:    'https://penningpence.blogspot.com',
  email:    'mailto:psinghpayal@outlook.com',
};

function openLink(url, label, term) {
  window.open(url, '_blank', 'noopener');
  term.print(`opening ${label}…`, { className: 'terminal-line--muted' });
}

export const commands = {

  help: {
    description: 'list available commands',
    handler(_args, term) {
      const lines = [
        'available commands:',
        '',
        '  about    — who I am',
        '  now      — what I\'m up to right now',
        '  talks    — talks and slides',
        '  resume   — work history',
        '',
        '  github   — github.com/payals',
        '  codeberg — codeberg.org/sillygoose',
        '  linkedin — linkedin profile',
        '  medium   — medium writing',
        '  blog     — /blog/',
        '  older    — penningpence.blogspot.com',
        '  email    — get in touch',
        '',
        '  whoami   — who are you?',
        '  clear    — clear terminal',
        '',
        'tip: press Tab to autocomplete · ↑↓ for history',
      ];
      lines.forEach((l) => term.print(l, { className: 'terminal-line--help' }));
    },
  },

  about: {
    description: 'open about panel',
    handler(_args, term) {
      openPanel('about');
      term.print('opening about…', { className: 'terminal-line--muted' });
    },
  },

  now: {
    description: 'open now panel',
    handler(_args, term) {
      openPanel('now');
      term.print('opening now…', { className: 'terminal-line--muted' });
    },
  },

  talks: {
    description: 'open talks panel',
    handler(_args, term) {
      openPanel('talks');
      term.print('opening talks…', { className: 'terminal-line--muted' });
    },
  },

  resume: {
    description: 'open resume panel',
    handler(_args, term) {
      openPanel('resume');
      term.print('opening resume…', { className: 'terminal-line--muted' });
    },
  },

  // cat <panel> aliases — registered separately below
  cat: {
    description: 'cat about | now | talks | resume',
    handler(args, term) {
      const target = (args[0] || '').toLowerCase();
      const panels = ['about', 'now', 'talks', 'resume'];
      if (panels.includes(target)) {
        openPanel(target);
        term.print(`opening ${target}…`, { className: 'terminal-line--muted' });
      } else if (target === '') {
        term.print('usage: cat <about|now|talks|resume>', { className: 'terminal-line--muted' });
      } else {
        term.print(`cat: ${target}: no such file`, { className: 'terminal-line--err' });
      }
    },
  },

  github: {
    description: 'open GitHub profile',
    handler(_args, term) { openLink(LINKS.github, 'github', term); },
  },

  codeberg: {
    description: 'open Codeberg profile',
    handler(_args, term) { openLink(LINKS.codeberg, 'codeberg', term); },
  },

  linkedin: {
    description: 'open LinkedIn profile',
    handler(_args, term) { openLink(LINKS.linkedin, 'linkedin', term); },
  },

  medium: {
    description: 'open Medium profile',
    handler(_args, term) { openLink(LINKS.medium, 'medium', term); },
  },

  blog: {
    description: 'open blog',
    handler(_args, term) {
      term.print('opening blog…', { className: 'terminal-line--muted' });
      window.location.href = LINKS.blog;
    },
  },

  older: {
    description: 'open older blog',
    handler(_args, term) { openLink(LINKS.older, 'older blog', term); },
  },

  email: {
    description: 'open email client',
    handler(_args, term) {
      window.open(LINKS.email, '_blank', 'noopener');
      term.print('opening email client…', { className: 'terminal-line--muted' });
    },
  },

  whoami: {
    description: 'identify yourself',
    handler(_args, term) {
      term.print('Payal Singh');
    },
  },

  clear: {
    description: 'clear terminal',
    handler(_args, term) {
      term.clear();
    },
  },

  // sudo handled inline in Terminal.runCommand — included here for tab-complete visibility
  sudo: {
    description: '',
    handler(_args, term) {
      term.print('nice try.', { className: 'terminal-line--muted' });
    },
  },
};
