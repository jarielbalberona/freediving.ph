# Profile Experience Integration Verification Plan

## Global Verification Rules

- Run targeted checks in each changed workspace before broad checks.
- Record exact commands and pass/fail output in phase reports.
- Do not claim repository health from memory.
- If a command cannot run because required local services or environment variables are missing, record the blocker exactly and run the closest static/unit checks available.
- Final verification must include a git diff review proving no unintended modules changed.

## Backend Verification

Targeted Go checks:

- `cd services/fphgo && go test ./internal/features/profiles/...`
- `cd services/fphgo && go test ./internal/features/dive_map/...` if a Dive Map package exists.
- `cd services/fphgo && go test ./internal/features/dive_journey/...` if a Journey package exists.
- `cd services/fphgo && go test ./internal/features/dive_passport/...` if a Passport package exists.
- `cd services/fphgo && go test ./internal/app/...`
- `pnpm test:go`

Required backend behavioral tests:

- Dive Sites Visited auto stat aligns with `user_dive_sites`.
- Map-based future badges source from `user_dive_sites`, not memories.
- Shared/tagged memories do not unlock map locations.
- Shared/tagged memories do not inflate visited-site counts.
- Journey entries do not create or mutate `user_dive_sites`.
- Journey entries do not award, verify, revoke, or mutate badges.
- Passport does not mutate badges, map, journey, profile source data, media, memories, or stats.
- Visibility filtering works across Passport, Journey, Map, and Badges.
- Badge `source_type`/`source_id` supports `dive_map` origins.

## Shared Type Verification

- `pnpm --filter @freediving.ph/types type-check`
- `pnpm --filter @freediving.ph/types test`

Required evidence:

- Badge, profile, map, journey, and passport contracts compile together.
- Contract tests cover source ownership fields, visibility fields, aggregate/empty states, and badge source identifiers.

## Web Verification

- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web test`
- `pnpm --filter @freediving.ph/web lint`

Required evidence:

- Public profile composition renders badges, map, journey, and passport coherently.
- Owner vs public viewer controls and visibility are consistent.
- Empty states for missing/empty modules are stable.
- Passport summary does not contradict standalone module sections.

## Route Snapshot Verification

When backend routes change:

- `cd services/fphgo && go test ./internal/app/...`

Required evidence:

- Route snapshot tests are updated intentionally.
- New or changed routes follow existing auth and middleware patterns.

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

- conflicting locked initiative specs.
- ambiguous source-of-truth ownership.
- privacy or visibility ambiguity.
- destructive migration risk.
- Passport duplicating module source data.
- Journey acting as source of truth.
- Badge auto stats counting memories or shared/tagged content.
- repeated same failure after three repair attempts.
