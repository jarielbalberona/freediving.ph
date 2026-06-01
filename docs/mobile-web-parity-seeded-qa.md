# Mobile-Web Parity Seeded QA

Date: 2026-06-01

## Status

PASS WITH ISSUES. The local iOS Simulator proved several seeded mutation paths and exposed one real Chika bug, which was fixed. Full public-release QA is still blocked by missing role-specific QA identities and disposable records for destructive/payment/report flows.

## Proven In Local Simulator

Environment:

- iPhone 17 Pro Max, iOS 26.4
- Expo dev server `192.168.254.106:8081`
- Local API `localhost:4000`
- Local DB accepted by `services/fphgo/cmd/dev-seed-runtime-smoke`

Evidence:

- `/tmp/fph-seeded-role-qa/messages-send-after.png`
- `/tmp/fph-seeded-role-qa/event-join-after.png`
- `/tmp/fph-seeded-role-qa/group-join-after.png`
- `/tmp/fph-seeded-role-qa/group-post-after.png`
- `/tmp/fph-seeded-role-qa/chika-reply-after-fix.png`
- `/tmp/fph-seeded-role-qa/role-restored-superadmin-final.png`

Passed:

- seeded direct message send
- seeded event join
- seeded group join
- seeded group post
- throwaway Chika thread create
- Chika reply after cache-key fix
- super-admin moderation route render after role restoration

## Bug Fixed

Chika reply creation committed in the backend but could show a false draft/error state in mobile because broad Chika thread-list cache patching also matched detail/comment query caches. The fix targets the concrete default thread-list query key and leaves broad refresh to invalidation.

## Still Required Before Public Release

Create or provide a QA identity pack:

- normal member
- moderator/admin
- super-admin
- event organizer/staff
- school owner/admin/instructor
- instructor applicant
- throwaway target user

Create disposable records:

- media post with comments enabled
- reportable Chika thread/comment
- reportable message thread
- joinable event with payment/check-in fixtures
- manageable school with booking/payment/session fixtures
- instructor application/proof-upload fixture
- moderation reports with safe status transitions

Do not use real community records for these flows.

## Verification

Passed after the Chika fix:

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test` - 69 passed.
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check`.
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint` - 259 files checked.
- `git diff --check`.

## QA Identity Pack Follow-Up

Date: 2026-06-01

Status: BLOCKED for public-release role QA.

The current local stack is safe for disposable database records, but it is not a complete mobile QA identity pack:

- Backend runtime auth is Clerk-backed because `DEV_AUTH=false` and `CLERK_SECRET_KEY=<set>`.
- Mobile uses Clerk Expo auth and sends Clerk bearer tokens.
- `runtime_smoke_*` users are local database fixtures only and cannot sign in to the simulator.
- Existing `smoke_member_*` Clerk-backed database rows do not include usable credentials or sessions in the repo.

Currently usable from the simulator:

| Identity | Role | Mobile usable | Notes |
|---|---:|---|---|
| `jarielbalberona` | `super_admin` | yes | Already signed in during prior smoke; useful for super-admin render and owner-scoped seeded mutations only. |

Database-only seeded identities:

| Identity | Role | Mobile usable |
|---|---:|---|
| `runtime_smoke_event_owner` | `member` | no |
| `runtime_smoke_buddy` | `member` | no |
| `runtime_smoke_messenger` | `member` | no |
| `runtime_smoke_requester` | `member` | no |
| `runtime_smoke_group_owner` | `member` | no |

Required before public release:

- Clerk QA credentials or legitimate mobile sessions for member, moderator/admin, super-admin, event organizer/staff, school owner/admin/instructor, instructor applicant, blocked counterpart, and report target identities.
- Disposable data for media comments/social actions, report/block/unblock, event payment/check-in, school booking/payment/session transitions, instructor proof upload, and moderation status changes.

Alternative: approve a tightly guarded mobile dev-auth QA harness that cannot be enabled in production builds. Without one of these, the remaining iOS Simulator role/mutation matrix is blocked and should not be represented as complete.

## Clerk Test User Role QA Follow-Up

Date: 2026-06-01

Status: PASS WITH ISSUES.

The QA identity blocker was partially removed by creating or confirming Clerk test users with `+clerk_test@clerk.com`, then linking them to deterministic local DB users through the local/dev-only seed command:

```bash
CONFIRM_DEV_SEED_MOBILE_ROLE_QA=1 go run ./cmd/dev-seed-mobile-role-qa
go run ./cmd/dev-seed-mobile-role-qa -inspect
```

Seeded users:

- `fph-member-a+clerk_test@clerk.com`
- `fph-member-b+clerk_test@clerk.com`
- `fph-instructor-applicant+clerk_test@clerk.com`
- `fph-approved-instructor+clerk_test@clerk.com`
- `fph-school-owner+clerk_test@clerk.com`
- `fph-event-organizer+clerk_test@clerk.com`
- `fph-group-owner+clerk_test@clerk.com`
- `fph-moderator+clerk_test@clerk.com`
- `fph-super-admin+clerk_test@clerk.com`
- `fph-target-user+clerk_test@clerk.com`

Disposable `QA Mobile Parity` data now exists for media, Chika, buddy request, message thread, group, event, school/course/session/booking, instructor profiles/certifications, and moderation reports.

Proven in iOS Simulator:

- member A Clerk sign-in;
- member A moderation denial;
- member A media detail render;
- member A media like/save mutations;
- moderator Clerk sign-in;
- moderator queue access;
- moderator report detail open;
- moderator report status transition to `reviewing` with audit note.

Evidence:

- `/tmp/fph-clerk-role-qa/`

Still required:

- simulator sign-in and route/action proof for member B, instructor applicant, approved instructor, school owner, event organizer, group owner, super admin, and target user;
- block/unblock proof;
- buddy lifecycle proof;
- media comment create/delete proof;
- event organizer payment/check-in proof;
- school owner booking/payment/session proof;
- instructor proof-upload/submission proof;
- super-admin-only route proof.
