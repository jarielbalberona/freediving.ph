package repo

import (
	"context"
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
	ID              string
	UserID          string
	Type            string
	Title           string
	Body            string
	DiveSiteID      string
	SourceType      string
	SourceID        string
	CoverMediaID    string
	Visibility      string
	VisibilityLabel string
	State           string
	OccurredAt      time.Time
	HiddenAt        *time.Time
	DeletedAt       *time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
	MediaIDs        []string
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
		ResultLimit:   50,
	})
	if err != nil {
		return nil, err
	}
	out := make([]JourneyEntry, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapEntry(row))
	}
	synthetic, err := r.listSyntheticEntries(ctx, input)
	if err != nil {
		return nil, err
	}
	out = append(out, synthetic...)
	sortJourneyEntries(out)
	if limit := int(input.Limit); limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	if err := r.hydrateMedia(ctx, out); err != nil {
		return nil, err
	}
	if err := r.hydrateGeneratedSourceMedia(ctx, out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *Repo) listSyntheticEntries(ctx context.Context, input ListProfileInput) ([]JourneyEntry, error) {
	loaders := []func(context.Context, ListProfileInput) ([]JourneyEntry, error){
		r.listSyntheticMapMilestones,
		r.listSyntheticMediaMilestones,
		r.listSyntheticBadgeMilestones,
		r.listSyntheticMemoryMilestones,
	}
	out := make([]JourneyEntry, 0, 16)
	for _, loader := range loaders {
		items, err := loader(ctx, input)
		if err != nil {
			return nil, err
		}
		out = append(out, items...)
	}
	return out, nil
}

