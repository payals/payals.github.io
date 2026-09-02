/**
 * mdlines.js: turn a small markdown file (data/about.md, data/cv.md) into
 * scrollback lines. Headings keep their hashes, lists keep their dashes,
 * links become anchors, emphasis markers are dropped. No HTML is parsed.
 */

const INLINE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g;

/**
 * @param {string} md
 * @returns {Array<{ className: string, segments: Array<{ text: string, href?: string }> }>}
 */
export function markdownToLines(md) {
  const lines = [];
  let lastBlank = true;

  for (const raw of md.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    if (line === '') {
      if (!lastBlank) lines.push({ className: '', segments: [] });
      lastBlank = true;
      continue;
    }
    lastBlank = false;

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      lines.push({ className: '', segments: [{ text: `${heading[1]} ` }, ...inline(heading[2])] });
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      lines.push({ className: 'scrollback__line--dim', segments: [{ text: '---' }] });
      continue;
    }

    const item = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (item) {
      lines.push({ className: '', segments: [{ text: `${item[1]}- ` }, ...inline(item[2])] });
      continue;
    }

    lines.push({ className: '', segments: inline(line) });
  }

  return lines;
}

function inline(text) {
  const segments = [];
  let last = 0;
  let m;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index) });
    if (m[1] !== undefined) segments.push({ text: m[1], href: m[2] });
    else if (m[3] !== undefined) segments.push({ text: m[3] });
    else if (m[4] !== undefined) segments.push({ text: m[4] });
    else segments.push({ text: m[5] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}
