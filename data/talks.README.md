# Talks Data Schema

`talks.json` is one ordered array. It contains sourced records first, in reverse chronological order by the `date` sort anchor, followed by archive leads. Keep upcoming sourced records first. Do not sort the data in the browser.

## Sourced records

```json
{
  "id": "stable-public-id",
  "record_type": "sourced",
  "title": "Talk title",
  "venue": "Conference and city when sourced",
  "date": "YYYY-MM-DD (omit when normalized evidence date is null)",
  "date_label": "Optional display label for an event date range",
  "evidence_level": "dated_schedule",
  "evidence_id": "matching-manifest-id",
  "event_url": "https://official-event-page.example/",
  "archive_url": "https://web.archive.org/...",
  "archive_label": "Optional honest label when the archive needs qualification",
  "slides_url": "https://organizer.example/slides.pdf",
  "status": "past",
  "note": "Short evidence note"
}
```

- `id`: stable identifier for the public record.
- `record_type`: always `sourced`.
- `title`: title shown by the source.
- `venue`: event name and a city only when the evidence supports it.
- `date`: optional ISO talk date used as the sort anchor. Omit it when normalized evidence has a null date.
- `date_label`: optional event range used as a display and year-level sort label when no talk date is supported.
- `evidence_level`: one of the evidence levels below.
- `evidence_id`: exact record ID in `_talk-evidence/manifest.json`.
- `event_url`: official event or program page.
- `archive_url`: optional replay URL copied from the manifest. Omit it when the manifest value is null.
- `archive_label`: optional archive-link label when `archive` would overstate the replay, such as an earlier-title metadata capture.
- `slides_url`: optional organizer-hosted slides.
- `status`: `upcoming` or `past`.
- `note`: concise statement of what the source supports. Program listings must state that they do not establish delivery.

Evidence levels:

- `scheduled_upcoming`: an official schedule lists a future session.
- `dated_schedule`: an official schedule gives a session date. This is a schedule record, not independent proof of delivery.
- `official_program_listing`: an official program lists the session and speaker, but the surviving schedule has no dated slot. Do not claim delivery.

## Archive leads

```json
{
  "id": "stable-public-id",
  "record_type": "archive_lead",
  "label": "Remembered appearance",
  "era": "Approximate period",
  "detail": "What is remembered and what remains unknown"
}
```

Archive leads are reconstruction notes, not sourced talks. They have only `id`, `record_type`, `label`, `era`, and `detail`. Do not add links or exact dates until a program record is recovered and promoted to a sourced record.

## Evidence archive

`_talk-evidence/` is the private, Jekyll-excluded provenance archive. Its `manifest.json` maps every sourced `evidence_id` to the official event URL and any available archive replay. JSON evidence files are authoritative; their HTML views are derivative. Run `node scripts/verify-talk-records.mjs` after changing sourced records or evidence.
