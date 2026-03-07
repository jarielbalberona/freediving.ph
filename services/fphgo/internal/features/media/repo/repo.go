package repo

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	mediaqlc "fphgo/internal/features/media/repo/sqlc"
)

type Repo struct {
	queries *mediaqlc.Queries
}

type MediaObject struct {
	ID             string
	OwnerAppUserID string
	ContextType    string
	ContextID      *string
	ObjectKey      string
	MimeType       string
	SizeBytes      int64
	Width          int32
	Height         int32
	State          string
	CreatedAt      time.Time
}

type CreateMediaObjectInput struct {
	OwnerAppUserID string
	ContextType    string
	ContextID      *string
	ObjectKey      string
	MimeType       string
	SizeBytes      int64
	Width          int32
	Height         int32
	State          string
}

type ListMediaByOwnerInput struct {
	OwnerAppUserID string
	CursorCreated  time.Time
	CursorID       string
	Limit          int32
}

type ListMediaByContextInput struct {
	ContextType   string
	ContextID     *string
	CursorCreated time.Time
	CursorID      string
	Limit         int32
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{queries: mediaqlc.New(pool)}
}

func (r *Repo) CreateMediaObject(ctx context.Context, input CreateMediaObjectInput) (MediaObject, error) {
	row, err := r.queries.CreateMediaObject(ctx, mediaqlc.CreateMediaObjectParams{
		OwnerAppUserID: toUUID(input.OwnerAppUserID),
		ContextType:    input.ContextType,
		ContextID:      toUUIDPtr(input.ContextID),
		ObjectKey:      input.ObjectKey,
		MimeType:       input.MimeType,
		SizeBytes:      input.SizeBytes,
		Width:          input.Width,
		Height:         input.Height,
		State:          input.State,
	})
	if err != nil {
		return MediaObject{}, err
	}
	return mapMedia(row), nil
}

func (r *Repo) GetMediaObjectByID(ctx context.Context, mediaID string) (MediaObject, error) {
	row, err := r.queries.GetMediaObjectByID(ctx, toUUID(mediaID))
	if err != nil {
		return MediaObject{}, err
	}
	return mapMedia(row), nil
}

func (r *Repo) GetMediaObjectsByIDs(ctx context.Context, mediaIDs []string) ([]MediaObject, error) {
	ids := make([]pgtype.UUID, 0, len(mediaIDs))
	for _, id := range mediaIDs {
		ids = append(ids, toUUID(id))
	}
	rows, err := r.queries.GetMediaObjectsByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	items := make([]MediaObject, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapMedia(row))
	}
	return items, nil
}

func (r *Repo) ListMediaByOwner(ctx context.Context, input ListMediaByOwnerInput) ([]MediaObject, error) {
	rows, err := r.queries.ListMediaByOwner(ctx, mediaqlc.ListMediaByOwnerParams{
		OwnerAppUserID: toUUID(input.OwnerAppUserID),
		CreatedAt:      toTimestamptz(input.CursorCreated),
		ID:             toUUID(input.CursorID),
		Limit:          input.Limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]MediaObject, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapMedia(row))
	}
	return items, nil
}

func (r *Repo) ListMediaByContext(ctx context.Context, input ListMediaByContextInput) ([]MediaObject, error) {
	rows, err := r.queries.ListMediaByContext(ctx, mediaqlc.ListMediaByContextParams{
		ContextType: input.ContextType,
		ContextID:   toUUIDPtr(input.ContextID),
		CreatedAt:   toTimestamptz(input.CursorCreated),
		ID:          toUUID(input.CursorID),
		Limit:       input.Limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]MediaObject, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapMedia(row))
	}
	return items, nil
}

func (r *Repo) UpdateMediaState(ctx context.Context, mediaID, state string) (MediaObject, error) {
	row, err := r.queries.UpdateMediaState(ctx, mediaqlc.UpdateMediaStateParams{ID: toUUID(mediaID), State: state})
	if err != nil {
		return MediaObject{}, err
	}
	return mapMedia(row), nil
}

func IsNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

func mapMedia(row mediaqlc.MediaObject) MediaObject {
	return MediaObject{
		ID:             row.ID.String(),
		OwnerAppUserID: row.OwnerAppUserID.String(),
		ContextType:    row.ContextType,
		ContextID:      uuidPtr(row.ContextID),
		ObjectKey:      row.ObjectKey,
		MimeType:       row.MimeType,
		SizeBytes:      row.SizeBytes,
		Width:          row.Width,
		Height:         row.Height,
		State:          row.State,
		CreatedAt:      row.CreatedAt.Time.UTC(),
	}
}

func toUUID(value string) pgtype.UUID {
	var id pgtype.UUID
	_ = id.Scan(value)
	return id
}

func toUUIDPtr(value *string) pgtype.UUID {
	if value == nil || strings.TrimSpace(*value) == "" {
		return pgtype.UUID{}
	}
	return toUUID(*value)
}

func toTimestamptz(value time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: value.UTC(), Valid: true}
}

func uuidPtr(value pgtype.UUID) *string {
	if !value.Valid {
		return nil
	}
	parsed := value.String()
	return &parsed
}
