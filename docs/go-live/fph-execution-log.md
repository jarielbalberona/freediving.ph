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

## 2026-03-31 19:49 Asia/Manila — FRO-190

- Status: pushed on shared branch, in review
- Branch: `fix/fph-go-live`
- Worktree: `/Volumes/Files/softwareengineering/my-projects/freedivingph-go-live`
- Summary: removed the fake profile tabs so launch scope only exposes the real profile media grid.
- Files touched:
  - `apps/web/src/features/profile/components/ProfileTabs.tsx`
  - `docs/go-live/fph-execution-log.md`
- Verification:
  - `pnpm --filter @freediving.ph/web type-check`
- Commit hash: `cf904a2`
- Pushed: yes, on `origin/fix/fph-go-live`
- Blockers: none

## 2026-03-31 20:00 Asia/Manila — FRO-194

- Status: pushed on shared branch, in review
- Branch: `fix/fph-go-live`
- Worktree: `/Volumes/Files/softwareengineering/my-projects/freedivingph-go-live`
- Summary: aligned Explore site links and share URLs to a dedicated slug helper so the route layer no longer implicitly treats `id` as the public slug contract.
- Files touched:
  - `apps/web/src/features/explore/types.ts`
  - `apps/web/src/features/explore/mock-data.ts`
  - `apps/web/src/features/explore/components/ExploreLayout.tsx`
  - `docs/go-live/fph-execution-log.md`
- Verification:
  - `pnpm --filter @freediving.ph/web type-check`
- Commit hash: `495dc1e`
- Pushed: yes, on `origin/fix/fph-go-live`
- Blockers: none

## 2026-03-31 20:22 Asia/Manila — FRO-193

- Status: completed on shared branch, awaiting review/merge
- Branch: `fix/fph-go-live`
- Worktree: `/Volumes/Files/softwareengineering/my-projects/freedivingph-go-live`
- Summary: cut the main `/explore` experience over to the real `fphgo` site list contract, removed mock-only rating/tag/review UI from the live path, switched save state to the real backend save endpoints, and added cursor-based loading for the results list.
- Files touched:
  - `apps/web/src/features/explore/api/exploreApi.ts`
  - `apps/web/src/features/explore/components/DiveSpotCard.tsx`
  - `apps/web/src/features/explore/components/ExploreLayout.tsx`
  - `apps/web/src/features/explore/components/ExploreMap.tsx`
  - `apps/web/src/features/explore/components/ExploreResultsPanel.tsx`
  - `apps/web/src/features/explore/mock-data.ts`
  - `apps/web/src/features/explore/types.ts`
  - `docs/go-live/fph-execution-log.md`
- Verification:
  - `pnpm --filter @freediving.ph/web type-check`
  - `rg -n "MOCK_EXPLORE_SPOTS|getMockDiveSpotBySlug" apps/web/src/features/explore/api/exploreApi.ts apps/web/src/features/explore/components/ExploreLayout.tsx 'apps/web/src/app/explore/sites/[slug]/page.tsx' apps/web/src/features/explore/mock-data.ts`
- Commit hash: recorded in Git history for `fix/fph-go-live`
- Pushed: yes, on `origin/fix/fph-go-live`
- Blockers: none

## 2026-03-31 21:15 Asia/Manila — FRO-192

- Status: pushed on shared branch, in review
- Branch: `fix/fph-go-live`
- Worktree: `/Volumes/Files/softwareengineering/my-projects/freedivingph-go-live`
- Summary: added real recipient-side request controls to the thread messaging flow, exposed request-action metadata in thread detail, blocked reply UI until a request is accepted, and wired accept/decline endpoints to the live thread category model instead of the legacy conversation request model.
- Files touched:
  - `services/fphgo/internal/features/messaging/repo/repo.go`
  - `services/fphgo/internal/features/messaging/service/service.go`
  - `services/fphgo/internal/features/messaging/service/service_test.go`
  - `services/fphgo/internal/features/messaging/http/dto.go`
  - `services/fphgo/internal/features/messaging/http/routes.go`
  - `services/fphgo/internal/features/messaging/http/handlers.go`
  - `services/fphgo/internal/features/messaging/http/integration_test.go`
  - `apps/web/src/lib/api/fphgo-routes.ts`
  - `packages/types/src/index.ts`
  - `apps/web/src/features/messages/api/messages.ts`
  - `apps/web/src/features/messages/hooks/mutations.ts`
  - `apps/web/src/features/messages/components/MessagingView.tsx`
  - `docs/go-live/fph-execution-log.md`
