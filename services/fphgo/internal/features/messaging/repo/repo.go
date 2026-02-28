package repo

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	messagingqlc "fphgo/internal/features/messaging/repo/sqlc"
)

type Repo struct {
	pool    *pgxpool.Pool
	queries *messagingqlc.Queries
}

type Conversation struct {
	ID              string
	InitiatorUserID string
	Status          string
	UpdatedAt       time.Time
}

type Message struct {
	ID             int64
	ConversationID string
	SenderID       string
	Content        string
	Metadata       *MessageMetadata
	CreatedAt      time.Time
}

type MessageMetadata struct {
	Type         string `json:"type"`
	DiveSiteID   string `json:"diveSiteId"`
	DiveSiteSlug string `json:"diveSiteSlug,omitempty"`
	DiveSiteName string `json:"diveSiteName"`
	DiveSiteArea string `json:"diveSiteArea,omitempty"`
	TimeWindow   string `json:"timeWindow,omitempty"`
	DateStart    string `json:"dateStart,omitempty"`
	DateEnd      string `json:"dateEnd,omitempty"`
	Note         string `json:"note,omitempty"`
}

type TrustSignals struct {
	EmailVerified bool
	PhoneVerified bool
	CertLevel     string
	BuddyCount    int64
	ReportCount   int64
}

type ConversationItem struct {
	ConversationID   string
	Status           string
	InitiatorUserID  string
	UpdatedAt        time.Time
	OtherUserID      string
	OtherUsername    string
	OtherDisplayName string
	OtherAvatarURL   string
	OtherTrust       TrustSignals
	LastMessage      Message
	RequestPreview   Message
	UnreadCount      int64
	PendingCount     int64
}

type ListInboxInput struct {
	UserID        string
	CursorUpdated time.Time
	CursorID      string
	Limit         int32
}

type ListConversationMessagesInput struct {
	ConversationID  string
	UserID          string
	CursorCreated   time.Time
	CursorMessageID int64
	Limit           int32
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool, queries: messagingqlc.New(pool)}
}

func sortedPairKey(a, b string) string {
	parts := []string{a, b}
	sort.Strings(parts)
	return parts[0] + ":" + parts[1]
}

func (r *Repo) AreBuddies(ctx context.Context, a, b string) (bool, error) {
	return r.queries.AreBuddies(ctx, messagingqlc.AreBuddiesParams{
		AppUserIDA:   toUUID(a),
		AppUserIDA_2: toUUID(b),
	})
}

func (r *Repo) UpsertDMConversation(ctx context.Context, senderID, recipientID, status string) (Conversation, error) {
	pairKey := sortedPairKey(senderID, recipientID)
	convID := uuid.NewString()

	row, err := r.queries.UpsertDMConversation(ctx, messagingqlc.UpsertDMConversationParams{
		ID:              toUUID(convID),
		DmPairKey:       pairKey,
		InitiatorUserID: toUUID(senderID),
		Status:          status,
	})
	if err != nil {
		return Conversation{}, err
	}

	for _, userID := range []string{senderID, recipientID} {
		if err := r.queries.AddConversationParticipant(ctx, messagingqlc.AddConversationParticipantParams{
			ConversationID: row.ID,
			UserID:         toUUID(userID),
		}); err != nil {
			return Conversation{}, err
		}
	}

	return Conversation{
		ID:              row.ID.String(),
		InitiatorUserID: row.InitiatorUserID.String(),
		Status:          row.Status,
		UpdatedAt:       row.UpdatedAt.Time.UTC(),
	}, nil
}

