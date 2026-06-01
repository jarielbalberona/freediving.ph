# 19 QA Identity Data Pack And Role Matrix Blocker Report

Final status: SUPERSEDED BY PASS WITH ISSUES
Date: 2026-06-01

## Verdict

The remaining mutation-heavy role QA is blocked. The local database seed path is safe and usable for disposable records, but the running mobile stack is Clerk-authenticated and does not provide usable mobile login sessions for the seeded role identities.

Do not pretend this is complete by flipping one signed-in user's database role. That would test a role mutation artifact, not the product's real multi-user auth, privacy, block, notification, and relationship behavior.

## Environment Guard

Confirmed safe local/development target:

- `services/fphgo/.env`: `APP_ENV=development`, `PORT=4000`, `DEV_AUTH=false`, `CLERK_SECRET_KEY=<set>`, `DB_DSN=<set>`.
- `apps/mobile/.env`: `EXPO_PUBLIC_API_BASE_URL=http://192.168.254.106:4000`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=<set>`.
- Existing production-like alternate mobile value `EXPO_PUBLIC_API_BASE_URL1=https://api.freediving.ph` was not the active API base URL.
- `services/fphgo/cmd/dev-seed-runtime-smoke` refused production-looking targets by design and accepted the current local database only.

No production/community data was mutated in this pass.

## Commands Run

```bash
python3 - <<'PY'
from pathlib import Path
for p in [Path('services/fphgo/.env'), Path('apps/mobile/.env')]:
    print(p)
    if not p.exists():
        print('  <missing>')
        continue
    for line in p.read_text(errors='ignore').splitlines():
        if '=' not in line or line.strip().startswith('#'):
            continue
        k,v=line.split('=',1)
        key=k.strip()
        val=v.strip()
        secret_markers=['SECRET','KEY','TOKEN','DSN','DATABASE','PASSWORD','CLERK']
        if any(s in key.upper() for s in secret_markers) and val:
            show='<set>'
        else:
            show=val or '<empty>'
        if key in {'APP_ENV','PORT','DEV_AUTH','EXPO_PUBLIC_API_BASE_URL','EXPO_PUBLIC_API_BASE_URL1','CLERK_SECRET_KEY','DB_DSN','DATABASE_URL','EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY'}:
            print(f'  {key}={show}')
PY
```

Result: local API and mobile environment confirmed; secrets were masked.

```bash
SMOKE_VIEWER_USERNAME=jarielbalberona go run ./cmd/dev-seed-runtime-smoke -inspect
```

Result:

```text
Runtime smoke local DB target accepted.
viewer=997d831b-f28c-4b64-8c06-6477329df394 username=jarielbalberona displayName="Jariel Balberona"
count.buddy_intents=4
count.event_interests=0
count.event_participations=5
count.events=4
count.group_memberships=6
count.group_posts=2
count.groups=2
count.message_thread_members=4
count.message_threads=2
count.profiles=14
count.thread_messages=4
count.users=23
```

```bash
set -a; source .env; set +a; psql "$DB_DSN" -Atc "SELECT username || '|' || auth_provider || '|' || coalesce(global_role::text,'') || '|' || account_status FROM users WHERE username = 'jarielbalberona' OR username LIKE 'runtime_smoke_%' OR username LIKE 'smoke_member_%' ORDER BY username;"
```

Result:

```text
jarielbalberona|clerk|super_admin|active
runtime_smoke_buddy|runtime_smoke|member|active
runtime_smoke_event_owner|runtime_smoke|member|active
runtime_smoke_group_owner|runtime_smoke|member|active
runtime_smoke_messenger|runtime_smoke|member|active
runtime_smoke_requester|runtime_smoke|member|active
smoke_member_1780254146|clerk|member|active
smoke_member_1780254321|clerk|member|active
smoke_member_1780254494|clerk|member|active
```

## Existing Seed And Auth Conventions

- Backend production-grade auth is Clerk bearer JWT.
- Mobile uses Clerk Expo auth and sends Clerk tokens through the shared mobile fetch path.
- Backend `DEV_AUTH` exists, but `AttachClerkAuth` only uses the `X-User-ID` dev-auth path when `DEV_AUTH=true` and `CLERK_SECRET_KEY` is empty.
- Current local backend has `DEV_AUTH=false` and `CLERK_SECRET_KEY=<set>`, so mobile runtime auth is Clerk-backed.
- The runtime seed command creates local database fixtures and `runtime_smoke_*` users, but those users are not mobile-sign-in identities.

## Available QA Identity Pack

Usable in current iOS Simulator:

| Identity | Source | Role | Mobile sign-in usable | Notes |
|---|---|---:|---|---|
| `jarielbalberona` | Clerk-backed local user | `super_admin` | yes, already signed in during previous smoke | Good for super-admin route render and owner-scoped mutations where the account owns seeded data. Not a substitute for member/moderator/organizer/school-owner/applicant matrices. |

Database-only fixtures:

| Identity | Source | Role | Mobile sign-in usable | Notes |
|---|---|---:|---|---|
| `runtime_smoke_event_owner` | `runtime_smoke` | `member` | no | Seed fixture for event ownership/data relationships only. |
| `runtime_smoke_buddy` | `runtime_smoke` | `member` | no | Seed fixture for Buddy Finder intent/data relationships only. |
| `runtime_smoke_messenger` | `runtime_smoke` | `member` | no | Seed fixture for messaging thread data only. |
| `runtime_smoke_requester` | `runtime_smoke` | `member` | no | Seed fixture for message request/thread data only. |
| `runtime_smoke_group_owner` | `runtime_smoke` | `member` | no | Seed fixture for group ownership/data relationships only. |