- Verification:
  - `go test ./internal/features/messaging/http ./internal/features/messaging/service`
  - `pnpm --filter @freediving.ph/web type-check` still fails in this shared worktree because `apps/web/node_modules` resolves `@freediving.ph/types` back to `/Volumes/Files/softwareengineering/my-projects/freediving.ph/packages/types/src/index.ts` instead of the worktree copy
  - `pnpm exec tsc -p /tmp/fro192-web-tsconfig.json --noEmit` resolves the worktree types correctly; remaining failures are unrelated pre-existing Explore Google Maps typings in `src/app/explore/submit/*` and `src/features/explore/components/ExploreMap.tsx`
- Commit hash: `04ac4fd`
- Pushed: yes, on `origin/fix/fph-go-live`
- Blockers:
  - shared worktree `apps/web/node_modules` symlink leaks to the original repo, so stock web type-check is not branch-isolated

## 2026-03-31 21:28 Asia/Manila — FRO-195

- Status: pushed on shared branch, in review
- Branch: `fix/fph-go-live`
- Worktree: `/Volumes/Files/softwareengineering/my-projects/freedivingph-go-live`
- Summary: narrowed restricted group membership to truthful launch scope by removing approval-queue promises from the web UI, limiting group creation to open or invite-only join policies, and replacing fake request-access states with explicit invite-required messaging.
- Files touched:
  - `apps/web/src/app/groups/page.tsx`
  - `apps/web/src/app/groups/[id]/page.tsx`
  - `docs/go-live/fph-execution-log.md`
- Verification:
  - `pnpm exec tsc -p /tmp/fro195-groups-tsconfig.json --noEmit`
- Commit hash: `aa2b85e`
- Pushed: yes, on `origin/fix/fph-go-live`
- Blockers:
  - none for this narrowed launch-scope fix

## 2026-03-31 21:43 Asia/Manila — FRO-196

- Status: pushed on shared branch, in review
- Branch: `fix/fph-go-live`
- Worktree: `/Volumes/Files/softwareengineering/my-projects/freedivingph-go-live`
- Summary: verified that Chika pseudonymous identity protection is already covered by backend integration tests and exposed the existing report flow in the thread and comment UI so launch now has a basic member report path without changing the privacy model.
- Files touched:
  - `apps/web/src/features/chika/components/ThreadDetail.tsx`
  - `apps/web/src/app/chika/[id]/page.tsx`
  - `docs/go-live/fph-execution-log.md`
- Verification:
  - `pnpm exec tsc -p /tmp/fro196-chika-tsconfig.json --noEmit`
  - reviewed `services/fphgo/internal/features/chika/http/integration_blocks_test.go` to confirm member-vs-moderator real-author behavior and hidden-content behavior are already covered in backend tests
- Commit hash: `42bd429`
- Pushed: yes, on `origin/fix/fph-go-live`
- Blockers:
  - none for this launch-scope fix

## 2026-03-31 22:05 Asia/Manila — FRO-197

- Status: verified on shared branch, no code change required
- Branch: `fix/fph-go-live`
- Worktree: `/Volumes/Files/softwareengineering/my-projects/freedivingph-go-live`
- Summary: confirmed the feed strategy contract and homepage framing are already stable on the current branch. The backend feed strategy test now passes, and the homepage feed components compile cleanly against the current shared types without needing a new patch.
- Files touched:
  - `docs/go-live/fph-execution-log.md`
- Verification:
  - `go test ./internal/features/feed/service`
  - `pnpm exec tsc -p /tmp/fro197-homefeed-tsconfig.json --noEmit`
- Commit hash: none
- Pushed: n/a
- Blockers:
  - none

## 2026-03-31 23:10 Asia/Manila — FRO-199

