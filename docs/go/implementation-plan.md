# Go API Migration Implementation Plan

## Verification Snapshot (Current `services/fphgo`)

### What is already in place

- Modular monolith structure is real and usable: `internal/features/<domain>/{http,service,repo}`.
- Router and middleware baseline exists: request ID, request logging, panic recovery, CORS, global rate limit.
- Auth integration exists via Clerk middleware (`AttachClerkAuth`, `RequireMember`).
- DB baseline exists: Goose migration + schema file + `pgxpool`.
- Realtime baseline exists: in-memory WebSocket hub with `/ws`.
- Existing domains in Go:
  - `users` (create/get/me with Clerk-to-local user mapping)
  - `messaging` (send/inbox/requests/accept/reject)
  - `chika` (post creation only)
  - `explore` (list dive sites)
- `go test ./...` passes.

### What is missing vs product scope

- No full RBAC/permission matrix yet (only member gate).
- No full groups/community domain.
- No marketplace domain.
- No collaboration domain beyond basic WS.
- No feed/timeline/ranking system.
- No moderation/reporting and audit subsystem in Go yet.
- Limited tests in service/repo layers for policy-heavy behavior.
- No migration compatibility layer/cutover process documented in Go docs.

## Execution Strategy

- Build and harden as a modular monolith first.
- Migrate in vertical slices with strict API contract parity checks against Node.
- Do not split into microservices until one domain proves clear scaling pain.
- Keep Postgres as shared system of record during migration.

## Priority Roadmap (Items 1-9)

## 1) Platform Foundation (Auth, Identity, RBAC)

### Goals

- Establish canonical identity and authorization model for all domains.

### Deliverables

- `identity` and `rbac` feature modules:
  - global roles, group roles, event roles
  - permission matrix + overrides
- Auth context enrichment middleware:
  - Clerk claims -> local user -> effective permissions
- Protected policy helpers (resource + scope checks).

### DB Work

- Add tables equivalent to:
  - `app_users` (or extend `users`)
  - `group_memberships`, `event_memberships`
  - `user_permission_overrides`
  - audit for authorization decisions

### Exit Criteria

- Every protected endpoint uses a single permission evaluation flow.
- No handler-level ad hoc authorization logic.

## 2) Core Social Write Path (Threads/Posts/Comments/Reactions/Media Metadata)

### Goals

- Rebuild core social creation/update flows with consistent contracts.

### Deliverables

- Expand `chika` into full thread lifecycle:
  - create/list/get/update/delete thread
  - create/list/update/delete comment
  - add/remove reaction
- Media metadata module for attachment references (object storage integration can stay minimal in v1).

### DB Work

- Add normalized thread/comment/reaction/media tables with moderation-safe fields.
- Add pagination-safe indexes for created-at and foreign key paths.

### Exit Criteria

- End-to-end posting/reply/reaction flows are stable with pagination.
- Pseudonymous mode does not leak actor identity.

## 3) Moderation and Safety (Reports, Blocks, Abuse Controls, Audit)

### Goals

- Prevent platform abuse and make moderation actions traceable.

### Deliverables

- `moderation` and `reports` modules:
  - submit report
  - moderator queue
  - action execution (hide/remove/suspend/restore)
- `blocks` behavior enforced in all read/write paths.
- Audit logging on all moderator actions.

### DB Work

- Add `reports`, `report_targets`, `moderation_actions`, `audit_logs`.
- Add moderation status fields on user/content entities.

### Exit Criteria

- No moderator action without audit trail.
- Block rules enforced server-side across messaging + social endpoints.

## 4) Read Path and Feed Assembly (No Ranking Yet)

### Goals

- Build deterministic retrieval and timeline composition first.

### Deliverables

- `feed` module:
  - timeline aggregation endpoints
  - deterministic pagination (cursor preferred)
- Read model queries with visibility/moderation filters.
- Optional cache layer for hot lists (deferred if unnecessary early).

### Exit Criteria

- Stable and repeatable pagination under concurrent writes.
- Retrieval excludes blocked/hidden/removed content by default.

## 5) Notifications

### Goals

- Deliver asynchronous user notifications for core events.

### Deliverables

- `notifications` module:
  - create/list/mark-read APIs
- Event dispatch from social/messaging/moderation actions.
- Worker process for fanout (initially DB-backed queue table).

### DB Work

- `notifications`, `notification_settings`, `notification_deliveries` (or equivalent).

### Exit Criteria

- Notification generation decoupled from synchronous request path.

## 6) Groups / Community Features

### Goals

- Add group-scoped interactions and role-governed management.

### Deliverables

- `groups` module:
  - create group, memberships, invites/requests
  - group roles and moderation controls
- Group-scoped threads/posts mapping.

### DB Work

- `groups`, `group_memberships`, `group_invites`, group-content join tables.

### Exit Criteria

- Group role checks enforced through centralized RBAC rules.

## 7) Marketplace

### Goals

- Support listing workflows safely without poisoning core social model.

### Deliverables

- `marketplace` module:
  - listing CRUD
  - listing moderation state
  - seller/buyer messaging hook integration
- Anti-fraud and abuse checks integrated with moderation module.

### DB Work

- `listings`, listing media, listing status history, listing reports.

### Exit Criteria

- Listing lifecycle state machine is explicit and tested.

## 8) Collaboration / Realtime Expansion

### Goals

- Move beyond basic WS broadcast into scoped realtime features.

### Deliverables

- Upgrade `realtime` module:
  - room/channel scoping
  - presence
  - typed event contracts per domain
- Collaboration APIs (shared threads/spaces/tasks depending on final product scope).

### Platform Notes

- Keep in-memory hub for dev/single instance.
- Add Redis/NATS only when multi-instance fanout is required.

### Exit Criteria

- Realtime events are scoped, bounded, and versioned.

## 9) Advanced Feed Ranking and Search

### Goals

- Add ranking/personalization only after baseline behavior is stable.

### Deliverables

- Ranking pipeline:
  - scoring strategy abstraction
  - feature store inputs (engagement, recency, relationship signals)
- Search indexing path (Postgres FTS first; external engine later if needed).

### Exit Criteria

- Ranking is configurable, explainable, and reversible.
- Fallback deterministic feed remains available.

## Cross-Cutting Milestones

## Milestone A: Contract Governance

- Produce canonical OpenAPI specs per migrated domain.
- Add Node-vs-Go contract parity tests for status codes and response envelopes.

## Milestone B: Migration Safety

- Route-group cutover checklist:
  - shadow reads
  - canary traffic
  - rollback runbook

## Milestone C: Quality Gates

- Required for each phase:
  - `go test ./...`
  - `go vet ./...`
  - sql migration up/down test
  - domain-level unit + integration tests for policy rules

## Suggested Phase Order and Timeline

1. Phase 1-3 (Foundation + core writes + moderation): 6-10 weeks
2. Phase 4-6 (read path + notifications + groups): 6-8 weeks
3. Phase 7-9 (marketplace + collaboration + ranking): 8-12 weeks

This is a realistic side-project pacing assumption with disciplined weekly execution.

## Immediate Next Actions

1. Finalize canonical permission model and RBAC schema changes.
2. Define contract parity format for one pilot domain (`/v1/chika` suggested).
3. Implement service-level tests for current `messaging` policy matrix before adding more domains.
4. Start Item 1 migration branch and keep all changes behind feature flags or route-level toggles.
