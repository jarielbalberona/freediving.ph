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

-- name: GetDirectThreadByPair :one
SELECT id, created_at, updated_at, last_message_at, type::text AS type, created_by_user_id, direct_user_low, direct_user_high
FROM message_threads
WHERE type = 'direct'
  AND direct_user_low = $1
  AND direct_user_high = $2;

-- name: CreateDirectThread :one
INSERT INTO message_threads (
  id,
  created_by_user_id,
  type,
  direct_user_low,
  direct_user_high,
  created_at,
  updated_at,
  last_message_at
)
VALUES ($1, $2, 'direct', $3, $4, NOW(), NOW(), NOW())
RETURNING id, created_at, updated_at, last_message_at, type::text AS type, created_by_user_id, direct_user_low, direct_user_high;

-- name: UpsertThreadMember :exec
INSERT INTO message_thread_members (
  thread_id,
  user_id,
  inbox_category,
  joined_at,
  left_at,
  is_archived,
  is_muted
)
VALUES ($1, $2, sqlc.arg(inbox_category)::message_inbox_category, NOW(), NULL, FALSE, FALSE)
ON CONFLICT (thread_id, user_id)
DO UPDATE SET
  joined_at = COALESCE(message_thread_members.joined_at, NOW()),
  left_at = NULL;

-- name: GetThreadMemberByThreadAndUser :one
SELECT
  thread_id,
  user_id,
  joined_at,
  left_at,
  inbox_category::text AS inbox_category,
  is_archived,
  is_muted,
  last_read_message_id,
  last_read_at
FROM message_thread_members
WHERE thread_id = $1
  AND user_id = $2
LIMIT 1;

-- name: ListThreadMemberUserIDs :many
SELECT user_id
FROM message_thread_members
WHERE thread_id = $1
  AND left_at IS NULL;

-- name: ListThreadParticipants :many
SELECT
  m.user_id,
  u.username,
  u.display_name,
  p.avatar_url
FROM message_thread_members m
JOIN users u ON u.id = m.user_id
LEFT JOIN profiles p ON p.user_id = m.user_id
WHERE m.thread_id = $1
  AND m.left_at IS NULL
ORDER BY m.joined_at ASC;

-- name: GetDirectOtherParticipant :one
SELECT
  m.user_id,
  u.username,
  u.display_name,
  p.avatar_url
FROM message_thread_members m
JOIN users u ON u.id = m.user_id
LEFT JOIN profiles p ON p.user_id = m.user_id
WHERE m.thread_id = $1
  AND m.user_id <> $2
  AND m.left_at IS NULL
LIMIT 1;

-- name: GetLastThreadMessage :one
SELECT id, thread_id, sender_user_id, client_id, kind::text AS kind, body, created_at, edited_at, deleted_at
FROM thread_messages
WHERE thread_id = $1
  AND deleted_at IS NULL
ORDER BY created_at DESC, id DESC
LIMIT 1;

-- name: ListMessageThreads :many
SELECT
  t.id,
  t.type::text AS type,
  t.last_message_at,
  m.inbox_category::text AS inbox_category,
  p.user_id AS participant_user_id,
  p.username AS participant_username,
  p.display_name AS participant_display_name,
  p.avatar_url AS participant_avatar_url,
  lm.id AS last_message_id,
  lm.kind::text AS last_message_kind,
  lm.body AS last_message_body,
  lm.sender_user_id AS last_message_sender_user_id,
  lm.created_at AS last_message_created_at,
  COALESCE(unread.unread_count, 0)::bigint AS unread_count
