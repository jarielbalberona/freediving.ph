# FPH Go-Live Execution Log

## 2026-03-31 19:39 Asia/Manila — FRO-187

- Status: completed on shared branch, awaiting review/merge
- Branch: `fix/fph-go-live`
- Worktree: `/Volumes/Files/softwareengineering/my-projects/freedivingph-go-live`
- Summary: refreshed the `fphgo` route surface snapshot to include the current media routes and aligned stale feed strategy tests with the live presentation copy.
- Files touched:
  - `services/fphgo/internal/app/testdata/route_surface.snapshot.json`
  - `services/fphgo/internal/features/feed/service/strategy_test.go`
  - `docs/go-live/fph-execution-log.md`
- Verification:
  - `go test ./internal/app ./internal/features/feed/service`
  - `go test ./internal/app ./internal/features/...`
- Commit hash: recorded in Git history for `fix/fph-go-live`
- Blockers: none

## 2026-03-31 19:46 Asia/Manila — FRO-188

- Status: completed on shared branch, awaiting review/merge
- Branch: `fix/fph-go-live`
- Worktree: `/Volumes/Files/softwareengineering/my-projects/freedivingph-go-live`
- Summary: made `/v1/auth/session` the explicit canonical session path in the web client, kept `/v1/me` only as a deprecated alias, and added contract coverage for the alias deprecation headers.
- Files touched:
  - `services/fphgo/internal/features/auth/http/handlers.go`
  - `services/fphgo/internal/app/routes.go`
  - `services/fphgo/internal/app/routes_contract_test.go`
  - `apps/web/src/lib/api/fphgo-routes.ts`
  - `apps/web/src/features/auth/session/use-session.ts`
  - `apps/web/src/app/profile/page.tsx`
  - `apps/web/test/fphgo-ci-smoke.test.mjs`
  - `docs/go-live/fph-execution-log.md`
- Verification:
  - `go test ./internal/app ./internal/features/auth/http`
  - `pnpm --filter @freediving.ph/web type-check`
- Commit hash: recorded in Git history for `fix/fph-go-live`
- Blockers: none
