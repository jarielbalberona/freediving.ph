package repo

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	divejourneysqlc "fphgo/internal/features/dive_journey/repo/sqlc"
)

var ErrNotFound = pgx.ErrNoRows

type Repo struct {
	pool    *pgxpool.Pool
	db      DBTX
	queries *divejourneysqlc.Queries
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool, db: pool, queries: divejourneysqlc.New(pool)}
}

type DBTX interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

func NewWithDB(db DBTX) *Repo {
	return &Repo{db: db, queries: divejourneysqlc.New(db)}
}

type JourneyOwner struct {
	UserID        string
	ViewerIsSelf  bool
	ViewerFollows bool
	Blocked       bool
}

type JourneyEntry struct {
	ID           string
	UserID       string
	Type         string
	Title        string
	Body         string
	DiveSiteID   string
	SourceType   string
	SourceID     string
	CoverMediaID string
	Visibility   string
	State        string
	OccurredAt   time.Time
	HiddenAt     *time.Time
	DeletedAt    *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
	MediaIDs     []string
}

type ListProfileInput struct {
	TargetUserID  string
	ViewerIsSelf  bool
	ViewerFollows bool
	Limit         int32
}

type UpsertManualInput struct {
	ID         string
	UserID     string
	Title      string
	Body       string
	DiveSiteID string
	Visibility string
	OccurredAt time.Time
	MediaIDs   []string
}

type UpsertGeneratedInput struct {
	UserID     string
	Type       string
	Title      string
	Body       string
	DiveSiteID string
	SourceType string
	SourceID   string
	Visibility string
	OccurredAt time.Time
}

func (r *Repo) GetOwnerByUsername(ctx context.Context, username, viewerUserID string) (JourneyOwner, error) {
	row, err := r.queries.GetJourneyOwnerByUsername(ctx, divejourneysqlc.GetJourneyOwnerByUsernameParams{
		Username:     username,
		ViewerUserID: viewerUserID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return JourneyOwner{}, ErrNotFound
		}
		return JourneyOwner{}, err
	}
	return JourneyOwner{
		UserID:        uuidString(row.ID),
		ViewerIsSelf:  row.ViewerIsSelf,
		ViewerFollows: row.ViewerFollows,
		Blocked:       row.Blocked,
	}, nil
}

func (r *Repo) ListForProfile(ctx context.Context, input ListProfileInput) ([]JourneyEntry, error) {
	rows, err := r.queries.ListJourneyEntriesForProfile(ctx, divejourneysqlc.ListJourneyEntriesForProfileParams{
		TargetUserID:  toUUID(input.TargetUserID),
		ViewerIsSelf:  input.ViewerIsSelf,
		ViewerFollows: input.ViewerFollows,
		ResultLimit:   input.Limit,
	})
	if err != nil {
		return nil, err
	}
	out := make([]JourneyEntry, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapEntry(row))
	}
	if err := r.hydrateMedia(ctx, out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *Repo) CreateManual(ctx context.Context, input UpsertManualInput) (JourneyEntry, error) {
	row, err := r.queries.CreateManualJourneyEntry(ctx, divejourneysqlc.CreateManualJourneyEntryParams{
		UserID:     toUUID(input.UserID),
		Title:      input.Title,
		Body:       input.Body,
		DiveSiteID: nullableUUID(input.DiveSiteID),
		Visibility: input.Visibility,
		OccurredAt: pgtype.Timestamptz{Time: input.OccurredAt.UTC(), Valid: true},
	})
	if err != nil {
		return JourneyEntry{}, err
	}
	entry := mapEntry(row)
	if err := r.ReplaceMedia(ctx, entry.UserID, entry.ID, input.MediaIDs); err != nil {
		return JourneyEntry{}, err
	}
	entry.MediaIDs = append([]string(nil), input.MediaIDs...)
	return entry, nil
}

func (r *Repo) UpsertGenerated(ctx context.Context, input UpsertGeneratedInput) (JourneyEntry, error) {
	row, err := r.queries.UpsertGeneratedJourneyEntry(ctx, divejourneysqlc.UpsertGeneratedJourneyEntryParams{
		UserID:     toUUID(input.UserID),
		Type:       input.Type,
		Title:      input.Title,
		Body:       input.Body,
		DiveSiteID: nullableUUID(input.DiveSiteID),
		SourceType: &input.SourceType,
		SourceID:   &input.SourceID,
		Visibility: input.Visibility,
		OccurredAt: pgtype.Timestamptz{Time: input.OccurredAt.UTC(), Valid: true},
	})
	if err != nil {
		return JourneyEntry{}, err
	}
	return mapEntry(row), nil
}

