# Rate Limits v1

Last updated: 2026-02-28

## Scope

This document defines v1 abuse controls for write-heavy endpoints in `services/fphgo`.

Implementation notes:
- Backend: PostgreSQL-backed event limiter via `internal/shared/ratelimit`
- Storage: `rate_limit_events` table
- Enforcement layer: service layer only (handlers remain thin)
- No Redis/external rate-limit service in v1

## Error Contract

When limit is exceeded:
- HTTP status: `429 Too Many Requests`
- API error code: `rate_limited`
- Message includes retry semantics (`retry after <seconds>s`)
- `Retry-After` response header is set (seconds)
- Error details include:
  - `window_seconds`
  - `retry_after_seconds`

When limiter infrastructure fails:
- HTTP status: `500`
- API error code: `rate_limit_failed`

## Policies

Global baseline:
- IP middleware guardrail (`internal/middleware/ratelimit`): configurable per deployment (`RateLimitPerMin`, default 300/min).
- Feature write endpoints below have service-level actor-scoped limits/cooldowns.

### Chika

| Scope Key | Limit | Window | Applies To |
|---|---:|---:|---|
| `chika.create_thread` per actor | 5 | 1 hour | `POST /v1/chika/threads` |
| `chika.update_thread` per actor | 30 | 1 minute | `PATCH /v1/chika/threads/{threadId}` |
| `chika.delete_thread` per actor | 20 | 1 minute | `DELETE /v1/chika/threads/{threadId}` |
| `chika.create_post` per actor | 40 | 1 minute | `POST /v1/chika/threads/{threadId}/posts` |
| `chika.create_comment` per actor | 60 | 1 minute | `POST /v1/chika/threads/{threadId}/comments` |
| `chika.update_comment` per actor | 40 | 1 minute | `PATCH /v1/chika/comments/{commentId}` |
| `chika.delete_comment` per actor | 30 | 1 minute | `DELETE /v1/chika/comments/{commentId}` |
| `chika.set_reaction` per actor | 120 | 1 minute | `POST /v1/chika/threads/{threadId}/reactions` |
| `chika.remove_reaction` per actor | 120 | 1 minute | `DELETE /v1/chika/threads/{threadId}/reactions` |
| `chika.create_media` per actor | 30 | 1 minute | `POST /v1/chika/media` |

### Profiles

| Scope Key | Limit | Window | Applies To |
|---|---:|---:|---|
| `profiles.update` per actor | 10 | 1 minute | `PATCH /v1/me/profile` |

### Blocks

| Scope Key | Limit | Window | Applies To |
|---|---:|---:|---|
| `blocks.write` per actor | 40 | 1 minute | `POST /v1/blocks`, `DELETE /v1/blocks/{blockedUserId}` |

### Buddies

| Scope Key | Limit | Window | Applies To |
|---|---:|---:|---|
| `buddies.create_request` per actor | 20 | 1 hour | `POST /v1/buddies/requests` |
| `buddies.transition` per actor | 60 | 1 minute | `POST /v1/buddies/requests/{requestId}/accept`, `POST /v1/buddies/requests/{requestId}/decline` |
| `buddies.remove` per actor | 30 | 1 minute | `DELETE /v1/buddies/{buddyUserId}` |
| `buddyfinder.create_intent` per actor | 3 | 24 hours | `POST /v1/buddy-finder/intents` |
| `buddyfinder.message_entry` per actor+target | 1 | 2 minutes | `POST /v1/buddy-finder/intents/{id}/message` |

### Explore

| Scope Key | Limit | Window | Applies To |
|---|---:|---:|---|
| `explore.create_update` per actor | 5 | 1 hour | `POST /v1/explore/sites/{siteId}/updates` |

### Messaging

| Scope Key | Limit | Window | Applies To |
|---|---:|---:|---|
| `messages.send` per sender | 30 | 1 minute | `POST /v1/messages/requests`, `POST /v1/messages/conversations/{id}` |
| `messages.request_initiation` per sender+recipient | 1 | 2 minutes | Non-buddy `POST /v1/messages/requests` |
| `messages.transition` per actor | 60 | 1 minute | `POST /v1/messages/requests/{id}/accept`, `POST /v1/messages/requests/{id}/decline` |

