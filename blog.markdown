---
layout: blog
title: Writing
description: "Notes on Postgres, AI, and systems engineering."
permalink: /blog/
---
{%- comment -%}
/blog/: every post as a link row, newest first, in a listing with the topic
filter (command.js, on [data-list]). The lede is computed from the posts;
nothing is typed in. Tags live on each post and on /blog/topics/.
{%- endcomment -%}
{%- include command/data.html -%}
{%- assign _first = site.posts | last -%}
{%- assign _latest = site.posts | first -%}
<header class="page-head">
<h1 class="page-title">Writing</h1>
<p class="page-lede">{{ page.description | escape }} {% if site.posts.size > 0 %}{{ site.posts.size }} post{% unless site.posts.size == 1 %}s{% endunless %} since {{ _first.date | date: "%B %Y" }}, the latest on <time datetime="{{ _latest.date | date: '%Y-%m-%d' }}">{{ _latest.date | date: "%b %-d" }}</time>.{% else %}No posts yet.{% endif %}</p>
<p class="page-links"><a class="chip" href="/blog/topics/">Tags</a><a class="chip" href="/feed.xml">RSS</a></p>
</header>
{%- if site.posts.size > 0 %}
<section class="listing" id="post-list" aria-label="All posts" data-list="writing">
<div class="listing-tools"><div class="panel-tools js-only" data-tools></div><p class="filter-status" aria-live="polite"></p></div>
{% include command/post-list.html %}
</section>
{%- endif %}
