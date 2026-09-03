---
layout: page
title: Reading
description: "What I am reading now, and what I have finished, with a rating out of five."
permalink: /reading/
---

## Now

<p class="reading-now">{{ site.data.now.reading | escape }}</p>

## Finished

{% assign scale = site.data.books.scale | default: 5 %}
{% assign books = site.data.books.read | sort: "year" | reverse %}
{% assign years = books | map: "year" | uniq %}
{%- assign gr_prefix = "https://www.goodreads.com/book/show/" -%}
{%- assign gr_prefix_len = gr_prefix.size -%}
{% for year in years %}
### {{ year }}

<table>
  <thead>
    <tr><th>Book</th><th>Author</th><th>Rating</th></tr>
  </thead>
  <tbody>
  {%- for book in books %}{%- if book.year == year %}
    {%- assign url_ok = false -%}
    {%- if book.url and book.url.size > gr_prefix_len -%}
      {%- assign url_head = book.url | slice: 0, gr_prefix_len -%}
      {%- if url_head == gr_prefix -%}
        {%- assign url_tail = book.url | slice: gr_prefix_len, 999 -%}
        {%- assign digits_only = url_tail | remove: "0" | remove: "1" | remove: "2" | remove: "3" | remove: "4" | remove: "5" | remove: "6" | remove: "7" | remove: "8" | remove: "9" -%}
        {%- if digits_only == "" -%}
          {%- assign url_ok = true -%}
        {%- endif -%}
      {%- endif -%}
    {%- endif -%}
    <tr>
      <td>{% if url_ok %}<a href="{{ book.url | escape }}" rel="noopener">{{ book.title | escape }}</a>{% else %}{{ book.title | escape }}{% endif %}</td>
      <td>{{ book.author | escape }}</td>
      <td>{% if book.rating > 0 %}<span aria-hidden="true">{% for i in (1..scale) %}{% if i <= book.rating %}★{% else %}☆{% endif %}{% endfor %}</span> {{ book.rating }} of {{ scale }}{% else %}not rated{% endif %}</td>
    </tr>
  {%- endif %}{%- endfor %}
  </tbody>
</table>
{% endfor %}

Ratings are mine and out of {{ scale }}. Titles link to Goodreads. The current book lives in the now pane on the [home page](/#now).

Ratings are mine and out of {{ scale }}. Titles link to Goodreads. The current book lives in the now pane on the [home page](/#now).
