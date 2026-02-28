# Best Add-on MVP1 Verification

Last updated: 2026-02-28

Source spec: [`docs/specs/best-addon-mvp1.md`](./best-addon-mvp1.md)

## Verification scope

This document verifies the 5 MVP1 add-ons across:

- `services/fphgo`
- `apps/web`
- `packages/types`
- docs and release checklist gates

Verification method:

- direct code traceability
- route snapshot inspection
- focused Go tests
- focused web contract tests
- Next production build route output

Commands run:

- `go test ./internal/features/explore/... ./internal/features/profiles/... ./internal/features/users/... ./internal/features/messaging/... ./internal/features/reports/... ./internal/features/buddyfinder/... ./internal/app`
- `pnpm -C packages/types type-check`
- `pnpm -C apps/web type-check`
- `pnpm -C apps/web build`
- `node --test apps/web/test/explore-buddy-site-contract.test.mjs apps/web/test/fphgo-routes-contract.test.mjs apps/web/test/best-addon-mvp1-contract.test.mjs`

Result summary:

- Go verification: pass
- Shared types type-check: pass
- Web type-check: pass
- Web build: pass
- Web contract tests: pass

## Cross-cutting verification

| Check | Evidence | Tests | Manual verification | Status |
|---|---|---|---|---|
| Shared request and response contracts exist in `packages/types` | [`packages/types/src/index.ts`](../../packages/types/src/index.ts), [`packages/types/src/api/profile.ts`](../../packages/types/src/api/profile.ts) | `pnpm -C packages/types type-check` | Inspect exported types for `ExploreLatestUpdatesResponse`, `BuddyFinderSharePreviewResponse`, `MessageMetadata`, `SaveUserResponse`, `SavedHubResponse` | Pass |
| Web imports shared contracts instead of redefining them | [`apps/web/src/app/explore/page.tsx`](../../apps/web/src/app/explore/page.tsx), [`apps/web/src/app/messages/page.tsx`](../../apps/web/src/app/messages/page.tsx), [`apps/web/src/features/profiles/api/profiles.ts`](../../apps/web/src/features/profiles/api/profiles.ts), [`apps/web/src/features/diveSpots/api/explore-v1.ts`](../../apps/web/src/features/diveSpots/api/explore-v1.ts) | `rg -n "from \"@freediving.ph/types\"" apps/web/src/features apps/web/src/app` | Confirm app and feature API clients import shared DTOs from `@freediving.ph/types` | Pass |
| ApiError and validation issue shape matches Go | [`packages/types/src/api/error.ts`](../../packages/types/src/api/error.ts), [`services/fphgo/internal/shared/httpx/respond.go`](../../services/fphgo/internal/shared/httpx/respond.go) | [`services/fphgo/internal/features/users/http/routes_test.go`](../../services/fphgo/internal/features/users/http/routes_test.go), [`services/fphgo/internal/features/profiles/http/integration_test.go`](../../services/fphgo/internal/features/profiles/http/integration_test.go), [`services/fphgo/internal/features/reports/http/integration_test.go`](../../services/fphgo/internal/features/reports/http/integration_test.go) | Compare `issues[]`, `requestId`, and normalized error codes | Pass |
| BIGSERIAL IDs remain safe for web by serializing as strings | [`services/fphgo/internal/features/messaging/http/dto.go`](../../services/fphgo/internal/features/messaging/http/dto.go), [`packages/types/src/index.ts`](../../packages/types/src/index.ts) | [`services/fphgo/internal/features/messaging/http/integration_test.go`](../../services/fphgo/internal/features/messaging/http/integration_test.go) | Confirm `messageId` and `requestId` are strings in DTOs and TS types | Pass |
| `suspended` and `read_only` states block add-on writes | [`services/fphgo/internal/middleware/clerk_auth.go`](../../services/fphgo/internal/middleware/clerk_auth.go), [`services/fphgo/internal/features/explore/http/routes.go`](../../services/fphgo/internal/features/explore/http/routes.go), [`services/fphgo/internal/features/buddyfinder/http/routes.go`](../../services/fphgo/internal/features/buddyfinder/http/routes.go), [`services/fphgo/internal/features/messaging/http/routes.go`](../../services/fphgo/internal/features/messaging/http/routes.go), [`services/fphgo/internal/features/users/http/routes.go`](../../services/fphgo/internal/features/users/http/routes.go) | [`services/fphgo/internal/middleware/clerk_auth_test.go`](../../services/fphgo/internal/middleware/clerk_auth_test.go), [`services/fphgo/internal/features/messaging/http/integration_test.go`](../../services/fphgo/internal/features/messaging/http/integration_test.go) | Verify all write routes sit behind `RequireMember` so suspended and read_only are blocked before handler execution | Pass |
| Add-on routes are mounted under `/v1/...` | [`services/fphgo/internal/app/testdata/route_surface.snapshot.json`](../../services/fphgo/internal/app/testdata/route_surface.snapshot.json), [`apps/web/src/lib/api/fphgo-routes.ts`](../../apps/web/src/lib/api/fphgo-routes.ts) | [`apps/web/test/fphgo-routes-contract.test.mjs`](../../apps/web/test/fphgo-routes-contract.test.mjs), `go test ./internal/app -run TestRouteSurfaceSnapshot` | Compare route snapshot and route builders | Pass |