Local Clerk-backed DB rows without usable credentials in repo:

| Identity | Source | Role | Mobile sign-in usable | Notes |
|---|---|---:|---|---|
| `smoke_member_1780254146` | Clerk-backed DB row | `member` | unknown/no credentials available | Cannot be used from simulator unless the matching Clerk account credentials/session are provided. |
| `smoke_member_1780254321` | Clerk-backed DB row | `member` | unknown/no credentials available | Cannot be used from simulator unless the matching Clerk account credentials/session are provided. |
| `smoke_member_1780254494` | Clerk-backed DB row | `member` | unknown/no credentials available | Cannot be used from simulator unless the matching Clerk account credentials/session are provided. |

## Disposable Records Available

Already seeded or confirmed from pass 18:

- `runtime-smoke-joinable-event`
- `runtime-smoke-joinable-group`
- `runtime-smoke-member-group`
- runtime-smoke message threads:
  - `30000000-0000-4000-8000-000000000001`
  - `30000000-0000-4000-8000-000000000002`
- runtime-smoke Buddy Finder intent data
- throwaway Chika thread/reply records from the previous simulator mutation pass

These records are useful, but they do not solve role-auth coverage because most actors are not sign-in identities in the running mobile app.

## Missing QA Identity Pack

Required before public-release role QA:

- normal member A
- normal member B or throwaway target user
- moderator/admin
- super-admin separate from the developer account
- event organizer/staff
- school owner
- school admin
- school instructor
- instructor applicant
- blocked-user counterpart
- report target counterpart

Each identity needs a real mobile sign-in path for the current auth mode:

- Clerk test account credentials, or
- disposable Clerk session tokens that the mobile QA runner can use legitimately, or
- an explicitly approved, tightly guarded mobile dev-auth QA harness that cannot be enabled in production builds.

## Missing Disposable Data Pack

Still needed for full mutation QA:

- media post with comments enabled, safe like/save/comment/delete target, and owner/non-owner actors
- reportable Chika thread/comment and reportable media/profile/message targets
- block/unblock pair with private profile and messaging visibility checks
- event payment proof, payment review, participant approval/rejection, pass, and check-in fixtures
- school course/session/booking/payment proof fixtures with owner/admin/instructor/member actors
- instructor application and proof-upload fixture for a disposable applicant
- moderation reports with safe status transitions and audit-note expectations
- Explore submission/edit/report target fixtures if those mutations are in release scope

## iOS Simulator Role QA Result

No additional role-matrix simulator mutations were run in this pass.

Reason: there is no honest mobile way to switch into the required seeded identities under the current Clerk-backed runtime. The seeded `runtime_smoke_*` users are database actors only. The `smoke_member_*` Clerk-backed database rows do not provide credentials or usable mobile sessions in the repo.

## Bugs Found And Fixed

None in this pass. No application source code was changed.

## Bugs Found And Not Fixed

No new runtime bug was found because the remaining simulator role QA could not be executed. The blocker is setup/auth data, not a confirmed app defect.

## Verification

Passed:

- `SMOKE_VIEWER_USERNAME=jarielbalberona go run ./cmd/dev-seed-runtime-smoke -inspect`
- local user/role fixture SQL inspection through the local `DB_DSN`

Skipped:

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test`
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check`
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint`
- shared type checks/tests
- backend tests

Reason: this pass did not change application, shared type, or backend source code. It stopped at an auth/identity-pack blocker before runtime mutations or repairs.

Required final check:

- `git diff --check`

## Risk Classification

- active: Full role-matrix QA remains blocked until mobile-usable QA identities exist.
- active: Destructive/payment/report/block/media mutation QA remains blocked until disposable data exists for each flow.
- accepted: The existing runtime-smoke seed command is useful for local throwaway records, but it is not an identity/session pack.
- resolved: The environment target was confirmed as local/development before any further QA planning.

## Decision Needed

Pick one:

1. Provide Clerk QA credentials/session setup for each required role.
2. Approve a guarded mobile dev-auth QA harness that only works in local/CI development, requires explicit env flags, is impossible in production, and is documented as test-only.

Until one of those happens, the public-release QA gate remains blocked.

## Clerk Test User Follow-Up

Date: 2026-06-01

Follow-up report: `.ai/initiatives/mobile-web-parity/reports/20-clerk-test-user-role-matrix-qa.md`

This blocker is no longer absolute. The follow-up pass created or confirmed Clerk test users with `+clerk_test@clerk.com`, mapped all ten QA identities into the local DB, seeded disposable `QA Mobile Parity` records, and proved real iOS Simulator sessions for member A and moderator.

Public release is still not ready because the full account-by-account role matrix and several mutation-heavy flows remain incomplete, but the original "no mobile-usable QA identities" blocker is superseded.

## Manual QA Checklist Still Required

- Sign in as normal member A and member B; test onboarding/profile completion, media social actions, Chika, messages, buddies, and block/report flows.
- Sign in as event organizer/staff; test participant management, payment review, and check-in against disposable event records.
- Sign in as school owner/admin/instructor; test bookings, payment proof review, sessions, and role visibility against disposable school records.
- Sign in as instructor applicant; test application and proof upload.
- Sign in as moderator/admin; test report triage/status transitions with audit notes against throwaway reports.
- Sign in as super-admin; confirm elevated moderation/admin routes and denial boundaries for lower roles.

## Release Recommendation

QA branch remains acceptable. Public release is blocked until the QA identity pack and disposable data pack exist and the role/mutation matrix is executed.
