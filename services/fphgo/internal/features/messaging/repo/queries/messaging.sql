-- name: AreBuddies :one
SELECT EXISTS (
  SELECT 1
  FROM buddies
  WHERE app_user_id_a = LEAST($1, $2)
    AND app_user_id_b = GREATEST($1, $2)
);

-- name: UpsertDMConversation :one
INSERT INTO conversations (id, kind, dm_pair_key, initiator_user_id, status)
VALUES ($1, 'dm', $2, $3, $4)
ON CONFLICT (dm_pair_key)
DO UPDATE SET
  status = CASE WHEN conversations.status = 'active' THEN 'active' ELSE EXCLUDED.status END,
  updated_at = NOW()
RETURNING id, kind, dm_pair_key, initiator_user_id, status, created_at, updated_at;

-- name: AddConversationParticipant :exec
INSERT INTO conversation_participants (conversation_id, user_id)
VALUES ($1, $2)
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- name: InsertMessage :one
INSERT INTO messages (conversation_id, sender_user_id, content, metadata, idempotency_key)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (conversation_id, idempotency_key) WHERE idempotency_key IS NOT NULL
DO UPDATE SET content = messages.content
RETURNING id, metadata, created_at;

-- name: TouchConversation :exec
UPDATE conversations
SET updated_at = NOW()
WHERE id = $1;

-- name: GetConversation :one
SELECT id, kind, dm_pair_key, initiator_user_id, status, created_at, updated_at
FROM conversations
WHERE id = $1;

-- name: IsParticipant :one
SELECT EXISTS (
  SELECT 1 FROM conversation_participants
  WHERE conversation_id = $1 AND user_id = $2
);

-- name: GetOtherParticipantID :one
SELECT cp.user_id
FROM conversation_participants cp
WHERE cp.conversation_id = $1
  AND cp.user_id <> $2
LIMIT 1;

-- name: SetConversationStatus :exec
UPDATE conversations
SET status = $2, updated_at = NOW()
WHERE id = $1;

-- name: ListInboxConversations :many
SELECT
  c.id,
  c.status,
  c.initiator_user_id,
  c.updated_at,
  other_cp.user_id AS other_user_id,
  u.username AS other_username,
  u.display_name AS other_display_name,
  u.email_verified AS other_email_verified,
  u.phone_verified AS other_phone_verified,
  p.avatar_url AS other_avatar_url,
  p.cert_level AS other_cert_level,
  COALESCE((
    SELECT COUNT(*)::bigint
    FROM (
      SELECT app_user_id_a AS app_user_id FROM buddies
      UNION ALL
      SELECT app_user_id_b AS app_user_id FROM buddies
    ) pairs
    WHERE pairs.app_user_id = other_cp.user_id
  ), 0)::bigint AS other_buddy_count,
  COALESCE((
    SELECT COUNT(*)::bigint
    FROM reports r
    WHERE r.target_app_user_id = other_cp.user_id
  ), 0)::bigint AS other_report_count,
  last_message.id AS last_message_id,
  last_message.sender_user_id AS last_message_sender_id,
  last_message.content AS last_message_content,
  last_message.metadata AS last_message_metadata,
  last_message.created_at AS last_message_created_at,
  first_message.id AS first_message_id,
  first_message.sender_user_id AS first_message_sender_id,
  first_message.content AS first_message_content,
  first_message.metadata AS first_message_metadata,
  first_message.created_at AS first_message_created_at,
  unread.unread_count,
  pending_msgs.pending_count
FROM conversations c
JOIN conversation_participants cp ON cp.conversation_id = c.id
JOIN conversation_participants other_cp ON other_cp.conversation_id = c.id AND other_cp.user_id <> $1
JOIN users u ON u.id = other_cp.user_id
LEFT JOIN profiles p ON p.user_id = other_cp.user_id
LEFT JOIN LATERAL (
  SELECT m.id, m.sender_user_id, m.content, m.metadata, m.created_at
  FROM messages m
  WHERE m.conversation_id = c.id
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT 1
) last_message ON TRUE
LEFT JOIN LATERAL (
  SELECT m.id, m.sender_user_id, m.content, m.metadata, m.created_at
  FROM messages m
  WHERE m.conversation_id = c.id
  ORDER BY m.created_at ASC, m.id ASC
  LIMIT 1
) first_message ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS unread_count
  FROM messages m
  WHERE m.conversation_id = c.id
    AND m.sender_user_id <> $1
    AND (
      cp.last_read_at IS NULL
      OR m.created_at > cp.last_read_at
    )
) unread ON TRUE
LEFT JOIN LATERAL (
  SELECT CASE WHEN c.status = 'pending' THEN COUNT(*)::bigint ELSE 0 END AS pending_count
  FROM messages m
  WHERE m.conversation_id = c.id
) pending_msgs ON TRUE
WHERE cp.user_id = $1
  AND (c.updated_at < $2 OR (c.updated_at = $2 AND c.id < $3))
  AND NOT EXISTS (
    SELECT 1
    FROM user_blocks b
    WHERE (b.blocker_app_user_id = $1 AND b.blocked_app_user_id = other_cp.user_id)
       OR (b.blocker_app_user_id = other_cp.user_id AND b.blocked_app_user_id = $1)
  )
ORDER BY c.updated_at DESC, c.id DESC
LIMIT $4;

-- name: ListConversationMessages :many
SELECT
  m.conversation_id,
  m.id,
  m.sender_user_id,
  m.content,
  m.metadata,
  m.created_at
FROM messages m
JOIN conversations c ON c.id = m.conversation_id
JOIN conversation_participants cp ON cp.conversation_id = c.id
JOIN conversation_participants other_cp ON other_cp.conversation_id = c.id AND other_cp.user_id <> $2
WHERE m.conversation_id = $1
  AND cp.user_id = $2
  AND (m.created_at < $3 OR (m.created_at = $3 AND m.id < $4))
  AND NOT EXISTS (
    SELECT 1
    FROM user_blocks b
    WHERE (b.blocker_app_user_id = $2 AND b.blocked_app_user_id = other_cp.user_id)
       OR (b.blocker_app_user_id = other_cp.user_id AND b.blocked_app_user_id = $2)
  )
ORDER BY m.created_at DESC, m.id DESC
LIMIT $5;

-- name: MarkConversationReadNow :exec
UPDATE conversation_participants
SET last_read_at = NOW()
WHERE conversation_id = $1
  AND user_id = $2;

-- name: MarkConversationReadByMessageID :exec
UPDATE conversation_participants cp
SET last_read_at = GREATEST(
  COALESCE(cp.last_read_at, 'epoch'::timestamptz),
  (SELECT m.created_at FROM messages m WHERE m.id = $3 AND m.conversation_id = $1)
)
WHERE cp.conversation_id = $1
  AND cp.user_id = $2
  AND EXISTS (
    SELECT 1
    FROM messages m
    WHERE m.id = $3
      AND m.conversation_id = $1
  );
