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

	divememoriessqlc "fphgo/internal/features/dive_memories/repo/sqlc"
)

var ErrNotFound = pgx.ErrNoRows

type Repo struct {
	pool    *pgxpool.Pool
	db      DBTX
	queries *divememoriessqlc.Queries
}

type DBTX interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool, db: pool, queries: divememoriessqlc.New(pool)}
}

func NewWithDB(db DBTX) *Repo {
	return &Repo{db: db, queries: divememoriessqlc.New(db)}
}

type Memory struct {
	ID           string
	AuthorUserID string
	DiveSiteID   string
	Title        string
	Body         string
	Visibility   string
	OccurredAt   time.Time
	DeletedAt    *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
	MediaIDs     []string
}

type MemoryMedia struct {
	ID        string
	MemoryID  string
	MediaID   string
	SortOrder int32
	CreatedAt time.Time
}

type MemoryTag struct {
	ID           string
	MemoryID     string
	TaggedUserID string
	Status       string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type ListTaggedUserTagsInput struct {
	TaggedUserID string
	Status       string
	Limit        int32
}

type MemoryOwner struct {
	UserID        string
	ViewerIsSelf  bool
	ViewerFollows bool
	Blocked       bool
}

type ListProfileInput struct {
	TargetUserID  string
	ViewerUserID  string
	ViewerIsSelf  bool
	ViewerFollows bool
	Limit         int32
}

type UpsertMemoryInput struct {
	ID           string
	AuthorUserID string
	DiveSiteID   string
	Title        string
	Body         string
	Visibility   string
	OccurredAt   time.Time
	MediaIDs     []string
}

func (r *Repo) GetOwnerByUsername(ctx context.Context, username, viewerUserID string) (MemoryOwner, error) {
	row, err := r.queries.GetMemoryOwnerByUsername(ctx, divememoriessqlc.GetMemoryOwnerByUsernameParams{
		Username:     username,
		ViewerUserID: viewerUserID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return MemoryOwner{}, ErrNotFound
		}
		return MemoryOwner{}, err
	}
	return MemoryOwner{
		UserID:        uuidString(row.ID),
		ViewerIsSelf:  row.ViewerIsSelf,
		ViewerFollows: row.ViewerFollows,
		Blocked:       row.Blocked,
	}, nil
}

func (r *Repo) Create(ctx context.Context, input UpsertMemoryInput) (Memory, error) {
	row, err := r.queries.CreateDiveMemory(ctx, divememoriessqlc.CreateDiveMemoryParams{
		AuthorUserID: toUUID(input.AuthorUserID),
		DiveSiteID:   toUUID(input.DiveSiteID),
		Title:        input.Title,
		Body:         input.Body,
		Visibility:   input.Visibility,
		OccurredAt:   pgtype.Timestamptz{Time: input.OccurredAt.UTC(), Valid: true},
	})
	if err != nil {
		return Memory{}, err
	}
	memory := mapMemory(row)
	if err := r.ReplaceMedia(ctx, memory.AuthorUserID, memory.ID, input.MediaIDs); err != nil {
		return Memory{}, err
	}
	memory.MediaIDs = append([]string(nil), input.MediaIDs...)
	return memory, nil
}

func (r *Repo) GetByID(ctx context.Context, id string) (Memory, error) {
	row, err := r.queries.GetDiveMemoryByID(ctx, toUUID(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Memory{}, ErrNotFound
		}
		return Memory{}, err
	}
	return mapMemory(row), nil
}

func (r *Repo) Update(ctx context.Context, input UpsertMemoryInput) (Memory, error) {
	row, err := r.queries.UpdateDiveMemory(ctx, divememoriessqlc.UpdateDiveMemoryParams{
		ID:           toUUID(input.ID),
		AuthorUserID: toUUID(input.AuthorUserID),
		DiveSiteID:   toUUID(input.DiveSiteID),
		Title:        input.Title,
		Body:         input.Body,
		Visibility:   input.Visibility,
		OccurredAt:   pgtype.Timestamptz{Time: input.OccurredAt.UTC(), Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Memory{}, ErrNotFound
		}
		return Memory{}, err
	}
	memory := mapMemory(row)
	if err := r.ReplaceMedia(ctx, memory.AuthorUserID, memory.ID, input.MediaIDs); err != nil {
		return Memory{}, err
	}
	memory.MediaIDs = append([]string(nil), input.MediaIDs...)
	return memory, nil
}

func (r *Repo) SoftDelete(ctx context.Context, authorUserID, memoryID string) error {
	rowsAffected, err := r.queries.SoftDeleteDiveMemory(ctx, divememoriessqlc.SoftDeleteDiveMemoryParams{
		ID:           toUUID(memoryID),
		AuthorUserID: toUUID(authorUserID),
	})
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repo) ListOwn(ctx context.Context, authorUserID string, limit int32) ([]Memory, error) {
	rows, err := r.queries.ListOwnDiveMemories(ctx, divememoriessqlc.ListOwnDiveMemoriesParams{
		AuthorUserID: toUUID(authorUserID),
		ResultLimit:  limit,
	})
	if err != nil {
		return nil, err
	}
	memories := mapMemories(rows)
	if err := r.hydrateMedia(ctx, memories); err != nil {
		return nil, err
	}
	return memories, nil
}

func (r *Repo) ListForProfile(ctx context.Context, input ListProfileInput) ([]Memory, error) {
	rows, err := r.queries.ListVisibleDiveMemoriesForProfile(ctx, divememoriessqlc.ListVisibleDiveMemoriesForProfileParams{
		TargetUserID:  toUUID(input.TargetUserID),
		ViewerUserID:  input.ViewerUserID,
		ViewerIsSelf:  input.ViewerIsSelf,
		ViewerFollows: input.ViewerFollows,
		ResultLimit:   input.Limit,
	})
	if err != nil {
		return nil, err
	}
	memories := mapMemories(rows)
	if err := r.hydrateMedia(ctx, memories); err != nil {
		return nil, err
	}
	return memories, nil
}

func (r *Repo) ListForOwnedMapSite(ctx context.Context, authorUserID, diveSiteID string, limit int32) ([]Memory, error) {
	rows, err := r.queries.ListDiveMemoriesForOwnedMapSite(ctx, divememoriessqlc.ListDiveMemoriesForOwnedMapSiteParams{
		AuthorUserID: toUUID(authorUserID),
		DiveSiteID:   toUUID(diveSiteID),
		ResultLimit:  limit,
	})
	if err != nil {
		return nil, err
	}
	memories := mapMemories(rows)
	if err := r.hydrateMedia(ctx, memories); err != nil {
		return nil, err
	}
	return memories, nil
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

func (r *Repo) ReplaceMedia(ctx context.Context, authorUserID, memoryID string, mediaIDs []string) error {
	if _, err := r.queries.DeleteDiveMemoryMedia(ctx, divememoriessqlc.DeleteDiveMemoryMediaParams{
		MemoryID:     toUUID(memoryID),
		AuthorUserID: toUUID(authorUserID),
	}); err != nil {
		return err
	}
	for idx, mediaID := range mediaIDs {
		if _, err := r.queries.AddDiveMemoryMedia(ctx, divememoriessqlc.AddDiveMemoryMediaParams{
			MemoryID:  toUUID(memoryID),
			MediaID:   toUUID(mediaID),
			SortOrder: int32(idx),
		}); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repo) hydrateMedia(ctx context.Context, memories []Memory) error {
	if len(memories) == 0 {
		return nil
	}
	ids := make([]string, 0, len(memories))
	byID := make(map[string]int, len(memories))
	for idx, memory := range memories {
		ids = append(ids, memory.ID)
		byID[memory.ID] = idx
	}
	rows, err := r.db.Query(ctx, `
		SELECT memory_id::text, media_id::text
		FROM dive_memory_media
		WHERE memory_id = ANY($1::uuid[])
		ORDER BY memory_id, sort_order ASC, id ASC
	`, uuidArray(ids))
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var memoryID, mediaID string
		if err := rows.Scan(&memoryID, &mediaID); err != nil {
			return err
		}
		if idx, ok := byID[memoryID]; ok {
			memories[idx].MediaIDs = append(memories[idx].MediaIDs, mediaID)
		}
	}
	return rows.Err()
}

func (r *Repo) ListMedia(ctx context.Context, memoryID string) ([]MemoryMedia, error) {
	rows, err := r.queries.ListDiveMemoryMedia(ctx, toUUID(memoryID))
	if err != nil {
		return nil, err
	}
	out := make([]MemoryMedia, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapMemoryMedia(row))
	}
	return out, nil
}

func (r *Repo) UpsertTag(ctx context.Context, memoryID, taggedUserID string) (MemoryTag, error) {
	row, err := r.queries.UpsertDiveMemoryTag(ctx, divememoriessqlc.UpsertDiveMemoryTagParams{
		MemoryID:     toUUID(memoryID),
		TaggedUserID: toUUID(taggedUserID),
	})
	if err != nil {
		return MemoryTag{}, err
	}
	return mapMemoryTag(row), nil
}

func (r *Repo) DeleteTag(ctx context.Context, memoryID, taggedUserID string) error {
	rowsAffected, err := r.queries.DeleteDiveMemoryTag(ctx, divememoriessqlc.DeleteDiveMemoryTagParams{
		MemoryID:     toUUID(memoryID),
		TaggedUserID: toUUID(taggedUserID),
	})
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repo) UpdateTagStatus(ctx context.Context, memoryID, taggedUserID, status string) (MemoryTag, error) {
	row, err := r.queries.UpdateDiveMemoryTagStatus(ctx, divememoriessqlc.UpdateDiveMemoryTagStatusParams{
		MemoryID:     toUUID(memoryID),
		TaggedUserID: toUUID(taggedUserID),
		Status:       status,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return MemoryTag{}, ErrNotFound
		}
		return MemoryTag{}, err
	}
	return mapMemoryTag(row), nil
}

func (r *Repo) ListTags(ctx context.Context, memoryID string) ([]MemoryTag, error) {
	rows, err := r.queries.ListDiveMemoryTags(ctx, toUUID(memoryID))
	if err != nil {
		return nil, err
	}
	out := make([]MemoryTag, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapMemoryTag(row))
	}
	return out, nil
}

func (r *Repo) ListTagsForTaggedUser(ctx context.Context, input ListTaggedUserTagsInput) ([]MemoryTag, error) {
	rows, err := r.queries.ListMemoryTagsForTaggedUser(ctx, divememoriessqlc.ListMemoryTagsForTaggedUserParams{
		TaggedUserID: toUUID(input.TaggedUserID),
		StatusFilter: input.Status,
		ResultLimit:  input.Limit,
	})
	if err != nil {
		return nil, err
	}
	out := make([]MemoryTag, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapMemoryTag(row))
	}
	return out, nil
}

