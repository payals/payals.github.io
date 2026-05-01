---
layout: default
title: Home
---

<section class="hero">
  <p class="eyebrow">Personal site & blog</p>
  <h1>Payal Singh</h1>
  <p class="lede">Notes on AI systems, markets, software, and research.</p>
  <div class="hero-actions">
    <a class="button" href="{{ '/blog/' | relative_url }}">Read the blog</a>
    <a class="button secondary" href="{{ '/about/' | relative_url }}">About</a>
  </div>
</section>

<section class="section">
  <h2>Latest posts</h2>
  {% if site.posts.size > 0 %}
    <div class="post-list">
      {% for post in site.posts limit:5 %}
        <article class="post-card">
          <p class="post-date">{{ post.date | date: "%B %-d, %Y" }}</p>
          <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
          {% if post.excerpt %}<p>{{ post.excerpt | strip_html | truncate: 180 }}</p>{% endif %}
        </article>
      {% endfor %}
    </div>
  {% else %}
    <p>No posts yet.</p>
  {% endif %}
</section>