## Traceability matrix

| Spec requirement | Implementation locations | Test coverage | Manual verification steps | Status |
|---|---|---|---|---|
| Conditions Pulse: public area updates feed | [`services/fphgo/internal/features/explore/http/routes.go`](../../services/fphgo/internal/features/explore/http/routes.go), [`services/fphgo/internal/features/explore/http/handlers.go`](../../services/fphgo/internal/features/explore/http/handlers.go), [`services/fphgo/internal/features/explore/service/service.go`](../../services/fphgo/internal/features/explore/service/service.go), query `ListLatestUpdates` in [`services/fphgo/internal/features/explore/repo/queries/explore.sql`](../../services/fphgo/internal/features/explore/repo/queries/explore.sql), [`apps/web/src/features/diveSpots/api/explore-v1.ts`](../../apps/web/src/features/diveSpots/api/explore-v1.ts), [`apps/web/src/app/explore/updates/page.tsx`](../../apps/web/src/app/explore/updates/page.tsx), [`packages/types/src/index.ts`](../../packages/types/src/index.ts) | [`services/fphgo/internal/features/explore/http/integration_test.go`](../../services/fphgo/internal/features/explore/http/integration_test.go), [`apps/web/test/best-addon-mvp1-contract.test.mjs`](../../apps/web/test/best-addon-mvp1-contract.test.mjs) | Open `/explore/updates`, filter by area and recency, confirm cards show note, site, trust, and timestamp | Pass |
| Conditions Pulse: site detail includes latest snapshot and conditions list | [`services/fphgo/internal/features/explore/repo/queries/explore.sql`](../../services/fphgo/internal/features/explore/repo/queries/explore.sql) `GetSiteBySlug`, `ListUpdatesForSite`; [`apps/web/src/app/explore/page.tsx`](../../apps/web/src/app/explore/page.tsx); [`apps/web/src/app/explore/sites/[slug]/page.tsx`](../../apps/web/src/app/explore/sites/[slug]/page.tsx) | [`services/fphgo/internal/features/explore/http/integration_test.go`](../../services/fphgo/internal/features/explore/http/integration_test.go) | Open a site sheet or `/explore/sites/{slug}` and confirm summary plus recent conditions entries | Pass |
| Conditions Pulse: member write for site updates | [`services/fphgo/internal/features/explore/http/routes.go`](../../services/fphgo/internal/features/explore/http/routes.go), [`services/fphgo/internal/features/explore/http/handlers.go`](../../services/fphgo/internal/features/explore/http/handlers.go), [`services/fphgo/internal/features/explore/service/service.go`](../../services/fphgo/internal/features/explore/service/service.go), query `CreateUpdate` in [`services/fphgo/internal/features/explore/repo/queries/explore.sql`](../../services/fphgo/internal/features/explore/repo/queries/explore.sql) | [`services/fphgo/internal/features/explore/http/integration_test.go`](../../services/fphgo/internal/features/explore/http/integration_test.go) | Signed in, open site sheet, submit the Add update form, confirm success or validation error | Pass |
| Conditions Pulse: create update rate limit | [`services/fphgo/internal/features/explore/service/service.go`](../../services/fphgo/internal/features/explore/service/service.go), [`services/fphgo/docs/rate-limits-v1.md`](../../services/fphgo/docs/rate-limits-v1.md) | [`services/fphgo/internal/features/explore/http/integration_test.go`](../../services/fphgo/internal/features/explore/http/integration_test.go) | Repost updates rapidly and confirm `429` plus `Retry-After` | Pass |
| Conditions Pulse: hidden updates excluded from reads | filter `u.state = 'active'` in [`services/fphgo/internal/features/explore/repo/queries/explore.sql`](../../services/fphgo/internal/features/explore/repo/queries/explore.sql) | [`services/fphgo/internal/features/explore/repo/repo_integration_test.go`](../../services/fphgo/internal/features/explore/repo/repo_integration_test.go) | Hide an update, then reload site detail and `/v1/explore/updates` | Pass |
| Conditions Pulse: report hooks for updates | [`services/fphgo/db/migrations/0017_best_addon_mvp1.sql`](../../services/fphgo/db/migrations/0017_best_addon_mvp1.sql), [`services/fphgo/internal/features/reports/http/dto.go`](../../services/fphgo/internal/features/reports/http/dto.go), [`services/fphgo/internal/features/reports/repo/queries/reports.sql`](../../services/fphgo/internal/features/reports/repo/queries/reports.sql), [`services/fphgo/internal/features/reports/service/service.go`](../../services/fphgo/internal/features/reports/service/service.go) | [`services/fphgo/internal/features/reports/http/integration_test.go`](../../services/fphgo/internal/features/reports/http/integration_test.go) | Create a report with `targetType=dive_site_update` and verify `201` | Pass |
| Safety Profile Card: trust ladder fields returned on explore updates, buddy cards, profile, and messaging | [`services/fphgo/internal/features/explore/http/dto.go`](../../services/fphgo/internal/features/explore/http/dto.go), [`services/fphgo/internal/features/buddyfinder/http/dto.go`](../../services/fphgo/internal/features/buddyfinder/http/dto.go), [`services/fphgo/internal/features/profiles/http/dto.go`](../../services/fphgo/internal/features/profiles/http/dto.go), [`services/fphgo/internal/features/messaging/http/dto.go`](../../services/fphgo/internal/features/messaging/http/dto.go), [`apps/web/src/components/trust-card.tsx`](../../apps/web/src/components/trust-card.tsx) | [`services/fphgo/internal/features/explore/http/integration_test.go`](../../services/fphgo/internal/features/explore/http/integration_test.go), [`services/fphgo/internal/features/profiles/http/integration_test.go`](../../services/fphgo/internal/features/profiles/http/integration_test.go), [`services/fphgo/internal/features/messaging/http/integration_test.go`](../../services/fphgo/internal/features/messaging/http/integration_test.go), [`apps/web/test/best-addon-mvp1-contract.test.mjs`](../../apps/web/test/best-addon-mvp1-contract.test.mjs) | Inspect buddy cards, profile header, and message request/inbox cards for badges and counts | Pass |
| Safety Profile Card: no precise location or exact last-active leak | Trust DTOs in [`services/fphgo/internal/features/buddyfinder/http/dto.go`](../../services/fphgo/internal/features/buddyfinder/http/dto.go), [`services/fphgo/internal/features/profiles/http/dto.go`](../../services/fphgo/internal/features/profiles/http/dto.go), [`services/fphgo/internal/features/messaging/http/dto.go`](../../services/fphgo/internal/features/messaging/http/dto.go) omit exact coordinates and last seen | DTO contract plus build and test inspection | Inspect payload shapes and UI fields. Only coarse `area`, `homeArea`, and aggregate counters appear | Pass |
| One-tap Save Pack: save site endpoints | [`services/fphgo/internal/features/explore/http/routes.go`](../../services/fphgo/internal/features/explore/http/routes.go), [`services/fphgo/internal/features/explore/http/handlers.go`](../../services/fphgo/internal/features/explore/http/handlers.go), queries `SaveSite` and `UnsaveSite` in [`services/fphgo/internal/features/explore/repo/queries/explore.sql`](../../services/fphgo/internal/features/explore/repo/queries/explore.sql) | [`services/fphgo/internal/features/explore/http/integration_test.go`](../../services/fphgo/internal/features/explore/http/integration_test.go) | Signed out, click Save on a site card or site detail and confirm sign-in gate. Signed in, save and unsave | Pass |
| One-tap Save Pack: save user endpoints | [`services/fphgo/internal/features/users/http/routes.go`](../../services/fphgo/internal/features/users/http/routes.go), [`services/fphgo/internal/features/users/http/handlers.go`](../../services/fphgo/internal/features/users/http/handlers.go), queries `SaveUser` and `UnsaveUser` in [`services/fphgo/internal/features/users/repo/queries/users.sql`](../../services/fphgo/internal/features/users/repo/queries/users.sql), migration [`services/fphgo/db/migrations/0017_best_addon_mvp1.sql`](../../services/fphgo/db/migrations/0017_best_addon_mvp1.sql) | [`services/fphgo/internal/features/users/http/routes_test.go`](../../services/fphgo/internal/features/users/http/routes_test.go) | Signed in, save from a buddy card or `/profile?userId=<uuid>` and confirm it appears in Saved hub | Pass |
| One-tap Save Pack: saved hub returns saved sites and saved users | [`services/fphgo/internal/features/profiles/http/routes.go`](../../services/fphgo/internal/features/profiles/http/routes.go), [`services/fphgo/internal/features/profiles/http/handlers.go`](../../services/fphgo/internal/features/profiles/http/handlers.go), [`services/fphgo/internal/features/profiles/service/service.go`](../../services/fphgo/internal/features/profiles/service/service.go), queries `ListSavedSitesForUser` and `ListSavedUsersForUser` in [`services/fphgo/internal/features/profiles/repo/queries/profiles.sql`](../../services/fphgo/internal/features/profiles/repo/queries/profiles.sql), [`apps/web/src/app/saved/page.tsx`](../../apps/web/src/app/saved/page.tsx) | [`services/fphgo/internal/features/profiles/http/integration_test.go`](../../services/fphgo/internal/features/profiles/http/integration_test.go), [`apps/web/test/best-addon-mvp1-contract.test.mjs`](../../apps/web/test/best-addon-mvp1-contract.test.mjs) | Open `/saved` and confirm `Saved Sites` and `Saved Buddies` tabs | Pass |
| One-tap Save Pack: blocks and moderation affect saved visibility | block filter and `account_status = 'active'` in [`services/fphgo/internal/features/profiles/repo/queries/profiles.sql`](../../services/fphgo/internal/features/profiles/repo/queries/profiles.sql); site moderation filter in same file | [`services/fphgo/internal/features/profiles/repo/repo_integration_test.go`](../../services/fphgo/internal/features/profiles/repo/repo_integration_test.go) | Save a blocked user or hidden site in test data, then query saved hub | Pass |
| Share Links: site share page with OG tags and stable route | [`apps/web/src/app/explore/sites/[slug]/page.tsx`](../../apps/web/src/app/explore/sites/[slug]/page.tsx), data from [`services/fphgo/internal/features/explore/http/handlers.go`](../../services/fphgo/internal/features/explore/http/handlers.go) and [`services/fphgo/internal/features/explore/http/routes.go`](../../services/fphgo/internal/features/explore/http/routes.go) | [`apps/web/test/best-addon-mvp1-contract.test.mjs`](../../apps/web/test/best-addon-mvp1-contract.test.mjs), `pnpm -C apps/web build` route output | Open `/explore/sites/{slug}` and inspect generated metadata in `generateMetadata()` | Pass |
| Share Links: redacted buddy share page with OG tags | [`services/fphgo/internal/features/buddyfinder/http/routes.go`](../../services/fphgo/internal/features/buddyfinder/http/routes.go), [`services/fphgo/internal/features/buddyfinder/http/handlers.go`](../../services/fphgo/internal/features/buddyfinder/http/handlers.go), query `GetSharePreviewByID` in [`services/fphgo/internal/features/buddyfinder/repo/queries/buddyfinder.sql`](../../services/fphgo/internal/features/buddyfinder/repo/queries/buddyfinder.sql), [`apps/web/src/app/buddy/[intentId]/page.tsx`](../../apps/web/src/app/buddy/[intentId]/page.tsx) | [`services/fphgo/internal/features/buddyfinder/http/integration_test.go`](../../services/fphgo/internal/features/buddyfinder/http/integration_test.go), [`apps/web/test/best-addon-mvp1-contract.test.mjs`](../../apps/web/test/best-addon-mvp1-contract.test.mjs) | Open `/buddy/{intentId}` and confirm note redaction plus sign-up CTA | Pass |
| Share Links: share buttons copy or use native share | [`apps/web/src/app/explore/page.tsx`](../../apps/web/src/app/explore/page.tsx), [`apps/web/src/app/buddies/page.tsx`](../../apps/web/src/app/buddies/page.tsx) | [`apps/web/test/explore-buddy-site-contract.test.mjs`](../../apps/web/test/explore-buddy-site-contract.test.mjs) | Click Share on site detail and buddy cards | Pass |
| Meet at Checkout: message metadata storage and transport | [`services/fphgo/db/migrations/0017_best_addon_mvp1.sql`](../../services/fphgo/db/migrations/0017_best_addon_mvp1.sql), [`services/fphgo/db/schema/000_schema.sql`](../../services/fphgo/db/schema/000_schema.sql), [`services/fphgo/internal/features/messaging/repo/queries/messaging.sql`](../../services/fphgo/internal/features/messaging/repo/queries/messaging.sql), [`services/fphgo/internal/features/messaging/repo/repo.go`](../../services/fphgo/internal/features/messaging/repo/repo.go) | [`services/fphgo/internal/features/messaging/http/integration_test.go`](../../services/fphgo/internal/features/messaging/http/integration_test.go), [`services/fphgo/internal/features/messaging/service/service_test.go`](../../services/fphgo/internal/features/messaging/service/service_test.go) | Send a conversation message with `metadata.type = "meet_at"` and confirm it round-trips | Pass |
| Meet at Checkout: metadata validation | [`services/fphgo/internal/features/messaging/service/service.go`](../../services/fphgo/internal/features/messaging/service/service.go), [`services/fphgo/internal/features/messaging/http/dto.go`](../../services/fphgo/internal/features/messaging/http/dto.go), [`packages/types/src/index.ts`](../../packages/types/src/index.ts) | [`services/fphgo/internal/features/messaging/service/service_test.go`](../../services/fphgo/internal/features/messaging/service/service_test.go) | Send invalid metadata and confirm `invalid_metadata` | Pass |
| Meet at Checkout: attach spot UI and rendered plan card with site link | [`apps/web/src/app/messages/page.tsx`](../../apps/web/src/app/messages/page.tsx) | [`apps/web/test/best-addon-mvp1-contract.test.mjs`](../../apps/web/test/best-addon-mvp1-contract.test.mjs) | In a conversation, click Attach spot, choose a site, then confirm the rendered Meet at card links to `/explore/sites/{slug}` | Pass |

