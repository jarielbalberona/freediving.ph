# Buddy Finder v1

## Purpose

Buddy Finder is not the same thing as buddy relationships. It is a short-lived matching surface for "who is looking, where, and when" with safety defaults turned on from the start.

## Routes

Base path: `/v1/buddy-finder`

- `GET /v1/buddy-finder/preview`
  - auth: public
  - query: `area`
  - response: count + limited preview cards
  - privacy: no direct contact, no full profile, no exact location

- `GET /v1/buddy-finder/intents`
  - auth: member + `buddies.read`
  - filters:
    - `area`
    - `intentType`
    - `timeWindow`
    - `cursor`
    - `limit`
  - privacy: coarse area only
  - safety: blocked users excluded in SQL

- `POST /v1/buddy-finder/intents`
  - auth: member + `buddies.write`
  - body:
    - optional `diveSiteId`
    - `area` (optional when `diveSiteId` is provided; derived from the site's coarse area)
    - `intentType`
    - `timeWindow`
    - optional `dateStart`
    - optional `dateEnd`
    - optional `note`
  - validation: `httpx.DecodeAndValidate`
  - rate limit: service-level create cooldown

- `DELETE /v1/buddy-finder/intents/{id}`
  - auth: member + `buddies.write`
  - behavior: author can delete own intent

- `POST /v1/buddy-finder/intents/{id}/message`
  - auth: member + `buddies.write`
  - behavior: validates block state and cooldown, then returns recipient user id for DM request flow

- `GET /v1/buddy-finder/intents/{id}/share-preview`
  - auth: public
  - response: redacted share-safe buddy intent preview for `/buddy/{intentId}`
  - safety: no direct contact, no full note, no exact location

## Data Model

### `buddy_intents`

- author app user id
- optional `dive_site_id` for explicit site-linked matching
- coarse `area`
- short-lived `intent_type` + `time_window`
- optional date range
- `visibility = 'members'` in v1
- `state` in `active|hidden|expired`
- `expires_at` for TTL-style filtering

## Trust ladder

Returned fields are intentionally lightweight:

- `email_verified`
- `phone_verified`
- optional `cert_level`
- aggregate `buddy_count`
- aggregate `report_count`
- placeholder `mutual_buddies_count`

No exact lat/lng is stored or returned for buddy matching.

## Safety rules

- coarse location only
- blocked users do not appear in member lists
- message entry is blocked across block relationships
- message initiation has a per-target cooldown
- public preview stays redacted by design, not by client convention

## Site page matching

- The site page uses a simple priority order because that is what matters in the first minute of usage:
  1. intents explicitly linked to the dive site
  2. fallback intents from the same coarse area
- The fallback exists to prevent empty state rot. If nobody linked the site yet, the user still sees local demand.
- Creating a site-linked intent does not store more precise location. `dive_site_id` is for matching, not for exposing private coordinates.

## Add-on coupling

- Buddy cards and share previews now expose the same compact trust ladder used in profile and messaging surfaces.
- Saved buddies are stored by user, not by intent, so the shortlist survives expired intent rows.
- Buddy share pages stay intentionally redacted. They are growth surfaces, not contact leaks.
