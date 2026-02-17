# Findings (Current Status)

## Open

None.

## Closed

### F-AUTH-001 (Closed)
- Evidence:
  - Policy minimum-role matrix now uses canonical platform roles in `apps/api/src/core/policies.ts`.
  - `canPerformPolicyAction` now evaluates role hierarchy through `hasMinimumRole` (which maps DB roles to platform roles in `apps/api/src/core/authorization.ts`).

### F-SEC-001 (Closed)
- Evidence:
  - Ownership/moderator checks enforced in `apps/api/src/app/threads/threads.service.ts` (`update`, `delete`).

### F-SEC-002 (Closed)
- Evidence:
  - Group member/post authorization checks enforced in `apps/api/src/app/groups/groups.service.ts`.
  - Request-body `authorId` no longer trusted from client in group posting flow.

### F-SEC-003 (Closed)
- Evidence:
  - Event attendee spoofing prevented in `apps/api/src/app/events/events.controller.ts` and `apps/api/src/app/events/events.service.ts`.

### F-SEC-004 (Closed)
- Evidence:
  - Notification object-level checks enforced in `apps/api/src/app/notifications/notifications.controller.ts`.

### F-SEC-005 (Closed)
- Evidence:
  - Presigned upload route requires auth and uses upload-safe behavior in `apps/api/src/app/media/media.routes.ts` and `apps/api/src/app/media/media.controller.ts`.

### F-SEC-006 (Closed)
- Evidence:
  - Clerk webhook raw verification path and anonymize-on-delete behavior in `apps/api/src/routes/clerk-webhook.ts`.

### F-AUTH-002 (Closed)
- Evidence:
  - Legacy auth flow removed from `/auth` page in `apps/web/src/app/auth/page.tsx`.
  - Legacy login/register/logout API calls replaced with Clerk redirects/sign-out in `apps/web/src/hooks/react-queries/auth.ts`.

### F-PRIV-001 (Closed)
- Evidence:
  - Pseudonymous identity redaction in thread/comment read paths in `apps/api/src/app/threads/threads.service.ts`.

### F-PRIV-002 (Closed)
- Evidence:
  - Dive spot lat/lng coarse handling and bounded validation in `apps/api/src/app/diveSpot/diveSpot.service.ts` and `apps/api/src/app/diveSpot/diveSpot.validators.ts`.
  - Buddy location outputs sanitized to coarse values in `apps/api/src/app/buddies/buddies.service.ts`.

### F-PRIV-003 (Closed)
- Evidence:
  - Block CRUD and cross-feature block checks in `apps/api/src/app/blocks/*`, `apps/api/src/app/events/events.service.ts`, `apps/api/src/app/groups/groups.service.ts`, `apps/api/src/app/messages/messages.service.ts`, `apps/api/src/app/threads/threads.service.ts`.

### F-MOD-001 (Closed)
- Evidence:
  - Pseudonymous rate counting scoped correctly in `apps/api/src/app/threads/threads.service.ts`.

### F-MOD-002 (Closed)
- Evidence:
  - `reasonCode` required for moderation payloads in `apps/api/src/app/marketplace/marketplace.validators.ts` and `apps/api/src/app/collaboration/collaboration.validators.ts`.
  - Reason metadata logged in moderation actions in `apps/api/src/app/marketplace/marketplace.service.ts` and `apps/api/src/app/collaboration/collaboration.service.ts`.

### F-DATA-001 (Closed)
- Evidence:
  - Webhook delete path anonymizes account in `apps/api/src/routes/clerk-webhook.ts`.

### F-DATA-002 (Closed)
- Evidence:
  - Event validator enums aligned in `apps/api/src/app/events/events.validators.ts`.
  - Shared types aligned in `packages/types/src/index.ts` with compile-time checks in `packages/types/test/event-contracts.test.ts`.

### F-DATA-003 (Closed)
- Evidence:
  - Migration discipline check in `apps/api/scripts/check-migrations.mjs` and CI step in `.github/workflows/ci.yml`.

### F-REL-001 (Closed)
- Evidence:
  - CSRF error classification fixed in `apps/api/src/utils/errorHandler.ts`.

### F-REL-002 (Closed)
- Evidence:
  - Pagination metadata present in messages/reports/buddies list endpoints:
    - `apps/api/src/app/messages/messages.service.ts`
    - `apps/api/src/app/reports/reports.service.ts`
    - `apps/api/src/app/buddies/buddies.service.ts`

### F-REL-003 (Closed)
- Evidence:
  - Base-path messaging corrected to root-mounted routes in `apps/api/src/app.ts` and `apps/api/src/routes/index.route.ts`.

### F-PERF-001 (Closed)
- Evidence:
  - Hot-query explain baseline script added in `apps/api/scripts/explain-hot-queries.mjs`.
  - CI hook added (conditional on `CI_DATABASE_URL`) in `.github/workflows/ci.yml`.

### F-OBS-001 (Closed)
- Evidence:
  - Audit logging expanded to sensitive actions including buddies/thread/user anonymize flows in:
    - `apps/api/src/app/buddies/buddies.service.ts`
    - `apps/api/src/app/threads/threads.service.ts`
    - `apps/api/src/app/user/user.service.ts`

### F-OBS-002 (Closed)
- Evidence:
  - DB connection logging redacts sensitive URL components in `apps/api/src/databases/drizzle/connection.ts`.

### F-DX-001 (Closed)
- Evidence:
  - Shared type alignment updates in `packages/types/src/index.ts`.
  - Contract tests added in:
    - `packages/types/test/event-contracts.test.ts`
    - `packages/types/test/buddies-contracts.test.ts`

### F-DX-002 (Closed)
- Evidence:
  - Runbooks added:
    - `docs/runbooks/backup-restore.md`
    - `docs/runbooks/moderation-ops.md`
    - `docs/runbooks/incident-basics.md`