func (r *Repo) listSyntheticMapMilestones(ctx context.Context, input ListProfileInput) ([]JourneyEntry, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			uds.user_id::text,
			uds.dive_site_id::text,
			ds.name,
			uds.media_post_count,
			uds.first_visited_at,
			uds.created_at,
			uds.updated_at,
			uds.visibility
		FROM user_dive_sites uds
		JOIN dive_sites ds ON ds.id = uds.dive_site_id
		WHERE uds.user_id = $1
		  AND ds.moderation_state = 'approved'
		  AND (
		    uds.visibility = 'public'
		    OR ($2::boolean AND uds.visibility = 'private')
		    OR (($2::boolean OR $3::boolean) AND uds.visibility = 'members')
		  )
		  AND NOT EXISTS (
		    SELECT 1
		    FROM journey_entries je
		    WHERE je.user_id = uds.user_id
		      AND je.type = 'map_milestone'
		      AND je.source_type = 'dive_map'
		      AND je.source_id = uds.dive_site_id::text
		  )
	`, toUUID(input.TargetUserID), input.ViewerIsSelf, input.ViewerFollows)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]JourneyEntry, 0)
	for rows.Next() {
		var (
			userID         string
			diveSiteID     string
			siteName       string
			mediaPostCount int32
			occurredAt     time.Time
			createdAt      time.Time
			updatedAt      time.Time
			visibility     string
		)
		if err := rows.Scan(&userID, &diveSiteID, &siteName, &mediaPostCount, &occurredAt, &createdAt, &updatedAt, &visibility); err != nil {
			return nil, err
		}
		out = append(out, JourneyEntry{
			ID:              "synthetic:map:" + diveSiteID,
			UserID:          userID,
			Type:            "map_milestone",
			Title:           "Visited " + siteName,
			Body:            formatProofCount(int(mediaPostCount)),
			DiveSiteID:      diveSiteID,
			SourceType:      "dive_map",
			SourceID:        diveSiteID,
			Visibility:      journeyVisibilityFromSource(visibility),
			VisibilityLabel: visibilityLabelFromSource(visibility),
			State:           "active",
			OccurredAt:      occurredAt.UTC(),
			CreatedAt:       createdAt.UTC(),
			UpdatedAt:       updatedAt.UTC(),
		})
	}
	return out, rows.Err()
}

func (r *Repo) listSyntheticMediaMilestones(ctx context.Context, input ListProfileInput) ([]JourneyEntry, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			mp.id::text,
			mp.author_app_user_id::text,
			mp.dive_site_id::text,
			ds.name,
			COALESCE(NULLIF(mp.post_caption, ''), ''),
			COUNT(mi.id)::int,
			COALESCE(ARRAY_AGG(mi.media_object_id::text ORDER BY mi.sort_order ASC, mi.id ASC), '{}'::text[]),
			mp.created_at,
			mp.created_at,
			mp.updated_at,
			uds.visibility
		FROM media_posts mp
		JOIN user_dive_sites uds
		  ON uds.user_id = mp.author_app_user_id
		 AND uds.dive_site_id = mp.dive_site_id
		JOIN dive_sites ds ON ds.id = mp.dive_site_id
		JOIN media_items mi ON mi.post_id = mp.id
		WHERE mp.author_app_user_id = $1
		  AND mp.dive_site_id IS NOT NULL
		  AND mp.deleted_at IS NULL
		  AND ds.moderation_state = 'approved'
		  AND mi.author_app_user_id = mp.author_app_user_id
		  AND mi.dive_site_id = mp.dive_site_id
		  AND mi.status = 'active'
		  AND mi.processing_status = 'ready'
		  AND mi.moderation_status = 'approved'
		  AND mi.deleted_at IS NULL
		  AND mp.id <> uds.first_post_id
		  AND (
		    uds.visibility = 'public'
		    OR ($2::boolean AND uds.visibility = 'private')
		    OR (($2::boolean OR $3::boolean) AND uds.visibility = 'members')
		  )
		  AND NOT EXISTS (
		    SELECT 1
		    FROM journey_entries je
		    WHERE je.user_id = mp.author_app_user_id
		      AND je.type = 'media'
		      AND je.source_type = 'media'
		      AND je.source_id = mp.id::text
		  )
		GROUP BY mp.id, mp.author_app_user_id, mp.dive_site_id, ds.name, mp.post_caption, mp.created_at, mp.updated_at, uds.visibility
		ORDER BY mp.created_at DESC, mp.id DESC
		LIMIT 30
	`, toUUID(input.TargetUserID), input.ViewerIsSelf, input.ViewerFollows)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]JourneyEntry, 0)
	for rows.Next() {
		var (
			postID     string
			userID     string
			diveSiteID string
			siteName   string
			caption    string
			mediaCount int32
			mediaIDs   []string
			occurredAt time.Time
			createdAt  time.Time
			updatedAt  time.Time
			visibility string
		)
		if err := rows.Scan(&postID, &userID, &diveSiteID, &siteName, &caption, &mediaCount, &mediaIDs, &occurredAt, &createdAt, &updatedAt, &visibility); err != nil {
			return nil, err
		}
		out = append(out, JourneyEntry{
			ID:              "synthetic:media:" + postID,
			UserID:          userID,
			Type:            "media",
			Title:           "Posted from " + siteName,
			Body:            coalesceJourneyBody(caption, formatMediaCount(int(mediaCount))),
			DiveSiteID:      diveSiteID,
			SourceType:      "media",
			SourceID:        postID,
			CoverMediaID:    firstMediaID(mediaIDs),
			Visibility:      journeyVisibilityFromSource(visibility),
			VisibilityLabel: visibilityLabelFromSource(visibility),
			State:           "active",
			OccurredAt:      occurredAt.UTC(),
			CreatedAt:       createdAt.UTC(),
			UpdatedAt:       updatedAt.UTC(),
			MediaIDs:        append([]string(nil), mediaIDs...),
		})
	}
	return out, rows.Err()
}

