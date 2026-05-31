# Dive Passport Verification Plan

## Global Verification Rules

- Run targeted checks in each changed workspace before broad checks.
- Record exact commands and pass/fail output in phase reports.
- Do not claim repository health from memory.
- If a command cannot run because required local services or environment variables are missing, record the blocker exactly and run the closest static/unit checks available.
- Final verification must include a git diff review proving no unintended modules changed.

## Backend Verification

Go code:

- `cd services/fphgo && go test ./internal/features/dive_passport/...` if a Passport package exists.
- `cd services/fphgo && go test ./internal/features/profiles/...` if profile aggregate paths are touched.
- `cd services/fphgo && go test ./internal/features/media/...` if media read integration is touched.
- `cd services/fphgo && go test ./internal/app/...`
- `pnpm test:go`

Settings schema, only if settings are implemented:

- `cd services/fphgo && go test ./db/...`
- `cd services/fphgo && make sqlc`
- `pnpm sqlc:go`
- `cd services/fphgo && git diff -- db/schema/000_schema.sql`

Required behavioral tests:

- Passport aggregate reads profile summary and available child sections.
- Visibility filtering prevents private child data leakage.
- Missing Dive Map returns stable fallback/empty state.
- Missing Dive Journey returns stable fallback/empty state.
- Missing badges return stable fallback/empty state.
- New user profile returns stable fallback/empty state.
- Missing memories/media return stable fallback/empty state.
- Passport does not create or mutate Dive Map locations.
- Passport does not increase visited-site counts.
- Passport does not create or mutate Journey entries.
- Passport does not create, award, verify, or mutate badges.
- Passport does not verify credentials.
- Passport does not create reverse dependencies into Map, Journey, or Badges.
- Optional settings affect presentation only.

## Shared Type Verification

- `pnpm --filter @freediving.ph/types type-check`
- `pnpm --filter @freediving.ph/types test`

Required evidence:

- API request/response contracts for Passport aggregate compile.
- Optional settings contracts compile if implemented.
- Contract tests cover empty section states and child aggregate shapes.

## Web Verification

- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web test`
- `pnpm --filter @freediving.ph/web lint`

Required evidence:

- Profile Passport UI consumes shared contracts without feature-local cross-boundary DTOs.
- Empty states render for missing map, journey, badges, memories, or media.
- Empty states render for new user profiles.
- UI does not imply formal verification unless source systems already provide verification indicators.
- UI remains responsive and accessible for profile use.

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

- Passport-owned source-of-truth table creation.
- destructive migration requirement.
- ambiguous auth or visibility behavior.
- product ambiguity around settings or featured badge ordering.
- conflict with Dive Map or Dive Journey contracts.
- missing empty-state contract for unavailable child systems.
- repeated same failure after three repair attempts.
- failures in unrelated dirty worktree files that cannot be safely separated from active phase work.
