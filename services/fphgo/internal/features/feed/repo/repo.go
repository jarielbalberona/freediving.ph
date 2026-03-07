package repo

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	pool *pgxpool.Pool
}

type CandidateInput struct {
	UserID string
	Limit  int32
}

type PostCandidate struct {
	ID               string
	AuthorUserID     string
	AuthorName       string
	AuthorUsername   string
	DiveSiteID       string
	DiveSiteName     string
	Area             string
	Note             string
	VisibilityMeters *float64
	Current          string
	Waves            string
	TempC            *float64
	CreatedAt        time.Time
	OccurredAt       time.Time
	SavedByViewer    bool
}

type CommunityCandidate struct {
	ID             string
	AuthorUserID   string
	AuthorName     string
	AuthorUsername string
	Title          string
	CategorySlug   string
	CategoryName   string
	ReplyCount     int64
	ReactionCount  int64
	CreatedAt      time.Time
}

type DiveSpotCandidate struct {
	ID                string
	Name              string
	Area              string
	Description       string
	EntryDifficulty   string
	Verification      string
	LastUpdatedAt     time.Time
	SaveCount         int64
	RecentUpdateCount int64
	SavedByViewer     bool
}

type BuddySignalCandidate struct {
	ID             string
	AuthorUserID   string
	AuthorName     string
	AuthorUsername string
	Area           string
	IntentType     string
	TimeWindow     string
	Note           string
	CreatedAt      time.Time
	ExpiresAt      time.Time
	DiveSiteID     string
	DiveSiteName   string
	SavedByViewer  bool
}

type EventCandidate struct {
	ID           string
	Title        string
	CreatedAt    time.Time
	MemberCount  int64
	ViewerMember bool
}

type NearbyCondition struct {
	Spot       string
	DistanceKm *int32
	Safety     string
	Current    string
	Visibility string
	WaterTemp  string
	Wind       string
	Sunrise    string
}

type FeedActionCount struct {
	EntityType string
	EntityID   string
	Count      int64
}

type FeedImpressionInsert struct {
	FeedItemID string
	EntityType string
	EntityID   string
	Mode       string
	Position   int
	SeenAt     time.Time
}

type FeedActionInsert struct {
	FeedItemID string
	EntityType string
	EntityID   string
	ActionType string
	Mode       string
	Value      map[string]any
	CreatedAt  time.Time
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool}
}

func (r *Repo) GetHomeArea(ctx context.Context, userID string) (string, error) {
	if strings.TrimSpace(userID) == "" {
		return "", nil
	}
	const q = `SELECT home_area FROM profiles WHERE user_id = $1`
	var area string
	err := r.pool.QueryRow(ctx, q, userID).Scan(&area)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return strings.TrimSpace(area), nil
}

func (r *Repo) ListHiddenItems(ctx context.Context, userID string) (map[string]struct{}, error) {
	if strings.TrimSpace(userID) == "" {
		return map[string]struct{}{}, nil
	}
	const q = `
		SELECT entity_type, entity_id
		FROM user_hidden_feed_items
		WHERE user_id = $1
	`
	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]struct{})
	for rows.Next() {
		var entityType, entityID string
		if scanErr := rows.Scan(&entityType, &entityID); scanErr != nil {
			return nil, scanErr
		}
		result[fmt.Sprintf("%s:%s", entityType, entityID)] = struct{}{}
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return result, nil
}

func (r *Repo) ListNegativeActionCounts(ctx context.Context, userID string, since time.Time) ([]FeedActionCount, error) {
	if strings.TrimSpace(userID) == "" {
		return []FeedActionCount{}, nil
	}
	const q = `
		SELECT entity_type, entity_id, COUNT(*)::bigint
		FROM feed_actions
		WHERE user_id = $1
		  AND created_at >= $2
		  AND action_type IN ('hide_item', 'not_interested')
		GROUP BY entity_type, entity_id
	`
	rows, err := r.pool.Query(ctx, q, userID, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]FeedActionCount, 0)
	for rows.Next() {
		var item FeedActionCount
		if scanErr := rows.Scan(&item.EntityType, &item.EntityID, &item.Count); scanErr != nil {
			return nil, scanErr
		}
		items = append(items, item)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return items, nil
}

