package repo

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	buddiesqlc "fphgo/internal/features/buddies/repo/sqlc"
)

type Repo struct {
	pool    *pgxpool.Pool
	queries *buddiesqlc.Queries
}

type BuddyRequest struct {
	ID              string
	RequesterUserID string
	TargetUserID    string
	Status          string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type BuddyProfile struct {
	UserID      string
	Username    string
	DisplayName string
	AvatarURL   string
}

type IncomingRequest struct {
	Request BuddyRequest
	From    BuddyProfile
}

type OutgoingRequest struct {
	Request BuddyRequest
	To      BuddyProfile
}

type Buddy struct {
	UserID      string
	Username    string
	DisplayName string
	AvatarURL   string
	CreatedAt   time.Time
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool, queries: buddiesqlc.New(pool)}
}

func (r *Repo) UserExists(ctx context.Context, userID string) (bool, error) {
	return r.queries.UserExists(ctx, toUUID(userID))
}

func (r *Repo) IsBlockedEitherDirection(ctx context.Context, a, b string) (bool, error) {
	return r.queries.IsBlockedEitherDirection(ctx, buddiesqlc.IsBlockedEitherDirectionParams{
		BlockerAppUserID: toUUID(a),
		BlockedAppUserID: toUUID(b),
	})
}

func (r *Repo) AreBuddies(ctx context.Context, a, b string) (bool, error) {
	return r.queries.AreBuddies(ctx, buddiesqlc.AreBuddiesParams{
		AppUserIDA:   toUUID(a),
		AppUserIDA_2: toUUID(b),
	})
}

func (r *Repo) GetPendingRequestBetweenUsers(ctx context.Context, a, b string) (BuddyRequest, error) {
	row, err := r.queries.GetPendingRequestBetweenUsers(ctx, buddiesqlc.GetPendingRequestBetweenUsersParams{
		RequesterAppUserID: toUUID(a),
		TargetAppUserID:    toUUID(b),
	})
	if err != nil {
		return BuddyRequest{}, err
	}
	return mapBuddyRequest(row), nil
}

func (r *Repo) CreateBuddyRequest(ctx context.Context, requesterUserID, targetUserID string) (BuddyRequest, error) {
	row, err := r.queries.CreateBuddyRequest(ctx, buddiesqlc.CreateBuddyRequestParams{
		RequesterAppUserID: toUUID(requesterUserID),
		TargetAppUserID:    toUUID(targetUserID),
	})
	if err != nil {
		return BuddyRequest{}, err
	}
	return mapBuddyRequest(row), nil
}

func (r *Repo) GetBuddyRequestByID(ctx context.Context, requestID string) (BuddyRequest, error) {
	row, err := r.queries.GetBuddyRequestByID(ctx, toUUID(requestID))
	if err != nil {
		return BuddyRequest{}, err
	}
	return mapBuddyRequest(row), nil
}

func (r *Repo) UpdateBuddyRequestStatus(ctx context.Context, requestID, status string) error {
	return r.queries.UpdateBuddyRequestStatus(ctx, buddiesqlc.UpdateBuddyRequestStatusParams{
		ID:     toUUID(requestID),
		Status: status,
	})
}

func (r *Repo) CreateBuddyPair(ctx context.Context, a, b string) error {
	return r.queries.CreateBuddyPair(ctx, buddiesqlc.CreateBuddyPairParams{
		Column1: toUUID(a),
		Column2: toUUID(b),
	})
}

func (r *Repo) AcceptBuddyRequest(ctx context.Context, requestID, requesterID, targetUserID string) error {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	q := r.queries.WithTx(tx)
	if err := q.CreateBuddyPair(ctx, buddiesqlc.CreateBuddyPairParams{
		Column1: toUUID(requesterID),
		Column2: toUUID(targetUserID),
	}); err != nil {
		return err
	}
	if err := q.UpdateBuddyRequestStatus(ctx, buddiesqlc.UpdateBuddyRequestStatusParams{
		ID:     toUUID(requestID),
		Status: "accepted",
	}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *Repo) DeleteBuddyPair(ctx context.Context, a, b string) error {
	return r.queries.DeleteBuddyPair(ctx, buddiesqlc.DeleteBuddyPairParams{
		Column1: toUUID(a),
		Column2: toUUID(b),
	})
}

func (r *Repo) ListIncomingBuddyRequests(ctx context.Context, actorUserID string) ([]IncomingRequest, error) {
	rows, err := r.queries.ListIncomingBuddyRequests(ctx, toUUID(actorUserID))
	if err != nil {
		return nil, err
	}
	items := make([]IncomingRequest, 0, len(rows))
	for _, row := range rows {
		items = append(items, IncomingRequest{
			Request: mapBuddyRequest(buddiesqlc.BuddyRequest{
				ID:                 row.ID,
				RequesterAppUserID: row.RequesterAppUserID,
				TargetAppUserID:    row.TargetAppUserID,
				Status:             row.Status,
				CreatedAt:          row.CreatedAt,
				UpdatedAt:          row.UpdatedAt,
			}),
			From: BuddyProfile{
				UserID:      row.RequesterAppUserID.String(),
				Username:    row.Username,
				DisplayName: row.DisplayName,
				AvatarURL:   valueOrEmpty(row.AvatarUrl),
			},
		})
	}
	return items, nil
}

func (r *Repo) ListOutgoingBuddyRequests(ctx context.Context, actorUserID string) ([]OutgoingRequest, error) {
	rows, err := r.queries.ListOutgoingBuddyRequests(ctx, toUUID(actorUserID))
	if err != nil {
		return nil, err
	}
	items := make([]OutgoingRequest, 0, len(rows))
	for _, row := range rows {
		items = append(items, OutgoingRequest{
			Request: mapBuddyRequest(buddiesqlc.BuddyRequest{
				ID:                 row.ID,
				RequesterAppUserID: row.RequesterAppUserID,
				TargetAppUserID:    row.TargetAppUserID,
				Status:             row.Status,
				CreatedAt:          row.CreatedAt,
				UpdatedAt:          row.UpdatedAt,
			}),
			To: BuddyProfile{
				UserID:      row.TargetAppUserID.String(),
				Username:    row.Username,
				DisplayName: row.DisplayName,
				AvatarURL:   valueOrEmpty(row.AvatarUrl),
			},
		})
	}
	return items, nil
}

func (r *Repo) ListBuddies(ctx context.Context, actorUserID string) ([]Buddy, error) {
	rows, err := r.queries.ListBuddies(ctx, toUUID(actorUserID))
	if err != nil {
		return nil, err
	}
	items := make([]Buddy, 0, len(rows))
	for _, row := range rows {
		items = append(items, Buddy{
			UserID:      row.BuddyUserID.String(),
			Username:    row.Username,
			DisplayName: row.DisplayName,
			AvatarURL:   valueOrEmpty(row.AvatarUrl),
			CreatedAt:   row.CreatedAt.Time.UTC(),
		})
	}
	return items, nil
}

type BuddyPreviewResult struct {
	Count int
	Items []BuddyProfile
}

func (r *Repo) BuddyPreview(ctx context.Context, targetUserID, viewerUserID string, limit int) (BuddyPreviewResult, error) {
	count, err := r.queries.BuddyCount(ctx, buddiesqlc.BuddyCountParams{
		TargetUserID: toUUID(targetUserID),
		ViewerUserID: toUUID(viewerUserID),
	})
	if err != nil {
		return BuddyPreviewResult{}, err
	}

	rows, err := r.queries.BuddyPreviewItems(ctx, buddiesqlc.BuddyPreviewItemsParams{
		TargetUserID: toUUID(targetUserID),
		ViewerUserID: toUUID(viewerUserID),
		PreviewLimit: int32(limit),
	})
	if err != nil {
		return BuddyPreviewResult{}, err
	}

	items := make([]BuddyProfile, 0, len(rows))
	for _, row := range rows {
		items = append(items, BuddyProfile{
			UserID:      row.BuddyUserID.String(),
			Username:    row.Username,
			DisplayName: row.DisplayName,
			AvatarURL:   valueOrEmpty(row.AvatarUrl),
		})
	}
	return BuddyPreviewResult{Count: int(count), Items: items}, nil
}

func IsNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

func mapBuddyRequest(row buddiesqlc.BuddyRequest) BuddyRequest {
	return BuddyRequest{
		ID:              row.ID.String(),
		RequesterUserID: row.RequesterAppUserID.String(),
		TargetUserID:    row.TargetAppUserID.String(),
		Status:          row.Status,
		CreatedAt:       row.CreatedAt.Time.UTC(),
		UpdatedAt:       row.UpdatedAt.Time.UTC(),
	}
}

func toUUID(value string) pgtype.UUID {
	var id pgtype.UUID
	_ = id.Scan(value)
	return id
}

func valueOrEmpty(input *string) string {
	if input == nil {
		return ""
	}
	return *input
}
