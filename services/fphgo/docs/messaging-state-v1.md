# Messaging State Model v1

## Conversation States

| State      | DB value    | Meaning                                          |
|------------|-------------|--------------------------------------------------|
| Pending    | `pending`   | Initiator sent request; recipient has not acted   |
| Active     | `active`    | Conversation is accepted (buddy bypass or accept) |
| Declined   | `rejected`  | Recipient declined the request                    |

Blocked is **not** a conversation state. Block enforcement happens at the
service layer: all read/write operations check blocks bidirectionally and
return 403 `blocked` if either direction has a block. Blocked conversations
are excluded from inbox listings at the SQL level.

## Inbox Truth Fields

Every inbox item includes the following fields so the client can render
truthful UI without extra fetches:

| Field             | Type                 | Description                                     |
|-------------------|----------------------|-------------------------------------------------|
| `conversationId`  | `string` (UUID)      | Conversation identifier                          |
| `status`          | `ConversationStatus` | `pending`, `active`, or `rejected`               |
| `initiatorUserId` | `string` (UUID)      | User who initiated the conversation              |
| `updatedAt`       | `string` (RFC3339)   | Timestamp of last activity (message or state)    |
| `participant`     | `MessageParticipant` | The other user's profile snippet                 |
| `lastMessage`     | `MessageItem`        | Most recent message in the conversation          |
| `requestPreview`  | `MessageItem?`       | First message (shown to recipient for pending)   |
| `unreadCount`     | `number`             | Messages from other user since last read         |
| `pendingCount`    | `number`             | Messages sent while conversation is pending      |

### Request Preview Rules

- `requestPreview` is populated for **all** inbox items (derived from
  the first message in the conversation).
- The HTTP handler only includes it in the JSON response when the
  conversation is `pending` **and** the viewer is the recipient
  (not the initiator).
- This prevents the sender from seeing their own preview redundantly.

### Unread Count Computation

Unread count is computed at the SQL level:

```
COUNT(messages)
WHERE sender_user_id ≠ viewer
  AND (last_read_at IS NULL OR message.created_at > last_read_at)
```

The `last_read_at` column on `conversation_participants` is updated by
the `POST /read` endpoint, which supports:
- Mark-all-read: sets `last_read_at = NOW()`
- Mark-up-to: sets `last_read_at = GREATEST(current, message.created_at)`

Both forms are idempotent — calling with the same or earlier message ID
has no effect due to the `GREATEST` clause.

### Pending Count

`pendingCount` is the total number of messages sent in a pending
conversation. This helps the sender see how many follow-up messages
they've queued before acceptance. For active conversations, this field
is 0.

## Idempotency

### Message Send

The `POST /conversations/{id}` and `POST /requests` endpoints accept an
optional `X-Idempotency-Key` header. When provided:

1. The key is stored as `idempotency_key` on the `messages` row.
2. A partial unique index on `(conversation_id, idempotency_key)`
   (where key is not null) prevents duplicates.
3. On conflict, the existing message is returned unchanged.

Clients should generate a UUID v4 as the idempotency key before sending.
If a network timeout occurs, the client can safely retry with the same key.

### Mark Read

Already idempotent via `GREATEST(current_last_read_at, message.created_at)`.
Repeated calls with the same message ID are no-ops.

## WebSocket Events

### Envelope

```json
{
  "v": 1,
  "type": "message.created",
  "ts": "2026-02-28T12:00:00Z",
  "eventId": "a1b2c3d4-...",
  "requestId": "req-...",
  "payload": { ... }
}
```

The `eventId` field is a UUID generated per broadcast. Clients use it
to de-duplicate events (e.g. if the WebSocket reconnects and replays).

### Event Types and Payloads

| Event                  | Payload fields                                              |
|------------------------|-------------------------------------------------------------|
| `message.created`      | `conversationId`, `messageId`, `senderId`, `content`, `createdAt`, `status` |
| `conversation.updated` | `conversationId`, `status`                                  |
| `request.created`      | `requestId`, `conversationId`, `initiatorUserId`, `status`  |
| `request.accepted`     | `requestId`, `conversationId`, `status`                     |
| `request.declined`     | `requestId`, `conversationId`, `status`                     |

### Client De-duplication Strategy

1. Maintain a bounded set of recently seen `eventId` values (e.g. last 200).
2. On receiving an event, check if `eventId` is in the set.
3. If seen, discard. Otherwise, process and add to set.

### Cache Update Strategy (Web)

Instead of invalidating queries on every event:

- **`message.created`**: Use `setQueryData` to append the message to the
  conversation message list and bump the conversation to the top of
  the inbox. Increment `unreadCount` if the sender is not the viewer.
- **`conversation.updated`** / **`request.*`**: Use `setQueryData` to
  update conversation status in the inbox cache.
- **Fallback**: If the conversation is not in the cache (new conversation
  from a different device), invalidate the inbox query once.

## ID Contracts

- `conversation.id` is UUID (string).
- `message.id` is `BIGSERIAL` in Postgres, serialized as `string` in JSON.
- All IDs in WebSocket payloads and HTTP responses use string encoding.
