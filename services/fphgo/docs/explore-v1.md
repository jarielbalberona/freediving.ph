# Explore v1

## Purpose

Explore is the public acquisition surface. It must be useful signed-out and show enough signal to answer one question fast: "Is this a known site and what are conditions like lately?"

## Routes

Base path: `/v1/explore`

- `GET /v1/explore/sites`
  - auth: public
  - filters:
    - `area`
    - `difficulty`
    - `verifiedOnly`
    - `search`
    - `cursor`
    - `limit`
  - response: list of site cards with trust signals and recent condition summary

- `GET /v1/explore/sites/{slug}`
  - auth: public
  - query:
    - `updatesCursor`
    - `updatesLimit`
  - response: full site detail + latest updates + current snapshot/trust fields

- `GET /v1/explore/updates`
  - auth: public
  - query:
    - `area`
    - `cursor`
    - `limit`
  - response: latest structured Conditions Pulse feed for nearby areas

- `GET /v1/explore/sites/{slug}/buddy-preview`
  - auth: public
  - query:
    - `limit`
  - response: redacted buddy preview cards for the site page
  - matching order:
    1. intents linked to `dive_site_id`
    2. area fallback using the site's coarse `area`

- `GET /v1/explore/sites/{slug}/buddy-intents`
  - auth: member + `buddies.read`
  - query:
    - `cursor`
    - `limit`
  - response: full buddy cards for the site page
  - matching order:
    1. site-linked intents first
    2. area fallback after site-linked supply is exhausted

- `POST /v1/explore/sites/{siteId}/updates`
  - auth: member + `explore.submit`
  - body: site conditions note + optional visibility/current/waves/temp/occurredAt
  - validation: `httpx.DecodeAndValidate`
  - rate limit: service-level cooldown on update creation

- `POST /v1/explore/sites/submit`
  - auth: member + `explore.submit`
  - body: proposed site fields (`name`, `area`, `entryDifficulty`, optional location/conditions/access metadata)
  - validation: `httpx.DecodeAndValidate`
  - behavior:
    1. inserts into `dive_sites`
    2. forces `moderation_state='pending'`
    3. stores `submitted_by_app_user_id`
  - rate limits:
    - 1 submission per hour per actor
    - 5 submissions per day per actor
  - dedupe:
    - rejects a submission when an approved site already exists with the same `name + area`

- `GET /v1/explore/sites/submissions`
  - auth: member + `explore.submit`
  - response: current actor's submissions, including `pending` and `hidden`

- `GET /v1/explore/sites/submissions/{id}`
  - auth: member + `explore.submit`
  - response: actor-owned submission detail with moderation status and optional moderation reason

- `GET /v1/explore/moderation/sites/pending`
  - auth: member + `explore.moderate`
  - response: pending site submissions for moderator review

- `GET /v1/explore/moderation/sites/{id}`
  - auth: member + `explore.moderate`
  - response: full submission detail regardless of moderation state

- `POST /v1/explore/moderation/sites/{id}/approve`
  - auth: member + `explore.moderate`
  - body: optional `reason`
  - behavior:
    1. requires current state `pending`
    2. generates a public slug
    3. stores `reviewed_by_app_user_id`, `reviewed_at`, and optional `moderation_reason`
    4. flips `moderation_state` to `approved`

- `POST /v1/explore/moderation/sites/{id}/reject`
  - auth: member + `explore.moderate`
  - body: optional `reason`
  - behavior:
    1. requires current state `pending`
    2. stores reviewer metadata
    3. flips `moderation_state` to `hidden`

- `POST /v1/explore/sites/{siteId}/save`
  - auth: member + `explore.submit`

- `DELETE /v1/explore/sites/{siteId}/save`
  - auth: member + `explore.submit`

## Data Model

### `dive_sites`

- public browse record
- slug-based share path
- coarse area string
- optional latitude/longitude for marker plotting
- trust fields:
  - `verification_status`
  - `verified_by_app_user_id`
  - `last_updated_at`
- moderation workflow fields:
  - `submitted_by_app_user_id`
  - `reviewed_by_app_user_id`
  - `reviewed_at`
  - `moderation_reason`
  - `updated_at`
- moderation meanings:
  - `pending`: member-submitted and awaiting review
  - `approved`: public and queryable by public Explore reads
  - `hidden`: rejected or moderator-removed from public Explore

### `dive_site_updates`

- append-only conditions reports
- active/hidden moderation state
- `occurred_at` represents observation time, not submission time

### `dive_site_saves`

- simple member save table
- unique by `(app_user_id, dive_site_id)`

## Explore x Buddy Finder coupling

- Site pages do not wait for a perfect site-linked network effect. They always try `dive_site_id` first, then fall back to the site's coarse `area`.
- Public site pages only get redacted buddy preview cards. Full notes, profile identity, and message entry stay behind sign-in.
- Matching is intentionally coarse. No buddy lat/lng is stored or exposed in the site flow.

## Safety and quality rules

- Public read only exposes approved sites.
- Submitters can see their own pending and hidden submissions by ID and list endpoints.
- Moderators can review pending submissions through `explore.moderate` routes.
- Site updates stay coarse and conditions-focused.
- Site update reads exclude hidden moderation state rows.
- Update responses include derived trust ladder signals for the author:
  - `emailVerified`
  - `phoneVerified`
  - optional `certLevel`
  - aggregate `buddyCount`
  - aggregate `reportCount`
- Site buddy preview is redacted server-side, not by client convention.
- Write routes require auth and permission.
- Update creation is rate-limited in the service layer.
- Site submission creation is rate-limited and duplicate-checked in the service layer.
- Share URLs are slug-based and stable for Messenger/social preview pages.

## Conditions Pulse add-on

- The add-on is intentionally simple:
  - latest snapshot on site cards
  - latest updates feed by area
  - fast post-update flow on site pages
- Reports can target dive site updates. Hidden updates stay out of public and member reads.

## Seed strategy

- Migration `0015_explore_buddy_finder_v1.sql` seeds 20 curated sites.
- Seed data also includes sample condition updates so cards do not look empty on day 1.
