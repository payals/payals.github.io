---
layout: page
title: Blog
description: "All posts."
permalink: /blog/
background: /assets/img/blog-header.jpg
---

<p class="blog-toolbar"><a href="{{ '/blog/topics/' | relative_url }}">Browse by topic</a> &nbsp;&middot;&nbsp; <a href="{{ '/feed.xml' | relative_url }}">RSS</a></p>

{% if site.posts.size > 0 %}
{% for post in site.posts %}
<article class="post-preview">
<a href="{{ post.url | prepend: site.baseurl | replace: '//', '/' }}">
<h2 class="post-title">{{ post.title }}</h2>
{% if post.subtitle %}
<h3 class="post-subtitle">{{ post.subtitle }}</h3>
{% else %}
<h3 class="post-subtitle">{{ post.excerpt | strip_html | truncatewords: 15 }}</h3>
{% endif %}
</a>
<p class="post-meta">Posted by {{ post.author | default: site.author }} on {{ post.date | date: "%B %-d, %Y" }} &middot; {{ post.content | number_of_words | divided_by: 200.0 | ceil }} min read</p>
{% if post.tags and post.tags != empty %}<p class="post-tags">{% for tag in post.tags %}<a class="tag-chip" href="{{ '/blog/topics/' | relative_url }}#{{ tag | slugify }}">#{{ tag }}</a>{% endfor %}</p>{% endif %}
</article>
<hr>
{% endfor %}
{% else %}
No posts yet.
{% endif %}