func (r *Repo) ListPostCandidates(ctx context.Context, input CandidateInput) ([]PostCandidate, error) {
	const q = `
		SELECT
			u.id::text,
			dsu.author_app_user_id::text,
			COALESCE(NULLIF(u.display_name, ''), u.username),
			u.username,
			ds.id::text,
			ds.name,
			ds.area,
			dsu.note,
			dsu.condition_visibility_m,
			COALESCE(dsu.condition_current, ''),
			COALESCE(dsu.condition_waves, ''),
			dsu.condition_temp_c,
			dsu.created_at,
			dsu.occurred_at,
			EXISTS(
				SELECT 1 FROM dive_site_saves dss
				WHERE dss.app_user_id = $1::uuid
				  AND dss.dive_site_id = dsu.dive_site_id
			)
		FROM dive_site_updates dsu
		JOIN dive_sites ds ON ds.id = dsu.dive_site_id
		JOIN users u ON u.id = dsu.author_app_user_id
		WHERE dsu.state = 'active'
		  AND ds.moderation_state = 'approved'
		  AND NOT EXISTS (
			SELECT 1 FROM user_blocks b
			WHERE (b.blocker_app_user_id = $1::uuid AND b.blocked_app_user_id = dsu.author_app_user_id)
			   OR (b.blocker_app_user_id = dsu.author_app_user_id AND b.blocked_app_user_id = $1::uuid)
		  )
		  AND NOT EXISTS (
			SELECT 1 FROM user_hidden_feed_items h
			WHERE h.user_id = $1::uuid
			  AND h.entity_type = 'post'
			  AND h.entity_id = dsu.id::text
		  )
		ORDER BY dsu.created_at DESC, dsu.id DESC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, q, userUUIDParam(input.UserID), input.Limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]PostCandidate, 0)
	for rows.Next() {
		var item PostCandidate
		var visibility pgtype.Numeric
		var temp pgtype.Numeric
		if scanErr := rows.Scan(
			&item.ID,
			&item.AuthorUserID,
			&item.AuthorName,
			&item.AuthorUsername,
			&item.DiveSiteID,
			&item.DiveSiteName,
			&item.Area,
			&item.Note,
			&visibility,
			&item.Current,
			&item.Waves,
			&temp,
			&item.CreatedAt,
			&item.OccurredAt,
			&item.SavedByViewer,
		); scanErr != nil {
			return nil, scanErr
		}
		if visibility.Valid {
			if f, convErr := numericToFloat64(visibility); convErr == nil {
				item.VisibilityMeters = &f
			}
		}
		if temp.Valid {
			if f, convErr := numericToFloat64(temp); convErr == nil {
				item.TempC = &f
			}
		}
		item.CreatedAt = item.CreatedAt.UTC()
		item.OccurredAt = item.OccurredAt.UTC()
		items = append(items, item)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return items, nil
}

func (r *Repo) ListCommunityCandidates(ctx context.Context, input CandidateInput) ([]CommunityCandidate, error) {
	const q = `
		SELECT
			t.id::text,
			t.created_by_user_id::text,
			COALESCE(NULLIF(u.display_name, ''), u.username),
			u.username,
			t.title,
			c.slug,
			c.name,
			COALESCE((SELECT COUNT(*) FROM chika_posts p WHERE p.thread_id = t.id AND p.deleted_at IS NULL), 0)::bigint,
			COALESCE((SELECT COUNT(*) FROM chika_thread_reactions r WHERE r.thread_id = t.id), 0)::bigint,
			t.created_at
		FROM chika_threads t
		JOIN users u ON u.id = t.created_by_user_id
		JOIN chika_categories c ON c.id = t.category_id
		WHERE t.deleted_at IS NULL
		  AND t.hidden_at IS NULL
		  AND NOT EXISTS (
			SELECT 1 FROM user_blocks b
			WHERE (b.blocker_app_user_id = $1::uuid AND b.blocked_app_user_id = t.created_by_user_id)
			   OR (b.blocker_app_user_id = t.created_by_user_id AND b.blocked_app_user_id = $1::uuid)
		  )
		  AND NOT EXISTS (
			SELECT 1 FROM user_hidden_feed_items h
			WHERE h.user_id = $1::uuid
			  AND h.entity_type = 'community_hot_post'
			  AND h.entity_id = t.id::text
		  )
		ORDER BY t.created_at DESC, t.id DESC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, q, userUUIDParam(input.UserID), input.Limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]CommunityCandidate, 0)
	for rows.Next() {
		var item CommunityCandidate
		if scanErr := rows.Scan(
			&item.ID,
			&item.AuthorUserID,
			&item.AuthorName,
			&item.AuthorUsername,
			&item.Title,
			&item.CategorySlug,
			&item.CategoryName,
			&item.ReplyCount,
			&item.ReactionCount,
			&item.CreatedAt,
		); scanErr != nil {
			return nil, scanErr
		}
		item.CreatedAt = item.CreatedAt.UTC()
		items = append(items, item)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return items, nil
}

