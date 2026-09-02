---
layout: blog
title: Topics
description: "Every post, grouped by tag."
permalink: /blog/topics/
---

{% assign sorted_tags = site.tags | sort %}
<p class="meta blog-toolbar">{{ sorted_tags.size }} topics &middot; <a href="/blog/">All posts</a> &middot; <a href="/feed.xml">RSS</a></p>

{% if sorted_tags.size > 0 %}
{% for tag in sorted_tags %}
<section class="topic" id="{{ tag[0] | slugify }}" tabindex="-1">
  <h2 class="topic__title">{{ tag[0] }} <span class="topic__count">{{ tag[1] | size }}</span></h2>
  <ul class="rows">
  {% for post in tag[1] %}<li class="row"><span class="row__date">{{ post.date | date: "%Y-%m-%d" }}</span><a class="row__title" href="{{ post.url }}">{{ post.title | escape }}</a></li>
  {% endfor %}</ul>
</section>
{% endfor %}
{% else %}
<p class="muted">No tagged posts yet.</p>
{% endif %}
