# Talk evidence archive

This directory preserves normalized evidence for twelve public speaking records. It is named with a leading underscore so Jekyll treats it as a private collection directory unless explicitly configured; this repository does not configure or publish it.

## Contents

- `manifest.json`: machine-readable index and source-to-archive mapping.
- `<stable-id>.json`: normalized evidence and integrity metadata.
- `<stable-id>.html`: readable, standalone rendering with inline CSS and no scripts or external assets.

## Evidence policy

- `dated_schedule`: an official schedule states a talk date. It does not independently prove delivery.
- `official_program_listing`: an official program/proposal listing identifies the talk and speaker but gives no talk date. No date or delivery claim is made.
- `scheduled_upcoming`: an official schedule lists a future talk.
- Source excerpts preserve exact relevant wording retrieved from official pages. Context excerpts are separately attributed when an official event page is needed for the city.
- Payal's first-party Internet Archive collection is recorded as collection provenance: <https://archive.org/details/@p_s623/web-archive>.
- First-party speaker-profile captures are supplementary identity provenance only. They are not evidence of scheduling or delivery.
- Metadata-only archived title variants identify historical page metadata without claiming that the archived page body was fetched or quoted.
- All stored Wayback replay URLs use HTTPS.
- `fetched_content_sha256` hashes the exact response-body bytes fetched from the live source with the recorded HTTP status and byte count. Full third-party pages are deliberately not retained.
- `source_excerpt_sha256` hashes the UTF-8 bytes of the exact retained `source_excerpt` string.
- `normalized_payload_sha256` hashes canonical JSON (recursively sorted object keys, array order preserved, UTF-8, no insignificant whitespace) of every top-level record field except `integrity`.

## Wayback results

Save Page Now was attempted for every live source on `2026-08-28T09:36:40Z`. Every request returned HTTP 429, so no submission was represented as successful. The Wayback Availability API was then queried. Existing closest snapshots are recorded exactly as returned; absent snapshots are `null`.

The SCaLE 23x record additionally uses Payal's first-party capture of the earlier-title talk URL as its primary Wayback replay. This provenance update does not alter the original Save Page Now result.

## Verification

Parse every JSON file, recompute the retained excerpt and canonical payload SHA-256 values, validate recorded fetched-body hashes as 64-digit SHA-256 values, and compare each manifest entry with its record. The HTML files are derivative views; JSON is authoritative.
