# Messaging Threads v1 Implementation Notes

## Schema

Added migration `0021_messaging_threads_v1.sql` with new messaging v1 tables:

- `message_threads`
- `message_thread_members`
- `thread_messages`

Supporting enums:

- `message_thread_type` (`direct`)
- `message_inbox_category` (`primary`, `general`, `requests`)
- `message_kind` (`text`, `system`)

Notes:

- Per-user inbox placement lives in `message_thread_members.inbox_category`.
- Direct thread uniqueness is enforced by `(type, direct_user_low, direct_user_high)`.
- Optimistic-send idempotency uses unique `(thread_id, sender_user_id, client_id)` when `client_id` is present.

## Endpoints

Under `/v1/messages`:

- `GET /threads?category=primary|general|requests&cursor=&limit=&q=`
- `GET /threads/{threadId}`
- `GET /threads/{threadId}/messages?cursor=&limit=`
- `POST /threads/{threadId}/messages` with `{ body, clientId? }`
- `POST /threads/direct` with `{ targetUserId }`
- `POST /threads/{threadId}/read` with `{ lastReadMessageId }`

Legacy `/inbox|/conversations|/requests` routes are still mounted for backward compatibility.

## Realtime Events

Websocket events used by v1:

- `message.created`
- `thread.updated`
- `thread.read`

Payloads are scoped to thread-member users using targeted fanout in `internal/realtime/ws/hub.go`.
Optional multi-instance fanout is available via Postgres `LISTEN/NOTIFY` by setting `WS_FANOUT_CHANNEL`.

## Deferred Items

- Group threads
- Media/voice/reactions/replies/edit/delete
- Typing indicators and push notifications
- Rich request-routing policy beyond buddy-based primary/request split
