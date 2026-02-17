# FPH RBAC

## Model Summary
- Authentication: Clerk sessions/JWT only.
- Authorization: Database only (`app_users`, membership tables, permission overrides).
- No RBAC decisions are sourced from Clerk metadata.
- FPH groups/events are app resources, not Clerk Organizations.

## Roles

### Global roles (`app_users.global_role`)
- `member`
- `trusted_member`
- `support`
- `moderator`
- `explore_curator`
- `records_verifier`
- `admin`
- `super_admin`

### Scoped roles
- Group role (`group_memberships.role`): `group_admin`, `group_moderator`, `group_member`
- Event role (`event_memberships.role`): `event_host`, `event_cohost`, `event_attendee`

## Account Status
Stored in `app_users.status`:
- `active`: normal operation
- `read_only`: read routes allowed, writes blocked by permission middleware
- `suspended`: blocked when `suspension_until` is in the future

## Permission Flags
- `profiles.view`
- `profiles.update_self`
- `profiles.update_any`
- `messaging.send`
- `messaging.read`
- `buddy.request`
- `buddy.accept`
- `groups.create`
- `groups.join`
- `groups.manage`
- `chika.read`
- `chika.post`
- `chika.moderate`
- `chika.reveal_identity`
- `explore.read`
- `explore.submit_site`
- `explore.moderate_site`
- `events.create`
- `events.manage`
- `events.moderate`
- `records.submit`
- `records.verify`
- `reports.create`
- `reports.review`
- `sanctions.apply`
- `admin.manage_roles`
- `admin.manage_settings`
- `admin.view_audit_log`

## Resolution Rules
1. Start from `ROLE_CONFIGS[globalRole]`.
2. Merge `user_permission_overrides.overrides` (boolean override per flag).
3. Apply scope checks for `groups.manage` and `events.manage`.
4. Fail closed when context is missing.

## API Middleware
- `optionalAuth`: parses bearer token if present; invalid provided token returns 401.
- `requireAuth`: verifies JWT, requires provisioned `app_users` row, enforces status/suspension.
- `requirePermission(flag)`: checks effective permissions and blocks write actions in `read_only`.
- `requireGlobalRole([...])`: requires minimum global role.
- `requireGroupRole(minRole)`: checks `group_memberships` for route `groupId`.
- `requireEventRole(minRole)`: checks `event_memberships` for route `eventId`.
- `assertCanRevealIdentity`: audit logs all reveal attempts before returning allow/deny.

## Audit Logging Rules
Always write `audit_log` for:
- Chika identity reveal attempts (success and failure)
- Moderation/sanction actions
- Verification approvals/denials
- Admin role changes

`audit_log.metadata` must include:
- `requestId`
- `ip`

## Examples
- Group admin managing a group:
  - User has `groups.manage` effective permission and `group_memberships.role = group_admin`.
- Event cohost editing event:
  - User has `events.manage` effective permission and `event_memberships.role = event_cohost`.
- Moderator revealing Chika identity:
  - Call `POST /moderation/chika/identity-reveal`.
  - Middleware checks permission from DB and writes audit log before allow/deny.
