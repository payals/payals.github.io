# Supplement to deep-interview-ghpages-terminal-landing.md

Captured 2026-05-19 after spec lock. Feed into autopilot alongside the main spec.

## Final tagline decision

**No tagline.** Just the name `Payal Singh`. Most editorial / restrained.

(Overrides the candidate "notes on data, AI, markets, research" mentioned in the main spec.)

## Final link list

| Command | URL |
|---------|-----|
| `github`   | https://github.com/payals |
| `linkedin` | https://linkedin.com/in/payalsingh |
| `medium`   | https://medium.com/@reliable-by-design |
| `blog`     | https://makeworld.dev |
| `older`    | https://penningpence.blogspot.com |
| `email`    | mailto:psinghpayal@outlook.com |

These hard-code into the JS command registry. Easy to edit later in one place.

## Resume

**v1 = placeholder.** Ship `data/resume.md` with content like:

```markdown
# Payal Singh — Resume

Coming soon. Reach me via the email command or LinkedIn for now.
```

No PDF link in v1. User will populate `data/resume.md` (and optionally drop `data/resume.pdf` to wire the download button) when ready.

## Talks

Not addressed in supplement-time data gather. Spec already plans `data/talks.json` placeholder. Autopilot should ship with an empty `talks.json` plus a friendly "no talks listed yet" panel state.

## `now.json` v1

Hand-edited fields:

```json
{
  "reading": "TBD — Pi to fill",
  "shipping": "makeworld.dev — self-hosted blog",
  "city": "TBD — Pi to fill",
  "updated": "2026-05-19"
}
```

Plus the two auto-fetched signals from the spec:
- Latest commit: `https://api.github.com/users/payals/events/public` → first `PushEvent` repo + time.
- Latest blog post: parse `https://makeworld.dev/feed.xml` → first `<entry>` title + date.

## ASCII portrait

Per Round-5 answer: ADD the portrait. Per portrait-source question: **generate a stylised non-photo motif**.

Designer agent is producing 3 candidates at `.omc/design/ascii-motif.md` (running in background at spec-write time).
Pick one and store as `assets/img/portrait.txt`.

## Constraints reminders for autopilot

- Strip Jekyll completely (delete `_config.yml`, `_layouts/`, `_posts/`, `Gemfile`, `blog.md`, `about.md`, `index.md`, `assets/css/main.scss`, `404.md`).
- Pure static HTML + vanilla JS + CSS. No frameworks. No bundlers.
- Under 100KB gzipped total.
- AA contrast on a dark palette.
- `prefers-reduced-motion: reduce` short-circuits the boot animation.
- Mobile-first; chips wrap; terminal sizes down.
- No tracking. No third-party scripts beyond optional GitHub/RSS fetch.
- Email rendered as `mailto:` — no JS obfuscation needed; the address is public.
- Outbound links open in new tab (`target="_blank" rel="noopener"`).
