-- name: IsBlockedEither :one
SELECT EXISTS (
  SELECT 1 FROM blocks
  WHERE (blocker_id = $1 AND blocked_id = $2)
     OR (blocker_id = $2 AND blocked_id = $1)
);

-- name: AreBuddies :one
SELECT EXISTS (
  SELECT 1 FROM buddy_relationships
  WHERE status = 'accepted'
    AND ((user_id = $1 AND buddy_id = $2) OR (user_id = $2 AND buddy_id = $1))
);

-- name: UpsertDMConversation :one
INSERT INTO conversations (id, kind, dm_pair_key, initiator_user_id, status)
VALUES ($1, 'dm', $2, $3, $4)
ON CONFLICT (dm_pair_key)
DO UPDATE SET status = CASE WHEN conversations.status = 'active' THEN 'active' ELSE EXCLUDED.status END,
              updated_at = NOW()
RETURNING id, kind, dm_pair_key, initiator_user_id, status, created_at, updated_at;

-- name: AddConversationParticipant :exec
INSERT INTO conversation_participants (conversation_id, user_id)
VALUES ($1, $2)
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- name: InsertMessage :one
INSERT INTO messages (conversation_id, sender_user_id, content)
VALUES ($1, $2, $3)
RETURNING id;

-- name: GetConversation :one
SELECT id, kind, dm_pair_key, initiator_user_id, status, created_at, updated_at
FROM conversations
WHERE id = $1;

-- name: IsParticipant :one
SELECT EXISTS (
  SELECT 1 FROM conversation_participants
  WHERE conversation_id = $1 AND user_id = $2
);

-- name: SetConversationStatus :exec
UPDATE conversations
SET status = $2, updated_at = NOW()
WHERE id = $1;

-- name: Inbox :many
SELECT
  m.conversation_id,
  m.id,
  m.sender_user_id,
  m.content,
  c.status,
  m.created_at
FROM messages m
JOIN conversations c ON c.id = m.conversation_id
JOIN conversation_participants cp ON cp.conversation_id = c.id
WHERE cp.user_id = $1
  AND c.status = 'active'
ORDER BY m.created_at DESC
LIMIT 100;

-- name: Requests :many
SELECT
  m.conversation_id,
  m.id,
  m.sender_user_id,
  m.content,
  c.status,
  m.created_at
FROM messages m
JOIN conversations c ON c.id = m.conversation_id
JOIN conversation_participants cp ON cp.conversation_id = c.id
WHERE cp.user_id = $1
  AND c.status = 'pending'
  AND c.initiator_user_id <> $1
ORDER BY m.created_at DESC
LIMIT 100;
