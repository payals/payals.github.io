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
<table>
  <thead>
    <tr><th>Book</th><th>Author</th><th>Rating</th><th>Read</th></tr>
  </thead>
  <tbody>
  {%- for book in site.data.books.read %}
    <tr>
      <td>{{ book.title | escape }}</td>
      <td>{{ book.author | escape }}</td>
      <td><span aria-hidden="true">{% for i in (1..scale) %}{% if i <= book.rating %}★{% else %}☆{% endif %}{% endfor %}</span> {{ book.rating }} of {{ scale }}</td>
      <td>{{ book.year }}</td>
    </tr>
  {%- endfor %}
  </tbody>
</table>

Ratings are mine and out of {{ scale }}. The list grows as I finish books; the current one lives in the now pane on the [home page](/#now).
