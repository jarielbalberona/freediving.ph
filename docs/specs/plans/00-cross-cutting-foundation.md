# Cross-Cutting Foundation Plan

## Scope

This plan covers prerequisites required by all features: authentication, RBAC, privacy controls, moderation, reporting, audit logging, rate limiting, and observability.

## Phase 0: Platform Baseline

### Backend

- Define canonical data model for `User`, `Profile`, `Block`, `Report`, `AuditLog`.
- Implement authentication (email/social) and account state (`active`, `suspended`, `deleted`).
- Implement RBAC middleware for global roles (`guest`, `member`, `moderator`, `admin`) and scoped roles.
- Implement centralized authorization policy checks (server-side only).
- Implement generic report API (`targetType`, `targetId`, `reasonCode`, `text`).
- Implement shared rate-limit service with per-feature policy keys.

### Frontend

- Build auth flows, session persistence, and role-aware navigation guards.
- Build reusable privacy/visibility selectors (`public`, `members_only`, `private`).
- Build report modal component and attachable report action for supported entities.

### Data and Ops

- Add soft-delete and anonymization strategy for user-generated content.
- Add audit log table/events for moderator/admin sensitive actions.
- Add moderation queue index and search filters by entity and reason code.

### Exit Criteria

- Every protected endpoint enforces policy checks.
- Reports can be filed on at least one sample object per target type.
- Audit logs are produced for role changes and content removals.

## Phase 1: Abuse and Safety Hardening

- Enforce baseline anti-spam limits from spec.
- Add account-age gating framework (`<24 hours`) for selected features.
- Add block enforcement layer shared by messaging, buddy finder, and discovery.
- Add moderation reason-code taxonomy and consistent placeholders for removed/deleted content.
- Add admin tooling for temporary feature restrictions (DM ban, posting cooldown).

## Phase 2: Operational Readiness

- Add alerting dashboards: moderation load, report backlog, ban rates, spam-rate trends.
- Add background jobs for stale pending requests, abuse pattern detection, and retention tasks.
- Add policy regression tests for role matrix and edge cases.

## Dependencies

- No feature should ship publicly before Phase 0 baseline is complete.

## Risks

- Authorization drift across services.
- Inconsistent moderation actions if reason codes are not centralized.

## Test Strategy

- Unit tests: policy matrix and role checks.
- Integration tests: report lifecycle and moderation actions.
- E2E tests: blocked-user and suspended-user behavior.
