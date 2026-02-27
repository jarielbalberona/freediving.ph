# Rate Limits v1

Last updated: 2026-02-27

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

| Domain | Scope Key | Limit | Window | Applies To |
|---|---|---:|---:|---|
| Profiles write | `profiles.update` per actor | 10 | 1 minute | `PATCH /v1/me/profile` |
| Blocks write | `blocks.write` per actor | 40 | 1 minute | `POST /v1/blocks`, `DELETE /v1/blocks/{blockedUserId}` |
| Reports target cooldown | report target pair cooldown | 1 | 24 hours | `POST /v1/reports` |
| Reports daily cap | reporter daily cap | 20 | 1 day | `POST /v1/reports` |
| Messaging send burst | `messages.send` per sender | 30 | 1 minute | `POST /v1/messages/send` |
| Messaging request initiation cooldown | `messages.request_initiation` per sender+recipient | 1 | 2 minutes | non-buddy `POST /v1/messages/send` |
| Messaging request actions | `messages.transition` per actor | 60 | 1 minute | `POST /v1/messages/{conversationId}/accept`, `POST /v1/messages/{conversationId}/reject` |
| Chika thread create | `chika.create_thread` per actor | 5 | 1 hour | `POST /v1/chika/threads` |
| Chika thread update | `chika.update_thread` per actor | 30 | 1 minute | `PATCH /v1/chika/threads/{threadId}` |
| Chika thread delete | `chika.delete_thread` per actor | 20 | 1 minute | `DELETE /v1/chika/threads/{threadId}` |
| Chika post create | `chika.create_post` per actor | 40 | 1 minute | `POST /v1/chika/threads/{threadId}/posts` |
| Chika comment create | `chika.create_comment` per actor | 60 | 1 minute | `POST /v1/chika/threads/{threadId}/comments` |
| Chika comment update | `chika.update_comment` per actor | 40 | 1 minute | `PATCH /v1/chika/comments/{commentId}` |
| Chika comment delete | `chika.delete_comment` per actor | 30 | 1 minute | `DELETE /v1/chika/comments/{commentId}` |
| Chika reaction set | `chika.set_reaction` per actor | 120 | 1 minute | `POST /v1/chika/threads/{threadId}/reactions` |
| Chika reaction remove | `chika.remove_reaction` per actor | 120 | 1 minute | `DELETE /v1/chika/threads/{threadId}/reactions` |
| Chika media create | `chika.create_media` per actor | 30 | 1 minute | `POST /v1/chika/media` |

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
