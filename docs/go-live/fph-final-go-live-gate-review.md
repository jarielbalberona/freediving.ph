# Freediving Philippines Final Go-Live Gate Review

Date/time of review: 2026-05-19 13:52 PST (UTC+08:00)

Environment reviewed:
- Repo checkout: `/Volumes/Files/softwareengineering/my-projects/freediving.ph`
- Current branch: `main` at `9a8ddb9` / `origin/main`
- Merged go-live PR: `#4` (`fix/fph-go-live` -> `main`), merged 2026-03-31
- Target web URL from `render.yaml`: `https://freediving-ph-app.onrender.com`
- Target API URL from `render.yaml`: `https://freediving-ph-api.onrender.com`
- Media/CDN URL from config/docs: `https://cdn.freediving.ph`

## Gate A - Product Experience

Result: Conditional Pass

Evidence:
- Current design/copy review in `docs/go-live/fph-design-copy-verification.md` marks the public core launch paths as `Ready with fixes`.
- The reviewed core public paths were Home, Explore, site detail, Buddies, Groups, Events, Chika, main/mobile navigation, create menu, closed non-launch areas, report dialog, and major empty/loading/error states.
- Remaining high-priority product issues are explicitly signed-in/secondary surface quality, not public-path collapse: Messages empty states, Notifications dashboard-like treatment, Saved older styling, and generic `Failed to...` fallback copy.

Remaining UX/copy issues:
- Messages still has cold empty states: `No conversations yet.`, `No messages yet.`, `Select a conversation.`
- Notifications still feels like an internal dashboard with `Total`, `Unread`, `Read`, and `Archived`.
- Saved still uses older hard-coded styling and generic empty states.
- Some mutation fallback copy still uses system-ish `Failed to...` wording.
- These are launch polish issues if target-env proof passes. They are not the current launch blocker.

## Gate B - Code & Ticket Integrity

Result: Fail

Evidence:
- GitHub PR `#4` exists and was merged, not open. There is no current open PR to review.
- `main` includes the go-live merge (`fbb9d34`) plus later docs commits (`d093133`, `9a8ddb9`).
- Current checkout has a large dirty working tree across web code, tests, config examples, Docker config, and go-live docs.
- `pnpm --filter @freediving.ph/web type-check` passed during this review.
- `pnpm --filter @freediving.ph/web test` failed: `apps/web/test/explore-buddy-site-contract.test.mjs` expects `Area fallback`, while the current page copy says `Near this area`.
- `go test ./internal/app ./internal/features/...` failed: `TestRouteSurfaceSnapshot` reports snapshot has 93 routes and current router has 95.
- The accessible Linear project `FPH Go Live` exists, but no issues are attached to it. Searches for `FRO-191`, `FRO-213`, `FRO-192`, and related go-live ticket titles returned no accessible issues.

Mismatches found:
- Older PR body says processed tickets were aligned in Linear, but the currently accessible Linear truth does not show those tickets.
- The execution log and PR body speak in `FRO-*` identifiers, while the accessible Linear workspace/team is `FD` and does not expose the referenced `FRO-*` issues.
- Current local test state is not green, so the branch cannot be called merge-ready or review-clean.

Corrections applied:
- Created Linear blocker `FD-1104` in the accessible FPH Go Live project for the failed final gate/environment proof.
- Posted an `offTrack` Linear project status update for `FPH Go Live`.

Still needed:
- Attach or recreate the missing go-live ticket accounting in Linear.
- Fix or intentionally update the Explore buddy contract test.
- Reconcile the Go route snapshot intentionally, then rerun backend route tests.
- Clean, stage, and review the dirty working tree through a real PR before making any new merge-readiness claim.

## Gate C - Deployment / Environment

Result: Fail

Evidence:
- `GET https://freediving-ph-app.onrender.com/` -> `404 Not Found`
- `GET https://freediving-ph-app.onrender.com/explore` -> `404 Not Found`
- `GET https://freediving-ph-app.onrender.com/chika` -> `404 Not Found`
- `GET https://freediving-ph-app.onrender.com/sign-in` -> `404 Not Found`
- `GET https://freediving-ph-api.onrender.com/healthz` -> `404 Not Found`
- `GET https://freediving-ph-api.onrender.com/readyz` -> `404 Not Found`
- `GET https://freediving-ph-api.onrender.com/v1/explore/sites` -> `404 Not Found`
- `GET https://freediving-ph-api.onrender.com/v1/chika/categories` -> `404 Not Found`
- Response headers for web/API include `x-render-routing: no-server`.

Remaining issues:
- Target web app is not serving.
- Target API is not serving.
- Health, readiness, Explore, Chika, and auth entry routes cannot be proven.
- This is a launch-blocking environment failure.