func (r *Repo) ListDiveSpotCandidates(ctx context.Context, input CandidateInput) ([]DiveSpotCandidate, error) {
	const q = `
		SELECT
			ds.id::text,
			ds.name,
			ds.area,
			COALESCE(ds.description, ''),
			ds.entry_difficulty,
			ds.verification_status,
			ds.last_updated_at,
			COALESCE((SELECT COUNT(*) FROM dive_site_saves dss WHERE dss.dive_site_id = ds.id), 0)::bigint,
			COALESCE((SELECT COUNT(*) FROM dive_site_updates dsu WHERE dsu.dive_site_id = ds.id AND dsu.state = 'active' AND dsu.created_at >= NOW() - INTERVAL '7 days'), 0)::bigint,
			EXISTS(SELECT 1 FROM dive_site_saves mine WHERE mine.app_user_id = $1::uuid AND mine.dive_site_id = ds.id)
		FROM dive_sites ds
		WHERE ds.moderation_state = 'approved'
		  AND NOT EXISTS (
			SELECT 1 FROM user_hidden_feed_items h
			WHERE h.user_id = $1::uuid
			  AND h.entity_type = 'dive_spot'
			  AND h.entity_id = ds.id::text
		  )
		ORDER BY ds.last_updated_at DESC, ds.id DESC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, q, userUUIDParam(input.UserID), input.Limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]DiveSpotCandidate, 0)
	for rows.Next() {
		var item DiveSpotCandidate
		if scanErr := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Area,
			&item.Description,
			&item.EntryDifficulty,
			&item.Verification,
			&item.LastUpdatedAt,
			&item.SaveCount,
			&item.RecentUpdateCount,
			&item.SavedByViewer,
		); scanErr != nil {
			return nil, scanErr
		}
		item.LastUpdatedAt = item.LastUpdatedAt.UTC()
		items = append(items, item)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return items, nil
}

func (r *Repo) ListBuddySignalCandidates(ctx context.Context, input CandidateInput) ([]BuddySignalCandidate, error) {
	const q = `
		SELECT
			bi.id::text,
			bi.author_app_user_id::text,
			COALESCE(NULLIF(u.display_name, ''), u.username),
			u.username,
			bi.area,
			bi.intent_type,
			bi.time_window,
			COALESCE(bi.note, ''),
			bi.created_at,
			bi.expires_at,
			COALESCE(bi.dive_site_id::text, ''),
			COALESCE(ds.name, ''),
			EXISTS(SELECT 1 FROM dive_site_saves dss WHERE dss.app_user_id = $1::uuid AND dss.dive_site_id = bi.dive_site_id)
		FROM buddy_intents bi
		JOIN users u ON u.id = bi.author_app_user_id
		LEFT JOIN dive_sites ds ON ds.id = bi.dive_site_id
		WHERE bi.state = 'active'
		  AND bi.expires_at >= NOW()
		  AND NOT EXISTS (
			SELECT 1 FROM user_blocks b
			WHERE (b.blocker_app_user_id = $1::uuid AND b.blocked_app_user_id = bi.author_app_user_id)
			   OR (b.blocker_app_user_id = bi.author_app_user_id AND b.blocked_app_user_id = $1::uuid)
		  )
		  AND NOT EXISTS (
			SELECT 1 FROM user_hidden_feed_items h
			WHERE h.user_id = $1::uuid
			  AND h.entity_type = 'buddy_signal'
			  AND h.entity_id = bi.id::text
		  )
		ORDER BY bi.created_at DESC, bi.id DESC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, q, userUUIDParam(input.UserID), input.Limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]BuddySignalCandidate, 0)
	for rows.Next() {
		var item BuddySignalCandidate
		if scanErr := rows.Scan(
			&item.ID,
			&item.AuthorUserID,
			&item.AuthorName,
			&item.AuthorUsername,
			&item.Area,
			&item.IntentType,
			&item.TimeWindow,
			&item.Note,
			&item.CreatedAt,
			&item.ExpiresAt,
			&item.DiveSiteID,
			&item.DiveSiteName,
			&item.SavedByViewer,
		); scanErr != nil {
			return nil, scanErr
		}
		item.CreatedAt = item.CreatedAt.UTC()
		item.ExpiresAt = item.ExpiresAt.UTC()
		items = append(items, item)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return items, nil
}

