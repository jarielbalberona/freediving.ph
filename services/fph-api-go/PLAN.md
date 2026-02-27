# PLAN.md

## Plan Principles
- Align implementation with FPH Feature Specification v1.1.
- Keep policy enforcement in service layer and visibility constraints in queries.
- Ship in vertical slices with testable, reversible milestones.

## Phase 0: Repo Baseline And Tooling Validation
### Scope
- Confirm scaffold integrity, Make targets, local run/test loop.
- Validate `sqlc`, goose, and DB connectivity assumptions.
- Define folder conventions for per-feature modules.

### Key Tables/Queries Touched
- Baseline schema/migration bootstrap only.
- Health/minimal introspection queries.

### Endpoints Introduced/Changed
- `GET /healthz`
- `GET /readyz`

### Tests Required
- Unit: health handler/service smoke.
- Integration: DB connect + migration up/down sanity.

### Exit Criteria
- `make dev`, `make test`, `make sqlc`, `make migrate-up/down` all run successfully.
- Baseline app boots and responds on health endpoints.

## Phase 1: Auth Stub + Users/Profiles Baseline
### Scope
- Define auth interfaces (`IdentityProvider`, token claims contract).
- Add auth middleware placeholder (no provider lock-in yet).
- Implement users/profiles read/update baseline with policy checks.

### Key Tables/Queries Touched
- `users`, `profiles`, optional `user_settings`.
- Queries for get-by-id, get-by-handle, update profile fields.

### Endpoints Introduced/Changed
- `GET /v1/users/me`
- `PATCH /v1/users/me/profile`
- `GET /v1/users/:id`

### Tests Required
- Unit: auth middleware behavior (pass-through/stub denial), profile service rules.
- Integration: repo queries for profile retrieval/update and visibility-safe reads.

### Exit Criteria
- Auth interface and middleware placeholder are stable and documented.
- Users/profiles baseline endpoints pass unit/integration tests.

## Phase 2: Messaging v1 (Request Flow + Inbox + WS Events)
### Scope
- Implement DM initiation rules:
  - DM anyone unless blocked/visibility-forbidden.
  - Buddy pair => active immediately.
  - Non-buddy => pending, recipient acceptance required.
- Support pending previews and multiple pending messages.
- Add acceptance/rejection flow.
- Deliver inbox and real-time events via WebSocket.
- Enforce service-level rate limits and cooldowns.

### Key Tables/Queries Touched
- `conversations`, `conversation_participants`, `messages`.
- `message_requests` or equivalent pending-state model.
- Buddy/relationship and blocklist lookup queries.
- Inbox list, pending preview, accept/reject transition queries.

### Endpoints Introduced/Changed
- `POST /v1/messages/dm`
- `GET /v1/messages/inbox`
- `GET /v1/messages/pending`
- `POST /v1/messages/pending/:conversationId/accept`
- `POST /v1/messages/pending/:conversationId/reject`
- `GET /v1/ws` (authenticated WebSocket)

### Tests Required
- Unit: service policy matrix (buddy vs non-buddy, blocked, pending preview, multi-pending, cooldown/rate limit).
- Integration: transaction-safe accept/reject flows, inbox ordering, visibility constraints.
- WS: envelope validation, overflow disconnect, heartbeat/deadline behavior.

### Exit Criteria
- Messaging rules are enforced exactly as specified and tested.
- Inbox/pending states are consistent after concurrent actions.
- WS delivers bounded, versioned event envelopes.

## Phase 3: Chika v1 (Categories, Threads, Posts + Pseudonymous Rules)
### Scope
- Implement categories, threads, posts CRUD baseline.
- Add pseudonymous posting mode with strict identity protection.
- Include moderation state visibility rules in read paths.

### Key Tables/Queries Touched
- `chika_categories`, `chika_threads`, `chika_posts`.
- `chika_actor_alias` (or equivalent pseudonymous mapping, internal-only).
- Queries with moderation/visibility predicates.

