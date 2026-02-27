# Authz Permissions V1

Last updated: 2026-02-27

This defines the minimal feature-scoped permissions for currently implemented protected features and the staged migration away from broad member grants.

## Minimal Permissions Per Feature

### Profiles
- `profiles.read`: `GET /v1/me/profile`, `GET /v1/profiles/{userID}`, `GET /v1/users/search`
- `profiles.write`: `PATCH /v1/me/profile`

### Blocks
- `blocks.read`: `GET /v1/blocks`
- `blocks.write`: `POST /v1/blocks`, `DELETE /v1/blocks/{blockedUserId}`

### Reports
- `reports.write`: `POST /v1/reports`
- `reports.read`: `GET /v1/reports`, `GET /v1/reports/{reportId}` (moderation read)
- `reports.moderate`: `PATCH /v1/reports/{reportId}/status`

### Messaging
- `messaging.read`: `GET /v1/messages/inbox`, `GET /v1/messages/requests`, `GET /ws`
- `messaging.write`: `POST /v1/messages/send`, `POST /v1/messages/{conversationId}/accept`, `POST /v1/messages/{conversationId}/reject`

### Chika
- `chika.read`: list/read threads/posts/comments/media endpoints
- `chika.write`: create/update/delete threads/comments/reactions/media endpoints
- `chika.moderate`: reserved moderator capability

## Where Default Grants Come From

- New/local users default to `users.global_role = 'member'`.
- Effective permissions are computed in identity resolution:
  - base role map from `internal/shared/authz.RolePermissions`
  - merged with `user_permission_overrides` from DB

## Staged Migration

### Stage 1: Granular permissions introduced
- Feature-scoped permission constants and route guards are used (`profiles.*`, `blocks.*`, `reports.*`, `messaging.*`, `chika.*`).
- Legacy `content.*` constants remain for compatibility, but route guards should not depend on them.

### Stage 2: Existing-user backfill
- `0005_authz_granular_permissions.sql`: backfills messaging/chika/profiles/explore granular grants.
- `0008_authz_blocks_reports_backfill.sql`: backfills blocks/reports granular grants.
- Backfill writes explicit granular values into `user_permission_overrides` based on current role.

### Stage 3: Tighten member defaults
- Broad `content.write` is not part of `member` default role grants.
- New members rely on explicit feature-scoped defaults only.

### Stage 4: Broad permission removed from enforcement
- Protected routes are guarded by feature-scoped permissions only.
- No route guard depends on `content.write`.
