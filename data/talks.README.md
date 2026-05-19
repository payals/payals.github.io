# Talks Data Schema

Each talk object in `talks.json` should have the following structure:

```json
{
  "title": "Talk Title",
  "venue": "Conference or Event Name",
  "date": "YYYY-MM-DD",
  "slides_url": "https://...",
  "video_url": "https://...",
  "image": "path/to/image.jpg"
}
```

Fields `slides_url`, `video_url`, and `image` are optional. The panel displays up to 6 talks initially with a "load more" button for additional entries.