func (r *Repo) HasBlockBetweenUsers(ctx context.Context, firstUserID, secondUserID string) (bool, error) {
	return r.queries.HasBlockBetweenUsers(ctx, divememoriessqlc.HasBlockBetweenUsersParams{
		BlockerAppUserID: toUUID(firstUserID),
		BlockedAppUserID: toUUID(secondUserID),
	})
}

func mapMemories(rows []divememoriessqlc.DiveMemory) []Memory {
	out := make([]Memory, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapMemory(row))
	}
	return out
}

func mapMemory(row divememoriessqlc.DiveMemory) Memory {
	return Memory{
		ID:           uuidString(row.ID),
		AuthorUserID: uuidString(row.AuthorUserID),
		DiveSiteID:   uuidString(row.DiveSiteID),
		Title:        row.Title,
		Body:         row.Body,
		Visibility:   row.Visibility,
		OccurredAt:   timeValue(row.OccurredAt),
		DeletedAt:    timePtr(row.DeletedAt),
		CreatedAt:    timeValue(row.CreatedAt),
		UpdatedAt:    timeValue(row.UpdatedAt),
	}
}

func mapMemoryMedia(row divememoriessqlc.DiveMemoryMedium) MemoryMedia {
	return MemoryMedia{
		ID:        uuidString(row.ID),
		MemoryID:  uuidString(row.MemoryID),
		MediaID:   uuidString(row.MediaID),
		SortOrder: row.SortOrder,
		CreatedAt: timeValue(row.CreatedAt),
	}
}

func mapMemoryTag(row divememoriessqlc.DiveMemoryTaggedUser) MemoryTag {
	return MemoryTag{
		ID:           uuidString(row.ID),
		MemoryID:     uuidString(row.MemoryID),
		TaggedUserID: uuidString(row.TaggedUserID),
		Status:       row.Status,
		CreatedAt:    timeValue(row.CreatedAt),
		UpdatedAt:    timeValue(row.UpdatedAt),
	}
}

func toUUID(value string) pgtype.UUID {
	id, _ := uuid.Parse(value)
	return pgtype.UUID{Bytes: id, Valid: id != uuid.Nil}
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
