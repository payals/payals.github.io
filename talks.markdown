---
layout: page
title: Talks
description: "Conference talks and sessions, upcoming first, each backed by an official schedule or program listing."
permalink: /talks/
---

{%- comment -%} PM2 (2026-09-04, minimal phone landing): the Talks door
card on the phone landing (index.html) opens this page instead of a
console pane. Same source, same ordering as the console's own talks
pane (index.html): sourced records first, upcoming then past by date,
archive leads in a short final section. Liquid over data/talks.json,
same as the console; see data/talks.README.md for the schema and
_includes/safe-link.html for why every URL here goes through an escape
and a scheme check rather than straight into an href. {%- endcomment -%}
{%- assign talks = site.data.talks -%}
{%- assign sourced = talks | where: "record_type", "sourced" -%}
{%- assign leads = talks | where: "record_type", "archive_lead" -%}
{%- assign upcoming = sourced | where: "status", "upcoming" -%}
{%- assign past = sourced | where: "status", "past" -%}
{%- assign ordered = upcoming | concat: past -%}

<p class="meta">{{ sourced.size }} sourced talk{% unless sourced.size == 1 %}s{% endunless %} &middot; {{ leads.size }} archive lead{% unless leads.size == 1 %}s{% endunless %} &middot; <a href="/data/talks.json">talks.json</a></p>

{%- if ordered.size == 0 %}
<p class="meta">No sourced talks on record yet.</p>
{%- else %}
<ul class="rows">
  {%- for talk in ordered %}
  {%- if talk.date %}{% assign talk_year = talk.date | slice: 0, 4 %}{% else %}{% assign talk_year = talk.date_label | slice: -4, 4 %}{% endif %}
  {%- capture talk_title_safe %}{{ talk.title | escape }}{% endcapture %}
  {%- capture talk_progsched_safe %}{% if talk.evidence_level == 'official_program_listing' %}program{% else %}schedule{% endif %}{% endcapture %}
  {%- capture talk_archive_safe %}{{ talk.archive_label | default: "archive" | escape }}{% endcapture %}
  <li class="row" data-year="{{ talk_year }}">
    {%- if talk.date %}
    <time class="row__date" datetime="{{ talk.date }}" data-year="{{ talk_year }}">{{ talk.date }}</time>
    {%- else %}
    <span class="row__date" data-year="{{ talk_year }}">{{ talk.date_label | escape }}</span>
    {%- endif %}
    {% include safe-link.html url=talk.event_url text=talk_title_safe class="row__title" target="_blank" rel="noopener" %}
    <span class="row__aside">{{ talk.venue | escape }}
      {%- if talk.status == 'upcoming' %} <span class="badge badge--ok">upcoming</span>{% endif %}
      {%- if talk.evidence_level == 'official_program_listing' %} <span class="badge">program listing</span>{% endif %}
      &middot; {% include safe-link.html url=talk.event_url text=talk_progsched_safe target="_blank" rel="noopener" %}
      {%- if talk.archive_url %} &middot; {% include safe-link.html url=talk.archive_url text=talk_archive_safe target="_blank" rel="noopener" %}{% endif %}
      {%- if talk.slides_url %} &middot; {% include safe-link.html url=talk.slides_url text="slides" target="_blank" rel="noopener" %}{% endif %}
    </span>
    {%- if talk.evidence_level == 'official_program_listing' and talk.note %}
    <p class="row__note">{{ talk.note | escape }}</p>
    {%- endif %}
  </li>
  {%- endfor %}
</ul>
{%- endif %}

{%- if leads.size > 0 %}
## Archive leads

Remembered appearances still being reconstructed. No title or date is claimed without a recovered record.

<ul class="rows">
  {%- for lead in leads %}
  <li class="row">
    <span class="row__date">{{ lead.era | escape }}</span>
    <span class="row__title">{{ lead.label | escape }}</span>
    <p class="row__note">{{ lead.detail | escape }}</p>
  </li>
  {%- endfor %}
</ul>
{%- endif %}

<p class="meta">Schedule records establish scheduling, not delivery.</p>
