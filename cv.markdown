---
layout: page
title: CV
description: "Payal Singh's CV: professional record, selected independent work, writing, speaking, and education."
permalink: /cv/
---

{%- comment -%} PM2 (2026-09-04, minimal phone landing): the CV door
card on the phone landing (index.html) opens this page instead of a
console pane. Same source as the console's own cv pane: data/cv.md
through markdownify. The page layout already renders an <h1>CV</h1>
above this content, so the h1 markdownify emits for "# Payal Singh" is
dropped (split on its closing tag, keep the rest) rather than shifted
down a level the way the console pane's copy has to -- this page's own
h1 plus cv.md's own h2/h3 structure is already a normal, un-collided
h1 > h2 > h3 nesting, and this is the only place data/cv.md is rendered
as its own document, so no kramdown id ever collides with another copy
of the same ids the way it would inside index.html. {%- endcomment -%}
<p class="actions"><a class="btn" href="/data/cv.pdf" download="payal-singh-cv.pdf">download pdf</a></p>

{%- capture cv_markdown -%}{% include_relative data/cv.md %}{%- endcapture -%}
{{ cv_markdown | markdownify | split: '</h1>' | last }}

<p class="actions">
  <a href="https://codeberg.org/sillygoose" target="_blank" rel="noopener">codeberg</a>
  <a href="https://medium.com/@reliable-by-design" target="_blank" rel="noopener">medium</a>
  <a href="https://penningpence.blogspot.com" target="_blank" rel="noopener">older</a>
  <a href="/reading/">reading</a>
</p>
