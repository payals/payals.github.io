---
layout: page
title: Blog
permalink: /blog/
---

{% if site.posts.size > 0 %}
  <div class="post-list">
  {% for post in site.posts %}
    <article class="post-card">
      <p class="post-date">{{ post.date | date: "%B %-d, %Y" }}</p>
      <h2><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h2>
      <p>{{ post.excerpt | strip_html | truncate: 220 }}</p>
    </article>
  {% endfor %}
  </div>
{% else %}
  <p>No posts yet.</p>
{% endif %}
