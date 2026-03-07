# Best Add-on Features for MVP1 Implementation Tracker

Last updated: 2026-02-28

## Conditions Pulse

- Status: Done
- API endpoints:
  - `GET /v1/explore/updates`
  - `GET /v1/explore/sites/{slug}`
  - `POST /v1/explore/sites/{siteId}/updates`
- DB tables and migrations:
  - `dive_site_updates` extensions if required
  - report target support for site updates
- Web pages and components:
  - Explore cards summary row
  - Latest updates page
  - Add update form on site page
- Tests:
  - public reads
  - signed-in create
  - rate limit and validation contract

## Safety Profile Card

- Status: Done
- API endpoints:
  - derived trust signals added to existing profile, buddy, and messaging responses
- DB tables and migrations:
  - no dedicated table planned
  - aggregate reads from `buddies`, `reports`, `users`, `profiles`
- Web pages and components:
  - reusable `TrustCard`
  - buddy intent cards
  - profile header
  - messaging request preview
- Tests:
  - trust fields present
  - sensitive fields omitted

## One-tap Save Pack

- Status: Done
- API endpoints:
  - `POST /v1/explore/sites/{siteId}/save`
  - `DELETE /v1/explore/sites/{siteId}/save`
  - `POST /v1/users/{userId}/save`
  - `DELETE /v1/users/{userId}/save`
  - `GET /v1/me/saved`
- DB tables and migrations:
  - `saved_users`
- Web pages and components:
  - save buttons on site, buddy, profile
  - saved hub page with sites and buddies tabs
- Tests:
  - save and unsave
  - blocks filtering

## Share Links that Preview Well

- Status: Done
- API endpoints:
  - existing site share support
  - redacted buddy share read path
- DB tables and migrations:
  - none expected
- Web pages and components:
  - `/explore/sites/{slug}`
  - `/buddy/{intentId}`
  - share buttons
- Tests:
  - render
  - metadata snapshots

## Meet at Checkout

- Status: Done
- API endpoints:
  - `POST /v1/messages/conversations/{id}` with optional metadata
  - message read endpoints return metadata
- DB tables and migrations:
  - `messages.metadata` jsonb
- Web pages and components:
  - attach spot UI in composer
  - plan card rendering in conversation
- Tests:
  - metadata validation
  - send and read contract
