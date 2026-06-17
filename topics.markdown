---
layout: page
title: Topics
description: "Browse posts by topic."
permalink: /blog/topics/
---

{% assign sorted_tags = site.tags | sort %}
<p class="blog-toolbar"><a href="{{ '/blog/' | relative_url }}">&larr; all posts</a></p>
{% if sorted_tags.size > 0 %}
{% for tag in sorted_tags %}
<h2 id="{{ tag[0] | slugify }}" class="topic-heading">{{ tag[0] }} <span class="topic-count">{{ tag[1] | size }}</span></h2>
<ul class="topic-list">
{% for post in tag[1] %}<li><a href="{{ post.url | relative_url }}">{{ post.title }}</a> <span class="topic-date">{{ post.date | date: "%b %-d, %Y" }}</span></li>
{% endfor %}</ul>
{% endfor %}
{% else %}
No tagged posts yet.
{% endif %}
