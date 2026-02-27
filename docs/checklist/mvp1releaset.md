---
doc_id: FPH-MVP1-RELEASE-CHECKLIST
title: Freediving Philippines MVP v1 Release Checklist
version: 1.0
status: Draft
timezone: Asia/Manila
created_at: 2026-02-28
last_updated_at: 2026-02-28
scope:
  - services/fphgo (Go API)
  - apps/web (Next.js web app)
release_scope: "Everything up to P1 Social Core (no P2 Diving Core)"
owners:
  - role: Release Captain
    name: "TBD"
  - role: Backend Owner
    name: "TBD"
  - role: Frontend Owner
    name: "TBD"
  - role: Data Owner
    name: "TBD"
  - role: Moderation Owner
    name: "TBD"
links:
  api_compatibility_matrix: "services/fphgo/docs/api-compatibility-matrix.md"
  authz_permissions_doc: "services/fphgo/docs/authz-permissions-v1.md"
  rate_limits_doc: "services/fphgo/docs/rate-limits-v1.md"
  moderation_actions_doc: "services/fphgo/docs/moderation-actions-v1.md"
  profiles_doc: "services/fphgo/docs/profiles-v1.md"
  blocks_doc: "services/fphgo/docs/blocks-v1.md"
  reports_doc: "services/fphgo/docs/reports-v1.md"
  buddies_doc: "services/fphgo/docs/buddies-v1.md"
  messaging_doc: "services/fphgo/docs/messaging-v1.md"
  chika_doc: "services/fphgo/docs/chika-v1.md"
notes:
  - "This checklist is a gate. If an item is unchecked, either complete it or explicitly mark it Deferred with rationale and risk."
  - "Single-instance websocket hub is acceptable for MVP, but must be documented and deployment must reflect it."
  - "No Redis in v1. Rate limits must be DB-backed or documented as single-instance in-memory."
---

# MVP v1 Release Checklist

## 0) How to use this checklist

- Check each item.
- Add evidence for each major gate (PR link, test output, screenshot, log line, doc section, or command result).
- If you defer an item, add:
  - Reason
  - Risk
  - Mitigation
  - Owner
  - Follow-up ticket

### Release metadata to fill in before go-live

- Target release date: `TBD`
- Release environment: `staging` then `production`
- Release tag: `TBD`
- Backend commit SHA: `TBD`
- Web commit SHA: `TBD`
- DB migration version: `TBD`
- Release Captain: `TBD`
- Rollback decision maker: `TBD`

---

## 1) Scope lock and route alignment

### 1.1 Scope boundaries (no P2 Diving Core)

- [ ] Scope excludes P2 modules (Explore, Events, Competitive Records) from MVP v1 release.
- [ ] A written list of migrated modules in MVP v1 exists and is agreed by owners.
- [ ] For migrated modules, `apps/web` calls only `services/fphgo`.
- [ ] No `apps/api/*` runtime dependency exists for migrated modules.

**Evidence:**

- Migrated module list:
- PR / commit:
- Notes:

### 1.2 API compatibility matrix is accurate and green

- [ ] `services/fphgo/docs/api-compatibility-matrix.md` includes every endpoint that `apps/web` calls for migrated features.
- [ ] All rows for migrated features are marked OK.
- [ ] Any temporary compatibility shims are documented, including end date.

**Evidence:**

- Matrix link and section anchors:
- PR / commit:

### 1.3 Route invariants

- [ ] All public API routes for migrated features are under `/v1/...`.
- [ ] No web API call targets legacy paths (`/messages`, `/threads`, etc) for migrated features.
- [ ] Route surface invariant tests exist (or route enumeration checks in CI).

**Evidence:**

- Test name and output:
- PR / commit:

---

## 2) Authentication and authorization gates

### 2.1 Clerk configuration correctness

- [ ] Production Clerk settings are correct (issuer, audience, keys as required).
- [ ] `CLERK_SECRET_KEY` is required in production configuration.
- [ ] Any DEV_AUTH or local bypass is blocked in production builds and documented.
- [ ] Token extraction uses `Authorization: Bearer <token>` consistently.
- [ ] Backend uses the current Clerk Go SDK integration patterns (no deprecated verification paths).

**Evidence:**

- Config docs / env var list:
- Staging verification notes:
- PR / commit:

### 2.2 Auth middleware and identity resolution

- [ ] Every protected route group uses auth middleware.
- [ ] Request context includes resolved internal app user identity for member routes.
- [ ] Identity resolution and permission resolution use DB-backed source of truth.
- [ ] Auth failures return consistent `ApiError` shape where applicable.

**Evidence:**

- Middleware file references:
- Integration test names:

### 2.3 Permissions model is safe (no broad default write)

