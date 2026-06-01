# 20 Clerk Test User Role Matrix QA Report

Final status: PASS WITH ISSUES, superseded by report 21
Date: 2026-06-01

## Verdict

The previous identity blocker is partially resolved. Clerk test users were created in the test Clerk instance, mapped to local DB users, assigned roles, and seeded with disposable `QA Mobile Parity` records. Real iOS Simulator proof now exists for member and moderator Clerk-backed sessions.

This is still not public-release final. The full role matrix was not completed account-by-account for every role, and several mutation-heavy flows remain manual.

Superseded note: `.ai/initiatives/mobile-web-parity/reports/21-final-public-release-role-mutation-qa.md` completed the remaining account-by-account simulator proof and Clerk JWT mutation matrix. Keep this report as historical evidence for the identity-pack setup and initial blocker removal.

## Safe Environment

Confirmed before user creation and mutation:

- Backend env: `APP_ENV=development`, `PORT=4000`, `DEV_AUTH=false`.
- Backend DB: local Postgres `host=localhost`, `port=5433`, `db=fph`.
- Clerk backend key prefix: `sk_test`.
- Mobile Clerk key prefix: `pk_test`.
- Mobile API base: `http://192.168.254.106:4000`.
- Existing production-looking alternate mobile value `EXPO_PUBLIC_API_BASE_URL1=https://api.freediving.ph` was not used as the active API base.

No production/community data was mutated.

## Clerk Test Users

Created or confirmed in Clerk test mode:

| Role key | Email | Clerk ID | Local DB user ID | Role |
|---|---|---|---|---|
| member A | `fph-member-a+clerk_test@clerk.com` | `user_3EWwQle6qFfVfbMh8eX0ZPL1I7m` | `41000000-0000-4000-8000-000000000001` | `member` |
| member B | `fph-member-b+clerk_test@clerk.com` | `user_3EWwVTAQcEicjBQceAoneaDYnl2` | `41000000-0000-4000-8000-000000000002` | `member` |
| instructor applicant | `fph-instructor-applicant+clerk_test@clerk.com` | `user_3EWwVX5fsG5MoFKM2O1ZXmnisNu` | `41000000-0000-4000-8000-000000000003` | `member` |
| approved instructor | `fph-approved-instructor+clerk_test@clerk.com` | `user_3EWwVeEfJPDGKSeHrI6yo43KHkf` | `41000000-0000-4000-8000-000000000004` | `member` |
| school owner | `fph-school-owner+clerk_test@clerk.com` | `user_3EWwVogtp1aorsnlAEH0CfY6r3d` | `41000000-0000-4000-8000-000000000005` | `member` |
| event organizer | `fph-event-organizer+clerk_test@clerk.com` | `user_3EWwW15dZdKeraBE3Dg1sCGPGgw` | `41000000-0000-4000-8000-000000000006` | `member` |
| group owner | `fph-group-owner+clerk_test@clerk.com` | `user_3EWwW4ISqnDtSzTAb13JUt6B18R` | `41000000-0000-4000-8000-000000000007` | `member` |
| moderator | `fph-moderator+clerk_test@clerk.com` | `user_3EWwW8CbuYoPPCMcyAEHiK3A3vY` | `41000000-0000-4000-8000-000000000008` | `moderator` |
| super admin | `fph-super-admin+clerk_test@clerk.com` | `user_3EWwWEsOwsLBtvQZDetJuOwsGH2` | `41000000-0000-4000-8000-000000000009` | `super_admin` |
| target user | `fph-target-user+clerk_test@clerk.com` | `user_3EWwWOIWYqisrjVkcIR0lhBEHmS` | `41000000-0000-4000-8000-000000000010` | `member` |

Password used for test users: `fphclerk_test`.

## Local Seed Tooling Added

Added a local/dev-only seed command:

```bash
CONFIRM_DEV_SEED_MOBILE_ROLE_QA=1 go run ./cmd/dev-seed-mobile-role-qa
go run ./cmd/dev-seed-mobile-role-qa -inspect
```

Guardrails:

