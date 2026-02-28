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
