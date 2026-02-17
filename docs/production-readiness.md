# Production Readiness Plan

Source of truth: `docs/specs/main.md` (FPH Feature Specification v1.1)

## Scope Rules
- No product-scope expansion unless required for safety/security/reliability.
- Authorization is enforced server-side only; UI checks are advisory.
- If a module is placeholder in spec (marketplace/collaboration heavy trust features), treat deep trust workflows as out-of-scope for launch and block unsafe partial rollout.

## A) Security

### Auth hardening, session/token handling
- Standardize one API authorization layer for all protected endpoints.
- Enforce bearer token verification, account status check, and consistent unauthorized/forbidden error payloads.
- Document token TTL expectations and reject stale/invalid tokens deterministically.
- Ensure auth-required routes cannot be reached through alternate route aliases.

### RBAC and permission checks per endpoint
- Map current DB roles to spec roles:
  - `guest`: unauthenticated
  - `member`: `USER|SUBSCRIBER|CONTRIBUTOR|AUTHOR`
  - `moderator`: `EDITOR`
  - `admin`: `ADMINISTRATOR|SUPER_ADMIN`
- Add reusable permission helpers for platform roles and group-scoped roles (`owner|moderator|member`).
- Add endpoint-level permission assertions for all write/moderation actions.

### Input validation and output encoding
- Enforce Zod validation for every write endpoint (`POST|PUT|PATCH|DELETE` with body/params/query checks as applicable).
- Normalize validation failure payload: message + machine-readable field errors.
- Add sanitization strategy for UGC rendered as HTML (if rich text is allowed, sanitize server-side).
- Keep React rendering escaped by default; ban raw HTML rendering without sanitizer.

### Rate limiting and abuse prevention
- Enable global limiter and explicit per-feature limiters.
- Enforce configurable limits for:
  - buddy requests
  - direct message sends
  - Chika threads/posts (stricter in pseudonymous mode)
  - reports and moderation actions (to prevent abuse/flood)
- Persist counters in distributed store before multi-instance production rollout (current in-memory limiter is insufficient at scale).

### CSRF
- If API is bearer-token-only for writes: disable or scope CSRF checks to cookie-auth endpoints.
- If cookie auth remains for any mutating endpoint: enforce CSRF token validation only on those endpoints and test both pass/fail.

### File uploads
- Keep strict mime/type/size limits.
- Add upload allowlist, extension verification, and content-type sniffing.
- Add malware scanning workflow (async quarantine + scan) before publication, or disable public uploads until scanner exists.

### Secrets/env/dependencies
- Keep env schema validation on boot (`src/core/env.ts`), fail fast.
- Move secrets to Render secret store only; never `.env` in production.
- Add dependency vulnerability scan in CI (`pnpm audit` or SCA tool) with policy gates for criticals.

## B) Reliability

### Idempotency
- Add idempotency keys for operations with repeat-risk (report submission, buddy request create, conversation create).
- Ensure duplicate submits return deterministic response without duplicate writes.

### Error model, retries, timeouts
- Standardize API error envelope and status codes.
- Set outbound timeouts/retry policy for external calls (Clerk, S3, email).
- Prevent retry storms: exponential backoff + capped attempts.

### Background jobs
- Define job boundary for async tasks:
  - notifications fan-out
  - moderation follow-up actions
  - media scanning/post-processing
- If no queue is introduced now, explicitly keep tasks synchronous and scoped; do not fake async reliability.

### DB migrations and rollback
- Require forward migration + rollback plan per migration.
- Gate production deploy on migration success.
- Add migration smoke test in staging using production-like snapshot.

### Backup/restore
- Define backup frequency and retention.
- Run restore drill in staging at least once per release train.

## C) Observability
- Structured JSON logs with request ID and user ID (where authenticated).
- HTTP metrics: request latency (p50/p95/p99), error rate, throughput.
- DB metrics: slow query count, connection saturation.
- Alerting thresholds:
  - 5xx spike
  - auth failure anomalies
  - moderation queue/report spikes
- Add readiness/health checks with DB connectivity and critical dependency probes.

## D) Performance
- Enforce pagination for all UGC list endpoints.
- Add explicit indexes for hot paths (threads/comments/messages/events/dive spots/buddy finder).
- Audit N+1 in service `with` joins and aggregate counts.
- Add cache strategy:
  - server-side short TTL for public browse lists
  - client query caching with invalidation on writes

## E) Moderation Readiness (Launch-Blocking)
- Reporting pipeline operational for all in-scope content types.
- Moderator actions: remove with reason code, lock thread, suspend user, feature restrictions.
- Audit logging for all sensitive actions.
- Pseudonymous Chika identity reveal available only to moderator/admin.
- Fast-path moderation endpoints must be rate-limited and audited.

## F) Privacy And Compliance Basics
- Coarse location by default (city/region only).
- Block rules enforced across messaging, buddy flows, buddy finder visibility, and relevant profile/forum surfaces.
- Soft delete for UGC and moderation removals with placeholders.
- Account deletion path anonymizes authored content unless legal hard-delete is required.
- Add user data export/delete request endpoints/process notes.

## G) CI/CD
- Required PR checks: typecheck, lint, tests.
- Preview deployments per PR for web + API.
- Staging and production environment separation with distinct secrets and DBs.
- Deploy pipeline order:
  - run migrations
  - verify readiness checks
  - shift traffic
  - rollback plan documented

## Implementation Plan (PR Sequence)

### PR 1 (Phase 1): Access control and validation
- Unify authorization middleware + role/group permission helpers.
- Normalize validation and error responses.
- Add pagination to legacy UGC list endpoints.
- Add tests for role mapping/permission helpers and pagination/validation contracts.

### PR 2 (Phase 2): Abuse controls
- Enforce configurable rate limits per spec defaults.
- Add pseudonymous Chika new-account gating and cooldown rules.
- Enforce blocking consistently across affected features.

### PR 3 (Phase 3): Moderation tooling
- Complete reporting coverage + moderator actions.
- Add/complete audit log writes for sensitive actions.
- Enforce moderator-only pseudonym identity reveal.

### PR 4 (Phase 4): Observability and ops
- Structured logging + request IDs.
- Metrics and health/readiness checks.
- Timeout/retry defaults for external dependencies.

### PR 5 (Phase 5): Data safety
- Soft delete and anonymization consistency.
- Index additions for core query paths.
- Migration discipline + backup/restore runbook.

### PR 6 (Phase 6): Frontend hardening
- Route guards by role and auth state.
- Fail-safe UI auth behavior (never trust client-side authorization).
- Safe optimistic updates with rollback.
- Removed-content placeholders and moderation states.

## Launch Checklist (Staging Gate)
- Authz checks confirmed for every write/mod endpoint.
- Validation coverage confirmed for all write endpoints.
- Pagination present on every UGC listing endpoint.
- Rate limiting enabled and tuned.
- Block rules tested across messaging/buddy/finder/profile/forum visibility.
- Reporting and moderation flows tested end-to-end.
- Pseudonymous Chika: per-thread pseudonym and mod-only identity reveal validated.
- Soft delete/anonymization flows validated.
- Structured logs + request IDs visible in centralized logging.
- Alerts fire correctly for synthetic 5xx and auth-failure tests.
- Backup restore drill completed and documented.
