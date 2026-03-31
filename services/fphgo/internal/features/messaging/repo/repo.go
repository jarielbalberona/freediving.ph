package repo

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
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

type ThreadCategory string

const (
	ThreadCategoryPrimary      ThreadCategory = "primary"
	ThreadCategoryGeneral      ThreadCategory = "general"
	ThreadCategoryTransactions ThreadCategory = "transactions"
	ThreadCategoryRequests     ThreadCategory = "requests"
)

type ThreadKind string

const (
	ThreadKindDirect ThreadKind = "direct"
)

type MessageKind string

const (
	MessageKindText   MessageKind = "text"
	MessageKindSystem MessageKind = "system"
)

type Thread struct {
	ID            string
	Type          ThreadKind
	Category      ThreadCategory
	CreatedAt     time.Time
	LastMessageAt time.Time
	LastReadID    *int64
}

type ThreadParticipant struct {
	UserID      string
	Username    string
	DisplayName string
	AvatarURL   string
}

type ThreadMessage struct {
	ID        int64
	ThreadID  string
	SenderID  string
	ClientID  *string
	Kind      MessageKind
	Body      string
	CreatedAt time.Time
}

type ThreadSummary struct {
	ThreadID      string
	Type          ThreadKind
	Category      ThreadCategory
	Participant   ThreadParticipant
	LastMessage   *ThreadMessage
	LastMessageAt time.Time
	UnreadCount   int64
	HasUnread     bool
	ActiveRequest bool
}

type ListThreadsInput struct {
	UserID              string
	Category            ThreadCategory
	Search              string
	CursorLastMessageAt time.Time
	CursorThreadID      string
	Limit               int32
}

