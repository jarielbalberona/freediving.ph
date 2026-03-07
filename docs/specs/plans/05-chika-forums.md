# 4.5 Chika (Forums) - Implementation Plan

## Scope

Thread-based forums with category modes (`normal`, `pseudonymous_chika`) and strict moderation controls.

## Phase 0: Policy and Pseudonym Design

- Define category-level mode and visibility controls.
- Design per-thread pseudonym generation and uniqueness constraints.
- Implement identity mapping table visible only to moderator/admin.
- Define stricter pseudonymous rate limits and account-age gating.

## Phase 1: MVP

### Backend

- CRUD-lite for threads/posts with soft-delete and lock states.
- Category browse/list endpoints with visibility filtering.
- Pseudonym resolution layer for pseudonymous categories.
- Post edit history persistence for moderation.

### Frontend

- Forum index by category and thread list.
- Thread view and reply composer.
- Category mode-aware identity display (real profile vs pseudonym).

### Acceptance

- Pseudonymous posts show generated handle per thread.
- Moderator/admin can inspect real identity; normal users cannot.
- Account-age and stricter limits apply to pseudonymous categories.

## Phase 2: Moderation Hardening

- Fast remove with reason codes and lock thread tools.
- Chika-specific cooldown restrictions per user.
- Reporting workflows for threads/posts with SLA queueing.

## Phase 3: Enhancements

- Add auto-lock heuristics for abuse bursts.
- Add moderator insights dashboard for pseudonymous abuse patterns.

## Dependencies

- Requires reporting, audit logs, rate-limiting, and role enforcement baseline.
