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
  - New messages are blocked when either user blocks the other.
  - Inbox/requests list filters hide conversations when either participant is blocked.
- Chika:
  - Service write paths (`create post`, `create comment`, `set reaction`) reject interactions when actor and thread owner are mutually blocked.
  - List views (`threads`, `posts`, `comments`) are filtered against `user_blocks` in repository queries via viewer-aware params.

## Error + Validation

- Validation errors use the standard `validation_error` payload with `issues[]`.
- Block attempts against self return `400 validation_error` with `issues[]`.
