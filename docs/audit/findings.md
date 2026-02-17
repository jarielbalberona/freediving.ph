# Findings

## Security

### F-SEC-001
- Severity: Blocker
- Likelihood: High
- Impact: High (unauthorized content modification/deletion)
- Evidence:
  - `apps/api/src/app/threads/threads.routes.ts` exposes `PUT /threads/:id` and `DELETE /threads/:id` for any authenticated user.
  - `apps/api/src/app/threads/threads.service.ts` methods `update` and `delete` do not verify actor owns thread or has moderator role.
- Recommendation: In `ThreadsService.update/delete`, fetch thread owner and enforce `owner || moderator/admin`. Return `403` otherwise.
- Test coverage needed: API tests for non-owner update/delete denied, owner allowed, moderator allowed.

### F-SEC-002
- Severity: Blocker
- Likelihood: High
- Impact: High (group membership and post impersonation abuse)
- Evidence:
  - `apps/api/src/app/groups/groups.routes.ts` allows authenticated `POST /groups/:id/members`, `DELETE /groups/:id/members/:userId`, `POST /groups/:id/posts`.
  - `apps/api/src/app/groups/groups.service.ts` methods `addMember`, `removeMember`, `createPost` have no actor authorization check.
  - `apps/api/src/app/groups/groups.validators.ts` `GroupPostSchema` accepts client-supplied `authorId`.
- Recommendation: Remove trust of body `authorId` (set from `req.user.id`), enforce group-role checks (`owner/admin/moderator`) for membership changes, require active membership with posting rights for posts.
- Test coverage needed: IDOR tests for group membership/post APIs and role matrix tests.

### F-SEC-003
- Severity: High
- Likelihood: High
- Impact: High (event attendee spoofing/removal)
- Evidence:
  - `apps/api/src/app/events/events.controller.ts` `addAttendee` validates body-supplied `userId` via `EventAttendeeSchema`.
  - `apps/api/src/app/events/events.service.ts` `addAttendee` uses provided `userId` without actor check.
  - `apps/api/src/app/events/events.routes.ts` `DELETE /events/:id/attendees/:userId` has no organizer/mod self-only guard.
- Recommendation: Force attendee user to `req.user.id` for self-join/leave endpoints; add organizer/moderator-only paths for managing others.
- Test coverage needed: attendee spoof attempts rejected; organizer moderation flows allowed.

### F-SEC-004
- Severity: High
- Likelihood: High
- Impact: High (cross-user notification data exposure/modification)
- Evidence:
  - `apps/api/src/app/notifications/notifications.routes.ts` exposes `/notifications/users/:userId*` endpoints.
  - `apps/api/src/app/notifications/notifications.controller.ts` methods pass param `userId` directly to service.
  - No check in service/controller that param userId equals authenticated user (or admin).
- Recommendation: enforce `userId === req.user.id` unless elevated role; audit all notification endpoints for object-level auth.
- Test coverage needed: unauthorized userId access blocked for read/write actions.

### F-SEC-005
- Severity: High
- Likelihood: Medium
- Impact: High (upload abuse / incorrect object access)
- Evidence:
  - `apps/api/src/app/media/media.routes.ts` exposes `GET /media/presigned-url/:username` without auth.
  - `apps/api/src/app/media/media.controller.ts` `createPresignedS3URL` uses `GetObjectCommand` for upload URL flow and does not validate `type/ext` query.
- Recommendation: require auth, bind key prefix to authenticated user, validate mime/ext whitelist, switch to `PutObjectCommand`, include size/type constraints and short expiry.
- Test coverage needed: unauth access denied, invalid ext rejected, signed URL allows upload-only for actor prefix.

### F-SEC-006
- Severity: High
- Likelihood: Medium
- Impact: Medium/High (webhook forgery handling + account lifecycle integrity)
- Evidence:
  - `apps/api/src/routes/clerk-webhook.ts` uses `webhook.verify(req.body, req.headers)` but app uses parsed JSON middleware globally (`apps/api/src/app.ts`), not raw body capture.
  - `handleUserDeleted` hard deletes user row.
- Recommendation: use raw-body verification path for webhook route; replace hard delete with anonymization/suspension workflow.
- Test coverage needed: signature verification tests (valid/invalid), user deletion event preserves anonymized placeholder record.

## Auth / RBAC

### F-AUTH-001
- Severity: High
- Likelihood: High
- Impact: High (inconsistent authorization policy)
- Evidence:
  - Role taxonomy in code: `USER/EDITOR/ADMINISTRATOR/SUPER_ADMIN` (`apps/api/src/core/authorization.ts`, `apps/api/src/core/policies.ts`).
  - Spec taxonomy: guest/member/moderator/admin (`docs/specs/main.md`).
- Recommendation: define canonical role-to-permission matrix in one module and consume it in all route guards/service checks.
- Test coverage needed: table-driven authorization tests per route/action.

