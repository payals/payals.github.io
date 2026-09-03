---
layout: page
title: Reading
description: "What I am reading now, and what I have finished, with a rating out of five."
permalink: /reading/
---

## Now

{{ site.data.now.reading }}

## Finished

{% assign scale = site.data.books.scale | default: 5 %}
{% assign books = site.data.books.read | sort: "year" | reverse %}
{% assign years = books | map: "year" | uniq %}
{% for year in years %}
### {{ year }}

<table>
  <thead>
    <tr><th>Book</th><th>Author</th><th>Rating</th></tr>
  </thead>
  <tbody>
  {%- for book in books %}{%- if book.year == year %}
    <tr>
      <td>{% if book.url %}<a href="{{ book.url }}" rel="noopener">{{ book.title | escape }}</a>{% else %}{{ book.title | escape }}{% endif %}</td>
      <td>{{ book.author | escape }}</td>
      <td>{% if book.rating > 0 %}<span aria-hidden="true">{% for i in (1..scale) %}{% if i <= book.rating %}★{% else %}☆{% endif %}{% endfor %}</span> {{ book.rating }} of {{ scale }}{% else %}not rated{% endif %}</td>
    </tr>
  {%- endif %}{%- endfor %}
  </tbody>
</table>
{% endfor %}

Ratings are mine and out of {{ scale }}. Titles link to Goodreads. The current book lives in the now pane on the [home page](/#now).
