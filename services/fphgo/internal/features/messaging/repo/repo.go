package repo

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	pool *pgxpool.Pool
}

type Conversation struct {
	ID              string
	InitiatorUserID string
	Status          string
}

type MessageItem struct {
	ConversationID string
	MessageID      int64
	SenderID       string
	Content        string
	Status         string
	CreatedAt      time.Time
}

func New(pool *pgxpool.Pool) *Repo { return &Repo{pool: pool} }

func sortedPairKey(a, b string) string {
	parts := []string{a, b}
	sort.Strings(parts)
	return parts[0] + ":" + parts[1]
}

func (r *Repo) IsBlockedEither(ctx context.Context, a, b string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM user_blocks
			WHERE (blocker_app_user_id = $1 AND blocked_app_user_id = $2)
			   OR (blocker_app_user_id = $2 AND blocked_app_user_id = $1)
		)
	`, a, b).Scan(&exists)
	return exists, err
}

func (r *Repo) AreBuddies(ctx context.Context, a, b string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM buddy_relationships
			WHERE status = 'accepted'
			  AND ((user_id = $1 AND buddy_id = $2) OR (user_id = $2 AND buddy_id = $1))
		)
	`, a, b).Scan(&exists)
	return exists, err
}

func (r *Repo) UpsertDMConversation(ctx context.Context, senderID, recipientID, status string) (Conversation, error) {
	if _, err := uuid.Parse(senderID); err != nil {
		return Conversation{}, fmt.Errorf("invalid sender id: %w", err)
	}
	if _, err := uuid.Parse(recipientID); err != nil {
		return Conversation{}, fmt.Errorf("invalid recipient id: %w", err)
	}

	pairKey := sortedPairKey(senderID, recipientID)
	convID := uuid.NewString()

	var conv Conversation
	err := r.pool.QueryRow(ctx, `
		INSERT INTO conversations (id, kind, dm_pair_key, initiator_user_id, status)
		VALUES ($1, 'dm', $2, $3, $4)
		ON CONFLICT (dm_pair_key)
		DO UPDATE SET
			status = CASE WHEN conversations.status = 'active' THEN 'active' ELSE EXCLUDED.status END,
			updated_at = NOW()
		RETURNING id, initiator_user_id, status
	`, convID, pairKey, senderID, status).Scan(&conv.ID, &conv.InitiatorUserID, &conv.Status)
	if err != nil {
		return Conversation{}, err
	}

	for _, userID := range []string{senderID, recipientID} {
		if _, err := r.pool.Exec(ctx, `
			INSERT INTO conversation_participants (conversation_id, user_id)
			VALUES ($1, $2)
			ON CONFLICT (conversation_id, user_id) DO NOTHING
		`, conv.ID, userID); err != nil {
			return Conversation{}, err
		}
	}

	return conv, nil
}

func (r *Repo) InsertMessage(ctx context.Context, conversationID, senderID, content string) (int64, error) {
	var id int64
	err := r.pool.QueryRow(ctx, `
		INSERT INTO messages (conversation_id, sender_user_id, content)
		VALUES ($1, $2, $3)
		RETURNING id
	`, conversationID, senderID, content).Scan(&id)
	return id, err
}

func (r *Repo) GetConversation(ctx context.Context, conversationID string) (Conversation, error) {
	var conv Conversation
	err := r.pool.QueryRow(ctx, `
		SELECT id, initiator_user_id, status
		FROM conversations
		WHERE id = $1
	`, conversationID).Scan(&conv.ID, &conv.InitiatorUserID, &conv.Status)
	return conv, err
}

func (r *Repo) IsParticipant(ctx context.Context, conversationID, userID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM conversation_participants
			WHERE conversation_id = $1 AND user_id = $2
		)
	`, conversationID, userID).Scan(&exists)
	return exists, err
}

func (r *Repo) UpdateConversationStatus(ctx context.Context, conversationID, status string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE conversations
		SET status = $2, updated_at = NOW()
		WHERE id = $1
	`, conversationID, status)
	return err
}

func (r *Repo) Inbox(ctx context.Context, userID string) ([]MessageItem, error) {
	rows, err := r.pool.Query(ctx, `
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
		JOIN conversation_participants other_cp ON other_cp.conversation_id = c.id AND other_cp.user_id <> $1
		WHERE cp.user_id = $1
		  AND c.status = 'active'
		  AND NOT EXISTS (
			SELECT 1
			FROM user_blocks b
			WHERE (b.blocker_app_user_id = $1 AND b.blocked_app_user_id = other_cp.user_id)
			   OR (b.blocker_app_user_id = other_cp.user_id AND b.blocked_app_user_id = $1)
		  )
		ORDER BY m.created_at DESC
		LIMIT 100
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]MessageItem, 0)
	for rows.Next() {
		var item MessageItem
		if err := rows.Scan(&item.ConversationID, &item.MessageID, &item.SenderID, &item.Content, &item.Status, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) Requests(ctx context.Context, userID string) ([]MessageItem, error) {
	rows, err := r.pool.Query(ctx, `
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
		JOIN conversation_participants other_cp ON other_cp.conversation_id = c.id AND other_cp.user_id <> $1
		WHERE cp.user_id = $1
		  AND c.status = 'pending'
		  AND c.initiator_user_id <> $1
		  AND NOT EXISTS (
			SELECT 1
			FROM user_blocks b
			WHERE (b.blocker_app_user_id = $1 AND b.blocked_app_user_id = other_cp.user_id)
			   OR (b.blocker_app_user_id = other_cp.user_id AND b.blocked_app_user_id = $1)
		  )
		ORDER BY m.created_at DESC
		LIMIT 100
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]MessageItem, 0)
	for rows.Next() {
		var item MessageItem
		if err := rows.Scan(&item.ConversationID, &item.MessageID, &item.SenderID, &item.Content, &item.Status, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) WithTx(ctx context.Context, fn func(tx pgx.Tx) error) error {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func IsNoRows(err error) bool { return errors.Is(err, pgx.ErrNoRows) }