### Reports

| Scope Key | Limit | Window | Applies To |
|---|---:|---:|---|
| Report target cooldown (custom) | 1 per target | 24 hours | `POST /v1/reports` |
| Reporter daily cap (custom) | 20 | 1 day | `POST /v1/reports` |
| `reports.update_status` per actor | 60 | 1 minute | `PATCH /v1/reports/{reportId}/status` |

### Moderation Actions

| Scope Key | Limit | Window | Applies To |
|---|---:|---:|---|
| `moderation.action` per actor | 60 | 1 minute | All moderation write endpoints (suspend, unsuspend, set read-only, clear read-only, hide/unhide thread, hide/unhide comment) |

### Users

| Scope Key | Limit | Window | Applies To |
|---|---:|---:|---|
| (global IP middleware) | 300 | 1 minute | `POST /v1/users` — no actor-level limit (unauthenticated registration endpoint) |

## Coverage Summary

| Feature | Write Endpoints | Rate Limited | Notes |
|---|---:|---:|---|
| Chika | 10 | 10 | Full coverage |
| Explore | 3 | 1 | Site save endpoints currently rely on authz and IP guardrail; update creation has actor-scoped limit |
| Profiles | 1 | 1 | Full coverage |
| Blocks | 2 | 2 | Full coverage |
| Buddies | 4 | 4 | Full coverage |
| Buddy Finder | 3 | 2 | Create intent and message entry have actor-scoped limits; delete own intent does not |
| Messaging | 5 | 4 | `MarkRead` excluded (idempotent read-state) |
| Reports | 2 | 2 | CreateReport uses custom cooldown; UpdateStatus uses shared limiter |
| Moderation Actions | 8 | 8 | All share `moderation.action` scope |
| Users | 1 | 1 | Global IP middleware only (no actor available) |

**Total: 39 write endpoints, 34 with feature-level limits, remaining endpoints covered by authz and baseline IP guardrail.**

## Test Coverage

Rate limit contract tests verify 429 status, `Retry-After` header, and `rate_limited` error code:

| Test | Feature | File |
|---|---|---|
| `TestChikaCreateCommentRateLimited` | Chika | `chika/http/integration_blocks_test.go` |
| `TestChikaCreatePostRateLimitedContract` | Chika | `chika/http/integration_blocks_test.go` |
| `TestPatchProfileRateLimitedContract` | Profiles | `profiles/http/integration_test.go` |
| `TestBlocksCreateRateLimitedContract` | Blocks | `blocks/http/integration_test.go` |
| `TestBuddiesCreateRequestRateLimitedContract` | Buddies | `buddies/http/integration_test.go` |
| `TestBuddiesRemoveBuddyRateLimitedContract` | Buddies | `buddies/http/integration_test.go` |
| `TestModerationSuspendUserRateLimitedContract` | Moderation | `moderation_actions/http/integration_test.go` |
| `TestModerationHideThreadRateLimitedContract` | Moderation | `moderation_actions/http/integration_test.go` |
| `TestCreateReportCooldown` | Reports | `reports/http/integration_test.go` |
| `TestReportUpdateStatusRateLimitedContract` | Reports | `reports/http/integration_test.go` |

## Pagination Guardrail Standard

Shared helper: `internal/shared/pagination`

- default limit: `20`
- max limit: `100` (clamped)
- cursor encoding: base64url of `created_at_unix_nano|tie_breaker_id`
- ordering: `created_at DESC, tie_breaker_id DESC`
- cursor predicate: `created_at < cursor_created_at OR (created_at = cursor_created_at AND tie_breaker_id < cursor_tie_breaker)`

Endpoints aligned in v1:
- `GET /v1/messages/inbox` (bigint tie breaker: `messageId`)
- `GET /v1/chika/threads` (uuid tie breaker: `threadId`)
- `GET /v1/chika/threads/{threadId}/comments` (bigint tie breaker: `commentId`)
- `GET /v1/reports` (uuid tie breaker: `reportId`)
- `GET /v1/blocks` (uuid tie breaker: `blockedUserId`)
