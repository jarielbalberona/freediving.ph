# Fix Plan (Phased, PR-Sized)

## Phase 1: Access control and validation

### Objectives
- Close all object-level auth gaps and impersonation vectors.
- Align route validators with DB enums/contracts.
- Enforce server-side ownership and role checks consistently.

### PR 1.1 Threads ownership enforcement
- Files to touch:
  - `apps/api/src/app/threads/threads.service.ts`
  - `apps/api/src/app/threads/threads.controller.ts`
  - `apps/api/test/*` (new thread authorization tests)
- Endpoints affected:
  - `PUT /threads/:id`
  - `DELETE /threads/:id`
- DB changes: none
- Tests to add:
  - non-owner cannot update/delete
  - owner can update/delete
  - moderator/admin can update/delete
- Acceptance criteria:
  - unauthorized edits/deletes return `403`
  - existing owner/mod flows remain functional

### PR 1.2 Groups auth hardening
- Files to touch:
  - `apps/api/src/app/groups/groups.routes.ts`
  - `apps/api/src/app/groups/groups.controller.ts`
  - `apps/api/src/app/groups/groups.service.ts`
  - `apps/api/src/app/groups/groups.validators.ts`
- Endpoints affected:
  - `POST /groups/:id/members`
  - `DELETE /groups/:id/members/:userId`
  - `POST /groups/:id/posts`
- DB changes: none
- Tests to add:
  - only owner/admin/mod can add/remove members
  - post `authorId` cannot be spoofed; forced from auth user
- Acceptance criteria:
  - membership and posting privileges enforced by role/membership state

### PR 1.3 Events attendee auth + enum alignment
- Files to touch:
  - `apps/api/src/app/events/events.controller.ts`
  - `apps/api/src/app/events/events.service.ts`
  - `apps/api/src/app/events/events.validators.ts`
  - `packages/types/src/index.ts` (if shared contracts updated)
- Endpoints affected:
  - `POST /events/:id/attendees`
  - `DELETE /events/:id/attendees/:userId`
  - event create/update endpoints
- DB changes: optional migration if enum normalization required
- Tests to add:
  - attendee spoof denied
  - organizer/mod can manage others
  - event schema accepts only model-compatible enum values
- Acceptance criteria:
  - no actor can alter attendee state for arbitrary users without privilege

### PR 1.4 Notifications object-level auth
- Files to touch:
  - `apps/api/src/app/notifications/notifications.routes.ts`
  - `apps/api/src/app/notifications/notifications.controller.ts`
  - `apps/api/src/app/notifications/notifications.service.ts`
- Endpoints affected:
  - `/notifications/users/:userId*` and per-notification read/update/delete endpoints
- DB changes: none
- Tests to add:
  - user cannot read/modify another user’s notifications
  - admin/mod override behavior (if desired) explicitly tested
- Acceptance criteria:
  - all notification access is actor-scoped by default

## Phase 2: Abuse controls (rate limits, gating)

### Objectives
- Enforce anti-abuse limits exactly as spec intent.
- Fix pseudonymous limit accounting and add missing per-feature limiters.

### PR 2.1 Pseudonymous Chika limit correctness
- Files to touch:
  - `apps/api/src/app/threads/threads.service.ts`
  - `apps/api/src/core/abuseControls.ts` (if thresholds adjusted)
- Endpoints affected:
  - `POST /threads/:id/comments`
  - `PATCH /threads/:id/mode`
- DB changes: optional index for mode-aware counting
- Tests to add:
  - pseudo reply count only increments for pseudo threads
  - normal thread comments don’t consume pseudo quota
- Acceptance criteria:
  - pseudonymous limits are mode-specific and deterministic

### PR 2.2 Expand per-route throttles + metrics
- Files to touch:
  - `apps/api/src/app/*/*.routes.ts` (mutation endpoints lacking limiter)
  - `apps/api/src/observability/metrics.ts` (throttle counters)
- Endpoints affected:
  - writes in groups/events/notifications/user-services and moderation-heavy flows
- DB changes: none
- Tests to add:
  - throttle behavior contract tests (`429` + message)
- Acceptance criteria:
  - all high-risk mutation endpoints have explicit throttles

## Phase 3: Reporting + moderation actions + audit logging

### Objectives
- Standardize moderation reason codes and placeholders across modules.
- Ensure sensitive actions are audit-logged consistently.

### PR 3.1 Moderation reason-code standardization
- Files to touch:
  - `apps/api/src/app/marketplace/marketplace.validators.ts`
  - `apps/api/src/app/collaboration/collaboration.validators.ts`
  - related services/controllers
  - optionally shared reason enum in `packages/types/src/index.ts`
