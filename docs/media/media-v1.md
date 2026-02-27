---
doc_id: FPH-MEDIA-V1
title: Media v1
version: 1.0
status: Draft
timezone: Asia/Manila
created_at: 2026-02-28
last_updated_at: 2026-02-28
owners:
  - role: Backend
    name: TBD
  - role: Web
    name: TBD
  - role: Edge (Cloudflare)
    name: TBD
related_docs:
  - services/fphgo/docs/api-compatibility-matrix.md
  - services/fphgo/docs/authz-permissions-v1.md
  - services/fphgo/docs/moderation-actions-v1.md
  - services/fphgo/docs/rate-limits-v1.md
---

# Media v1

This document defines how Freediving Philippines (FPH) stores and serves images in v1 using one private Cloudflare R2 bucket and Instagram-like expiring signed CDN URLs with edge resizing.

## Goals

- Store originals once in R2.
- Serve images through a CDN domain (example: `https://cdn.freediving.ph`).
- URLs are public-by-link but time-limited (expiry).
- Image resizing and format selection happen at delivery time.
- Signed URLs do not destroy cache hit rate.
- Future access control upgrades (blocks, private groups, buddies-only) can be added without breaking URL formats.

## Non-goals (v1)

- True per-viewer authorization after a URL is issued. Anyone with a valid URL can fetch it until expiry.
- Server-side thumbnail generation and storing multiple sizes.
- Video processing.

## Terminology

- **Object key**: the path inside R2, for example `feed/<userId>/2026/02/<filename>.jpg`.
- **Minting**: Go API generating a signed CDN URL for an object key and transform parameters.
- **Edge**: Cloudflare Worker that validates the signature, fetches from R2, resizes, and caches.

---

## Context defaults for FPH media v1

### Presets

| Preset | Widths | Quality | Format |
| --- | ---: | ---: | --- |
| `thumb` | 96, 144 | 70 | `auto` |
| `card` | 320, 480, 640 | 75 | `auto` |
| `dialog` | 720, 1080, 1600 | 80 | `auto` |
| `original` | no resize | n/a | n/a |

### Defaults per context

| Context | Object key prefix | Default TTL | Max upload | Max transform width | Allowed presets | Notes |
| --- | --- | ---: | ---: | ---: | --- | --- |
| `profile_avatar` | `avatars/{userId}/` | 7 days | 5 MB | 1024 | thumb, card, dialog | Identity surface. |
| `profile_feed` | `feed/{userId}/{yyyy}/{mm}/` | 3 days | 10 MB | 2048 | card, dialog | High volume. Batch minting required. |
| `chika_attachment` | `chika/{threadId}/` | 12 hours | 10 MB | 1600 | card, dialog | More takedown-sensitive. |
| `event_attachment` | `events/{eventId}/` | 3 days | 10 MB | 2048 | card, dialog | |
| `dive_spot_attachment` | `dive-spots/{spotId}/` | 7 days | 10 MB | 2048 | card, dialog | Often reused. |
| `group_cover` | `groups/{groupId}/cover/` | 7 days | 10 MB | 2048 | card, dialog | |

### Allowed types (v1)

Allow:
- `image/jpeg`
- `image/png`
- `image/webp`
- `image/gif` (optional)

Disallow in v1:
- `image/svg+xml` (security risk unless sanitized)
- HEIC/AVIF unless the delivery pipeline is validated end-to-end

### Metadata and privacy

- Sniff file type from bytes. Do not trust client-provided MIME alone.
- Strip EXIF (at least GPS) on upload, or document that EXIF is retained (not recommended).

---

## Storage

- One private R2 bucket.
- No public bucket URLs are used by clients.
- The DB stores `object_key` as the source of truth. Do not store permanent public URLs.

### Object key patterns

- `profile_avatar`: `avatars/{userId}/{unixMillis}-{randHex}.{ext}`
- `profile_feed`: `feed/{userId}/{yyyy}/{mm}/{unixMillis}-{randHex}.{ext}`
- `chika_attachment`: `chika/{threadId}/{unixMillis}-{randHex}.{ext}`
- `event_attachment`: `events/{eventId}/{unixMillis}-{randHex}.{ext}`
- `dive_spot_attachment`: `dive-spots/{spotId}/{unixMillis}-{randHex}.{ext}`
- `group_cover`: `groups/{groupId}/cover/{unixMillis}-{randHex}.{ext}`

---

## Delivery URL format

All images are served from the CDN Worker domain:

`GET https://cdn.freediving.ph/i/{objectKey}?w=640&q=75&f=auto&exp=1700000000&k=1&sig=...`

Query parameters:

- `w`: width (integer). Optional for `original` preset (omit `w`).
- `q`: quality (integer).
- `f`: output format (`auto`, `webp`, `jpeg`, `png`).
- `exp`: unix seconds expiry.
- `k`: signing key version. Used for rotation.
- `sig`: signature of the canonical string, base64url-encoded (no padding).

The path `/i/{objectKey}` is stable and meaningful. Removing `sig` or `exp` must make the URL invalid, similar to Instagram-style CDN URLs.

---

## Signing spec

### Overview

- Algorithm: HMAC-SHA256
- Output encoding: base64url without padding (`=` removed)
- Signature covers the path and a strict subset of query parameters so that transform parameters cannot be tampered with.

### Canonical string spec

The canonical string is ASCII text built exactly as follows:

