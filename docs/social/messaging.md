# Messaging Spec

## A) Purpose and Non-Goals
### Purpose
Messaging delivers private 1:1 conversations with anti-spam controls and strict block enforcement.

### Non-goals (MVP)
- No group chat.
- No voice, video, or disappearing messages.
- No end-to-end encryption redesign.

## B) User Stories
### MVP
- As a member, I can send a message request before direct messaging a non-buddy.
- As a member, I can accept or decline message requests.
- As a member, I can send and receive 1:1 messages once request is accepted.
- As a member, I can delete my own message from my view.
- As a member, I cannot message users I blocked or who blocked me.

### Later
- Group chat.
- Read receipts.
- Rich attachment types beyond image placeholder.

Read receipts decision: Later. Rationale: MVP reliability and abuse controls are higher priority than read-state consistency and extra storage churn.

## C) Data Model Draft
| Table | Key columns | Relations | Indexes and constraints |
|---|---|---|---|
| `direct_conversations` | `id (pk)`, `user_a_id`, `user_b_id`, `created_at`, `last_message_at` | each user id references `app_users.id` | unique(leasts/greatest pair for user ids), index(`last_message_at`) |
| `message_requests` | `id (pk)`, `requester_user_id`, `target_user_id`, `status`, `created_at`, `resolved_at` | requester/target reference `app_users.id` | unique(active requester-target pair), index(`target_user_id`,`status`), index(`created_at`) |
| `messages` | `id (pk)`, `conversation_id`, `sender_user_id`, `body`, `media_asset_id`, `sent_at`, `deleted_by_sender_at`, `deleted_by_recipient_at`, `removed_by_moderator_at` | `conversation_id -> direct_conversations.id` | index(`conversation_id`,`sent_at`), index(`sender_user_id`,`sent_at`) |
| `conversation_participant_state` | `conversation_id`, `user_id`, `last_read_message_id`, `last_read_at`, `muted_until` | refs conversation and user | pk(`conversation_id`,`user_id`) |

Message request status enum: `requested | accepted | declined | canceled`.

## D) API Contract Draft
| Method | Route | Purpose | Authz checks | Pagination |
|---|---|---|---|---|
| `POST` | `/v1/social/messages/requests` | Create message request | authenticated, not blocked, request rate limits | none |
| `GET` | `/v1/social/messages/requests/incoming` | List incoming requests | authenticated | cursor (`created_at`,`id`) |
| `GET` | `/v1/social/messages/requests/outgoing` | List outgoing requests | authenticated | cursor (`created_at`,`id`) |
| `POST` | `/v1/social/messages/requests/:id/accept` | Accept request and open conversation | authenticated target only | none |
| `POST` | `/v1/social/messages/requests/:id/decline` | Decline request | authenticated target only | none |
| `POST` | `/v1/social/messages/requests/:id/cancel` | Cancel pending request | authenticated requester only | none |
| `GET` | `/v1/social/messages/conversations` | List conversations | authenticated participant only | cursor (`last_message_at`,`id`) |
| `GET` | `/v1/social/messages/conversations/:id` | List messages | authenticated participant only and block check | cursor (`sent_at`,`id`) |
| `POST` | `/v1/social/messages/conversations/:id/messages` | Send message | authenticated participant, rate limits, block check | none |
| `DELETE` | `/v1/social/messages/messages/:id` | Delete message from actor view | sender or recipient participant only | none |

Retention and deletion semantics:
- User delete message: set actor-side delete timestamp, hide in actor reads.
- Both sides deleted: retain for moderation hold window, then purge job eligible.
- Moderator remove: content replaced with moderation placeholder, record reason.
- Legal/moderation hold blocks purge until hold cleared.

Real-time strategy decision record (placeholder):
- MVP transport: short polling (5-10s) for inbox/thread refresh.
- Contract requirements for future SSE/WebSocket:
  - auth-bound channel scoped to actor user id
  - at-least-once delivery semantics with idempotent client merge by message id
  - server event types: `message.created`, `message.updated`, `conversation.read_state.updated`

## E) UI Flows
- Requests inbox: pending incoming and outgoing with accept/decline/cancel actions.
- Conversation list: latest snippet, unread badge, blocked status notice.
- Thread view: message stream, composer, send pending/error/retry states.
- Empty states: no requests, no conversations, no messages yet.
- Error cases: blocked delivery failure, rate-limit hit, request no longer valid, suspended write denied.

## F) Abuse and Safety Considerations
- Hard block rule: blocked users cannot request, send, or receive messages.
- New account guardrails: stricter daily request and send limits for first 7 days.
- Link and media scanning hooks reserved for moderation pipeline.
- Burst send detection triggers temporary cooldown.

## G) Acceptance Criteria
- User cannot send a direct message without accepted request unless already buddies.
- User cannot send message if either side blocked the other.
- Request lifecycle transitions only follow allowed state machine.
- Deleting a message hides it from deleting actor immediately.
- Moderator-removed message remains visible as a placeholder with no raw body.
- Polling contract returns deterministic order by `sent_at`, then `id`.
