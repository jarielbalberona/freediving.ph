# 21 Final Public Release Role Mutation QA Report

Final status: PASS
Date: 2026-06-01

## Verdict

The remaining public-release QA gaps from reports 18-20 are closed for the local Clerk-backed QA environment.

This pass proved all ten Clerk test identities, account-by-account simulator sessions for the remaining roles, local Clerk-to-DB mappings, full backend role allow/deny behavior with real Clerk session JWTs, and disposable mutation flows across media, Chika, buddies, messaging, events, schools, instructor application, reports, blocks, and moderation.

This is not production-data proof and does not claim App Store/device-file-picker coverage. It is the local public-release gate for the completed mobile parity implementation.

## Safe Environment

Confirmed before mutation:

- Backend: `APP_ENV=development`, `DEV_AUTH=false`, `PORT=4000`.
- Backend DB: local Postgres on `localhost:5433`, database `fph`.
- Clerk backend key: test mode, `sk_test`.
- Mobile Clerk key: test mode, `pk_test`.
- Active mobile API base: `http://192.168.254.106:4000`.
- Simulator: iPhone 17 Pro Max, iOS 26.4.
- Metro/Expo: existing local session.

The unused production-looking `EXPO_PUBLIC_API_BASE_URL1=https://api.freediving.ph` was not the active API base. No production/community data was mutated.

## Clerk Test Users Proven

All ten Clerk test users were confirmed by `go run ./cmd/dev-seed-mobile-role-qa -inspect`, mobile simulator settings screenshots, and real Clerk JWT API calls:

| Role key | Email | Local role |
|---|---|---|
| member A | `fph-member-a+clerk_test@clerk.com` | `member` |
| member B | `fph-member-b+clerk_test@clerk.com` | `member` |
| instructor applicant | `fph-instructor-applicant+clerk_test@clerk.com` | `member` |
| approved instructor | `fph-approved-instructor+clerk_test@clerk.com` | `member` |
| school owner | `fph-school-owner+clerk_test@clerk.com` | `member` |
| event organizer | `fph-event-organizer+clerk_test@clerk.com` | `member` |
| group owner | `fph-group-owner+clerk_test@clerk.com` | `member` |
| moderator | `fph-moderator+clerk_test@clerk.com` | `moderator` |
| super admin | `fph-super-admin+clerk_test@clerk.com` | `super_admin` |
| target user | `fph-target-user+clerk_test@clerk.com` | `member` |

## iOS Simulator Evidence

Evidence folder:

```text
/tmp/fph-clerk-role-qa/
```

Fresh screenshots captured in this final pass:

- `instructor-applicant-settings.png`
- `instructor-applicant-application.png`
- `approved-instructor-settings.png`
- `approved-instructor-public.png`
- `school-owner-settings.png`
- `school-owner-management.png`
- `event-organizer-settings.png`
- `event-organizer-management.png`
- `group-owner-settings.png`
- `group-owner-group-detail.png`
- `super-admin-settings.png`
- `super-admin-moderation.png`
- `target-user-settings.png`
- `target-user-moderation-denied.png`

Previously captured in the same evidence folder and retained as part of the full matrix:

- member A auth, settings, media detail, media like/save, and moderation denial.
- member B auth, settings, message thread, message send, moderation denial, and media detail/comment sheet render.
- moderator auth, moderation queue, and report review route.

## Role Matrix Result

Passed:

- Guest public school access allowed.
- Guest report mutation denied.
- Member A/B moderation denied.
- Instructor applicant moderation denied.
- Approved instructor moderation denied.
- School owner management allowed for owned seeded school.
- School owner booking/payment/session management allowed for owned seeded records.
- School owner unauthorized booking approval denied for ordinary member.
- Event organizer event management allowed for owned seeded event.
- Event organizer payment review, participant attendance, and pass check-in allowed for owned seeded records.
- Group owner group detail route rendered against seeded owned group.
- Moderator moderation access allowed.
- Super admin moderation access allowed.
- Target user moderation denied.

The API matrix used real Clerk backend session tokens, not fake mobile auth, dev-auth header spoofing, or direct DB role flipping.

## Mutation Flows Proven

Passed through the Clerk JWT API runner:

