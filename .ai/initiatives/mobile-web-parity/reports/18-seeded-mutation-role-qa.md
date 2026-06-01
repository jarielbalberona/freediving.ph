# 18 Seeded Mutation And Role QA Report

Final status: PASS WITH ISSUES
Date: 2026-06-01

## Verdict

The seeded mobile mutation pass is good enough for QA-branch readiness, but not public-release final. It proved several real write paths through the iOS Simulator against local throwaway/runtime-smoke data and fixed one real Chika mutation bug. It did not complete a full role matrix or destructive/admin/payment workflow pass.

## Environment

- Simulator: iPhone 17 Pro Max, iOS 26.4.
- Metro/Expo: existing dev server on `192.168.254.106:8081`, Metro on `127.0.0.1:8081`.
- API: local `services/fphgo` on port `4000`.
- DB guard: `services/fphgo/cmd/dev-seed-runtime-smoke` accepted only local development DB target from `services/fphgo/.env`.
- Evidence folder: `/tmp/fph-seeded-role-qa/`.

## Seed Data

Seeded with:

```bash
SMOKE_VIEWER_USERNAME=jarielbalberona CONFIRM_DEV_SEED_RUNTIME_SMOKE=1 go run ./cmd/dev-seed-runtime-smoke
SMOKE_VIEWER_USERNAME=jarielbalberona go run ./cmd/dev-seed-runtime-smoke -inspect
```

The signed-in simulator user was `jarielbalberona`, a local Clerk-backed dev user. Runtime smoke records created or reset:

- `runtime-smoke-joinable-event`
- `runtime-smoke-joinable-group`
- `runtime-smoke-member-group`
- runtime-smoke message threads `30000000-0000-4000-8000-000000000001` and `30000000-0000-4000-8000-000000000002`
- `runtime_smoke_*` fixture users

## Simulator Mutations Proven

- Messaging: sent `Seeded QA message 2026-06-01` to the seeded Runtime Messenger thread. DB confirmed the new `thread_messages` row from `jarielbalberona`.
- Events: joined `runtime-smoke-joinable-event`. DB confirmed `jarielbalberona` as `participant/confirmed`.
- Groups: joined `runtime-smoke-joinable-group`. DB confirmed active member row for `jarielbalberona`.
- Groups: posted `Seeded QA group post 2026-06-01` to `runtime-smoke-joinable-group`. DB confirmed `group_posts` row from `jarielbalberona`.
- Chika: created throwaway local thread `Seeded QA Chika thread 2026-06-01`.
- Chika: posted reply `Seeded QA reply after fix 2026-06-01` after the fix. Simulator rendered the reply immediately and DB confirmed the `chika_comments` row.

## Bug Found And Fixed

- File: `apps/mobile/src/features/chika/hooks/use-chika-mutations.ts`
- Bug: Chika comment/reply mutations committed to the backend, but the mobile success handler used the broad `["chika", "threads"]` query prefix as if every matching cache entry were a thread list. That prefix also matches Chika detail/comment caches. The success callback could throw after a successful backend commit, causing the UI to show `Could not post reply. Saved as draft.` while the comment actually existed.
- Fix: changed Chika comment and thread-reaction optimistic list patching to target the concrete default thread-list key instead of the broad thread prefix. Broad invalidation remains for eventual refresh.
- Runtime proof after fix: clean app relaunch, reopened the throwaway Chika thread, discarded the stale draft, posted `Seeded QA reply after fix 2026-06-01`, and observed `2 replies` plus immediate rendered reply.

## Role Matrix

- Confirmed super-admin route access after restoring `jarielbalberona` to `super_admin`; `freediving-ph-app://moderation` rendered the moderation triage queue.
- Attempted reversible local role flip to `member`, but cold-start route proof was not completed because terminating the Expo dev client returns to the development launcher and requires manually selecting the dev server before deep-link replay. The DB role was restored to `super_admin` and verified.
- Do not claim full role-matrix completion from this pass. Member/staff/organizer/school-owner/moderator denial and allowed-action matrices still need seeded account credentials or a dev-auth mobile runtime harness.

## Deferred Mutation Areas

Not live-mutated in this pass:

- media like/save/comment/delete
- report/block/unblock
- booking/payment/session transitions
- event payment proof review/check-in
- school booking management/payment/session mutations
- instructor application/proof upload
- moderation status changes
- destructive/admin/management actions

Reason: safe seeded fixtures and role-specific signed-in identities were not available for those flows in the simulator session.

## Acceptance Result

PASS WITH ISSUES:

- PASS for seeded messaging, event join, group join/post, Chika create/reply, and the Chika mutation cache repair.
- PASS for super-admin moderation route rendering after role restoration.
- ISSUES for incomplete role-matrix coverage and deferred destructive/payment/report/block/media mutation flows.

## Verification

Passed:

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test`
  - Result: pass, 69 mobile tests.
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check`
  - Result: pass.
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint`
  - Result: pass, Biome checked 259 files.
- `git diff --check`
  - Result: pass.

Skipped:

- Shared type checks were not rerun because this pass did not change shared types.
- Backend tests were not rerun because this pass did not change backend code.

## Manual Smoke Checklist Still Required

- Sign in as separate seeded member, moderator/admin, event organizer, school owner/admin/instructor, instructor applicant, and ordinary target user accounts.
- Run report/block/unblock against throwaway target users and content.
- Run media like/save/comment/delete against throwaway media.
- Run event check-in/payment proof review against seeded event records.
- Run school booking/payment/session transitions against seeded school records.
- Run instructor application/proof upload with a disposable applicant.
- Run moderation status transitions with seeded throwaway reports and audit notes.

## Handoff

The next hardening step is not more blind simulator clicking. Build or provide a proper QA identity pack: credentials/tokens for member, moderator, super-admin, event organizer, school owner/admin/instructor, and applicant roles, plus disposable records for each destructive or payment workflow. Without that, role-matrix QA will remain partial.

## QA Identity Pack Follow-Up

Date: 2026-06-01

Follow-up report: `.ai/initiatives/mobile-web-parity/reports/19-qa-identity-data-pack-and-role-matrix-blocker.md`

The follow-up assessment confirmed the handoff blocker. The existing `runtime_smoke_*` seed users are database fixtures, not mobile sign-in identities. The current running stack is Clerk-authenticated (`DEV_AUTH=false`, `CLERK_SECRET_KEY=<set>`), so the iOS Simulator cannot legitimately switch into seeded role identities without Clerk QA credentials/sessions or an explicitly approved guarded dev-auth mobile QA harness.

## Clerk Test User Role Matrix Follow-Up

Date: 2026-06-01

Follow-up report: `.ai/initiatives/mobile-web-parity/reports/20-clerk-test-user-role-matrix-qa.md`

The missing mobile-usable identity pack was partially resolved with Clerk test users. Report 20 created/confirmed ten `+clerk_test@clerk.com` accounts, mapped them into the local DB, seeded disposable `QA Mobile Parity` records, and proved real simulator sessions for member A and moderator. Full role-matrix QA remains incomplete until the remaining role accounts are simulator-smoked.
