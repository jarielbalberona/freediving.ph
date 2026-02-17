# Chika (Forums) Spec

## A) Purpose and Non-Goals
### Purpose
Chika provides thread-based forum discussions with category-level rules and optional pseudonymous per-thread identities.

### Non-goals (MVP)
- No reputation system.
- No advanced ranking/recommendation algorithm.
- No Ocean Awareness Wall policy workflows.

Launch default: categories are `members_only`.

## B) User Stories
### MVP
- As a member, I can browse categories and threads I have access to.
- As a member, I can create threads and replies.
- As a member in pseudonymous categories, I see stable pseudonyms per thread.
- As a moderator/admin, I can lock threads and remove violating posts.
- As a moderator/admin, I can reveal identity behind a pseudonymous author with audit logging.
- As a member, I can report threads and posts.

### Later
- Reputation and trust scoring.
- Auto-moderation heuristics.
- Rich media embeds and previews.

## C) Data Model Draft
| Table | Key columns | Relations | Indexes and constraints |
|---|---|---|---|
| `chika_categories` | `id (pk)`, `slug (uniq)`, `name`, `visibility`, `mode`, `status`, `created_at` | none | unique(`slug`), index(`visibility`,`status`) |
| `chika_threads` | `id (pk)`, `category_id`, `author_user_id`, `title`, `status`, `locked_at`, `locked_by_user_id`, `created_at`, `updated_at`, `deleted_at` | refs category and users | index(`category_id`,`created_at`), index(`status`,`locked_at`) |
| `chika_posts` | `id (pk)`, `thread_id`, `author_user_id`, `body`, `status`, `created_at`, `updated_at`, `deleted_at` | refs thread and users | index(`thread_id`,`created_at`), index(`author_user_id`,`created_at`) |
| `chika_thread_pseudonyms` | `id (pk)`, `thread_id`, `user_id`, `pseudonym`, `created_at` | refs thread and user | unique(`thread_id`,`user_id`), unique(`thread_id`,`pseudonym`) |
| `chika_identity_reveal_log` | `id (pk)`, `thread_id`, `target_user_id`, `revealed_by_user_id`, `reason`, `created_at`, `audit_log_id` | refs thread, users, audit | index(`thread_id`,`created_at`), index(`revealed_by_user_id`,`created_at`) |

Enums:
- `visibility`: `public | members_only | private` (launch default `members_only`)
- `mode`: `normal | pseudonymous`
- `status`: `active | removed | deleted`

Pseudonym generation and storage:
- Generated at first post/reply in a thread for that actor.
- Deterministic in-thread uniqueness only.
- Stored in `chika_thread_pseudonyms` and never exposed with global user identifiers to normal members.

## D) API Contract Draft
| Method | Route | Purpose | Authz checks | Pagination |
|---|---|---|---|---|
| `GET` | `/v1/social/chika/categories` | List visible categories | actor-aware visibility | none |
| `GET` | `/v1/social/chika/categories/:slug/threads` | List category threads | actor-aware visibility | cursor (`created_at`,`id`) |
| `POST` | `/v1/social/chika/categories/:slug/threads` | Create thread | authenticated member, rate limits, status check | none |
| `GET` | `/v1/social/chika/threads/:threadId` | Get thread detail and posts | actor-aware visibility | cursor (`created_at`,`id`) for posts |
| `POST` | `/v1/social/chika/threads/:threadId/posts` | Reply in thread | authenticated, thread not locked, rate limits | none |
| `POST` | `/v1/social/chika/threads/:threadId/lock` | Lock thread | moderator/admin or scoped group mod if configured | none |
| `POST` | `/v1/social/chika/posts/:postId/remove` | Remove violating post | moderator/admin | none |
| `POST` | `/v1/social/chika/threads/:threadId/reveal-identity` | Reveal true identity for pseudonymous actor | moderator/admin only, mandatory audit log | none |

Moderation set for MVP:
- Report thread/post
- Remove post or thread
- Lock thread
- Shadowban user from posting in Chika (moderator/admin action)

## E) UI Flows
- Category list: visibility and mode badges.
- Thread list: lock/removed indicators.
- Thread detail: pseudonym or real identity display based on category mode.
- Post composer: lock state, rate-limit, and suspension feedback.
- Report flow: reason, optional details, submit confirmation.
- Moderator flow: lock thread, remove content, reveal identity with reason prompt.
- Empty states: no threads, no posts.

## F) Abuse and Safety Considerations
- Pseudonym mode reduces dogpiling risk while preserving moderator traceability.
- Reveal identity requires explicit reason and full audit event.
- Rate limits stricter for new accounts and pseudonymous categories.
- Shadowban action is write-only from moderator perspective and invisible to target user.
- Anti-misinformation note: dedicated policy tuning deferred to future Ocean Awareness work.

## G) Acceptance Criteria
- Member sees consistent pseudonym per author within a single thread.
- Member cannot link pseudonyms across different threads via API payloads.
- Moderator/admin identity reveal endpoint is denied to regular users.
- Every reveal attempt, success or failure, generates an audit log event.
- Locked threads reject new posts with deterministic error response.
- Removed posts are replaced by placeholder state and excluded from normal content exports.