- Endpoints affected:
  - `PATCH /marketplace/:id/moderate`
  - `PATCH /collaboration/:id/moderate`
- DB changes: optional fields for `reasonCode`, `note` on moderated entities
- Tests to add:
  - moderation action without reason rejected
- Acceptance criteria:
  - all moderation state transitions include reason metadata

### PR 3.2 Audit log coverage expansion
- Files to touch:
  - `apps/api/src/app/user/user.service.ts`
  - `apps/api/src/app/buddies/buddies.service.ts`
  - `apps/api/src/app/threads/threads.service.ts`
  - any new block endpoints (Phase 4)
- Endpoints affected:
  - user anonymization, buddy actions, owner deletes/edits, block/unblock
- DB changes: none (reuse `audit_logs`)
- Tests to add:
  - assert audit log insert for each sensitive action
- Acceptance criteria:
  - mandatory audit event list fully instrumented

## Phase 4: Data safety (soft delete, anonymization, indexes, migrations discipline)

### Objectives
- Enforce anonymization-first account deletion behavior.
- Improve query safety/performance with targeted indexes.
- Stabilize migration workflow discipline.

### PR 4.1 Webhook deletion safety
- Files to touch:
  - `apps/api/src/routes/clerk-webhook.ts`
  - `apps/api/src/app/user/user.service.ts`
- Endpoints affected:
  - `POST /webhooks/clerk-webhook`
- DB changes: none
- Tests to add:
  - `user.deleted` event triggers anonymization (not hard delete)
- Acceptance criteria:
  - account deletion preserves referential community artifacts with placeholders

### PR 4.2 Index and query plan hardening
- Files to touch:
  - `apps/api/src/models/drizzle/moderation.model.ts`
  - `apps/api/src/models/drizzle/threads.model.ts`
  - `apps/api/src/models/drizzle/messages.model.ts`
  - migration SQL in `apps/api/.drizzle/migrations/*`
- Endpoints affected:
  - high-volume lists in threads/messages/reports/events
- DB changes:
  - add composite indexes aligned to where/order clauses
- Tests to add:
  - migration test + explain-plan snapshots for key queries
- Acceptance criteria:
  - no major sequential scans on hot list paths under expected filters

### PR 4.3 Migration discipline checks
- Files to touch:
  - CI workflow `.github/workflows/ci.yml`
  - new script under repo tooling (`scripts/`)
- Endpoints affected: none
- DB changes: none
- Tests to add:
  - migration naming/order validator in CI
- Acceptance criteria:
  - CI fails on duplicate/invalid migration sequencing

## Phase 5: Observability and ops

### Objectives
- Remove sensitive logging leaks.
- Improve incident/debug readiness with consistent request/audit context.

### PR 5.1 Logging and error-handler fixes
- Files to touch:
  - `apps/api/src/utils/errorHandler.ts`
  - `apps/api/src/databases/drizzle/connection.ts`
- Endpoints affected: global
- DB changes: none
- Tests to add:
  - CSRF/non-CSRF error classification tests
  - log redaction tests for DSN values
- Acceptance criteria:
  - non-CSRF errors no longer misclassified; secrets not emitted to logs

### PR 5.2 Operational runbooks
- Files to touch:
  - `docs/runbooks/backup-restore.md`
  - `docs/runbooks/moderation-ops.md`
  - `docs/runbooks/incident-basics.md`
- Endpoints affected: none
- DB changes: none
- Tests to add: n/a
- Acceptance criteria:
  - runbooks exist, referenced from launch checklist

## Phase 6: Frontend hardening and UX safety states

### Objectives
- Prevent identity leakage in pseudonymous Chika UI.
- Remove stale auth assumptions and align client contracts to server.

### PR 6.1 Pseudonymous UI contract enforcement
- Files to touch:
  - `apps/web/src/features/chika/components/ThreadDetail.tsx`
  - `apps/web/src/app/chika/threads.tsx`
  - `apps/web/src/features/chika/api/threads.ts`
  - `packages/types/src/index.ts` (if API DTO changes)
- Endpoints affected:
  - `GET /threads`, `GET /threads/:id`, `GET /threads/:id/comments`
- DB changes: none
- Tests to add:
  - UI renders pseudonym handle only in pseudo mode
- Acceptance criteria:
  - non-mod users cannot see identity fields in pseudo mode responses or UI

### PR 6.2 Remove legacy login/register client path
- Files to touch:
  - `apps/web/src/hooks/react-queries/auth.ts`
  - dependent pages/components under `apps/web/src/app/auth/*`
- Endpoints affected: none (cleanup)
- DB changes: none
- Tests to add:
  - auth flow integration test using Clerk-only strategy
- Acceptance criteria:
  - no web calls to nonexistent `/auth/login|register|logout`