func (r *Repo) listSyntheticBadgeMilestones(ctx context.Context, input ListProfileInput) ([]JourneyEntry, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			ub.id::text,
			ub.user_id::text,
			bt.name,
			bt.category,
			COALESCE(bt.unit, ''),
			bt.value_type,
			COALESCE(ub.value_text, ''),
			COALESCE(ub.value_number::text, ''),
			COALESCE(ub.value_minutes, -1),
			COALESCE(ub.value_seconds, -1),
			COALESCE(ub.reference_label, ''),
			COALESCE(ub.earned_date::timestamp, ub.earned_at, ub.created_at),
			ub.created_at,
			ub.updated_at,
			ub.visibility
		FROM user_badges ub
		JOIN badge_templates bt ON bt.id = ub.badge_template_id
		WHERE ub.user_id = $1
		  AND (
		    ub.visibility = 'public'
		    OR ($2::boolean AND ub.visibility = 'private')
		  )
		  AND NOT EXISTS (
		    SELECT 1
		    FROM journey_entries je
		    WHERE je.user_id = ub.user_id
		      AND je.type = 'badge'
		      AND je.source_type = 'badge'
		      AND je.source_id = ub.id::text
		  )
		ORDER BY COALESCE(ub.earned_date::timestamp, ub.earned_at, ub.created_at) DESC, ub.id DESC
		LIMIT 30
	`, toUUID(input.TargetUserID), input.ViewerIsSelf)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]JourneyEntry, 0)
	for rows.Next() {
		var (
			badgeID        string
			userID         string
			name           string
			category       string
			unit           string
			valueType      string
			valueText      string
			valueNumber    string
			valueMinutes   int32
			valueSeconds   int32
			referenceLabel string
			occurredAt     time.Time
			createdAt      time.Time
			updatedAt      time.Time
			visibility     string
		)
		if err := rows.Scan(
			&badgeID,
			&userID,
			&name,
			&category,
			&unit,
			&valueType,
			&valueText,
			&valueNumber,
			&valueMinutes,
			&valueSeconds,
			&referenceLabel,
			&occurredAt,
			&createdAt,
			&updatedAt,
			&visibility,
		); err != nil {
			return nil, err
		}
		out = append(out, JourneyEntry{
			ID:              "synthetic:badge:" + badgeID,
			UserID:          userID,
			Type:            "badge",
			Title:           badgeJourneyTitle(category, name),
			Body:            badgeJourneyBody(valueType, valueText, valueNumber, unit, valueMinutes, valueSeconds, referenceLabel),
			SourceType:      "badge",
			SourceID:        badgeID,
			Visibility:      visibility,
			VisibilityLabel: visibilityLabelFromSource(visibility),
			State:           "active",
			OccurredAt:      occurredAt.UTC(),
			CreatedAt:       createdAt.UTC(),
			UpdatedAt:       updatedAt.UTC(),
		})
	}
	return out, rows.Err()
}

func (r *Repo) listSyntheticMemoryMilestones(ctx context.Context, input ListProfileInput) ([]JourneyEntry, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			dm.id::text,
			dm.author_user_id::text,
			dm.dive_site_id::text,
			dm.title,
			dm.body,
			COALESCE((
				SELECT ARRAY_AGG(dmm.media_id::text ORDER BY dmm.sort_order ASC, dmm.id ASC)
				FROM dive_memory_media dmm
				JOIN media_objects mo ON mo.id = dmm.media_id
				WHERE dmm.memory_id = dm.id
				  AND mo.state = 'active'
			), '{}'::text[]),
			dm.occurred_at,
			dm.created_at,
			dm.updated_at,
			dm.visibility
		FROM dive_memories dm
		WHERE dm.author_user_id = $1
		  AND dm.deleted_at IS NULL
		  AND (
		    dm.visibility = 'public'
		    OR (($2::boolean OR $3::boolean) AND dm.visibility = 'followers')
		    OR ($2::boolean AND dm.visibility IN ('private', 'tagged'))
		  )
		  AND NOT EXISTS (
		    SELECT 1
		    FROM journey_entries je
		    WHERE je.user_id = dm.author_user_id
		      AND je.type = 'memory'
		      AND je.source_type = 'memory'
		      AND je.source_id = dm.id::text
		  )
		ORDER BY dm.occurred_at DESC, dm.id DESC
		LIMIT 30
	`, toUUID(input.TargetUserID), input.ViewerIsSelf, input.ViewerFollows)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]JourneyEntry, 0)
	for rows.Next() {
		var (
			memoryID   string
			userID     string
			diveSiteID string
			title      string
			body       string
			mediaIDs   []string
			occurredAt time.Time
			createdAt  time.Time
			updatedAt  time.Time
			visibility string
		)
		if err := rows.Scan(&memoryID, &userID, &diveSiteID, &title, &body, &mediaIDs, &occurredAt, &createdAt, &updatedAt, &visibility); err != nil {
			return nil, err
		}
		out = append(out, JourneyEntry{
			ID:              "synthetic:memory:" + memoryID,
			UserID:          userID,
			Type:            "memory",
			Title:           title,
			Body:            body,
			DiveSiteID:      diveSiteID,
			SourceType:      "memory",
			SourceID:        memoryID,
			CoverMediaID:    firstMediaID(mediaIDs),
			Visibility:      journeyVisibilityFromMemory(visibility),
			VisibilityLabel: visibilityLabelFromMemory(visibility),
			State:           "active",
			OccurredAt:      occurredAt.UTC(),
			CreatedAt:       createdAt.UTC(),
			UpdatedAt:       updatedAt.UTC(),
			MediaIDs:        append([]string(nil), mediaIDs...),
		})
	}
	return out, rows.Err()
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

