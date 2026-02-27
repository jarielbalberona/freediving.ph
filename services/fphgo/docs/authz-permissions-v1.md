# Authz Permissions V1

This document defines the feature-scoped permission baseline for `services/fphgo` and the staged migration away from broad `content.write` defaults.

## Permission Catalog

### Messaging
- `messaging.read`: read inbox/requests and websocket message feed
- `messaging.write`: send/accept/reject conversation actions

### Chika
- `chika.read`: list/read threads, comments, media
- `chika.write`: create/update/delete own threads/comments/reactions/media
- `chika.moderate`: moderator-level moderation actions (reserved; service role checks still apply)

### Explore
- `explore.read`: browse explore resources
- `explore.submit`: submit explore content

### Profiles
- `profiles.read`: read profile resources
- `profiles.write`: update own profile resources

### Existing Cross-Feature/System Permissions (kept for compatibility)
- `users.read`, `users.manage`
- `groups.read`, `groups.manage`
- `events.read`, `events.manage`
- `reports.read`, `reports.write`
- `content.read`, `content.write` (legacy compatibility only; new route enforcement should use feature-scoped permissions)

## Route Enforcement Baseline (Current)

- Messaging read routes use `messaging.read`.
- Messaging write routes use `messaging.write`.
- Chika read routes use `chika.read`.
- Chika write routes use `chika.write`.
- WebSocket endpoint uses `messaging.read`.

## Safe Migration Plan

### Stage 1: Add granular permissions alongside broad permissions
- Add permission constants and role mapping for granular permissions.
- Keep legacy `content.*` constants for compatibility.

### Stage 2: Backfill existing users
- Goose migration writes explicit granular permission overrides into `user_permission_overrides` based on current role.
- Backfill ensures existing users retain access even if role defaults tighten later.

### Stage 3: Remove broad default grants
- Remove `content.write` from default role grants for `member` and enforce granular route checks.
- New members no longer inherit broad write permission by default.

### Stage 4: Tighten enforcement
- Route middleware checks granular permissions (`messaging.*`, `chika.*`, etc.) for protected endpoints.

## Lockout Guardrail

- Elevated roles (`admin`, `super_admin`) retain management permissions.
- Migration has a reversible `Down` section to remove added granular override keys if rollback is required.
