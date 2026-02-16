# 4.4 Groups - Implementation Plan

## Scope

Group discovery, creation, and membership flows with `visibility` and `joinPolicy`.

## Phase 0: Model and Permissions

- Define `Group` and `GroupMembership` role/state matrix.
- Implement owner/mod/member permissions and owner non-removability.
- Define visibility indexing strategy for public/members_only/private groups.

## Phase 1: MVP

### Backend

- Create/list/get groups endpoints with visibility-aware filtering.
- Membership endpoints for open/request/invite flows.
- Moderator actions: approve/reject requests, remove/ban members.

### Frontend

- Group directory with visibility labels and policy badges.
- Group creation/edit flow.
- Membership management UI (request queue, member list, ban state).

### Acceptance

- Join behavior matches selected policy.
- Private groups are hidden unless invited.
- Group moderators cannot remove owner.

## Phase 2: Moderation and Safety

- Add reportability for groups and group content.
- Add platform moderator override controls.
- Add audit logs for role changes and bans.

## Phase 3: Enhancements

- Add group activity feed integration to profiles.
- Add recommended groups by region/interests.

## Dependencies

- Requires RBAC foundation and profile identity.
