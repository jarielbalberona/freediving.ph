# User Dive Map Final Report

Final status: passed

## Summary

User Dive Map V1 is implemented as a proof-based profile experience. A site is unlocked only when the target user owns a qualifying media post tagged to `dive_site_id`. V1 marker details show only that user's own qualifying media posts for the selected site.

Dive Memories, tagged-user sharing, shared-memory marker content, tag acceptance/decline, and memory privacy behavior remain explicitly deferred.

## Completed Phases

- Phase 1: Discovery and Contract Alignment
- Phase 2: Backend Schema Read Model Foundation
- Phase 3: Media Post Derivation
- Phase 4: Dive Map Read APIs and Contracts
- Phase 5: Web Profile Dive Map UI
- Phase 6: Map Read Model Hardening
- Phase 7: Profile UI Hardening
- Phase 8: Badge/Journey/Passport Integration Preparation
- Phase 9: Final Verification/Reporting

## Product Invariants Confirmed

- Dive Map remains proof-based.
- A dive site is unlocked only by a qualifying user-owned media post tagged to `dive_site_id`.
- Shared/tagged memories do not unlock locations.
- Shared/tagged memories do not inflate visited-site counts.
- V1 marker contents include only the user's own qualifying media posts.
- Future Dive Memories require a separate locked privacy/tagging specification before memory content can be integrated.
- Future badges, Journey, and Passport consumers must use the documented `user_dive_sites` boundary and must not create competing dive-site truth.

## Implementation Summary

- Added `user_dive_sites` schema and migration.
- Added a `dive_map` sqlc/repository package with proof derivation and read-model helpers.
- Wired media post creation and ready Moment completion to recompute the proof read model.
- Added profile Dive Map read APIs:
  - `GET /v1/profiles/{username}/dive-map`
  - `GET /v1/profiles/{username}/dive-map/{siteID}`
- Added shared TypeScript profile Dive Map contracts and web API/query hooks.
- Added profile Diving tab Dive Map UI with locked/unlocked marker states and selected-site proof media.
- Added contract, integration, and focused hardening tests for proof-only behavior and downstream boundaries.
- Documented integration boundaries in `services/fphgo/internal/features/dive_map/README.md`.

## Verification Results

- `cd services/fphgo && go test ./db/...`: passed.
- `cd services/fphgo && make sqlc`: passed.
- `pnpm sqlc:go`: passed.
- `DB_DSN=postgres://postgres:postgres@localhost:5433/fph?sslmode=disable pnpm migrate:go`: passed to version 84.
- `DB_DSN=postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable pnpm migrate:go`: passed to version 84.
- `cd services/fphgo && go test ./internal/features/media/...`: passed.
- `cd services/fphgo && TEST_DB_DSN=postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable go test ./internal/features/dive_map/...`: passed.
- `cd services/fphgo && go test ./internal/features/profiles/...`: passed.
- `cd services/fphgo && go test ./internal/app/...`: passed.
- `cd services/fphgo && go test ./...`: passed.
- `pnpm --filter @freediving.ph/types type-check`: passed.
- `pnpm --filter @freediving.ph/types test`: passed.
- `pnpm --filter @freediving.ph/web type-check`: passed.
- `pnpm --filter @freediving.ph/web test`: passed.
- `pnpm --filter @freediving.ph/web lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed.
- `pnpm build`: passed.
- `git diff --check`: passed.
- `git diff --stat`: reviewed.

## Reports Written

- `.ai/initiatives/user-dive-map/reports/phase-1-discovery-and-contract-alignment.md`
- `.ai/initiatives/user-dive-map/reports/phase-2-backend-schema-read-model-foundation.md`
- `.ai/initiatives/user-dive-map/reports/phase-3-media-post-derivation.md`
- `.ai/initiatives/user-dive-map/reports/phase-4-dive-map-read-apis-and-contracts.md`
- `.ai/initiatives/user-dive-map/reports/phase-5-web-profile-dive-map-ui.md`
- `.ai/initiatives/user-dive-map/reports/phase-6-map-read-model-hardening.md`
- `.ai/initiatives/user-dive-map/reports/phase-7-profile-ui-hardening.md`
- `.ai/initiatives/user-dive-map/reports/phase-8-badge-journey-passport-integration-preparation.md`
- `.ai/initiatives/user-dive-map/reports/phase-9-final-verification-reporting.md`

## Known Risks

- Future profile media edit/delete or retag flows must call the recompute boundary for affected old/new user-site pairs.
- `user_dive_sites.first_post_id` and `last_post_id` use `ON DELETE RESTRICT`; any future hard-delete lifecycle must recompute/remove read-model rows first.
- Profile Dive Map visibility currently follows existing profile diving visibility semantics; different map-specific privacy would require a separate locked decision.
- The V1 web surface is a profile Dive Map section/list, not a full geographic map canvas.
- Dive Memories/tagged-user sharing remain blocked pending a separate locked specification.

## Follow-Up Recommendation

Create a separate locked `dive-memories` initiative before any memory content appears in map markers or downstream profile experience modules. That initiative must define memory ownership, tagged-user access, acceptance/decline, blocking, visibility, and authorization rules.