## Example verified payload shapes

These shapes are backed by DTOs and asserted in focused tests.

### Explore latest updates response

Evidence:

- DTO: [`services/fphgo/internal/features/explore/http/dto.go`](../../services/fphgo/internal/features/explore/http/dto.go)
- Handler coverage: [`services/fphgo/internal/features/explore/http/integration_test.go`](../../services/fphgo/internal/features/explore/http/integration_test.go)

Example shape:

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440401",
      "diveSiteId": "550e8400-e29b-41d4-a716-446655440101",
      "siteSlug": "twin-rocks-anilao",
      "siteName": "Twin Rocks",
      "siteArea": "Mabini, Batangas",
      "authorDisplayName": "Member User",
      "authorTrust": {
        "emailVerified": true,
        "phoneVerified": false,
        "buddyCount": 0,
        "reportCount": 0
      },
      "note": "10m vis and easy surface."
    }
  ]
}
```

### Saved hub response

Evidence:

- DTO: [`services/fphgo/internal/features/profiles/http/dto.go`](../../services/fphgo/internal/features/profiles/http/dto.go)
- Handler coverage: [`services/fphgo/internal/features/profiles/http/integration_test.go`](../../services/fphgo/internal/features/profiles/http/integration_test.go)

Example shape:

```json
{
  "sites": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440021",
      "slug": "twin-rocks-anilao",
      "name": "Twin Rocks"
    }
  ],
  "users": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440022",
      "username": "buddy",
      "displayName": "Buddy User"
    }
  ]
}
```

### Meet-at message metadata

Evidence:

- DTO: [`services/fphgo/internal/features/messaging/http/dto.go`](../../services/fphgo/internal/features/messaging/http/dto.go)
- Roundtrip test: [`services/fphgo/internal/features/messaging/http/integration_test.go`](../../services/fphgo/internal/features/messaging/http/integration_test.go)

Example shape:

```json
{
  "content": "Let us lock the plan",
  "metadata": {
    "type": "meet_at",
    "diveSiteId": "550e8400-e29b-41d4-a716-446655440099",
    "diveSiteSlug": "twin-rocks-anilao",
    "diveSiteName": "Twin Rocks",
    "diveSiteArea": "Mabini, Batangas",
    "timeWindow": "weekend",
    "note": "Early morning window"
  }
}
```

## Runtime smoke evidence

### Signed-out surfaces

- `pnpm -C apps/web build` emitted routes for:
  - `/explore`
  - `/explore/sites/[slug]`
  - `/explore/updates`
  - `/buddy/[intentId]`
- [`services/fphgo/internal/features/explore/http/integration_test.go`](../../services/fphgo/internal/features/explore/http/integration_test.go) verifies:
  - public site list
  - public site detail
  - public buddy preview
  - public latest updates feed

### Signed-in surfaces

- [`services/fphgo/internal/features/explore/http/integration_test.go`](../../services/fphgo/internal/features/explore/http/integration_test.go) verifies update creation validation and rate limit.
- [`services/fphgo/internal/features/profiles/http/integration_test.go`](../../services/fphgo/internal/features/profiles/http/integration_test.go) verifies saved hub access.
- [`services/fphgo/internal/features/messaging/http/integration_test.go`](../../services/fphgo/internal/features/messaging/http/integration_test.go) verifies request flow plus meet-at metadata roundtrip.
- [`services/fphgo/internal/features/reports/http/integration_test.go`](../../services/fphgo/internal/features/reports/http/integration_test.go) verifies `dive_site_update` reporting.

## Docs alignment

Verified updated docs:

- [`services/fphgo/docs/explore-v1.md`](../../services/fphgo/docs/explore-v1.md)
- [`services/fphgo/docs/buddy-finder-v1.md`](../../services/fphgo/docs/buddy-finder-v1.md)
- [`services/fphgo/docs/api-compatibility-matrix.md`](../../services/fphgo/docs/api-compatibility-matrix.md)
- [`services/fphgo/docs/rate-limits-v1.md`](../../services/fphgo/docs/rate-limits-v1.md)

## Final assessment

MVP1 Best Add-on Features are implemented and verified in the repo with passing focused checks across Go API, web, shared contracts, docs, and release-gate surfaces.