- loads only local `.env`;
- refuses `APP_ENV=production`/`prod`;
- refuses non-local DB hosts;
- refuses production-looking DB names and remote DB markers;
- requires `CONFIRM_DEV_SEED_MOBILE_ROLE_QA=1` for mutations;
- reads Clerk test user IDs from `/tmp/fph-clerk-test-users.json`;
- writes deterministic local QA IDs and `QA Mobile Parity` labels.

## Disposable QA Records

Seeded or updated:

- media post owned by member A;
- media comment from member B;
- Chika thread and reply;
- pending buddy request from member A to member B;
- direct message thread between member A and member B;
- group owned by group owner with member A membership and group post;
- event owned by event organizer with member A participation and submitted payment proof record;
- school owned by school owner with approved instructor membership;
- course, session, booking, and submitted booking payment proof;
- instructor applicant profile and pending certification;
- approved instructor profile and verified certification;
- five moderation reports targeting user, message, Chika thread, Chika comment, and dive-site update disposable records.

Seed result:

```text
count.buddy_requests=1
count.chika_threads=1
count.course_booking_requests=1
count.events=1
count.groups=1
count.instructor_profiles=2
count.media_posts=1
count.message_threads=1
count.reports=5
count.schools=1
```

## iOS Simulator Evidence

Simulator:

- iPhone 17 Pro Max
- iOS 26.4
- Expo/Metro existing session
- local API through `192.168.254.106:4000`

Evidence folder:

```text
/tmp/fph-clerk-role-qa/
```

Screenshots:

- `member-a-home.png`
- `member-a-moderation-denied.png`
- `member-a-media-detail.png`
- `member-a-media-like-save.png`
- `member-a-media-comment-attempt.png`
- `member-a-settings.png`
- `moderator-moderation-queue.png`
- `moderator-report-reviewing.png`

## Simulator Flows Proven

Member A:

- signed into the iOS Simulator using Clerk test email/password;
- profile/settings showed `fph-member-a+clerk_test@clerk.com`;
- moderation route opened as denied/unavailable for member;
- seeded media detail opened;
- media like mutation succeeded;
- media save mutation succeeded.

Database proof:

```text
media_like=1
media_save=1
```

Moderator:

- signed into the iOS Simulator using Clerk test email/password;
- moderation queue opened with seeded disposable reports;
- report detail opened for the disposable Chika comment report;
- audit note entered;
- status transition to `reviewing` succeeded.

Database proof:

```text
report_status=reviewing
report_event_note=QA Mobile Parity moderator review
```

## Simulator Flows Attempted But Not Completed

- Media comment creation from member A was attempted in the comment sheet. The UI accepted text, but the CUA click on the post button was unreliable; database proof showed no created comment. This is recorded as incomplete QA, not an app bug.
- Full account-by-account simulator pass for member B, instructor applicant, approved instructor, school owner, event organizer, group owner, super admin, and target user was not completed in this run.

## Bugs Found And Fixed

No application runtime bug was found.

Added seed/tooling only:

- `services/fphgo/cmd/dev-seed-mobile-role-qa/main.go`

## Bugs Found And Not Fixed

No confirmed app bug remains from this pass.

Remaining gaps are QA coverage gaps:

- full role allow/deny matrix across all Clerk test accounts;
- media comment create/delete proof;
- block/unblock proof;
- buddy request accept/decline/cancel/remove proof;
- event join/leave/payment/check-in proof using the event organizer account;
- school booking/payment/session review proof using the school owner account;
- instructor applicant submission/proof upload proof;
- super-admin-only route proof.

## Verification

Passed:

- `go test ./cmd/dev-seed-mobile-role-qa`
- `go test ./...`
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test`
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check`
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint`

Pending after documentation updates:

- `git diff --check`

Skipped:

- shared type checks/tests because no shared types were changed.

## Risk Classification

- resolved: mobile-usable Clerk test identities now exist for the role QA pack.
- resolved: local DB mappings for all ten Clerk test identities are proven.
- resolved: local disposable records now exist for the major remaining role/mutation surfaces.
- active: full public-release role matrix is not complete until every role account is simulator-smoked.
- active: mutation-heavy flows remain incomplete for block/unblock, buddy lifecycle, booking/payment/session, event organizer review/check-in, instructor proof upload, media comment create/delete, and super-admin-only access.
- accepted: this pass used Clerk test accounts and local DB fixtures only.

## Recommendation

QA branch remains ready. Public release is still not ready.
