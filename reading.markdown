---
layout: page
title: Reading
description: "What I am reading now, and what I have finished, with a rating out of five."
permalink: /reading/
---

## Now

{% assign reading_url = site.data.now.reading_url | default: "" %}
{% assign reading_url_head = reading_url | slice: 0, 36 %}

<p class="reading-now">{% if reading_url_head == "https://www.goodreads.com/book/show/" %}<a href="{{ reading_url | escape }}" rel="noopener">{{ site.data.now.reading | escape }}</a>{% else %}{{ site.data.now.reading | escape }}{% endif %}</p>

## Finished

{% assign scale = site.data.books.scale | default: 5 %}
{% assign books = site.data.books.read | sort: "date" | reverse %}
{% assign years = books | map: "year" | uniq %}
{% assign gr_prefix = "https://www.goodreads.com/book/show/" %}
{% assign gr_prefix_len = gr_prefix.size %}

<div class="reading-years">
{%- for year in years %}
{%- assign year_books = books | where: "year", year %}
<details class="reading-year"{% if forloop.first %} open{% endif %}>
<summary><span class="reading-year__label">{{ year }}</span> <span class="reading-year__count">{{ year_books.size }} book{% if year_books.size != 1 %}s{% endif %}</span></summary>
<table>
  <thead>
    <tr><th>Book</th><th>Author</th><th>Rating</th></tr>
  </thead>
  <tbody>
  {%- for book in year_books %}
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
  {%- endfor %}
  </tbody>
</table>
</details>
{%- endfor %}
</div>

<script>
(function () {
  if (!window.matchMedia || !window.matchMedia("(max-width: 767px)").matches) return;
  var years = document.querySelectorAll("details.reading-year");
  for (var i = 1; i < years.length; i++) years[i].open = false;
})();
</script>

Ratings are mine and out of {{ scale }}. Titles link to Goodreads. The current book lives in the now pane on the [home page](/#now).