- [ ] Feature-scoped permissions exist at least for:
  - Profiles: `profiles.read`, `profiles.write`
  - Blocks: `blocks.read`, `blocks.write`
  - Reports: `reports.write`, `reports.read`, `reports.moderate`
  - Buddies: `buddies.read`, `buddies.write`
  - Messaging: `messaging.read`, `messaging.write`
  - Chika: `chika.read`, `chika.write`, `chika.moderate`
  - Moderation: `moderation.read`, `moderation.write`
- [ ] New member defaults do not grant broad write that covers unrelated features.
- [ ] Backfill migration exists for existing users where required.
- [ ] `RequirePermission` is used consistently on all relevant endpoints.
- [ ] Web does not deny access while session is still loading.

**Evidence:**

- Permissions doc: `services/fphgo/docs/authz-permissions-v1.md`
- PR / commit:
- Tests:

### 2.4 Account state enforcement

- [ ] `suspended` state blocks all writes across migrated features.
- [ ] `read_only` state blocks all writes across migrated features.
- [ ] The error returned is stable and appropriate (for example 403 with clear `ApiError.code`).
- [ ] State enforcement is in service layer where business rules exist, and also guarded by middleware where appropriate.

**Evidence:**

- Endpoint list tested:
- Tests and output:

---

## 3) Shared contracts and error handling

### 3.1 `packages/types` is the single source of truth

- [ ] Shared types exist and are used by `apps/web`:
  - MeResponse
  - Profile and profile responses
  - Permission and role types
  - ApiError
  - Buddies types
  - Messaging types and websocket envelope
  - Chika types
  - Reports types
  - Rate limit details if used
- [ ] No duplicate local type definitions exist in `apps/web` for these contracts.
- [ ] Contracts match actual JSON responses from `services/fphgo`.

**Evidence:**

- Type file paths:
- PR / commit:
- Contract tests:

### 3.2 ApiError shape is consistent

- [ ] Validation errors return `ApiError` with `issues[]` shaped as `{ path, message, code? }`.
- [ ] Forbidden and unauthorized errors are stable and do not leak internal details.
- [ ] Not found errors are stable (`code: "not_found"` or agreed equivalent).
- [ ] Blocked actions return a stable code (for example `code: "blocked"`).
- [ ] Rate limited returns `code: "rate_limited"` and retry semantics.

**Evidence:**

- Examples from logs or tests:
- PR / commit:

### 3.3 BIGINT safety for web clients

- [ ] Any BIGSERIAL ids exposed to web are serialized as strings in JSON, or there is a documented alternative that is proven safe.
- [ ] `apps/web` treats such ids as strings in types and logic.

**Evidence:**

- Example payloads:
- Type definitions:

---

## 4) Safety primitives and moderation loop

### 4.1 Blocks v1 is complete and enforced

- [ ] Blocks endpoints exist: block, unblock, list.
- [ ] Blocks enforced for messaging writes (request create, message send).
- [ ] Messaging inbox hides blocked relationships.
- [ ] Blocks enforced for chika reads (threads and comments list) both directions.
- [ ] Blocks enforced for buddies writes (cannot request, accept, or buddy across a block).
- [ ] Block enforcement returns stable ApiError codes.

**Evidence:**

- Tests:
- Docs: `services/fphgo/docs/blocks-v1.md`

### 4.2 Reports v1 is operational

- [ ] Can report targets: user, message, chika_thread, chika_comment.
- [ ] Mixed id targets are handled safely:
  - UUID targets parsed and stored as uuid column
  - BIGINT targets parsed and stored as bigint column
  - DB constraints prevent invalid combinations
- [ ] Target existence checks are enforced.
- [ ] Target author resolution works for moderator view.
- [ ] Cooldown or cap prevents report spam and is documented.
- [ ] Audit trail events are written for create and status changes.
- [ ] Moderator triage endpoints exist: list, detail, status update.

**Evidence:**

- Tests:
- Docs: `services/fphgo/docs/reports-v1.md`

### 4.3 Moderation actions exist and are auditable

- [ ] Moderator can suspend and unsuspend a user.
- [ ] Moderator can set and clear read_only for a user.
- [ ] Moderator can hide and unhide chika thread and comment.
- [ ] Every moderation action writes an immutable audit record:
  - actor_app_user_id
  - action
  - target_type and target_id
  - reason
  - timestamp
  - optional linked report id
- [ ] Hidden content is not visible to normal members, but moderators can view it with markers.
- [ ] Enforcement integrates with account state gates (suspended, read_only).

**Evidence:**

- Tests:
- Docs: `services/fphgo/docs/moderation-actions-v1.md`

---

## 5) Profiles v1 readiness