func (r *Repo) hydrateGeneratedSourceMedia(ctx context.Context, entries []JourneyEntry) error {
	if len(entries) == 0 {
		return nil
	}

	memoryEntryBySource := map[string][]int{}
	mediaEntryBySource := map[string][]int{}
	for idx, entry := range entries {
		if len(entry.MediaIDs) > 0 || entry.CoverMediaID != "" {
			continue
		}
		switch entry.SourceType {
		case "memory":
			if entry.SourceID != "" {
				memoryEntryBySource[entry.SourceID] = append(memoryEntryBySource[entry.SourceID], idx)
			}
		case "media":
			if entry.SourceID != "" {
				mediaEntryBySource[entry.SourceID] = append(mediaEntryBySource[entry.SourceID], idx)
			}
		}
	}

	if err := r.hydrateMemorySourceMedia(ctx, entries, memoryEntryBySource); err != nil {
		return err
	}
	if err := r.hydratePostSourceMedia(ctx, entries, mediaEntryBySource); err != nil {
		return err
	}
	return nil
}

func (r *Repo) hydrateMemorySourceMedia(ctx context.Context, entries []JourneyEntry, entryBySource map[string][]int) error {
	if len(entryBySource) == 0 {
		return nil
	}
	rows, err := r.db.Query(ctx, `
		SELECT dmm.memory_id::text, dmm.media_id::text
		FROM dive_memory_media dmm
		JOIN media_objects mo ON mo.id = dmm.media_id
		WHERE dmm.memory_id = ANY($1::uuid[])
		  AND mo.state = 'active'
		ORDER BY dmm.memory_id, dmm.sort_order ASC, dmm.id ASC
	`, uuidArray(mapKeys(entryBySource)))
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var sourceID, mediaID string
		if err := rows.Scan(&sourceID, &mediaID); err != nil {
			return err
		}
		for _, idx := range entryBySource[sourceID] {
			entries[idx].MediaIDs = append(entries[idx].MediaIDs, mediaID)
			if entries[idx].CoverMediaID == "" {
				entries[idx].CoverMediaID = mediaID
			}
		}
	}
	return rows.Err()
}

func (r *Repo) hydratePostSourceMedia(ctx context.Context, entries []JourneyEntry, entryBySource map[string][]int) error {
	if len(entryBySource) == 0 {
		return nil
	}
	rows, err := r.db.Query(ctx, `
		SELECT mp.id::text, mi.media_object_id::text
		FROM media_posts mp
		JOIN media_items mi ON mi.post_id = mp.id
		JOIN media_objects mo ON mo.id = mi.media_object_id
		WHERE mp.id = ANY($1::uuid[])
		  AND mp.deleted_at IS NULL
		  AND mi.status = 'active'
		  AND mi.processing_status = 'ready'
		  AND mi.moderation_status = 'approved'
		  AND mi.deleted_at IS NULL
		  AND mo.state = 'active'
		ORDER BY mp.id, mi.sort_order ASC, mi.id ASC
	`, uuidArray(mapKeys(entryBySource)))
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var sourceID, mediaID string
		if err := rows.Scan(&sourceID, &mediaID); err != nil {
			return err
		}
		for _, idx := range entryBySource[sourceID] {
			entries[idx].MediaIDs = append(entries[idx].MediaIDs, mediaID)
			if entries[idx].CoverMediaID == "" {
				entries[idx].CoverMediaID = mediaID
			}
		}
	}
	return rows.Err()
}