- `/v1/me/profile` identity proof for all ten users.
- Media comment create, like, and delete.
- Block target, blocked target buddy-request denial, unblock, and block list cleanup.
- Buddy seeded accept, list, remove, send/cancel, send/decline.
- Event interest set/remove.
- Event pass read.
- Event organizer payment verification.
- Event organizer attendance marking.
- Event organizer pass check-in.
- Member booking list.
- Member booking create/cancel.
- School owner booking approve, schedule, complete.
- School owner booking payment verification.
- School owner session completion.
- Instructor applicant proof URL, certification proof update, and application submit.
- Approved instructor public profile read.
- Super-admin report detail read and disposable report rejection.

Final API run:

```text
CONFIRM_DEV_SEED_MOBILE_ROLE_QA=1 go run ./cmd/dev-seed-mobile-role-qa >/tmp/fph-clerk-role-qa/reseed-final-api.log
node /tmp/fph-clerk-role-qa/api-role-mutation-runner.cjs
{
  "ok": true,
  "count": 60,
  "output": "/tmp/fph-clerk-role-qa/api-role-mutation-results.json"
}
```

Final DB state proof:

```text
users               | 10
event_participation | attended/checked=true
event_payment       | verified
course_booking      | completed
course_payment      | verified
course_session      | completed
applicant_profile   | pending
user_blocks         | 0
reports_rejected    | 1
```

## Bugs Found And Fixed

Fixed backend buddy relationship check:

- File: `services/fphgo/internal/features/buddies/repo/queries/buddies.sql`
- File: `services/fphgo/internal/features/buddies/repo/sqlc/buddies.sql.go`
- File: `services/fphgo/internal/features/buddies/repo/repo.go`
- Problem: accepting/removing a buddy, then sending a fresh request could hit `buddy_check_failed` because PostgreSQL could not infer the types for `LEAST($1, $2)` / `GREATEST($1, $2)`.
- Fix: cast both params to `uuid` in SQL and update the wrapper to use the generated `Column1`/`Column2` param names.

Fixed mobile school management transition mismatch:

- File: `apps/mobile/src/features/schools/api/school-management-api.ts`
- File: `apps/mobile/src/features/schools/hooks/use-school-management.ts`
- File: `apps/mobile/src/features/schools/screens/school-management-screen.tsx`
- Problem: the mobile management UI exposed `Complete` for an approved booking even though the backend canonical transition is `approved -> scheduled -> completed`.
- Fix: added the `schedule` action and showed `Complete` only for scheduled bookings.

Fixed seed data incompleteness:

- File: `services/fphgo/cmd/dev-seed-mobile-role-qa/main.go`
- Problem: event/school payment review and instructor proof flows needed explicit disposable payment methods and proof media.
- Fix: seeded deterministic event payment method, school payment method, and instructor certification proof media records.

## Bugs Found And Not Fixed

None.

Non-blocking limits:

- This pass used local/dev Clerk test accounts and local DB fixtures only.
- Native binary file picker/device upload UX was not exercised on physical hardware.
- Production/staging data and destructive real-community actions were intentionally not touched.

## Verification Commands

Passed:

```bash
go run ./cmd/dev-seed-mobile-role-qa -inspect
CONFIRM_DEV_SEED_MOBILE_ROLE_QA=1 go run ./cmd/dev-seed-mobile-role-qa
node /tmp/fph-clerk-role-qa/api-role-mutation-runner.cjs
go test ./cmd/dev-seed-mobile-role-qa ./internal/features/buddies/...
go test ./...
/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test
/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check
/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint
```

Passed after documentation updates:

```bash
git diff --check
```

Shared type checks were not rerun because no shared TypeScript contracts changed.

## Remaining Public-Release Blockers

None for the local mobile-web parity release gate.

Production release still needs the normal non-parity release process: staging/prod config review, store/device QA as applicable, and any business approval for intentionally web-owned destructive/admin surfaces.

## Later Profile Tabs Parity Correction

Date: 2026-06-01

Report 22 was completed after this role/mutation QA report. It does not change the role/mutation evidence above, but it corrects a profile UI parity gap: mobile now exposes the same icon-only profile tab order as web and renders real Dive Map, Dive Journey, and Dive Passport tab content from existing shared/backend contracts.

Report: `.ai/initiatives/mobile-web-parity/reports/22-profile-tabs-parity-correction.md`.

## Recommendation

Public-release ready for the completed mobile-web parity scope, subject to the normal release process above.