1. `METHOD` is always `GET` (uppercase).
2. `PATH` is the request path, exactly `/i/{objectKey}`.
   - `{objectKey}` must be used as stored, without decoding and without normalizing slashes.
3. `QUERY` is the signed query subset rendered as `key=value` pairs joined by `&` in sorted key order.
   - Signed keys are: `f`, `q`, `w`, `exp`, `k`
   - If a key is absent (example: `w` for original), omit it from QUERY and omit it from signing.
4. Newline delimiter is `\n` between METHOD, PATH, and QUERY.
5. No trailing newline at the end.

Canonical string format:

```
GET
/i/{objectKey}
f=auto&q=75&w=640&exp=1700000000&k=1
```

Important rules:

- Keys are lowercase exactly as listed.
- Values are rendered as strings with no extra spaces.
- `w`, `q`, `exp` are base-10 integers with no leading `+`.
- `f` is lowercase and must be one of the allowed formats.
- `objectKey` must not contain `..` segments. Reject any key that fails validation before signing or serving.

### Signature computation

1. Compute HMAC-SHA256 over the canonical string bytes (UTF-8).
2. Encode raw HMAC bytes as base64url without padding.
3. Put the result into the `sig` query parameter.

### Example

Inputs:
- objectKey: `feed/user_123/2026/02/1700000123456-ab12cd.jpg`
- w: `640`
- q: `75`
- f: `auto`
- exp: `1700000000`
- k: `1`

Canonical string:

```
GET
/i/feed/user_123/2026/02/1700000123456-ab12cd.jpg
f=auto&q=75&w=640&exp=1700000000&k=1
```

Signed URL pattern:

`https://cdn.freediving.ph/i/feed/user_123/2026/02/1700000123456-ab12cd.jpg?w=640&q=75&f=auto&exp=1700000000&k=1&sig=<base64url>`

### Key rotation

- Go mints URLs using the current key version `k`.
- Worker validates using the secret for the provided `k`.
- To rotate:
  1) Add new secret `k=2` to Worker and Go.
  2) Start minting with `k=2`.
  3) Keep validating `k=1` until old TTLs expire.
  4) Remove `k=1` from Worker later.

---

## Worker behavior

The Worker handles `GET /i/*`.

### Validation

- Reject if `exp` missing or expired (allow small skew, for example 60 seconds).
- Reject if `sig` missing or invalid.
- Parse and validate `w`, `q`, `f`.
- Enforce max width by context using objectKey prefix rules:
  - `avatars/` max 1024
  - `chika/` max 1600
  - default max 2048
- Clamp quality to safe bounds (example 50 to 85).

### Fetch and transform

- Fetch original from R2.
- Apply resizing at the edge:
  - width = `w`
  - quality = `q`
  - format = `f` (or `auto`)
- If `w` is omitted, serve original (still behind signature and expiry).

### Cache normalization

- The Worker must avoid cache fragmentation by `sig` and `exp`.
- Cache key must ignore `sig` and `exp` and include only meaningful variant parameters, for example:
  - `/cache/i/{objectKey}?w={w}&q={q}&f={f}`
- Cached response TTL must not exceed the remaining expiry window.

### Moderation state and revocation

v1 minimum:
- Go refuses to mint URLs for media with `state != active` for normal members.
- Old URLs can remain valid until expiry.

Optional future:
- Worker consults a denylist for immediate revocation, without waiting for expiry.

---

## Go API responsibilities

### Upload

- Endpoint: `POST /v1/media/upload`
- Stores metadata in DB and uploads original to R2.
- Validates context limits, allowed types, and file signature (magic bytes).
- Extracts width and height.
- Sets state to `active`.

### URL minting

- Endpoint: `POST /v1/media/urls` (batch)
- Returns signed CDN URLs for each requested mediaId and preset.
- Applies context defaults:
  - TTL by context
  - max transform width and allowed presets
  - clamps width overrides
- Refuses to mint for `hidden` or `deleted` unless caller has moderation permission (optional policy).

### Permissions

Minimum permissions:
- `media.read` required to mint URLs.
- `media.write` required to upload.
Optional:
- `media.moderate` to mint URLs for hidden media (usually not needed).

---

## Next.js responsibilities

- Never construct permanent image URLs.
- Use a shared hook or helper that calls `/v1/media/urls` to mint signed URLs in batches.
- Use presets consistently:
  - Avatar uses `thumb`
  - Feed grid uses `card`
  - Modal uses `dialog`
- Avoid refetch storms by caching minted URLs in React Query with sensible stale times aligned to TTL.

---

## Operational notes

- Signed URLs are public-by-link. If a user shares a valid URL, anyone can fetch until expiry.
- Choose TTL based on takedown sensitivity:
  - Shorter TTL for chika attachments
  - Longer TTL for avatars and dive spots
- Ensure logs exist for:
  - signature validation failures
  - fetch failures
  - transform errors
  - cache hit or miss (optional)

---

## Appendix: Canonicalization checklist

When debugging signature mismatches, verify:

- Method is `GET`.
- Path begins with `/i/` and includes the exact objectKey characters.
- Only the signed keys are used in canonical query: `f`, `q`, `w`, `exp`, `k`.
- Query keys are sorted lexicographically.
- Values match exactly, including casing.
- Newlines are present exactly between METHOD, PATH, and QUERY.
- Output encoding is base64url without padding.