## Gate D - Target-Environment Smoke

Result: Fail

| Smoke item | Status | Evidence |
| --- | --- | --- |
| Clerk sign-in | Blocked | `https://freediving-ph-app.onrender.com/sign-in` returns `404 Not Found`; no deployed auth entry point is available. |
| Media upload/readback | Blocked | Target web/API are unavailable; no authenticated session or deployed media API can be exercised. |
| Two-account messaging | Blocked | Target web/API are unavailable; no real two-account flow can be run. |
| Explore live path | Failed | `https://freediving-ph-api.onrender.com/v1/explore/sites` returns `404 Not Found`; `https://freediving-ph-app.onrender.com/explore` returns `404 Not Found`. |
| Basic public browse path | Failed | `/`, `/explore`, and `/chika` on target web return `404 Not Found`. |

Remaining issues:
- No critical smoke path is proven in the real target environment.
- Blocked smoke cannot be converted into pass from source code.
- Explore and public browsing are direct failures, not merely untested.

## Gate E - Launch Risk

Result: Fail

Must fix before launch:
- Restore target web/API availability at the configured Render URLs or update the documented target URLs to the actual serving environment.
- Prove Clerk sign-in on the deployed web app.
- Prove media upload and readback against the deployed API, R2 bucket, and CDN path.
- Prove two-account messaging, including message request accept/decline if message requests remain in launch scope.
- Prove Explore live API data and basic public browse paths on the deployed target.
- Fix current local verification failures before any new review/merge claim.
- Reconcile Linear ticket accounting so blockers and completed work are visible in the actual tracker reviewers can inspect.

Can launch with mitigation:
- Messages, Saved, and Notifications polish only after the environment and smoke gates are green.
- Generic `Failed to...` fallback copy only if it is not dominant in core launch paths.

Can wait:
- Competitive Records and other non-launch routes, as long as they stay hidden from launch navigation and direct visits remain honest.
- Broader UI cohesion cleanup for signed-in secondary pages.
- Advanced moderation and observability beyond MVP launch basics.

## Final Decision

Not ready

Blunt decision:
- Code review readiness: No. There is no open review PR, the checkout is dirty, and current tests are not green.
- Merge readiness: No. There is nothing clean to merge right now, and current verification has failures.
- Deployment readiness: No. The target environment is not available; Render returns `x-render-routing: no-server`.
- Go-live readiness: No. The live environment fails routing-level checks and launch-critical smoke is either failed or blocked.

This product may be directionally close in source code and public UX, but launch readiness is not a vibe. The target app and API are not serving. Clerk, media, messaging, and Explore are not proven in the real environment. Calling this ready would be false.

## Explicit Blocking Items

1. Target web URL returns `404 Not Found`.
2. Target API URL returns `404 Not Found`.
3. Render response includes `x-render-routing: no-server`.
4. Clerk sign-in is blocked by unavailable web auth route.
5. Media upload/readback is unproven and blocked by unavailable app/API.
6. Two-account messaging is unproven and blocked by unavailable app/API.
7. Explore live path fails in target environment.
8. Basic public browse path fails in target environment.
9. Current web tests fail on Explore buddy contract copy drift.
10. Current Go route snapshot test fails due route count drift.
11. Linear ticket truth is not reviewable from the accessible `FPH Go Live` project.

## Exact Next Actions

1. Restore or recreate the Render web service for `https://freediving-ph-app.onrender.com`.
2. Restore or recreate the Render API service for `https://freediving-ph-api.onrender.com`.
3. Confirm `/healthz`, `/readyz`, `/v1/explore/sites`, `/`, `/explore`, `/chika`, and `/sign-in` return expected app/API responses.
4. Fix or intentionally update `apps/web/test/explore-buddy-site-contract.test.mjs` so the test and current product copy agree.
5. Reconcile the `services/fphgo/internal/app/testdata/route_surface.snapshot.json` route drift after verifying the two added routes are intentional.
6. Rerun:
   - `pnpm --filter @freediving.ph/web type-check`
   - `pnpm --filter @freediving.ph/web test`
   - `go test ./internal/app ./internal/features/...`
7. Rebuild Linear truth in the accessible `FPH Go Live` project: processed ticket list, blocked runtime/storage proof, target-environment availability, and final smoke gate.
8. Open a new PR for the current dirty working tree, or clean it down to only intentional reviewable changes.
9. Run the target-environment smoke checklist from `docs/go-live/fph-launch-smoke-checklist.md`.
10. Do not say `ready to launch`, `go live approved`, or `ready to deploy` until Gates C and D pass with real target-environment evidence.
