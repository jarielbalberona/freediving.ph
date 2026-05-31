# Phase 4: Dive Map Read APIs And Shared Contracts

Final status: passed

## Summary

Exposed server-owned profile Dive Map read APIs and shared TypeScript contracts.

Marker list reads are sourced from `user_dive_sites`. Marker detail first verifies the target user has an unlocked, visible `user_dive_sites` row for the requested dive site, then returns only the target user's own qualifying media items for that site. Dive Memories, shared/tagged content, comments, likes, feed items, and manual inputs are not part of the response.

## Routes Added

- `GET /v1/profiles/{username}/dive-map`
- `GET /v1/profiles/{username}/dive-map/{siteID}`

Both routes follow the existing public profile route convention. Visibility matches existing profile diving reads: `public` is anonymous-visible, `members` requires a signed-in viewer, and `private` is self-only.

## Shared Contracts Added

- `ProfileDiveMapMarker`
- `ProfileDiveMapProofMedia`
- `ProfileDiveMapResponse`
- `ProfileDiveMapSiteResponse`

Contracts are exported through `@freediving.ph/types` via the existing `profile-view` export surface.

## Files Changed

- `.ai/initiatives/user-dive-map/phases/phase-4-dive-map-read-apis-and-contracts.md`
- `.ai/initiatives/user-dive-map/reports/phase-4-dive-map-read-apis-and-contracts.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- `packages/types/src/api/profile-view.ts`
- `packages/types/test/profile-contracts.test.ts`
- `services/fphgo/internal/app/routes_contract_test.go`
- `services/fphgo/internal/app/testdata/route_surface.snapshot.json`
- `services/fphgo/internal/features/profiles/http/dto.go`
- `services/fphgo/internal/features/profiles/http/handlers.go`
- `services/fphgo/internal/features/profiles/http/integration_test.go`
- `services/fphgo/internal/features/profiles/http/routes.go`
- `services/fphgo/internal/features/profiles/repo/badges_contract_test.go`
- `services/fphgo/internal/features/profiles/repo/repo.go`
- `services/fphgo/internal/features/profiles/service/badges_test.go`
- `services/fphgo/internal/features/profiles/service/service.go`

## Verification Commands And Results

- `pnpm --filter @freediving.ph/types type-check`: passed.
- `pnpm --filter @freediving.ph/types test`: passed, 34 tests.
- `cd services/fphgo && go test ./internal/features/profiles/...`: passed.
- `cd services/fphgo && TEST_DB_DSN=postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable go test ./internal/features/dive_map/...`: passed.
- `cd services/fphgo && UPDATE_SNAPSHOTS=1 go test ./internal/app/ -run TestRouteSurfaceSnapshot`: passed and updated route snapshot.
- `cd services/fphgo && go test ./internal/app/...`: passed.
- `git diff --check`: passed.

## Repairs Attempted

- Added the new Dive Map service methods to existing test fakes.
- Updated the route surface snapshot for the intentional two-route addition.
- Updated an obsolete profile badge contract test to assert `user_dive_sites` source-of-truth ownership without forbidding marker-detail media joins.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

`.ai/state/decisions.md` was not updated because no new durable product decision was made.

## Risks And Limitations

- Profile Dive Map APIs are available, but web UI rendering is still pending Phase 5.
- The profile repository still contains a transitional media-post fallback for visited-site counts if `user_dive_sites` is absent. In the current migrated schema, `user_dive_sites` exists and is used.
- Marker details expose media proof only; future Dive Memories integration remains blocked on a separate locked privacy/tagging specification.

## Next Phase Readiness

Ready for Phase 5: Web Profile Dive Map UI.
