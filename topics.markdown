---
layout: blog
title: Tags
description: "Every post, grouped by tag."
permalink: /blog/topics/
c_path: writing/tags
---
{%- comment -%}
/blog/topics/: every post grouped by tag. The page is "Tags" so that "topic"
keeps one meaning sitewide (the six shapes); the URL and the #<tag> anchors
that every post links to are unchanged. A chip row jumps to each tag.
{%- endcomment -%}
{%- include command/data.html -%}
{%- assign sorted_tags = site.tags | sort -%}
<header class="page-head">
<h1 class="page-title">Tags</h1>
<p class="page-lede">{{ sorted_tags.size }} tag{% unless sorted_tags.size == 1 %}s{% endunless %} across {{ site.posts.size }} post{% unless site.posts.size == 1 %}s{% endunless %}. Tags are finer than the topic filter on <a href="/blog/">Writing</a>: a post has one topic, shown by its shape, and several tags.</p>
{%- if sorted_tags.size > 0 %}
<nav class="page-links" aria-label="Tags">{% for tag in sorted_tags %}<a class="chip" href="#{{ tag[0] | slugify }}">{{ tag[0] }} <span class="n mono">{{ tag[1] | size }}</span></a>{% endfor %}</nav>
{%- endif %}
</header>
{%- if sorted_tags.size > 0 %}
<div class="tagsecs">
{%- for tag in sorted_tags %}
<section class="tagsec" id="{{ tag[0] | slugify }}" tabindex="-1" aria-labelledby="tag-{{ tag[0] | slugify }}">
<h2 id="tag-{{ tag[0] | slugify }}">{{ tag[0] }} <span class="n mono">{{ tag[1] | size }} post{% unless tag[1].size == 1 %}s{% endunless %}</span></h2>
{%- assign _tag_posts = tag[1] %}
{% include command/post-list.html posts=_tag_posts compact=true %}
</section>
{%- endfor %}
</div>
{%- else %}
<p class="page-lede">No tagged posts yet.</p>
{%- endif %}
