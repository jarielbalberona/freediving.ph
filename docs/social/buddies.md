# Buddies Spec

## A) Purpose and Non-Goals
### Purpose
Buddies establish trusted bilateral relationships for social discovery and communication eligibility.

### Non-goals (MVP)
- No buddy recommendation algorithm.
- No buddy finder matching experience.
- No advanced relationship labels.

## B) User Stories
### MVP
- As a member, I can send a buddy request.
- As a member, I can accept, decline, or ignore incoming requests.
- As a member, I can cancel outgoing pending requests.
- As a member, I can remove an active buddy.
- As a member, I cannot send buddy requests to blocked users.

### Later
- Buddy tags and custom notes.
- Smart recommendations from profile and activity signals.

## C) Data Model Draft
| Table | Key columns | Relations | Indexes and constraints |
|---|---|---|---|
| `buddy_requests` | `id (pk)`, `requester_user_id`, `target_user_id`, `status`, `created_at`, `updated_at`, `resolved_at`, `resolution_reason` | both users reference `app_users.id` | unique(active requester-target pair), index(`target_user_id`,`status`), index(`requester_user_id`,`status`), index(`created_at`) |
| `buddy_relationships` | `id (pk)`, `user_low_id`, `user_high_id`, `created_at`, `ended_at`, `ended_reason` | user ids reference `app_users.id` | unique(active unordered user pair), index(`user_low_id`), index(`user_high_id`) |
| `buddy_request_cooldowns` | `requester_user_id`, `target_user_id`, `cooldown_until`, `reason` | refs users | pk(`requester_user_id`,`target_user_id`), index(`cooldown_until`) |

Request status enum: `requested | accepted | declined | canceled | blocked`.

## D) API Contract Draft
| Method | Route | Purpose | Authz checks | Pagination |
|---|---|---|---|---|
| `POST` | `/v1/social/buddies/requests` | Send buddy request | authenticated, not blocked, cooldown clear, rate limits | none |
| `GET` | `/v1/social/buddies/requests/incoming` | List incoming requests | authenticated target only | cursor (`created_at`,`id`) |
| `GET` | `/v1/social/buddies/requests/outgoing` | List outgoing requests | authenticated requester only | cursor (`created_at`,`id`) |
| `POST` | `/v1/social/buddies/requests/:id/accept` | Accept request | authenticated target only | none |
| `POST` | `/v1/social/buddies/requests/:id/decline` | Decline request | authenticated target only | none |
| `POST` | `/v1/social/buddies/requests/:id/cancel` | Cancel pending request | authenticated requester only | none |
| `GET` | `/v1/social/buddies` | List active buddies | authenticated actor only | cursor (`created_at`,`id`) |
| `DELETE` | `/v1/social/buddies/:buddyUserId` | Remove active buddy | authenticated actor only, relationship membership check | none |

Discovery constraints:
- APIs that surface candidate users must apply profile visibility and coarse location policy.
- Buddies model stores no precise geo fields, keeping Buddy Finder integration open.

## E) UI Flows
- Profile action button states: `Add Buddy`, `Requested`, `Accept`, `Buddies`, `Blocked`.
- Request inbox: accept or decline actions with optimistic updates.
- Outgoing list: cancel pending request.
- Buddy list: list and remove action with confirmation.
- Empty states: no requests, no buddies.
- Error cases: cooldown active, duplicate request, blocked relationship, rate-limit exceeded.

## F) Abuse and Safety Considerations
- Repeated declined requests trigger cooldown (default 14 days).
- Daily request caps, with stricter caps for new accounts.
- Block action automatically cancels pending buddy requests and prevents future requests.
- Moderator tooling can inspect abusive request patterns.

## G) Acceptance Criteria
- Request cannot be created if either side blocked the other.
- Accepting request creates exactly one active buddy relationship record.
- Declined request cannot be re-sent until cooldown expires.
- Removing buddy ends active relationship without creating a block.
- Duplicate active buddy relationships are impossible due to unique unordered pair constraint.
- Request lists paginate deterministically by `created_at`, then `id`.
