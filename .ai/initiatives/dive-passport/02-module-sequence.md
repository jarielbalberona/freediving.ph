# Dive Passport Module Sequence

## Dependency Order

1. Discovery and dependency alignment.
2. Passport aggregate contract design.
3. Backend aggregate read API.
4. Optional Passport settings schema/API.
5. Shared TypeScript contracts.
6. Web Passport profile UI.
7. Empty-state and visibility hardening.
8. Integration with Badges/Dive Map/Journey.
9. Final polish and accessibility.
10. Final verification/reporting.

## Phase 1: Discovery And Dependency Alignment

Goal: inspect current profile, badges, Dive Map, Dive Journey, media, memory, auth, visibility, route, shared type, and web profile patterns before changing code.

Primary modules:

- `.ai/initiatives/user-dive-map`
- `.ai/initiatives/dive-journey`
- `services/fphgo/internal/features/profiles`
- `services/fphgo/internal/features/media`
- badge-related backend and shared type modules discovered in Phase 1
- Dive Map / Journey backend modules if already implemented
- `services/fphgo/internal/app/routes.go`
- `packages/types/src`
- `apps/web/src/features/profile`

## Phase 2: Passport Aggregate Contract Design

Goal: design the aggregate shape and section fallback behavior before backend implementation.

Primary modules:

- Initiative docs/report output for the contract decision.
- Existing shared type conventions in `packages/types/src`.
- Existing profile/badge/map/journey DTOs discovered in Phase 1.

## Phase 3: Backend Aggregate Read API

Goal: implement the read-only Passport aggregate API with visibility filtering and source-system fallbacks.

Primary modules:

- New or selected backend Passport aggregate service.
- `services/fphgo/internal/features/profiles` if profile owns public aggregate reads.
- `services/fphgo/internal/app/routes.go`.
- Route tests and snapshots.

## Phase 4: Optional Passport Settings Schema/API

Goal: implement presentation-only settings only if Phase 1 and Phase 2 confirm product behavior is clear and low risk.

Primary modules:

- `services/fphgo/db/migrations`
- `services/fphgo/db/schema/000_schema.sql`
- `services/fphgo/sqlc.yaml`
- Passport settings repository/service/handler tests.

## Phase 5: Shared TypeScript Contracts

Goal: expose stable Passport aggregate and optional settings API contracts.

Primary modules:

- `packages/types/src/api`
- `packages/types/src/index.ts`
- `packages/types/test`

## Phase 6: Web Passport Profile UI

Goal: add a profile Passport section/page/tab using shared contracts.

Primary modules:

- `apps/web/src/features/profile`
- Existing profile routes under `apps/web/src/app/profile/[username]` and `apps/web/src/app/[username]` as applicable.
- Existing API client and hook patterns.

## Phase 7: Empty-State And Visibility Hardening

Goal: prove Passport handles missing or private child systems without leaking private data or implying unavailable source data exists.

Primary modules:

- Passport backend service/handler tests.
- Shared contract tests.
- Web tests for empty/private states.

## Phase 8: Integration With Badges/Dive Map/Journey

Goal: wire available source systems into the aggregate read path while preserving read-only boundaries.

Primary modules:

- Passport aggregate service.
- Existing Profile Badges read surfaces.
- Existing Dive Map read surfaces if implemented.
- Existing Dive Journey read surfaces if implemented.

## Phase 9: Final Polish And Accessibility

Goal: polish the web Passport presentation for responsive, accessible profile use without adding new product scope.

Primary modules:

- `apps/web/src/features/profile`
- Shared UI components where existing conventions make them reusable.
- Web accessibility-oriented tests or static checks where available.

## Phase 10: Final Verification/Reporting

Goal: run final targeted and repo-level verification, write reports, and update state accurately when execution actually happens.

Primary modules:

- `.ai/initiatives/dive-passport/reports`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- Git diff review.