### Endpoints Introduced/Changed
- `GET /v1/chika/categories`
- `GET /v1/chika/threads`
- `POST /v1/chika/threads`
- `GET /v1/chika/threads/:id/posts`
- `POST /v1/chika/threads/:id/posts`

### Tests Required
- Unit: pseudonymous rules and posting permissions.
- Integration: query-level visibility/moderation filtering and identity non-leak checks.

### Exit Criteria
- Pseudonymous mode never exposes real identity in API/WS payloads.
- Category/thread/post workflows pass policy and visibility tests.

## Phase 4: Explore v1 (Dive Sites Browse/Search/Filter + Moderation State)
### Scope
- Implement dive site browse/search/filter endpoints.
- Enforce moderation/publication state on results.
- Provide stable pagination and sorting behavior.

### Key Tables/Queries Touched
- `dive_sites`, `site_tags`, `site_media` (or equivalent).
- Search/filter queries with moderation state conditions.

### Endpoints Introduced/Changed
- `GET /v1/explore/sites`
- `GET /v1/explore/sites/:id`
- Optional: `GET /v1/explore/filters`

### Tests Required
- Unit: filter parsing and service-level guardrails.
- Integration: search relevance baseline, pagination determinism, moderation filtering.

### Exit Criteria
- Explore endpoints return only policy-allowed content.
- Pagination/filter behavior is deterministic and documented.

## Phase 5: Moderation + Reporting Baseline + Audit Log (Minimal)
### Scope
- Add reporting intake and minimal moderation actions.
- Implement minimal audit log writes for moderator actions.
- Define escalation statuses and resolution workflow skeleton.

### Key Tables/Queries Touched
- `reports`, `report_targets`, `moderation_actions`, `audit_logs`.
- Queries for report queue, action application, and audit insertions.

### Endpoints Introduced/Changed
- `POST /v1/reports`
- `GET /v1/mod/reports`
- `POST /v1/mod/actions`

### Tests Required
- Unit: moderation authorization and action validation.
- Integration: report lifecycle transitions and required audit record creation.

### Exit Criteria
- Every moderator action emits an auditable record.
- Minimal report triage flow works end-to-end.

## Phase 6: Hardening (Rate Limits, Abuse Controls, Pagination, Observability Hooks)
### Scope
- Expand per-route/service rate limits and cooldown controls.
- Add abuse heuristics and enforcement hooks.
- Normalize pagination contracts across domains.
- Add observability hooks (structured logs, metrics, trace points).

### Key Tables/Queries Touched
- Optional abuse/rate-limit persistence tables if needed.
- Query refinements for consistent cursor/keyset pagination.

### Endpoints Introduced/Changed
- No major new domain endpoints.
- Add/standardize headers and response metadata for limits/pagination.

### Tests Required
- Unit: limiter/cooldown policies and abuse decision logic.
- Integration: pagination consistency under writes; middleware/service observability emission sanity.

### Exit Criteria
- High-risk endpoints have enforceable anti-abuse controls.
- Pagination and observability conventions are consistent across services.

## Phase 7: Migration Strategy Node/Express -> Go
### Scope
- Execute route-by-route migration plan against shared Postgres.
- Maintain compatibility layer for clients during cutover.
- Add parity checks and rollback strategy per route group.

### Key Tables/Queries Touched
- Shared production tables across migrated domains.
- Parity queries and temporary compatibility adapters where needed.

### Endpoints Introduced/Changed
- Dual-run or staged cutover for `/v1/*` route groups.
- Deprecation markers for Node routes as Go parity lands.

### Tests Required
- Unit: adapter/compatibility behavior.
- Integration: contract parity tests (response shape + status semantics) between Node and Go for migrated routes.
- Smoke: canary and rollback rehearsals.

### Exit Criteria
- Each migrated route group meets parity SLA before traffic shift.
- Rollback path validated.
- Node surface area reduced to agreed residual scope with deprecation timeline.