- Status: pushed on shared branch, in review
- Branch: `fix/fph-go-live`
- Worktree: `/Volumes/Files/softwareengineering/my-projects/freedivingph-go-live`
- Summary: enforced production media readiness at startup by rejecting incomplete R2/CDN/signing env configuration during config load, and by refusing to boot production if R2 client initialization still fails. This removes the previous launch lie where the API could start successfully and only break when users attempted uploads or URL minting.
- Files touched:
  - `services/fphgo/internal/config/config.go`
  - `services/fphgo/internal/config/config_test.go`
  - `services/fphgo/internal/app/app.go`
  - `services/fphgo/README.md`
  - `docs/go-live/fph-execution-log.md`
- Verification:
  - `go test ./internal/config`
  - `go test ./internal/app -run TestNope`
  - `go test ./internal/app ./internal/config` still hits the pre-existing `TestRouteSurfaceSnapshot` mismatch in `internal/app`; this ticket did not touch routes
- Commit hash: `1f78e55`
- Pushed: yes, on `origin/fix/fph-go-live`
- Blockers:
  - none for this startup hardening change

## 2026-03-31 23:20 Asia/Manila — FRO-200

- Status: pushed on shared branch, in review
- Branch: `fix/fph-go-live`
- Worktree: `/Volumes/Files/softwareengineering/my-projects/freedivingph-go-live`
- Summary: removed `comingSoon` routes from launch-visible navigation so unfinished surfaces are no longer advertised in the sidebar, “more” drawer, or deprecated link exports. The pages may still exist in the repo, but launch navigation no longer pretends they are part of the public product.
- Files touched:
  - `apps/web/src/config/nav.ts`
  - `docs/go-live/fph-execution-log.md`
- Verification:
  - `pnpm exec tsc -p /tmp/fro200-nav-tsconfig.json --noEmit`
- Commit hash: `e93d88f`
- Pushed: yes, on `origin/fix/fph-go-live`
- Blockers:
  - none

## 2026-03-31 23:35 Asia/Manila — FRO-198

- Status: pushed on shared branch, in review
- Branch: `fix/fph-go-live`
- Worktree: `/Volumes/Files/softwareengineering/my-projects/freedivingph-go-live`
- Summary: added a repo-backed launch smoke checklist that separates what is already automated from what still requires real deploy-time/manual verification. The checklist is grounded in the current route surface and explicitly calls out that dev-auth smoke is not enough to prove production Clerk or media behavior.
- Files touched:
  - `docs/go-live/fph-launch-smoke-checklist.md`
  - `docs/go-live/fph-execution-log.md`
- Verification:
  - `rg -n "Automated Smoke Already In Repo|Manual Launch Smoke|Navigation Truth|Known Limits Of This Checklist" docs/go-live/fph-launch-smoke-checklist.md`
  - reviewed `apps/web/test/fphgo-ci-smoke.test.mjs`, `services/fphgo/internal/app/routes.go`, and feature route files to ground checklist steps in current repo truth
- Commit hash: `1dcc40d`
- Pushed: yes, on `origin/fix/fph-go-live`
- Blockers:
  - real production smoke execution still depends on deploy-time Clerk and media environment; this ticket documents the path and gates instead of faking runtime evidence

## 2026-04-01 03:35 Asia/Manila — FRO-212

- Status: pushed on shared branch, in review
- Branch: `fix/fph-go-live`
- Worktree: `/Volumes/Files/softwareengineering/my-projects/freedivingph-go-live`
- Summary: reconciled the stale execution log with actual git commits, push state, and Linear review state for the completed go-live tickets. This is bookkeeping-only and does not change product behavior.
- Files touched:
  - `docs/go-live/fph-execution-log.md`
- Verification:
  - `git log --oneline --decorate --graph a7d11d6..HEAD`
  - `git diff -- docs/go-live/fph-execution-log.md`
  - verified `FRO-192`, `FRO-195`, `FRO-196`, `FRO-199`, `FRO-200`, and `FRO-198` against Linear `In Review` state and branch truth
- Commit hash: pending
- Pushed: pending
- Blockers:
  - none