type ListThreadMessagesInput struct {
	ThreadID        string
	CursorCreatedAt time.Time
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

func orderedPair(a, b string) (string, string) {
	if a <= b {
		return a, b
	}
	return b, a
}

func (r *Repo) OpenOrCreateDirectThread(ctx context.Context, actorID, targetUserID string, targetCategory ThreadCategory) (Thread, error) {
	low, high := orderedPair(actorID, targetUserID)
	existing, err := r.queries.GetDirectThreadByPair(ctx, messagingqlc.GetDirectThreadByPairParams{
		DirectUserLow:  toUUID(low),
		DirectUserHigh: toUUID(high),
	})
	if err != nil && !IsNoRows(err) {
		return Thread{}, err
	}

	now := time.Now().UTC()
	threadID := uuid.NewString()
	threadCreatedAt := now
	threadLastMessageAt := now
	if err == nil {
		threadID = existing.ID.String()
		threadCreatedAt = existing.CreatedAt.Time.UTC()
		threadLastMessageAt = existing.LastMessageAt.Time.UTC()
	} else {
		row, createErr := r.queries.CreateDirectThread(ctx, messagingqlc.CreateDirectThreadParams{
			ID:              toUUID(threadID),
			CreatedByUserID: toUUID(actorID),
			DirectUserLow:   toUUID(low),
			DirectUserHigh:  toUUID(high),
		})
		if createErr != nil {
			if !isUniqueViolation(createErr) {
				return Thread{}, createErr
			}
			// Another request created the same direct pair concurrently.
			// Load the existing canonical thread and continue.
			row, lookupErr := r.queries.GetDirectThreadByPair(ctx, messagingqlc.GetDirectThreadByPairParams{
				DirectUserLow:  toUUID(low),
				DirectUserHigh: toUUID(high),
			})
			if lookupErr != nil {
				return Thread{}, lookupErr
			}
			threadID = row.ID.String()
			threadCreatedAt = row.CreatedAt.Time.UTC()
			threadLastMessageAt = row.LastMessageAt.Time.UTC()
		} else {
			threadID = row.ID.String()
			threadCreatedAt = row.CreatedAt.Time.UTC()
			threadLastMessageAt = row.LastMessageAt.Time.UTC()
		}
	}

	if err := r.upsertThreadMember(ctx, threadID, actorID, ThreadCategoryPrimary); err != nil {
		return Thread{}, err
	}
	if err := r.upsertThreadMember(ctx, threadID, targetUserID, targetCategory); err != nil {
		return Thread{}, err
	}

	return Thread{
		ID:            threadID,
		Type:          ThreadKindDirect,
		Category:      stringCategory(string(ThreadCategoryPrimary)),
		CreatedAt:     threadCreatedAt,
		LastMessageAt: threadLastMessageAt,
	}, nil
}

func (r *Repo) AreUsersBuddies(ctx context.Context, a, b string) (bool, error) {
	return r.queries.AreUsersBuddies(ctx, messagingqlc.AreUsersBuddiesParams{
		AppUserIDA:   toUUID(a),
		AppUserIDA_2: toUUID(b),
	})
}

func (r *Repo) ListThreads(ctx context.Context, input ListThreadsInput) ([]ThreadSummary, error) {
	rows, err := r.queries.ListMessageThreads(ctx, messagingqlc.ListMessageThreadsParams{
		UserID:              toUUID(input.UserID),
		Category:            string(input.Category),
		Search:              strings.TrimSpace(input.Search),
		CursorLastMessageAt: toTimestamptz(input.CursorLastMessageAt),
		CursorThreadID:      toUUID(input.CursorThreadID),
		LimitCount:          input.Limit,
	})
	if err != nil {
		return nil, err
	}

	items := make([]ThreadSummary, 0, len(rows))
	for _, row := range rows {
		var lastMessage *ThreadMessage
		if row.LastMessageID > 0 {
			lastMessage = &ThreadMessage{
				ID:        row.LastMessageID,
				ThreadID:  row.ID.String(),
				SenderID:  row.LastMessageSenderUserID.String(),
				Kind:      stringKind(row.LastMessageKind),
				Body:      row.LastMessageBody,
				CreatedAt: row.LastMessageCreatedAt.Time.UTC(),
			}
		}
		items = append(items, ThreadSummary{
			ThreadID:      row.ID.String(),
			Type:          stringThreadKind(row.Type),
			Category:      stringCategory(fmt.Sprint(row.InboxCategory)),
			Participant:   ThreadParticipant{UserID: row.ParticipantUserID.String(), Username: row.ParticipantUsername, DisplayName: row.ParticipantDisplayName, AvatarURL: row.ParticipantAvatarUrl},
			LastMessage:   lastMessage,
			LastMessageAt: row.LastMessageAt.Time.UTC(),
			UnreadCount:   row.UnreadCount,
			HasUnread:     row.UnreadCount > 0,
			ActiveRequest: fmt.Sprint(row.InboxCategory) == string(ThreadCategoryRequests),
		})
	}
	return items, nil
}

func (r *Repo) GetThread(ctx context.Context, threadID, userID string) (Thread, error) {
	row, err := r.queries.GetThreadDetail(ctx, messagingqlc.GetThreadDetailParams{
		ID:     toUUID(threadID),
		UserID: toUUID(userID),
	})
	if err != nil {
		return Thread{}, err
	}
	var lastRead *int64
	if row.LastReadMessageID != nil {
		lastRead = row.LastReadMessageID
	}
	return Thread{
		ID:            row.ID.String(),
		Type:          stringThreadKind(row.Type),
		Category:      stringCategory(fmt.Sprint(row.InboxCategory)),
		CreatedAt:     row.CreatedAt.Time.UTC(),
		LastMessageAt: row.LastMessageAt.Time.UTC(),
		LastReadID:    lastRead,
	}, nil
}

func (r *Repo) ListThreadParticipants(ctx context.Context, threadID string) ([]ThreadParticipant, error) {
	rows, err := r.queries.ListThreadParticipants(ctx, toUUID(threadID))
	if err != nil {
		return nil, err
	}
	participants := make([]ThreadParticipant, 0, len(rows))
	for _, row := range rows {
		participants = append(participants, ThreadParticipant{
			UserID:      row.UserID.String(),
			Username:    row.Username,
			DisplayName: row.DisplayName,
			AvatarURL:   valueOrEmpty(row.AvatarUrl),
		})
	}
	return participants, nil
}

func (r *Repo) ListThreadMessages(ctx context.Context, input ListThreadMessagesInput) ([]ThreadMessage, error) {
	rows, err := r.queries.ListThreadMessages(ctx, messagingqlc.ListThreadMessagesParams{
		ThreadID:        toUUID(input.ThreadID),
		CursorCreatedAt: toTimestamptz(input.CursorCreatedAt),
		CursorMessageID: input.CursorMessageID,
		LimitCount:      input.Limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]ThreadMessage, 0, len(rows))
	for _, row := range rows {
		items = append(items, ThreadMessage{
			ID:        row.ID,
			ThreadID:  row.ThreadID.String(),
			SenderID:  row.SenderUserID.String(),
			ClientID:  row.ClientID,
			Kind:      stringKind(row.Kind),
			Body:      row.Body,
			CreatedAt: row.CreatedAt.Time.UTC(),
		})
	}
	return items, nil
}

func (r *Repo) CreateThreadMessage(ctx context.Context, threadID, senderID, body string, clientID *string) (ThreadMessage, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return ThreadMessage{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	q := r.queries.WithTx(tx)

	row, err := q.InsertThreadMessage(ctx, messagingqlc.InsertThreadMessageParams{
		ThreadID:     toUUID(threadID),
		SenderUserID: toUUID(senderID),
		ClientID:     clientID,
		Body:         body,
	})
	if err != nil {
		return ThreadMessage{}, err
	}
	if err := q.TouchThreadLastMessage(ctx, messagingqlc.TouchThreadLastMessageParams{
		ID:            toUUID(threadID),
		LastMessageAt: row.CreatedAt,
	}); err != nil {
		return ThreadMessage{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return ThreadMessage{}, err
	}
	return ThreadMessage{
		ID:        row.ID,
		ThreadID:  row.ThreadID.String(),
		SenderID:  row.SenderUserID.String(),
		ClientID:  row.ClientID,
		Kind:      stringKind(row.Kind),
		Body:      row.Body,
		CreatedAt: row.CreatedAt.Time.UTC(),
	}, nil
}

func (r *Repo) MarkThreadRead(ctx context.Context, threadID, userID string, lastReadMessageID int64) error {
	return r.queries.MarkThreadRead(ctx, messagingqlc.MarkThreadReadParams{
		ThreadID: toUUID(threadID),
		UserID:   toUUID(userID),
		ID:       lastReadMessageID,
	})
}

func (r *Repo) GetThreadMessage(ctx context.Context, threadID string, messageID int64) (ThreadMessage, error) {
	row, err := r.queries.GetThreadMessageByID(ctx, messagingqlc.GetThreadMessageByIDParams{
		ID:       messageID,
		ThreadID: toUUID(threadID),
	})
	if err != nil {
		return ThreadMessage{}, err
	}
	return ThreadMessage{
		ID:        row.ID,
		ThreadID:  row.ThreadID.String(),
		SenderID:  row.SenderUserID.String(),
		ClientID:  row.ClientID,
		Kind:      stringKind(row.Kind),
		Body:      row.Body,
		CreatedAt: row.CreatedAt.Time.UTC(),
	}, nil
}

func (r *Repo) ThreadMemberIDs(ctx context.Context, threadID string) ([]string, error) {
	rows, err := r.queries.ListThreadMemberUserIDs(ctx, toUUID(threadID))
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(rows))
	for _, id := range rows {
		ids = append(ids, id.String())
	}
	return ids, nil
}

func (r *Repo) IsThreadMember(ctx context.Context, threadID, userID string) (bool, error) {
	_, err := r.queries.GetThreadMemberByThreadAndUser(ctx, messagingqlc.GetThreadMemberByThreadAndUserParams{
		ThreadID: toUUID(threadID),
		UserID:   toUUID(userID),
	})
	if err != nil {
		if IsNoRows(err) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (r *Repo) PromoteThreadRequestToPrimary(ctx context.Context, threadID, userID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE message_thread_members
		SET inbox_category = 'primary'::message_inbox_category
		WHERE thread_id = $1
		  AND user_id = $2
		  AND left_at IS NULL
		  AND inbox_category = 'requests'::message_inbox_category
	`, toUUID(threadID), toUUID(userID))
	return err
}

func (r *Repo) ArchiveThreadForUser(ctx context.Context, threadID, userID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE message_thread_members
		SET is_archived = TRUE
		WHERE thread_id = $1
		  AND user_id = $2
		  AND left_at IS NULL
	`, toUUID(threadID), toUUID(userID))
	return err
}

func (r *Repo) UpdateThreadCategory(ctx context.Context, threadID string, category ThreadCategory) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE message_thread_members
		SET inbox_category = $2::message_inbox_category
		WHERE thread_id = $1
		  AND left_at IS NULL
	`, toUUID(threadID), string(category))
	return err
}

func (r *Repo) upsertThreadMember(ctx context.Context, threadID, userID string, category ThreadCategory) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO message_thread_members (
		  thread_id,
		  user_id,
		  inbox_category,
		  joined_at,
		  left_at,
		  is_archived,
		  is_muted
		)
		VALUES ($1, $2, $3::message_inbox_category, NOW(), NULL, FALSE, FALSE)
		ON CONFLICT (thread_id, user_id)
		DO UPDATE SET
		  inbox_category = EXCLUDED.inbox_category,
		  joined_at = COALESCE(message_thread_members.joined_at, NOW()),
		  left_at = NULL,
		  is_archived = FALSE
	`, toUUID(threadID), toUUID(userID), string(category))
	return err
}

func stringThreadKind(value interface{}) ThreadKind {
	switch strings.ToLower(fmt.Sprint(value)) {
	case "direct":
		return ThreadKindDirect
	default:
		return ThreadKindDirect
	}
}

func stringCategory(value string) ThreadCategory {
	switch strings.ToLower(value) {
	case string(ThreadCategoryGeneral):
		return ThreadCategoryGeneral
	case string(ThreadCategoryTransactions):
		return ThreadCategoryTransactions
	case string(ThreadCategoryRequests):
		return ThreadCategoryRequests
	default:
		return ThreadCategoryPrimary
	}
}

func stringKind(value interface{}) MessageKind {
	switch strings.ToLower(fmt.Sprint(value)) {
	case string(MessageKindSystem):
		return MessageKindSystem
	default:
		return MessageKindText
	}
}

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

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
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