func mapEntry(row divejourneysqlc.JourneyEntry) JourneyEntry {
	return JourneyEntry{
		ID:              uuidString(row.ID),
		UserID:          uuidString(row.UserID),
		Type:            row.Type,
		Title:           row.Title,
		Body:            row.Body,
		DiveSiteID:      uuidString(row.DiveSiteID),
		SourceType:      stringPtr(row.SourceType),
		SourceID:        stringPtr(row.SourceID),
		CoverMediaID:    uuidString(row.CoverMediaID),
		Visibility:      row.Visibility,
		VisibilityLabel: visibilityLabelFromSource(row.Visibility),
		State:           row.State,
		OccurredAt:      timeValue(row.OccurredAt),
		HiddenAt:        timePtr(row.HiddenAt),
		DeletedAt:       timePtr(row.DeletedAt),
		CreatedAt:       timeValue(row.CreatedAt),
		UpdatedAt:       timeValue(row.UpdatedAt),
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

func firstMediaID(mediaIDs []string) string {
	if len(mediaIDs) == 0 {
		return ""
	}
	return mediaIDs[0]
}

func mapKeys[V any](items map[string]V) []string {
	keys := make([]string, 0, len(items))
	for key := range items {
		keys = append(keys, key)
	}
	return keys
}

func sortJourneyEntries(items []JourneyEntry) {
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].OccurredAt.Equal(items[j].OccurredAt) {
			return items[i].ID > items[j].ID
		}
		return items[i].OccurredAt.After(items[j].OccurredAt)
	})
}

func visibilityLabelFromSource(value string) string {
	switch value {
	case "public":
		return "Public"
	case "followers":
		return "Followers"
	case "members":
		return "Members"
	default:
		return "Private"
	}
}

func journeyVisibilityFromSource(value string) string {
	switch value {
	case "public", "followers", "private":
		return value
	case "members":
		return "followers"
	default:
		return "private"
	}
}

func journeyVisibilityFromMemory(value string) string {
	switch value {
	case "public", "followers":
		return value
	default:
		return "private"
	}
}

func visibilityLabelFromMemory(value string) string {
	if value == "followers" {
		return "Followers"
	}
	if value == "public" {
		return "Public"
	}
	return "Private"
}

func formatProofCount(count int) string {
	if count <= 1 {
		return "1 proof-backed post"
	}
	return fmt.Sprintf("%d proof-backed posts", count)
}

func formatMediaCount(count int) string {
	if count <= 1 {
		return "1 media item"
	}
	return fmt.Sprintf("%d media items", count)
}

func coalesceJourneyBody(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func badgeJourneyTitle(category, name string) string {
	switch category {
	case "personal_best":
		return "Logged a new PB: " + name
	case "certification":
		return "Added " + name
	default:
		return "Earned " + name
	}
}

func badgeJourneyBody(
	valueType string,
	valueText string,
	valueNumber string,
	unit string,
	valueMinutes int32,
	valueSeconds int32,
	referenceLabel string,
) string {
	switch valueType {
	case "text":
		if valueText != "" {
			return valueText
		}
	case "number":
		if valueNumber != "" {
			return strings.TrimSpace(valueNumber + unit)
		}
	case "duration":
		if valueMinutes >= 0 || valueSeconds >= 0 {
			minutes := max(valueMinutes, 0)
			seconds := max(valueSeconds, 0)
			return fmt.Sprintf("%02d:%02d", minutes, seconds)
		}
	}
	if referenceLabel != "" {
		return referenceLabel
	}
	return ""
}
