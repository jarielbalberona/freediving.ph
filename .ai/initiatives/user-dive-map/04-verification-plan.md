# User Dive Map Verification Plan

## Global Verification Rules

- Run targeted checks in each changed workspace before broad checks.
- Record exact commands and pass/fail output in phase reports.
- Do not claim repository health from memory.
- If a command cannot run because required local services or environment variables are missing, record the blocker exactly and run the closest static/unit checks available.
- Final verification must include a git diff review proving no unintended modules changed.

## Backend Verification

Migration and schema:

- `cd services/fphgo && go test ./db/...`
- `pnpm sqlc:go`
- `cd services/fphgo && make sqlc`
- `cd services/fphgo && git diff -- db/schema/000_schema.sql`

Go code:

- `cd services/fphgo && go test ./internal/features/media/...`
- `cd services/fphgo && go test ./internal/features/profiles/...`
- `cd services/fphgo && go test ./internal/features/explore/...`
- `cd services/fphgo && go test ./internal/features/dive_map/...` if a new Dive Map package exists.
- `cd services/fphgo && go test ./internal/features/dive_memories/...` if a Dive Memories package exists.
- `cd services/fphgo && go test ./internal/app/...`
- `pnpm test:go`

Required behavioral tests:

- Qualifying user-owned media post tagged to `dive_site_id` creates or updates `user_dive_sites`.
- Removing or untagging the last qualifying proof media post removes or recomputes the user's unlocked marker.
- Multiple qualifying posts update first/last post fields and `media_post_count`.
- Shared/tagged memories do not unlock a dive site.
- Shared/tagged memories do not increase visited-site count.
- Shared/tagged memories appear in marker contents only when the tagged user already has `user_dive_sites` for that dive site.
- Unauthorized viewers cannot read private marker contents or private memories.

## Shared Type Verification

- `pnpm --filter @freediving.ph/types type-check`
- `pnpm --filter @freediving.ph/types test`

Required evidence:

- API request/response contracts for Dive Map and Dive Memories compile.
- Contract tests cover marker summary, marker detail, and memory/tagging shapes if those contracts are added.

## Web Verification

- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web test`
- `pnpm --filter @freediving.ph/web lint`

Add route or component tests where existing local conventions support them.

Required evidence:

- Profile Dive Map UI consumes shared contracts without local API contract types.
- Locked shared memories do not appear as unlocked map markers.
- Unlocked marker detail can show own proof posts, own memories, and allowed shared/tagged memories.
- Empty state handles users with zero unlocked dive sites without implying manual visit counts.

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
- ambiguous auth or ownership behavior
- product ambiguity around qualifying proof or V1 memory scope
- repeated same failure after three repair attempts
- failures in unrelated dirty worktree files that cannot be safely separated from active phase work