### F-AUTH-002
- Severity: Medium
- Likelihood: Medium
- Impact: Medium (client assumptions diverge from server auth)
- Evidence:
  - frontend legacy auth hooks call `/auth/login`, `/auth/register`, `/auth/logout` (`apps/web/src/hooks/react-queries/auth.ts`)
  - server has Clerk-based auth and no such handlers in `apps/api/src/routes/auth.routes.ts`.
- Recommendation: remove dead auth flows in web, centralize Clerk token/session strategy.
- Test coverage needed: frontend integration tests for auth guard + API token flow only.

## Privacy

### F-PRIV-001
- Severity: Blocker
- Likelihood: High
- Impact: High (identity leak in pseudonymous Chika)
- Evidence:
  - Thread retrieval always returns `user.username/email/alias`: `apps/api/src/app/threads/threads.service.ts` (`retrieve`, `retrieveAll`).
  - Comment retrieval returns `user.username/alias`: `apps/api/src/app/threads/threads.service.ts` (`getComments`).
  - No mode-aware redaction in these methods despite pseudonym tables (`apps/api/src/models/drizzle/chika.model.ts`).
- Recommendation: in pseudonymous mode, serialize only pseudonym handle publicly; keep real identity only in moderation endpoint (`apps/api/src/app/moderation/moderation.service.ts` `revealThreadPseudonyms`).
- Test coverage needed: pseudonymous thread/comment APIs never expose userId/username/alias to non-mod users.

### F-PRIV-002
- Severity: High
- Likelihood: High
- Impact: High (spec violation: coarse location default)
- Evidence:
  - precise coordinates stored/exposed for dive spots: `lat/lng` in `apps/api/src/models/drizzle/diveSpots.model.ts` and accepted by `DiveSpotServerSchema` (`apps/api/src/app/diveSpot/diveSpot.validators.ts`).
  - buddy finder returns raw `users.location/homeDiveArea` (`apps/api/src/app/buddies/buddies.service.ts` `finder`).
- Recommendation: enforce coarse-location schema (city/region) for public surfaces; keep precise coordinates restricted or omitted by default.
- Test coverage needed: serialization tests to ensure no precise lat/lng in default public endpoints.

### F-PRIV-003
- Severity: High
- Likelihood: Medium
- Impact: High (blocking policy not universal)
- Evidence:
  - blocking helpers used in profiles/threads/buddies/messages (`apps/api/src/core/blocking.ts`, services).
  - no block checks in groups/events/notifications/read paths.
  - no block-management API found (no route for creating/deleting `blocks`).
- Recommendation: add block/unblock endpoints and shared policy middleware applied to all user-to-user visibility/read/write paths.
- Test coverage needed: block matrix tests across messaging, buddy requests/finder, profiles, groups/events visibility.

## Moderation / Abuse

### F-MOD-001
- Severity: High
- Likelihood: High
- Impact: High (rate limits not correctly scoped)
- Evidence:
  - pseudonymous post limit counts all comments by user, regardless of thread mode (`apps/api/src/app/threads/threads.service.ts` `createComment`, query `count(comments.id)` only).
- Recommendation: count only comments in pseudonymous threads (join with `thread_category_modes` mode = `PSEUDONYMOUS_CHIKA`).
- Test coverage needed: separate counters for normal vs pseudonymous replies.

### F-MOD-002
- Severity: Medium
- Likelihood: Medium
- Impact: Medium (moderation consistency drift)
- Evidence:
  - reason-code enums strong in reports/moderation (`apps/api/src/app/reports/reports.validators.ts`, `apps/api/src/app/moderation/moderation.validators.ts`).
  - marketplace/collaboration moderation payloads have no reason code (`apps/api/src/app/marketplace/marketplace.validators.ts`, `apps/api/src/app/collaboration/collaboration.validators.ts`).
- Recommendation: require reasonCode/note on all moderation state transitions.
- Test coverage needed: reject moderation actions missing reason codes.

## Data Integrity

### F-DATA-001
- Severity: High
- Likelihood: Medium
- Impact: High (spec conflict on account deletion)
- Evidence:
  - soft/anonymize flow exists: `UserService.anonymizeUserAccount` (`apps/api/src/app/user/user.service.ts`).
  - Clerk webhook hard deletes user: `handleUserDeleted` in `apps/api/src/routes/clerk-webhook.ts`.
- Recommendation: webhook delete should call anonymization path, not hard delete.
- Test coverage needed: user deletion event retains anonymized community data placeholders.

### F-DATA-002
- Severity: Medium
- Likelihood: High
- Impact: Medium (contract/runtime mismatches)
- Evidence:
  - event validator enum uses `eventType` values (`DIVE`, `TRAINING`, etc.) in `apps/api/src/app/events/events.validators.ts`.
  - DB enum `EVENT_TYPE` values differ (`DIVE_SESSION`, `TRAINING`, etc.) in `apps/api/src/models/drizzle/events.model.ts`.
