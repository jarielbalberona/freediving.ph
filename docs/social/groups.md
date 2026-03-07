# Groups Spec

## A) Purpose and Non-Goals
### Purpose
Groups provide member-organized communities with controlled visibility, membership roles, and minimal discussions.

### Non-goals (MVP)
- No event management inside groups.
- No advanced recommendation engine.
- No rich wiki/content modules.

## B) User Stories
### MVP
- As a member, I can create a group.
- As a member, I can browse groups based on visibility rules.
- As a member, I can request to join or join directly depending on group policy.
- As an owner/moderator, I can approve requests, remove members, and manage posting permissions.
- As a member, I can create and read basic group discussion posts.

### Later
- Group analytics dashboard.
- Scheduled posts and pinned content bundles.
- Integrated live chat.

## C) Data Model Draft
| Table | Key columns | Relations | Indexes and constraints |
|---|---|---|---|
| `groups` | `id (pk)`, `owner_user_id`, `name`, `slug (uniq)`, `description`, `visibility`, `join_policy`, `posting_policy`, `cover_media_id`, `created_at`, `updated_at`, `deleted_at` | owner references `app_users.id` | unique(`slug`), index(`visibility`), index(`owner_user_id`), index(`deleted_at`) |
| `group_memberships` | `id (pk)`, `group_id`, `user_id`, `role`, `status`, `joined_at`, `removed_at` | refs `groups.id`, `app_users.id` | unique(active group-user pair), index(`group_id`,`role`,`status`), index(`user_id`,`status`) |
| `group_join_requests` | `id (pk)`, `group_id`, `requester_user_id`, `status`, `created_at`, `resolved_at`, `resolved_by_user_id` | refs group and users | unique(active group-requester pair), index(`group_id`,`status`,`created_at`) |
| `group_threads` | `id (pk)`, `group_id`, `author_user_id`, `title`, `status`, `created_at`, `updated_at` | refs group and users | index(`group_id`,`created_at`), index(`status`) |
| `group_posts` | `id (pk)`, `thread_id`, `author_user_id`, `body`, `status`, `created_at`, `updated_at` | refs thread and users | index(`thread_id`,`created_at`), index(`author_user_id`,`created_at`) |

Enums:
- `visibility`: `public | members_only | private`
- `join_policy`: `open | request_only | invite_only`
- `group role`: `owner | group_moderator | member`

## D) API Contract Draft
| Method | Route | Purpose | Authz checks | Pagination |
|---|---|---|---|---|
| `POST` | `/v1/social/groups` | Create group | authenticated, groups.create permission | none |
| `GET` | `/v1/social/groups` | List visible groups | actor-aware visibility + block filtering | cursor (`created_at`,`id`) |
| `GET` | `/v1/social/groups/:slug` | Get group details | visibility and membership checks | none |
| `POST` | `/v1/social/groups/:groupId/join` | Join or request membership | policy-aware, not blocked, rate limits | none |
| `POST` | `/v1/social/groups/:groupId/requests/:requestId/approve` | Approve join request | owner or group_moderator | none |
| `POST` | `/v1/social/groups/:groupId/requests/:requestId/reject` | Reject join request | owner or group_moderator | none |
| `DELETE` | `/v1/social/groups/:groupId/members/:userId` | Remove member | owner or group_moderator, owner non-removable | none |
| `POST` | `/v1/social/groups/:groupId/threads` | Create thread | role and posting policy check | none |
| `GET` | `/v1/social/groups/:groupId/threads` | List threads | membership/visibility check | cursor (`created_at`,`id`) |
| `POST` | `/v1/social/groups/:groupId/threads/:threadId/posts` | Reply to thread | role and posting policy check | none |

## E) UI Flows
- Group directory: visibility badges and join policy badges.
- Group create/edit: fields, visibility, join policy, posting policy.
- Group detail: about, members, join/request actions.
- Group moderation: request queue, member list with role actions.
- Group discussions: thread list, thread detail, composer.
- Error states: private group inaccessible, join denied, insufficient role.
- Empty states: no groups yet, no threads yet.

## F) Abuse and Safety Considerations
- Group-level moderation actions: remove member, lock thread, remove post.
- Platform moderators can override group moderators where policy violations exist.
- Join request spam controls by user and by target group.
- Blocked users cannot interact in the same group thread context.

## G) Acceptance Criteria
- Private groups are not discoverable by non-members and non-invitees.
- Owner role cannot be removed by non-admin actions.
- Posting permissions enforce role and policy at API level.
- Removed/locked content appears with clear placeholder state.
- Group thread and post listing is deterministic and paginated.
- Block relationships prevent direct harassment paths inside group interactions.