- [ ] View a profile works and returns contract-stable fields.
- [ ] Edit my profile works with validation and consistent error shape.
- [ ] User search for typeahead works with pagination and permission enforcement.
- [ ] Privacy defaults are enforced (coarse location by default).
- [ ] Buddy count and buddy preview behavior for profile pages is defined:
  - Who can see it (public, members-only, buddies-only, self-only)
  - Blocks influence visibility
- [ ] Profile endpoints are covered by integration tests (401, 403, 200, 400 validation).

**Evidence:**

- Docs: `services/fphgo/docs/profiles-v1.md`
- Tests:

---

## 6) Buddies v1 readiness

### 6.1 Buddy lifecycle

- [ ] Create buddy request (not self, not blocked).
- [ ] Incoming and outgoing requests list.
- [ ] Accept and decline request.
- [ ] Cancel outgoing pending request.
- [ ] Remove buddy.
- [ ] Reverse request dedupe is deterministic (A to B then B to A converges).
- [ ] Idempotency behavior is defined and tested for request creation and cancel.

**Evidence:**

- Docs: `services/fphgo/docs/buddies-v1.md`
- Tests:

### 6.2 Buddy visibility policy

- [ ] Buddy list and count visibility rules are documented and enforced.
- [ ] Blocks filter buddy list and count.
- [ ] Suspended users are excluded from listings for normal members (unless moderator view is intended and documented).
- [ ] List endpoint uses stable ordering and cursor pagination.

**Evidence:**

- Visibility doc section or link:
- Tests:

---

## 7) Messaging v1 readiness

### 7.1 Request model and preview flow

- [ ] Non-buddy DM creates a request state.
- [ ] Recipient sees request preview that includes the first message content before accepting.
- [ ] Sender can send additional messages while pending, as specified.
- [ ] Buddies bypass request and conversations are active immediately.
- [ ] Decline behavior is defined (what the sender sees, can they re-request, cooldown).
- [ ] Cooldowns exist for request initiation to prevent spam.

**Evidence:**

- Docs: `services/fphgo/docs/messaging-v1.md`
- Tests:

### 7.2 Inbox truth and read states

- [ ] Inbox list returns explicit state: pending, accepted, declined where relevant.
- [ ] Inbox ordering is stable (last message time desc with tie-breaker).
- [ ] Unread counts are correct and do not drift under rapid messages.
- [ ] Mark read endpoint is idempotent.
- [ ] Blocked relationships are excluded from inbox list.
- [ ] read_only and suspended users cannot send or create requests.

**Evidence:**

- Tests:
- Example payloads:

### 7.3 WebSockets and client updates

- [ ] WebSocket envelope is versioned and stable.
- [ ] Send buffer is bounded and disconnect behavior is safe.
- [ ] Heartbeat and deadlines are configured.
- [ ] Web uses websocket events to update cache with setQueryData, not refetch storms.
- [ ] Duplicate events do not corrupt state, or dedupe logic is present and tested.

**Evidence:**

- Websocket docs section:
- Tests or dev verification notes:

---

## 8) Chika v1 readiness

### 8.1 Categories and pseudonymity

- [ ] Categories exist and include a pseudonymous flag.
- [ ] Pseudonymity is per thread and stable for a given author within a thread.
- [ ] Member responses do not leak real identity in pseudonymous categories.
- [ ] Moderator responses include real identity only when `chika.moderate` (or equivalent) permission is present.
- [ ] Blocks filter thread and comment lists both directions.
- [ ] Hidden thread/comment visibility follows moderation rules (members cannot see, moderators can see with marker).

**Evidence:**

- Docs: `services/fphgo/docs/chika-v1.md`
- Tests:

### 8.2 Threads and comments flows

- [ ] Create thread with validation.
- [ ] List threads with cursor pagination and stable ordering.
- [ ] Thread detail is correct and stable.
- [ ] Create comment with validation.
- [ ] List comments with cursor pagination and stable ordering.
- [ ] Rate limits exist for thread and comment creation.
- [ ] Reports integration exists for thread and comment items in UI.

**Evidence:**

- Tests:
- Example payloads:

---

## 9) Operational guardrails

### 9.1 Rate limits and cooldowns are present and documented

- [ ] Rate limits and cooldown rules are documented: `services/fphgo/docs/rate-limits-v1.md`.
- [ ] High-risk endpoints have throttling:
  - reports.create
  - messages.send and request create
  - chika create thread and comment
  - buddy request create
- [ ] 429 responses include stable code and retry semantics.

**Evidence:**

- Docs:
- Tests:

### 9.2 Pagination is consistent

