# Talks Data Schema

Each talk object in `talks.json` should have the following structure:

```json
{
  "title": "Talk Title",
  "venue": "Conference or Event Name",
  "date": "YYYY-MM-DD",
  "status": "upcoming",
  "event_url": "https://...",
  "slides_url": "https://...",
  "video_url": "https://...",
  "image": "path/to/image.jpg"
}
```

Fields `status`, `event_url`, `slides_url`, `video_url`, and `image` are optional. `event_url` renders as a `details` link, and `status: "upcoming"` renders as a badge. The panel displays up to 6 talks initially with a "load more" button for additional entries.

Keep entries in reverse chronological order, with upcoming talks first.
