# Moderation Actions v1

Last updated: 2026-02-27

## Scope

Moderators can now resolve reports through concrete account/content actions in `services/fphgo`.

Implemented actions:
- Account: `suspend`, `unsuspend`, `read_only`, `clear_read_only`
- Chika content: `hide/unhide` thread, `hide/unhide` comment

All actions are auditable via immutable `moderation_actions` rows with actor, target, action, reason, optional linked `report_id`, and timestamp.

## New Endpoints

All endpoints are mounted under `RequireMember` and require `moderation.write`.

- `POST /v1/moderation/users/{appUserId}/suspend`
- `POST /v1/moderation/users/{appUserId}/unsuspend`
- `POST /v1/moderation/users/{appUserId}/read-only`
- `POST /v1/moderation/users/{appUserId}/read-only/clear`
- `POST /v1/moderation/chika/threads/{threadId}/hide`
- `POST /v1/moderation/chika/threads/{threadId}/unhide`
- `POST /v1/moderation/chika/comments/{commentId}/hide`
- `POST /v1/moderation/chika/comments/{commentId}/unhide`

Request body for all endpoints:

```json
{
  "reason": "string (required)",
  "reportId": "uuid (optional)"
}
```

Response shape:

```json
{
  "action": {
    "id": "uuid",
    "actorUserId": "uuid",
    "targetType": "user | chika_thread | chika_comment",
    "targetId": "uuid|string",
    "action": "string",
    "reason": "string",
    "reportId": "uuid (optional)",
    "createdAt": "RFC3339"
  }
}
```

## Permission Model

New permissions:
- `moderation.read`
- `moderation.write`

Granted by default to roles:
- `moderator`
- `admin`
- `super_admin`

## Data Model

Migration `0009_moderation_actions_v1.sql` adds:

- `moderation_actions` table (immutable audit log)
- `chika_threads.hidden_at`
- `chika_comments.hidden_at`

## Enforcement Hooks

Account state enforcement remains centralized in `RequireMember`:
- `suspended` users cannot access member routes
- `read_only` users cannot use write methods (`POST|PUT|PATCH|DELETE`)

Hidden content behavior:
- Members do not see hidden threads/comments in list endpoints.
- Moderators/admins/super_admins still see hidden threads/comments in list endpoints.

## Test Coverage

- `internal/features/moderation_actions/http/integration_test.go`
  - 401/403 permission enforcement
  - audit row write behavior (in-memory integration harness)
- `internal/features/chika/http/integration_blocks_test.go`
  - hidden content filtered for members, visible for moderators