- [ ] A shared cursor pattern is used across list endpoints.
- [ ] Limit defaults and max clamp exist and are consistent.
- [ ] Sorting rules are stable and documented per endpoint.

**Evidence:**

- Tests:
- Docs:

---

## 10) Data and database readiness

- [ ] Fresh DB bootstrap works from zero:
  - apply all migrations
  - run sqlc generation
  - start API and pass smoke tests
- [ ] Migrations are reversible where required, or rollback strategy is documented.
- [ ] Indexes exist for hot queries:
  - messaging inbox sorting and lookups
  - chika thread list sorting and filtering
  - reports list by status and created_at
  - blocks both-direction checks
  - buddy list and request lookups
- [ ] Backup plan exists for production Postgres, including restore procedure.
- [ ] Secrets and DSN handling are correct across environments.

**Evidence:**

- Commands and output:
- Backup notes:

---

## 11) CI and quality gates

- [ ] CI runs in a clean environment:
  - start Postgres service
  - run migrations (Goose)
  - run sqlc generation as needed
  - run `go test ./...` including integration tests
  - run `go vet ./...`
- [ ] Route invariants are enforced by tests.
- [ ] Contract tests exist for at least:
  - /v1/me
  - one endpoint each for profiles, blocks, reports, buddies, messaging, chika
- [ ] `apps/web` build and basic lint checks pass.
- [ ] No production build includes dev-only auth bypass.

**Evidence:**

- CI run link:
- Logs summary:

---

## 12) Observability and runbooks

### 12.1 Logging and health

- [ ] Request logging exists with method, path, status, duration, request id.
- [ ] Errors logged include ApiError code where applicable.
- [ ] Health endpoints exist: liveness and readiness.
- [ ] Websocket connection counts are visible somewhere (log or metrics).

**Evidence:**

- Log example:
- Health endpoint outputs:

### 12.2 Minimal metrics and alerts (MVP level)

- [ ] Track request rate, latency, error rate.
- [ ] Track 4xx and 5xx counts separately.
- [ ] Track rate limit triggers count.
- [ ] Track websocket connected clients count.
- [ ] Alerting exists at least for:
  - elevated 5xx
  - DB connectivity failures
  - sustained latency increase

**Evidence:**

- Dashboard links or screenshots:
- Alert rules notes:

### 12.3 Runbooks are written

- [ ] How to suspend and unsuspend a user.
- [ ] How to set and clear read_only.
- [ ] How to hide and unhide chika content.
- [ ] How to investigate a report and record action taken.
- [ ] How to rollback API deploy.
- [ ] How to rollback migrations, or how to restore DB from backup.
- [ ] How to rotate Clerk keys and secrets safely.

**Evidence:**

- Runbook locations:

---

## 13) Release execution plan

### 13.1 Staging validation

- [ ] Deploy `services/fphgo` to staging with production-like config.
- [ ] Run a manual smoke suite on staging:
  - sign in
  - profile view and edit
  - buddy request flow
  - DM request preview and accept
  - send and receive messages
  - chika create and browse
  - block and verify enforcement
  - report user and content
  - moderator action taken, verify effect
- [ ] Verify rate limits trigger predictably.
- [ ] Verify logs and metrics populate.

**Evidence:**

- Staging URL:
- Smoke results:

### 13.2 Production cutover checklist

- [ ] Confirm all required env vars are set in production.
- [ ] Apply DB migrations with safe procedure.
- [ ] Deploy backend first.
- [ ] Deploy web next.
- [ ] Run production smoke suite after deploy.
- [ ] Announce release and monitor metrics.

**Evidence:**

- Production smoke results:

### 13.3 Rollback plan

- [ ] Rollback steps are written and understood.
- [ ] Rollback decision criteria are defined (error rate, auth failures, DB issues).
- [ ] DB rollback strategy exists (down migrations or restore).
- [ ] Web rollback strategy exists (previous deploy artifact).

**Evidence:**

- Rollback doc link:

---

## 14) Final go or no-go sign-off

### 14.1 Sign-off table

| Area | Owner | Ready (Y/N) | Evidence link | Notes |
| --- | --- | --- | --- | --- |
| Scope lock and routes | TBD |  |  |  |
| Auth and authz | TBD |  |  |  |
| Contracts and types | TBD |  |  |  |
| Safety and moderation | TBD |  |  |  |
| Profiles | TBD |  |  |  |
| Buddies | TBD |  |  |  |
| Messaging | TBD |  |  |  |
| Chika | TBD |  |  |  |
| DB and migrations | TBD |  |  |  |
| CI and tests | TBD |  |  |  |
| Observability | TBD |  |  |  |

### 14.2 Release decision

- Go decision: `TBD`
- Time decided: `TBD`
- Release Captain: `TBD`
- Notes:

