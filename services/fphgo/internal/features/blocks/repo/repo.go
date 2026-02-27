package repo

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	blocksqlc "fphgo/internal/features/blocks/repo/sqlc"
)

type Repo struct {
	queries *blocksqlc.Queries
}

type Block struct {
	BlockedUserID string
	Username      string
	DisplayName   string
	AvatarURL     string
	CreatedAt     time.Time
}

type ListBlocksInput struct {
	BlockerUserID string
	CursorCreated time.Time
	CursorUserID  string
	Limit         int32
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{queries: blocksqlc.New(pool)}
}

func (r *Repo) CreateBlock(ctx context.Context, blockerID, blockedID string) error {
	return r.queries.CreateBlock(ctx, blocksqlc.CreateBlockParams{
		BlockerAppUserID: toUUID(blockerID),
		BlockedAppUserID: toUUID(blockedID),
	})
}

func (r *Repo) DeleteBlock(ctx context.Context, blockerID, blockedID string) error {
	return r.queries.DeleteBlock(ctx, blocksqlc.DeleteBlockParams{
		BlockerAppUserID: toUUID(blockerID),
		BlockedAppUserID: toUUID(blockedID),
	})
}

func (r *Repo) ListBlocksByBlocker(ctx context.Context, input ListBlocksInput) ([]Block, error) {
	rows, err := r.queries.ListBlocksByBlocker(ctx, blocksqlc.ListBlocksByBlockerParams{
		BlockerAppUserID: toUUID(input.BlockerUserID),
		CreatedAt:        toTimestamptz(input.CursorCreated),
		BlockedAppUserID: toUUID(input.CursorUserID),
		Limit:            input.Limit,
	})
	if err != nil {
		return nil, err
	}

	items := make([]Block, 0, len(rows))
	for _, row := range rows {
		items = append(items, Block{
			BlockedUserID: row.BlockedAppUserID.String(),
			Username:      row.Username,
			DisplayName:   row.DisplayName,
			AvatarURL:     valueOrEmpty(row.AvatarUrl),
			CreatedAt:     row.CreatedAt.Time.UTC(),
		})
	}

	return items, nil
}

func (r *Repo) IsBlockedEitherDirection(ctx context.Context, a, b string) (bool, error) {
	return r.queries.IsBlockedEitherDirection(ctx, blocksqlc.IsBlockedEitherDirectionParams{
		BlockerAppUserID: toUUID(a),
		BlockedAppUserID: toUUID(b),
	})
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