FROM message_thread_members m
JOIN message_threads t ON t.id = m.thread_id
JOIN LATERAL (
  SELECT
    om.user_id,
    u.username,
    u.display_name,
    COALESCE(pr.avatar_url, '')::text AS avatar_url
  FROM message_thread_members om
  JOIN users u ON u.id = om.user_id
  LEFT JOIN profiles pr ON pr.user_id = om.user_id
  WHERE om.thread_id = m.thread_id
    AND om.user_id <> $1
    AND om.left_at IS NULL
  LIMIT 1
) p ON TRUE
LEFT JOIN LATERAL (
  SELECT tm.id, tm.kind, tm.body, tm.sender_user_id, tm.created_at
  FROM thread_messages tm
  WHERE tm.thread_id = m.thread_id
    AND tm.deleted_at IS NULL
  ORDER BY tm.created_at DESC, tm.id DESC
  LIMIT 1
) lm ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS unread_count
  FROM thread_messages tm
  WHERE tm.thread_id = m.thread_id
    AND tm.deleted_at IS NULL
    AND tm.sender_user_id <> $1
    AND tm.created_at > COALESCE(m.last_read_at, 'epoch'::timestamptz)
) unread ON TRUE
WHERE m.user_id = $1
  AND m.left_at IS NULL
  AND m.is_archived = FALSE
  AND m.inbox_category = sqlc.arg(category)::message_inbox_category
  AND (
    sqlc.arg(search)::text = ''
    OR p.username ILIKE ('%' || sqlc.arg(search)::text || '%')
    OR p.display_name ILIKE ('%' || sqlc.arg(search)::text || '%')
  )
  AND (
    t.last_message_at < sqlc.arg(cursor_last_message_at)::timestamptz
    OR (t.last_message_at = sqlc.arg(cursor_last_message_at)::timestamptz AND t.id < sqlc.arg(cursor_thread_id)::uuid)
  )
ORDER BY t.last_message_at DESC, t.id DESC
LIMIT sqlc.arg(limit_count)::int;

-- name: GetThreadDetail :one
SELECT
  t.id,
  t.type::text AS type,
  t.created_at,
  t.updated_at,
  t.last_message_at,
  m.inbox_category::text AS inbox_category,
  m.last_read_message_id
FROM message_threads t
JOIN message_thread_members m ON m.thread_id = t.id
WHERE t.id = $1
  AND m.user_id = $2
  AND m.left_at IS NULL
LIMIT 1;

-- name: ListThreadMessages :many
SELECT
  id,
  thread_id,
  sender_user_id,
  client_id,
  kind::text AS kind,
  body,
  created_at,
  edited_at,
  deleted_at
FROM thread_messages
WHERE thread_id = $1
  AND deleted_at IS NULL
  AND (
    created_at < sqlc.arg(cursor_created_at)::timestamptz
    OR (created_at = sqlc.arg(cursor_created_at)::timestamptz AND id < sqlc.arg(cursor_message_id)::bigint)
  )
ORDER BY created_at DESC, id DESC
LIMIT sqlc.arg(limit_count)::int;

-- name: InsertThreadMessage :one
INSERT INTO thread_messages (
  thread_id,
  sender_user_id,
  client_id,
  kind,
  body
)
VALUES (
  $1,
  $2,
  sqlc.narg(client_id),
  'text',
  $3
)
ON CONFLICT (thread_id, sender_user_id, client_id)
WHERE client_id IS NOT NULL
DO UPDATE SET body = thread_messages.body
RETURNING id, thread_id, sender_user_id, client_id, kind::text AS kind, body, created_at, edited_at, deleted_at;

-- name: TouchThreadLastMessage :exec
UPDATE message_threads
SET last_message_at = $2,
    updated_at = NOW()
WHERE id = $1;

-- name: MarkThreadRead :exec
UPDATE message_thread_members m
SET last_read_message_id = tm.id,
    last_read_at = GREATEST(COALESCE(m.last_read_at, 'epoch'::timestamptz), tm.created_at)
FROM thread_messages tm
WHERE m.thread_id = $1
  AND m.user_id = $2
  AND tm.thread_id = $1
  AND tm.id = $3
  AND (m.last_read_at IS NULL OR tm.created_at >= m.last_read_at);

-- name: GetThreadMessageByID :one
SELECT id, thread_id, sender_user_id, client_id, kind::text AS kind, body, created_at, edited_at, deleted_at
FROM thread_messages
WHERE id = $1
  AND thread_id = $2
  AND deleted_at IS NULL;

-- name: AreUsersBuddies :one
SELECT EXISTS (
  SELECT 1
  FROM buddies
  WHERE app_user_id_a = LEAST($1, $2)
    AND app_user_id_b = GREATEST($1, $2)
);