- Recommendation: align request schema with DB enum and shared `@freediving.ph/types` contracts.
- Test coverage needed: validator-model compatibility test and end-to-end event create/update tests.

### F-DATA-003
- Severity: Medium
- Likelihood: Medium
- Impact: Medium (migration discipline risk)
- Evidence:
  - migration folder has duplicate sequence numbers (`0002_*.sql`, `0022_*.sql`, `0023_*.sql`, `0024_*.sql`) in `apps/api/.drizzle/migrations`.
- Recommendation: enforce migration naming/version policy and CI check for duplicates/order integrity.
- Test coverage needed: CI script validating monotonic migration ordering and uniqueness.

## Reliability

### F-REL-001
- Severity: High
- Likelihood: High
- Impact: High (error handling regression)
- Evidence:
  - in `apps/api/src/utils/errorHandler.ts`, CSRF branch checks `if (invalidCsrfTokenError)` (module constant), not `err instanceof invalidCsrfTokenError`; this condition is always truthy and can misclassify errors.
- Recommendation: perform proper instance/type check against incoming `err`.
- Test coverage needed: error handler tests for CSRF vs non-CSRF errors.

### F-REL-002
- Severity: Medium
- Likelihood: High
- Impact: Medium (API shape inconsistency)
- Evidence:
  - pagination metadata present in some services (threads/events/dive spots via `buildOffsetPagination`).
  - missing in others returning lists (`messages.listMessages`, `reports.list`, buddies list endpoints).
- Recommendation: standardize list response envelope with pagination across all UGC collections.
- Test coverage needed: contract tests for paginated endpoints.

### F-REL-003
- Severity: Low
- Likelihood: Medium
- Impact: Medium (route contract ambiguity)
- Evidence:
  - comments/docs mention `/api/...` base (`apps/api/src/app.ts`, `apps/api/src/routes/index.route.ts`).
  - router mount in `apps/api/src/routes/routes.config.ts` uses direct paths (`/auth`, `/threads`, etc.).
- Recommendation: choose one API base path and enforce consistently in app, docs, and frontend clients.
- Test coverage needed: smoke tests against canonical base path.

## Performance

### F-PERF-001
- Severity: Medium
- Likelihood: Medium
- Impact: Medium (slow scans under load)
- Evidence:
  - many list endpoints filter/sort on fields lacking explicit indexes in models (e.g., reports status/reason createdAt in `apps/api/src/models/drizzle/moderation.model.ts`; thread/comment deleted filters in `apps/api/src/models/drizzle/threads.model.ts`).
- Recommendation: add compound indexes for hot moderation, messaging, and forum queries based on observed where/order patterns.
- Test coverage needed: explain-plan baseline scripts + regression checks for key queries.

## Observability

### F-OBS-001
- Severity: Medium
- Likelihood: Medium
- Impact: Medium (insufficient auditability for sensitive flows)
- Evidence:
  - audit logs inserted only in selected services (`rg insert(auditLogs)` across `apps/api/src/app/**`).
  - no audit entries for anonymization path (`apps/api/src/app/user/user.service.ts`), buddy actions (`apps/api/src/app/buddies/buddies.service.ts`), or thread owner delete (`apps/api/src/app/threads/threads.service.ts`).
- Recommendation: define mandatory audit events list and instrument all sensitive actions.
- Test coverage needed: unit tests verifying audit insert calls for each protected action.

### F-OBS-002
- Severity: Low
- Likelihood: Medium
- Impact: Medium (sensitive config leakage)
- Evidence:
  - DB URL logged in plain text in `apps/api/src/databases/drizzle/connection.ts` (`logDatabaseConnection`).
- Recommendation: remove secrets from logs; use masked DSN.
- Test coverage needed: logging tests/assertions for redaction.

## DX

### F-DX-001
- Severity: Medium
- Likelihood: High
- Impact: Medium (contract drift between app and shared types)
- Evidence:
  - shared `packages/types/src/index.ts` shapes diverge from API response shapes in multiple modules (threads/events/groups/message fields).
- Recommendation: generate shared DTOs from backend schemas or enforce type contract tests between API responses and `@freediving.ph/types`.
- Test coverage needed: consumer-driven contract tests in `apps/web/test` against API envelopes.

### F-DX-002
- Severity: Low
- Likelihood: Medium
- Impact: Medium
- Evidence:
  - no `docs/audit` or operational runbooks were present before this audit; no backup/restore or moderation incident SOP found (`Unknown` after checking `docs/`, `terraform/`, `.github/`).
- Recommendation: add minimal runbooks (backup/restore, moderation operations, incident triage).
- Test coverage needed: n/a (process/documentation control).