func (r *Repo) InsertMessage(ctx context.Context, conversationID, senderID, content string, metadata *MessageMetadata, idempotencyKey *string) (Message, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Message{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	q := r.queries.WithTx(tx)
	inserted, err := q.InsertMessage(ctx, messagingqlc.InsertMessageParams{
		ConversationID: toUUID(conversationID),
		SenderUserID:   toUUID(senderID),
		Content:        content,
		Metadata:       encodeMessageMetadata(metadata),
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		return Message{}, err
	}
	if err := q.TouchConversation(ctx, toUUID(conversationID)); err != nil {
		return Message{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Message{}, err
	}

	return Message{
		ID:             inserted.ID,
		ConversationID: conversationID,
		SenderID:       senderID,
		Content:        content,
		Metadata:       decodeMessageMetadata(inserted.Metadata),
		CreatedAt:      inserted.CreatedAt.Time.UTC(),
	}, nil
}

func (r *Repo) GetConversation(ctx context.Context, conversationID string) (Conversation, error) {
	row, err := r.queries.GetConversation(ctx, toUUID(conversationID))
	if err != nil {
		return Conversation{}, err
	}
	return Conversation{
		ID:              row.ID.String(),
		InitiatorUserID: row.InitiatorUserID.String(),
		Status:          row.Status,
		UpdatedAt:       row.UpdatedAt.Time.UTC(),
	}, nil
}

func (r *Repo) IsParticipant(ctx context.Context, conversationID, userID string) (bool, error) {
	return r.queries.IsParticipant(ctx, messagingqlc.IsParticipantParams{
		ConversationID: toUUID(conversationID),
		UserID:         toUUID(userID),
	})
}

func (r *Repo) GetOtherParticipantID(ctx context.Context, conversationID, userID string) (string, error) {
	id, err := r.queries.GetOtherParticipantID(ctx, messagingqlc.GetOtherParticipantIDParams{
		ConversationID: toUUID(conversationID),
		UserID:         toUUID(userID),
	})
	if err != nil {
		return "", err
	}
	return id.String(), nil
}

func (r *Repo) UpdateConversationStatus(ctx context.Context, conversationID, status string) error {
	return r.queries.SetConversationStatus(ctx, messagingqlc.SetConversationStatusParams{
		ID:     toUUID(conversationID),
		Status: status,
	})
}

func (r *Repo) ListInboxConversations(ctx context.Context, input ListInboxInput) ([]ConversationItem, error) {
	rows, err := r.queries.ListInboxConversations(ctx, messagingqlc.ListInboxConversationsParams{
		UserID:    toUUID(input.UserID),
		UpdatedAt: toTimestamptz(input.CursorUpdated),
		ID:        toUUID(input.CursorID),
		Limit:     input.Limit,
	})
	if err != nil {
		return nil, err
	}

	items := make([]ConversationItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, ConversationItem{
			ConversationID:   row.ID.String(),
			Status:           row.Status,
			InitiatorUserID:  row.InitiatorUserID.String(),
			UpdatedAt:        row.UpdatedAt.Time.UTC(),
			OtherUserID:      row.OtherUserID.String(),
			OtherUsername:    row.OtherUsername,
			OtherDisplayName: row.OtherDisplayName,
			OtherAvatarURL:   valueOrEmpty(row.OtherAvatarUrl),
			OtherTrust: TrustSignals{
				EmailVerified: row.OtherEmailVerified,
				PhoneVerified: row.OtherPhoneVerified,
				CertLevel:     valueOrEmpty(row.OtherCertLevel),
				BuddyCount:    row.OtherBuddyCount,
				ReportCount:   row.OtherReportCount,
			},
			LastMessage: Message{
				ID:             row.LastMessageID,
				ConversationID: row.ID.String(),
				SenderID:       row.LastMessageSenderID.String(),
				Content:        row.LastMessageContent,
				Metadata:       decodeMessageMetadata(row.LastMessageMetadata),
				CreatedAt:      row.LastMessageCreatedAt.Time.UTC(),
			},
			RequestPreview: Message{
				ID:             row.FirstMessageID,
				ConversationID: row.ID.String(),
				SenderID:       row.FirstMessageSenderID.String(),
				Content:        row.FirstMessageContent,
				Metadata:       decodeMessageMetadata(row.FirstMessageMetadata),
				CreatedAt:      row.FirstMessageCreatedAt.Time.UTC(),
			},
			UnreadCount:  row.UnreadCount,
			PendingCount: int64(row.PendingCount),
		})
	}
	return items, nil
}

func (r *Repo) ListConversationMessages(ctx context.Context, input ListConversationMessagesInput) ([]Message, error) {
	rows, err := r.queries.ListConversationMessages(ctx, messagingqlc.ListConversationMessagesParams{
		ConversationID: toUUID(input.ConversationID),
		UserID:         toUUID(input.UserID),
		CreatedAt:      toTimestamptz(input.CursorCreated),
		ID:             input.CursorMessageID,
		Limit:          input.Limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]Message, 0, len(rows))
	for _, row := range rows {
		items = append(items, Message{
			ID:             row.ID,
			ConversationID: row.ConversationID.String(),
			SenderID:       row.SenderUserID.String(),
			Content:        row.Content,
			Metadata:       decodeMessageMetadata(row.Metadata),
			CreatedAt:      row.CreatedAt.Time.UTC(),
		})
	}
	return items, nil
}

func (r *Repo) MarkConversationRead(ctx context.Context, conversationID, userID string, messageID *int64) error {
	if messageID == nil {
		return r.queries.MarkConversationReadNow(ctx, messagingqlc.MarkConversationReadNowParams{
			ConversationID: toUUID(conversationID),
			UserID:         toUUID(userID),
		})
	}
	return r.queries.MarkConversationReadByMessageID(ctx, messagingqlc.MarkConversationReadByMessageIDParams{
		ConversationID: toUUID(conversationID),
		UserID:         toUUID(userID),
		ID:             *messageID,
	})
}

func IsNoRows(err error) bool { return errors.Is(err, pgx.ErrNoRows) }

func toUUID(value string) pgtype.UUID {
	var id pgtype.UUID
	_ = id.Scan(value)
	return id
}

func toTimestamptz(value time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: value, Valid: true}
}

func valueOrEmpty(input *string) string {
	if input == nil {
		return ""
	}
	return *input
}

func encodeMessageMetadata(metadata *MessageMetadata) []byte {
	if metadata == nil {
		return nil
	}
	payload, err := json.Marshal(metadata)
	if err != nil {
		return nil
	}
	return payload
}

func decodeMessageMetadata(raw []byte) *MessageMetadata {
	if len(raw) == 0 {
		return nil
	}
	var metadata MessageMetadata
	if err := json.Unmarshal(raw, &metadata); err != nil {
		return nil
	}
	return &metadata
}
