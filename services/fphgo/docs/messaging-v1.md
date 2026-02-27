# Messaging v1

## Product Rules

- A member can DM any other user unless blocked.
- If users are already buddies, DM is immediately `active`.
- If users are not buddies, first DM creates a `pending` request conversation.
- Recipient sees request preview from the first message before accepting.
- Sender can send additional messages while conversation is `pending`.
- Recipient cannot reply until request is accepted.

## Routes (`/v1/messages`)

- `POST /requests`
  - body: `{ recipientId: uuid, content: string }`
  - creates a request with first message (or active conversation if buddies)

- `POST /requests/{requestId}/accept`
  - accepts pending request

- `POST /requests/{requestId}/decline`
  - declines pending request

- `GET /inbox`
  - lists conversations with status (`pending` or `active`)
  - includes `requestPreview` for recipient-side pending requests

- `GET /conversations/{conversationId}`
  - paginated messages for one conversation

- `POST /conversations/{conversationId}`
  - sends message in conversation
  - pending policy: initiator can continue sending while pending

- `POST /read`
  - body: `{ conversationId: uuid, messageId?: string }`
  - updates read state per conversation participant

## Permissions

- Read routes require `messaging.read`.
- Write routes require `messaging.write`.

## Enforcement

- `RequireMember` enforces account state (`suspended` denied, `read_only` denied for writes).
- Service enforces blocked state for reads and writes (`code: blocked`).
- Inbox excludes blocked relationships server-side.
- Buddy bypass is enforced in service.

## WebSocket Events

Envelope:
- `v: 1`
- `type`
- `ts` (RFC3339)
- `requestId` (optional)
- `payload`

Emitted event types:
- `message.created`
- `conversation.updated`
- `request.created`
- `request.accepted`
- `request.declined`

## ID Contracts

- `messages.id` is `BIGSERIAL` in Postgres.
- Message IDs are serialized as strings in JSON payloads.
- Shared TypeScript message id fields are `string`.