func (r *Repo) ListEventCandidates(ctx context.Context, input CandidateInput) ([]EventCandidate, error) {
	const q = `
		SELECT
			e.id::text,
			e.title,
			e.created_at,
			COALESCE((SELECT COUNT(*) FROM event_memberships em WHERE em.event_id = e.id AND em.status = 'active'), 0)::bigint,
			EXISTS(SELECT 1 FROM event_memberships mine WHERE mine.event_id = e.id AND mine.user_id = $1::uuid AND mine.status = 'active')
		FROM events e
		WHERE NOT EXISTS (
			SELECT 1 FROM user_hidden_feed_items h
			WHERE h.user_id = $1::uuid
			  AND h.entity_type = 'event'
			  AND h.entity_id = e.id::text
		)
		ORDER BY e.created_at DESC, e.id DESC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, q, userUUIDParam(input.UserID), input.Limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]EventCandidate, 0)
	for rows.Next() {
		var item EventCandidate
		if scanErr := rows.Scan(&item.ID, &item.Title, &item.CreatedAt, &item.MemberCount, &item.ViewerMember); scanErr != nil {
			return nil, scanErr
		}
		item.CreatedAt = item.CreatedAt.UTC()
		items = append(items, item)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return items, nil
}

func (r *Repo) GetNearbyCondition(ctx context.Context, userID string) (NearbyCondition, error) {
	const qSaved = `
		SELECT
			ds.name,
			COALESCE(
				CASE WHEN dsu.condition_current = 'none' THEN 'Calm'
				     WHEN dsu.condition_current = 'mild' THEN 'Light'
				     WHEN dsu.condition_current = 'strong' THEN 'Strong'
				     ELSE '' END,
			''
			),
			COALESCE(
				CASE WHEN dsu.condition_visibility_m IS NULL THEN '' ELSE CONCAT(TRIM(TO_CHAR(dsu.condition_visibility_m, 'FM999999990.##')), 'm') END,
			''
			),
			COALESCE(
				CASE WHEN dsu.condition_temp_c IS NULL THEN '' ELSE CONCAT(TRIM(TO_CHAR(dsu.condition_temp_c, 'FM999999990.##')), 'C') END,
			''
			),
			'Low',
			'Stable',
			'6:00 AM'
		FROM dive_site_saves dss
		JOIN dive_sites ds ON ds.id = dss.dive_site_id
		LEFT JOIN LATERAL (
			SELECT condition_current, condition_visibility_m, condition_temp_c
			FROM dive_site_updates u
			WHERE u.dive_site_id = ds.id AND u.state = 'active'
			ORDER BY u.created_at DESC
			LIMIT 1
		) dsu ON TRUE
		WHERE dss.app_user_id = $1::uuid
		ORDER BY dss.created_at DESC
		LIMIT 1
	`
	var out NearbyCondition
	if strings.TrimSpace(userID) != "" {
		err := r.pool.QueryRow(ctx, qSaved, userID).Scan(
			&out.Spot,
			&out.Current,
			&out.Visibility,
			&out.WaterTemp,
			&out.Wind,
			&out.Safety,
			&out.Sunrise,
		)
		if err == nil {
			return out, nil
		}
		if err != pgx.ErrNoRows {
			return NearbyCondition{}, err
		}
	}

	const qFallback = `
		SELECT ds.name
		FROM dive_sites ds
		WHERE ds.moderation_state = 'approved'
		ORDER BY ds.last_updated_at DESC
		LIMIT 1
	`
	if err := r.pool.QueryRow(ctx, qFallback).Scan(&out.Spot); err != nil {
		if err == pgx.ErrNoRows {
			out.Spot = "Unknown spot"
		} else {
			return NearbyCondition{}, err
		}
	}
	out.Safety = "Stable"
	out.Current = "Light"
	out.Visibility = "--"
	out.WaterTemp = "--"
	out.Wind = "Low"
	out.Sunrise = "6:00 AM"
	return out, nil
}

func (r *Repo) InsertImpressions(ctx context.Context, userID, sessionID string, rows []FeedImpressionInsert) error {
	if len(rows) == 0 {
		return nil
	}
	const q = `
		INSERT INTO feed_impressions (
			user_id, session_id, feed_item_id, entity_type, entity_id, mode, position, seen_at
		)
		VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (user_id, session_id, feed_item_id, position) DO NOTHING
	`
	for _, row := range rows {
		seenAt := row.SeenAt
		if seenAt.IsZero() {
			seenAt = time.Now().UTC()
		}
		if _, err := r.pool.Exec(ctx, q,
			userID,
			sessionID,
			row.FeedItemID,
			row.EntityType,
			row.EntityID,
			row.Mode,
			row.Position,
			seenAt,
		); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repo) InsertActions(ctx context.Context, userID, sessionID string, rows []FeedActionInsert) error {
	if len(rows) == 0 {
		return nil
	}
	const q = `
		INSERT INTO feed_actions (
			user_id, session_id, feed_item_id, entity_type, entity_id, action_type, mode, value_json, created_at
		)
		VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
	`
	for _, row := range rows {
		createdAt := row.CreatedAt
		if createdAt.IsZero() {
			createdAt = time.Now().UTC()
		}
		valueRaw := []byte("{}")
		if row.Value != nil {
			encoded, err := json.Marshal(row.Value)
			if err != nil {
				return err
			}
			valueRaw = encoded
		}
		if _, err := r.pool.Exec(ctx, q,
			userID,
			sessionID,
			nullableText(row.FeedItemID),
			row.EntityType,
			row.EntityID,
			row.ActionType,
			row.Mode,
			valueRaw,
			createdAt,
		); err != nil {
			return err
		}
	}
	return nil
}

func nullableText(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func numericToFloat64(value pgtype.Numeric) (float64, error) {
	floatVal, err := value.Float64Value()
	if err != nil {
		return 0, err
	}
	if !floatVal.Valid {
		return 0, fmt.Errorf("invalid numeric value")
	}
	return floatVal.Float64, nil
}

func userUUIDParam(userID string) any {
	trimmed := strings.TrimSpace(userID)
	if trimmed == "" {
		return nil
	}
	return trimmed
}
