---
layout: blog
title: Writing
description: "Notes on Postgres, AI, and systems engineering."
permalink: /blog/
---

<p class="meta blog-toolbar">{{ site.posts.size }} posts &middot; <a href="/blog/topics/">Browse by topic</a> &middot; <a href="/feed.xml">RSS</a></p>

{% if site.posts.size > 0 %}
<ol class="postlist">
{% for post in site.posts %}
  <li class="postlist__item">
    <time class="postlist__date" datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%Y-%m-%d" }}</time>
    <div class="postlist__main">
      <a class="postlist__title" href="{{ post.url }}">{{ post.title | escape }}</a>
      {% if post.subtitle %}<p class="postlist__sub">{{ post.subtitle | escape }}</p>{% else %}<p class="postlist__sub">{{ post.excerpt | strip_html | normalize_whitespace | truncatewords: 24 }}</p>{% endif %}
      {% if post.tags and post.tags != empty %}<p class="postlist__tags">{% for tag in post.tags %}<a class="tag-chip" href="/blog/topics/#{{ tag | slugify }}">{{ tag }}</a>{% endfor %}</p>{% endif %}
    </div>
  </li>
{% endfor %}
</ol>
{% else %}
<p class="muted">No posts yet.</p>
{% endif %}