func (r *Repo) UpdateManual(ctx context.Context, input UpsertManualInput) (JourneyEntry, error) {
	row, err := r.queries.UpdateManualJourneyEntry(ctx, divejourneysqlc.UpdateManualJourneyEntryParams{
		ID:         toUUID(input.ID),
		UserID:     toUUID(input.UserID),
		Title:      input.Title,
		Body:       input.Body,
		DiveSiteID: nullableUUID(input.DiveSiteID),
		Visibility: input.Visibility,
		OccurredAt: pgtype.Timestamptz{Time: input.OccurredAt.UTC(), Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return JourneyEntry{}, ErrNotFound
		}
		return JourneyEntry{}, err
	}
	entry := mapEntry(row)
	if err := r.ReplaceMedia(ctx, entry.UserID, entry.ID, input.MediaIDs); err != nil {
		return JourneyEntry{}, err
	}
	entry.MediaIDs = append([]string(nil), input.MediaIDs...)
	return entry, nil
}

func (r *Repo) SoftDeleteManual(ctx context.Context, userID, entryID string) error {
	rowsAffected, err := r.queries.SoftDeleteManualJourneyEntry(ctx, divejourneysqlc.SoftDeleteManualJourneyEntryParams{
		ID:     toUUID(entryID),
		UserID: toUUID(userID),
	})
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repo) HideGenerated(ctx context.Context, input UpsertGeneratedInput) error {
	rowsAffected, err := r.queries.HideGeneratedJourneyEntry(ctx, divejourneysqlc.HideGeneratedJourneyEntryParams{
		UserID:     toUUID(input.UserID),
		Type:       input.Type,
		SourceType: &input.SourceType,
		SourceID:   &input.SourceID,
	})
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repo) ListOwnedActiveMedia(ctx context.Context, userID string, mediaIDs []string) (map[string]struct{}, error) {
	out := map[string]struct{}{}
	if len(mediaIDs) == 0 {
		return out, nil
	}
	rows, err := r.db.Query(ctx, `
		SELECT id::text
		FROM media_objects
		WHERE owner_app_user_id = $1
		  AND state = 'active'
		  AND id = ANY($2::uuid[])
	`, toUUID(userID), uuidArray(mediaIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out[id] = struct{}{}
	}
	return out, rows.Err()
}

func (r *Repo) ReplaceMedia(ctx context.Context, userID, entryID string, mediaIDs []string) error {
	if _, err := r.db.Exec(ctx, `
		DELETE FROM journey_entry_media
		WHERE journey_entry_id = $1
		  AND EXISTS (
		    SELECT 1
		    FROM journey_entries je
		    WHERE je.id = journey_entry_media.journey_entry_id
		      AND je.user_id = $2
		  )
	`, toUUID(entryID), toUUID(userID)); err != nil {
		return err
	}
	for idx, mediaID := range mediaIDs {
		if _, err := r.db.Exec(ctx, `
			INSERT INTO journey_entry_media (journey_entry_id, media_id, sort_order)
			VALUES ($1, $2, $3)
			ON CONFLICT (journey_entry_id, media_id) DO UPDATE
			SET sort_order = EXCLUDED.sort_order
		`, toUUID(entryID), toUUID(mediaID), idx); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repo) hydrateMedia(ctx context.Context, entries []JourneyEntry) error {
	if len(entries) == 0 {
		return nil
	}
	ids := make([]string, 0, len(entries))
	byID := make(map[string]int, len(entries))
	for idx, entry := range entries {
		ids = append(ids, entry.ID)
		byID[entry.ID] = idx
	}
	rows, err := r.db.Query(ctx, `
		SELECT journey_entry_id::text, media_id::text
		FROM journey_entry_media
		WHERE journey_entry_id = ANY($1::uuid[])
		ORDER BY journey_entry_id, sort_order ASC, id ASC
	`, uuidArray(ids))
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var entryID, mediaID string
		if err := rows.Scan(&entryID, &mediaID); err != nil {
			return err
		}
		if idx, ok := byID[entryID]; ok {
			entries[idx].MediaIDs = append(entries[idx].MediaIDs, mediaID)
		}
	}
	return rows.Err()
}

func mapEntry(row divejourneysqlc.JourneyEntry) JourneyEntry {
	return JourneyEntry{
		ID:           uuidString(row.ID),
		UserID:       uuidString(row.UserID),
		Type:         row.Type,
		Title:        row.Title,
		Body:         row.Body,
		DiveSiteID:   uuidString(row.DiveSiteID),
		SourceType:   stringPtr(row.SourceType),
		SourceID:     stringPtr(row.SourceID),
		CoverMediaID: uuidString(row.CoverMediaID),
		Visibility:   row.Visibility,
		State:        row.State,
		OccurredAt:   timeValue(row.OccurredAt),
		HiddenAt:     timePtr(row.HiddenAt),
		DeletedAt:    timePtr(row.DeletedAt),
		CreatedAt:    timeValue(row.CreatedAt),
		UpdatedAt:    timeValue(row.UpdatedAt),
	}
}

func toUUID(value string) pgtype.UUID {
	id, _ := uuid.Parse(value)
	return pgtype.UUID{Bytes: id, Valid: id != uuid.Nil}
}

func nullableUUID(value string) pgtype.UUID {
	if value == "" {
		return pgtype.UUID{}
	}
	return toUUID(value)
}

func uuidArray(values []string) []pgtype.UUID {
	out := make([]pgtype.UUID, 0, len(values))
	for _, value := range values {
		out = append(out, toUUID(value))
	}
	return out
}

func uuidString(value pgtype.UUID) string {
	if !value.Valid {
		return ""
	}
	return uuid.UUID(value.Bytes).String()
}

func stringPtr(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func timeValue(value pgtype.Timestamptz) time.Time {
	if !value.Valid {
		return time.Time{}
	}
	return value.Time
}

func timePtr(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	t := value.Time
	return &t
}
