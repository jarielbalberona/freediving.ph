# Dive Journey Module Sequence

## Dependency Order

1. Discovery and contract alignment.
2. Backend schema foundation.
3. Journey read/write APIs and authorization.
4. Media and tagging support.
5. Shared TypeScript contracts.
6. Web profile Journey UI.
7. Generated-entry integration preparation.
8. Visibility/hide/delete hardening.
9. Passport integration preparation only.
10. Final verification/reporting.

## Phase 1: Discovery And Contract Alignment

Goal: inspect existing profile, media, auth, visibility, follower, route, sqlc, shared type, and web profile patterns before changing code.

Primary modules:

- `services/fphgo/db/schema/000_schema.sql`
- `services/fphgo/db/migrations`
- `services/fphgo/internal/features/profiles`
- `services/fphgo/internal/features/media`
- `services/fphgo/internal/features/buddies` or follower-related modules if present
- `services/fphgo/internal/app/routes.go`
- `packages/types/src`
- `apps/web/src/features/profile`
- `apps/web/src/features/media`
- `.ai/initiatives/user-dive-map`

## Phase 2: Backend Schema Foundation

Goal: add non-destructive persistence for Journey entries, media attachments, and tagged users where V1 scope allows.

Primary modules:

- Goose migration in `services/fphgo/db/migrations`.
- Generated schema snapshot in `services/fphgo/db/schema/000_schema.sql`.
- Migration/schema drift tests under `services/fphgo/db`.
- sqlc package configuration for the selected Journey backend boundary.

## Phase 3: Journey Read/Write APIs And Authorization

Goal: implement backend APIs and services for profile Journey reads and authenticated manual entry management.

Primary modules:

- New or selected Journey backend feature package.
- `services/fphgo/internal/app/routes.go`.
- Route tests and snapshots.
- Auth/validation helpers already used by the service.

## Phase 4: Media And Tagging Support

Goal: add optional media attachment and tagged-user support if Phase 1 confirms the dependencies are safe for V1.

Primary modules:

- Journey backend service/repository.
- Existing media feature boundaries.
- Existing user/buddy lookup or tagging conventions if present.

## Phase 5: Shared TypeScript Contracts

Goal: expose stable shared Journey API contracts for backend and web.

Primary modules:

- `packages/types/src/api`
- `packages/types/src/index.ts`
- `packages/types/test`

## Phase 6: Web Profile Journey UI

Goal: add a profile Journey section and manual-entry flows using shared contracts.

Primary modules:

- `apps/web/src/features/profile`
- Existing profile routes under `apps/web/src/app/profile/[username]` and `apps/web/src/app/[username]` as applicable.
- Existing API client and hook patterns.

## Phase 7: Generated-Entry Integration Preparation

Goal: prepare idempotent generated-entry integration points for Dive Map, Badges, events/courses, and media milestones without implementing those upstream systems.

Primary modules:

- Journey service/repository generation helpers.
- Tests for `source_type`/`source_id` idempotency.
- Minimal docs where existing conventions support them.

## Phase 8: Visibility/Hide/Delete Hardening

Goal: prove private/followers/public visibility and hide/delete semantics for manual and generated entries.

Primary modules:

- Journey service tests.
- Journey handler tests.
- Shared type tests for visibility states.
- Web tests for visible/hidden/empty states where applicable.

## Phase 9: Passport Integration Preparation Only

Goal: prepare a read-only future integration path for Dive Passport display without implementing Passport.

Primary modules:

- Journey read service/repository methods.
- Minimal documentation or naming that makes the future Passport consumer boundary clear.

## Phase 10: Final Verification/Reporting

Goal: run final targeted and repo-level verification, write reports, and update state accurately when execution actually happens.

Primary modules:

- `.ai/initiatives/dive-journey/reports`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- Git diff review.
