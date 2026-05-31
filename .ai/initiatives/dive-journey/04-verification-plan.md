# Dive Journey Verification Plan

## Global Verification Rules

- Run targeted checks in each changed workspace before broad checks.
- Record exact commands and pass/fail output in phase reports.
- Do not claim repository health from memory.
- If a command cannot run because required local services or environment variables are missing, record the blocker exactly and run the closest static/unit checks available.
- Final verification must include a git diff review proving no unintended modules changed.

## Backend Verification

Migration and schema:

- `cd services/fphgo && go test ./db/...`
- `cd services/fphgo && make sqlc`
- `pnpm sqlc:go`
- `cd services/fphgo && git diff -- db/schema/000_schema.sql`

Go code:

- `cd services/fphgo && go test ./internal/features/dive_journey/...` if a Journey package exists.
- `cd services/fphgo && go test ./internal/features/profiles/...` if profile read paths are touched.
- `cd services/fphgo && go test ./internal/features/media/...` if media attachments are touched.
- `cd services/fphgo && go test ./internal/app/...`
- `pnpm test:go`

Required behavioral tests:

- Manual Journey entries can be created without `dive_site_id`.
- Manual Journey entries can be created without media.
- Users can update/delete or hide their own manual entries according to product rules.
- Users cannot edit another user's entries.
- Generated entries can be idempotent by `source_type` and `source_id` where appropriate.
- Generated entries can be regenerated safely without duplicates.
- Journey entries do not unlock Dive Map locations.
- Journey entries do not increase visited-site counts.
- Journey entries do not award badges.
- Journey entries do not verify credentials.
- Shared/tagged memories do not unlock Dive Map locations through Journey.
- Shared/tagged memories do not increase visited-site counts through Journey.
- Private/followers/public visibility is enforced where applicable.
- If `followers` visibility is unavailable, execution records the hard stop or product-approved fallback.
- Tagged users do not gain ownership or proof status from tags.

## Shared Type Verification

- `pnpm --filter @freediving.ph/types type-check`
- `pnpm --filter @freediving.ph/types test`

Required evidence:

- API request/response contracts for Journey list/detail/manual writes compile.
- Contract tests cover Journey entry shape, visibility, source references, media attachments, and tagged users when those contracts are added.

## Web Verification

- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web test`
- `pnpm --filter @freediving.ph/web lint`

Required evidence:

- Profile Journey UI consumes shared contracts without feature-local cross-boundary DTOs.
- Empty state handles users with zero Journey entries.
- Manual entry forms support entries without dive site or media.
- UI does not imply Journey entries verify badges, credentials, or site visits.
- Hide/delete states are visible and understandable where implemented.

## Route Snapshot Verification

When backend routes change:

- `cd services/fphgo && go test ./internal/app/...`

Required evidence:

- Route snapshot tests are updated intentionally.
- New routes follow existing auth and middleware patterns.

## Final Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `git diff --stat`
- `git diff --check`

If full repo checks are too expensive or blocked by unrelated existing failures, record the exact failure and include targeted passing evidence for all changed modules.

## Hard Stop Verification Failures

Stop instead of repairing when verification reveals:

- destructive migration requirement
- ambiguous auth, ownership, or visibility behavior
- missing follower system without product-approved fallback
- product ambiguity around followers visibility or generated-entry editing
- conflict with the locked `user-dive-map` proof model
- repeated same failure after three repair attempts
- failures in unrelated dirty worktree files that cannot be safely separated from active phase work
