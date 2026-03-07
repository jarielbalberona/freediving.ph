# Blocks v1

Last updated: 2026-02-27

## Data Model

- Table: `user_blocks`
  - `blocker_app_user_id UUID NOT NULL`
  - `blocked_app_user_id UUID NOT NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `PRIMARY KEY (blocker_app_user_id, blocked_app_user_id)`
  - `CHECK (blocker_app_user_id <> blocked_app_user_id)`

Migration `0006_profiles_blocks_v1.sql` also backfills from legacy `blocks` into `user_blocks`.

## Routes

- `POST /v1/blocks`
  - Auth: `RequireMember` + `blocks.write`
  - Body: `{ "blockedUserId": "<uuid>" }`
  - Response: `201 { "ok": true }`
- `DELETE /v1/blocks/{blockedUserId}`
  - Auth: `RequireMember` + `blocks.write`
  - Response: `204` (idempotent)
- `GET /v1/blocks`
  - Auth: `RequireMember` + `blocks.read`
  - Response: `200 { "items": [{ blockedUserId, username, displayName, avatarUrl, createdAt }], "nextCursor"?: string }`

## Enforcement

- Messaging:
  - `POST /v1/messages/send`: blocked when either user blocks the other (`403`, `code: "blocked"`).
  - `POST /v1/messages/{conversationId}/accept`: blocked when either user blocks the other (`403`, `code: "blocked"`).
  - `GET /v1/messages/inbox` and `GET /v1/messages/requests`: filters hide conversations when either participant is blocked.
- Chika:
  - Service write paths (`create post`, `create comment`, `set reaction`) reject interactions when actor and thread owner are mutually blocked (`403`, `code: "blocked"`).
  - List views (`threads`, `posts`, `comments`) are filtered against `user_blocks` in repository queries via viewer-aware params.

## Endpoint Inventory (Task Scope)

### Messaging

| Endpoint | Method | Enforcement in this task |
|---|---|---|
| `/v1/messages/inbox` | `GET` | yes, read filtering (blocked relationships hidden) |
| `/v1/messages/requests` | `GET` | yes, read filtering (blocked relationships hidden) |
| `/v1/messages/send` | `POST` | yes, write blocked both directions |
| `/v1/messages/{conversationId}/accept` | `POST` | yes, write blocked both directions |
| `/v1/messages/{conversationId}/reject` | `POST` | no new block rule needed (reject remains allowed) |

### Chika

| Endpoint | Method | Enforcement in this task |
|---|---|---|
| `/v1/chika/threads` | `GET` | yes, excludes blocked authors both directions |
| `/v1/chika/threads/{threadId}` | `GET` | no new block filter (detail endpoint unchanged) |
| `/v1/chika/threads/{threadId}/comments` | `GET` | yes, excludes blocked authors both directions |
| `/v1/chika/threads/{threadId}/posts` | `GET` | yes, excludes blocked authors both directions |
| `/v1/chika/threads/{threadId}/comments` | `POST` | yes, write blocked both directions against thread owner |

## Error + Validation

- Validation errors use the standard `validation_error` payload with `issues[]`.
- Block attempts against self return `400 validation_error` with `issues[]`.
