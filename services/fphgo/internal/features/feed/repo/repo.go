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
	DiveSiteSlug     string
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

type MediaPostCandidate struct {
	ID                  string
	AuthorUserID        string
	AuthorName          string
	AuthorUsername      string
	DiveSiteID          string
	DiveSiteSlug        string
	DiveSiteName        string
	Area                string
	PostCaption         string
	PreviewCaption      string
	PreviewMediaID      string
	PreviewMimeType     string
	PreviewType         string
	PreviewPlaybackURL  string
	PreviewThumbnailURL string
	PreviewWidth        int32
	PreviewHeight       int32
	ItemCount           int32
	Items               []MediaPostCandidateItem
	CreatedAt           time.Time
	SavedByViewer       bool
	LikeCount           int64
	CommentCount        int64
	ViewerHasLiked      bool
	ViewerHasSaved      bool
}

type MediaPostCandidateItem struct {
	ID            string         `json:"id"`
	MediaObjectID string         `json:"mediaObjectId"`
	Type          string         `json:"type"`
	Width         int32          `json:"width"`
	Height        int32          `json:"height"`
	Caption       string         `json:"caption"`
	SortOrder     int32          `json:"sortOrder"`
	Playback      map[string]any `json:"playback,omitempty"`
	PlaybackURL   string         `json:"playbackUrl,omitempty"`
	ThumbnailURL  string         `json:"thumbnailUrl,omitempty"`
	PreviewURL    string         `json:"previewUrl,omitempty"`
}

type CommunityCandidate struct {
	ID                   string
	Slug                 string
	AuthorUserID         string
	AuthorName           string
	AuthorUsername       string
	AuthorPseudonym      string
	Mode                 string
	Title                string
	Content              string
	CategorySlug         string
	CategoryName         string
	CategoryPseudonymous bool
	ReplyCount           int64
	ReactionCount        int64
	CreatedAt            time.Time
}

type DiveSpotCandidate struct {
	ID                string
	Slug              string
	Name              string
	Area              string
	Description       string
	EntryDifficulty   string
	Verification      string
	LastUpdatedAt     time.Time
	SaveCount         int64
	LikeCount         int64
	RecentUpdateCount int64
	SavedByViewer     bool
	ViewerHasLiked    bool
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
	Visibility     string
	SavedByViewer  bool
}

type EventCandidate struct {
	ID               string
	Slug             string
	Title            string
	ShortDescription string
	Area             string
	Status           string
	Visibility       string
	CreatedAt        time.Time
	MemberCount      int64
	ViewerMember     bool
	ViewerAuthorized bool
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
	Source     string
	EntityType string
	EntityID   string
	Mode       string
	Position   int
	SeenAt     time.Time
}

type FeedActionInsert struct {
	FeedItemID string
	Source     string
	EntityType string
	EntityID   string
	ActionType string
	Mode       string
	Value      map[string]any
	CreatedAt  time.Time
}

type FeedHiddenItemInsert struct {
	EntityType string
	EntityID   string
	Reason     string
}

type ActivityListInput struct {
	UserID           string
	Mode             string
	Area             string
	DiveSiteID       string
	Types            []string
	CursorOccurredAt time.Time
	CursorID         string
	Limit            int32
}

type ActivityUpsert struct {
	Type            string
	SourceModule    string
	SourceType      string
	SourceID        string
	ActorUserID     string
	TargetType      string
	TargetID        string
	Visibility      string
	State           string
	Area            string
	DiveSiteID      string
	GroupID         string
	EventID         string
	OccurredAt      time.Time
	SourceCreatedAt time.Time
	Title           string
	Body            string
	Media           []map[string]any
	Stats           map[string]any
	Metadata        map[string]any
}

type ActivityRow struct {
	ID             string
	Type           string
	SourceModule   string
	SourceType     string
	SourceID       string
	ActorUserID    string
	ActorName      string
	ActorUsername  string
	ActorAvatarURL string
	TargetType     string
	TargetID       string
	Visibility     string
	Area           string
	DiveSiteID     string
	GroupID        string
	EventID        string
	OccurredAt     time.Time
	Title          string
	Body           string
	Media          []map[string]any
	Stats          map[string]any
	Metadata       map[string]any
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
			dsu.id::text,
			dsu.author_app_user_id::text,
			COALESCE(NULLIF(u.display_name, ''), u.username),
			u.username,
				ds.id::text,
				COALESCE(ds.slug, ''),
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
		  AND u.account_status = 'active'
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
			&item.DiveSiteSlug,
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

func (r *Repo) ListMediaPostCandidates(ctx context.Context, input CandidateInput) ([]MediaPostCandidate, error) {
	const q = `
		SELECT
			mp.id::text,
			mp.author_app_user_id::text,
			COALESCE(NULLIF(u.display_name, ''), u.username),
			u.username,
				COALESCE(ds.id::text, ''),
				COALESCE(ds.slug, ''),
				COALESCE(ds.name, ''),
				COALESCE(ds.area, ''),
			COALESCE(mp.post_caption, ''),
			COALESCE(preview.caption, ''),
			preview.media_object_id::text,
			preview.mime_type,
			preview.type,
			COALESCE(preview.playback_url, ''),
			COALESCE(preview.thumbnail_url, ''),
			preview.width,
			preview.height,
			item_counts.item_count,
			item_counts.items_json,
			mp.created_at,
			EXISTS(
				SELECT 1 FROM dive_site_saves dss
				WHERE dss.app_user_id = $1::uuid
				  AND dss.dive_site_id = mp.dive_site_id
			),
			COALESCE((SELECT COUNT(*) FROM media_post_likes mpl WHERE mpl.media_post_id = mp.id), 0)::bigint,
			COALESCE((SELECT COUNT(*) FROM media_post_comments mpc WHERE mpc.media_post_id = mp.id AND mpc.deleted_at IS NULL), 0)::bigint,
			EXISTS(
				SELECT 1 FROM media_post_likes viewer_like
				WHERE viewer_like.user_id = $1::uuid
				  AND viewer_like.media_post_id = mp.id
			),
			EXISTS(
				SELECT 1 FROM media_post_saves viewer_save
				WHERE viewer_save.user_id = $1::uuid
				  AND viewer_save.media_post_id = mp.id
			)
			FROM media_posts mp
			JOIN users u ON u.id = mp.author_app_user_id
			LEFT JOIN dive_sites ds ON ds.id = mp.dive_site_id
		JOIN LATERAL (
			SELECT
				mi.media_object_id,
				mi.mime_type,
				mi.type,
				mi.playback_url,
				mi.thumbnail_url,
				mi.width,
				mi.height,
				COALESCE(mi.caption, '') AS caption
			FROM media_items mi
			WHERE mi.post_id = mp.id
			  AND mi.status = 'active'
			  AND mi.deleted_at IS NULL
			  AND mi.moderation_status = 'approved'
			  AND (
				mi.type = 'photo'
				OR (
				  mi.type = 'video'
				  AND mi.provider = 'cloudflare_stream'
				  AND mi.processing_status = 'ready'
				)
			  )
			ORDER BY mi.sort_order ASC, mi.created_at ASC, mi.id ASC
			LIMIT 1
		) preview ON true
		JOIN LATERAL (
			SELECT
				COUNT(*)::int AS item_count,
				COALESCE(
					json_agg(
						json_build_object(
							'id', mi.id::text,
							'mediaObjectId', mi.media_object_id::text,
							'type', mi.type,
							'width', mi.width,
							'height', mi.height,
							'caption', COALESCE(mi.caption, ''),
							'sortOrder', mi.sort_order,
							'playback',
								CASE
									WHEN mi.type = 'video' AND mi.provider = 'cloudflare_stream' THEN
										json_build_object(
											'provider', 'cloudflare_stream',
											'iframeUrl', NULLIF(COALESCE(mi.playback_url, ''), ''),
											'hlsUrl',
												CASE
													WHEN NULLIF(COALESCE(mi.playback_uid, ''), '') IS NOT NULL THEN
														'https://videodelivery.net/' || mi.playback_uid || '/manifest/video.m3u8'
													ELSE NULL
												END,
											'posterUrl', NULLIF(COALESCE(mi.thumbnail_url, mi.preview_url, ''), '')
										)
									ELSE NULL
								END,
							'playbackUrl', COALESCE(mi.playback_url, ''),
							'thumbnailUrl', COALESCE(mi.thumbnail_url, ''),
							'previewUrl', COALESCE(mi.preview_url, '')
						)
						ORDER BY mi.sort_order ASC, mi.created_at ASC, mi.id ASC
					),
					'[]'::json
				) AS items_json
			FROM media_items mi
			WHERE mi.post_id = mp.id
			  AND mi.status = 'active'
			  AND mi.deleted_at IS NULL
			  AND mi.moderation_status = 'approved'
			  AND (
				mi.type = 'photo'
				OR (
				  mi.type = 'video'
				  AND mi.provider = 'cloudflare_stream'
				  AND mi.processing_status = 'ready'
				)
			  )
		) item_counts ON true
			WHERE mp.deleted_at IS NULL
			  AND (mp.dive_site_id IS NULL OR ds.moderation_state = 'approved')
		  AND u.account_status = 'active'
		  AND NOT EXISTS (
			SELECT 1 FROM user_blocks b
			WHERE (b.blocker_app_user_id = $1::uuid AND b.blocked_app_user_id = mp.author_app_user_id)
			   OR (b.blocker_app_user_id = mp.author_app_user_id AND b.blocked_app_user_id = $1::uuid)
		  )
		  AND NOT EXISTS (
			SELECT 1 FROM user_hidden_feed_items h
			WHERE h.user_id = $1::uuid
			  AND h.entity_type = 'media_post'
			  AND h.entity_id = mp.id::text
		  )
		ORDER BY mp.created_at DESC, mp.id DESC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, q, userUUIDParam(input.UserID), input.Limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]MediaPostCandidate, 0)
	for rows.Next() {
		var item MediaPostCandidate
		var itemsJSON []byte
		if scanErr := rows.Scan(
			&item.ID,
			&item.AuthorUserID,
			&item.AuthorName,
			&item.AuthorUsername,
			&item.DiveSiteID,
			&item.DiveSiteSlug,
			&item.DiveSiteName,
			&item.Area,
			&item.PostCaption,
			&item.PreviewCaption,
			&item.PreviewMediaID,
			&item.PreviewMimeType,
			&item.PreviewType,
			&item.PreviewPlaybackURL,
			&item.PreviewThumbnailURL,
			&item.PreviewWidth,
			&item.PreviewHeight,
			&item.ItemCount,
			&itemsJSON,
			&item.CreatedAt,
			&item.SavedByViewer,
			&item.LikeCount,
			&item.CommentCount,
			&item.ViewerHasLiked,
			&item.ViewerHasSaved,
		); scanErr != nil {
			return nil, scanErr
		}
		if len(itemsJSON) > 0 {
			if err := json.Unmarshal(itemsJSON, &item.Items); err != nil {
				return nil, err
			}
		}
		item.CreatedAt = item.CreatedAt.UTC()
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
			t.slug,
			t.created_by_user_id::text,
			COALESCE(NULLIF(u.display_name, ''), u.username),
			u.username,
			COALESCE(ta.pseudonym, ''),
			t.mode,
			t.title,
			COALESCE(fp.content, ''),
			c.slug,
			c.name,
			c.pseudonymous,
			COALESCE((SELECT COUNT(*) FROM chika_comments c WHERE c.thread_id = t.id AND c.deleted_at IS NULL), 0)::bigint,
			COALESCE((
				SELECT SUM(CASE WHEN r.reaction_type = 'upvote' THEN 1 WHEN r.reaction_type = 'downvote' THEN -1 ELSE 0 END)::bigint
				FROM chika_thread_reactions r
				WHERE r.thread_id = t.id
			), 0)::bigint,
			t.created_at
		FROM chika_threads t
		JOIN users u ON u.id = t.created_by_user_id
		JOIN chika_categories c ON c.id = t.category_id
		LEFT JOIN chika_thread_aliases ta ON ta.thread_id = t.id AND ta.user_id = t.created_by_user_id
		LEFT JOIN LATERAL (
			SELECT cp.content
			FROM chika_posts cp
			WHERE cp.thread_id = t.id AND cp.deleted_at IS NULL
			ORDER BY cp.created_at ASC, cp.id ASC
			LIMIT 1
		) fp ON TRUE
		WHERE t.deleted_at IS NULL
		  AND t.hidden_at IS NULL
		  AND u.account_status = 'active'
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
			&item.Slug,
			&item.AuthorUserID,
			&item.AuthorName,
			&item.AuthorUsername,
			&item.AuthorPseudonym,
			&item.Mode,
			&item.Title,
			&item.Content,
			&item.CategorySlug,
			&item.CategoryName,
			&item.CategoryPseudonymous,
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
			COALESCE(ds.slug, ''),
			ds.name,
			ds.area,
			COALESCE(ds.description, ''),
			ds.entry_difficulty,
			ds.verification_status,
			ds.last_updated_at,
			COALESCE((SELECT COUNT(*) FROM dive_site_saves dss WHERE dss.dive_site_id = ds.id), 0)::bigint,
			COALESCE((SELECT COUNT(*) FROM dive_site_likes dsl WHERE dsl.dive_site_id = ds.id), 0)::bigint,
			COALESCE((SELECT COUNT(*) FROM dive_site_updates dsu WHERE dsu.dive_site_id = ds.id AND dsu.state = 'active' AND dsu.created_at >= NOW() - INTERVAL '7 days'), 0)::bigint,
			EXISTS(SELECT 1 FROM dive_site_saves mine WHERE mine.app_user_id = $1::uuid AND mine.dive_site_id = ds.id),
			EXISTS(SELECT 1 FROM dive_site_likes mine_like WHERE mine_like.user_id = $1::uuid AND mine_like.dive_site_id = ds.id)
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
			&item.Slug,
			&item.Name,
			&item.Area,
			&item.Description,
			&item.EntryDifficulty,
			&item.Verification,
			&item.LastUpdatedAt,
			&item.SaveCount,
			&item.LikeCount,
			&item.RecentUpdateCount,
			&item.SavedByViewer,
			&item.ViewerHasLiked,
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
			bi.visibility,
			EXISTS(SELECT 1 FROM dive_site_saves dss WHERE dss.app_user_id = $1::uuid AND dss.dive_site_id = bi.dive_site_id)
		FROM buddy_intents bi
		JOIN users u ON u.id = bi.author_app_user_id
		LEFT JOIN dive_sites ds ON ds.id = bi.dive_site_id
		WHERE bi.state = 'active'
		  AND bi.expires_at >= NOW()
		  AND bi.visibility = 'members'
		  AND $1::uuid IS NOT NULL
		  AND u.account_status = 'active'
		  AND (bi.dive_site_id IS NULL OR ds.moderation_state = 'approved')
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
			&item.Visibility,
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
			e.slug,
			e.title,
			COALESCE(e.short_description, ''),
			COALESCE(e.location, e.location_name, ''),
			e.status,
			e.visibility,
			e.created_at,
			COALESCE((SELECT COUNT(*) FROM event_memberships em WHERE em.event_id = e.id AND em.status = 'active'), 0)::bigint,
			EXISTS(SELECT 1 FROM event_memberships mine WHERE mine.event_id = e.id AND mine.user_id = $1::uuid AND mine.status = 'active'),
			(
				e.visibility = 'public'
				OR (
					$1::uuid IS NOT NULL
					AND e.visibility = 'group_members'
					AND (
						EXISTS(SELECT 1 FROM event_memberships emv WHERE emv.event_id = e.id AND emv.user_id = $1::uuid AND emv.status = 'active')
						OR (
							e.group_id IS NOT NULL
							AND EXISTS(SELECT 1 FROM group_memberships gmv WHERE gmv.group_id = e.group_id AND gmv.user_id = $1::uuid AND gmv.status = 'active')
						)
					)
				)
				OR (
					$1::uuid IS NOT NULL
					AND e.visibility = 'invite_only'
					AND EXISTS(SELECT 1 FROM event_memberships eiv WHERE eiv.event_id = e.id AND eiv.user_id = $1::uuid AND eiv.status = 'active')
				)
			)
		FROM events e
		LEFT JOIN users organizer ON organizer.id = e.organizer_user_id
		LEFT JOIN groups g ON g.id = e.group_id
		WHERE e.status = 'published'
		  AND (e.organizer_user_id IS NULL OR organizer.account_status = 'active')
		  AND (e.group_id IS NULL OR g.status = 'active')
		  AND (
			e.visibility = 'public'
			OR (
				$1::uuid IS NOT NULL
				AND e.visibility = 'group_members'
				AND (
					EXISTS(SELECT 1 FROM event_memberships emv WHERE emv.event_id = e.id AND emv.user_id = $1::uuid AND emv.status = 'active')
					OR (
						e.group_id IS NOT NULL
						AND EXISTS(SELECT 1 FROM group_memberships gmv WHERE gmv.group_id = e.group_id AND gmv.user_id = $1::uuid AND gmv.status = 'active')
					)
				)
			)
			OR (
				$1::uuid IS NOT NULL
				AND e.visibility = 'invite_only'
				AND EXISTS(SELECT 1 FROM event_memberships eiv WHERE eiv.event_id = e.id AND eiv.user_id = $1::uuid AND eiv.status = 'active')
			)
		  )
		  AND NOT EXISTS (
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
		if scanErr := rows.Scan(&item.ID, &item.Slug, &item.Title, &item.ShortDescription, &item.Area, &item.Status, &item.Visibility, &item.CreatedAt, &item.MemberCount, &item.ViewerMember, &item.ViewerAuthorized); scanErr != nil {
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
			user_id, session_id, feed_item_id, feed_source, entity_type, entity_id, mode, position, seen_at
		)
		VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (user_id, session_id, feed_source, feed_item_id, position) DO NOTHING
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
			normalizeFeedSource(row.Source),
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
			user_id, session_id, feed_item_id, feed_source, entity_type, entity_id, action_type, mode, value_json, created_at
		)
		VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
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
			normalizeFeedSource(row.Source),
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

func normalizeFeedSource(value string) string {
	if strings.TrimSpace(value) == "activity" {
		return "activity"
	}
	return "home"
}

func (r *Repo) InsertHiddenItems(ctx context.Context, userID string, rows []FeedHiddenItemInsert) error {
	if len(rows) == 0 {
		return nil
	}
	const q = `
		INSERT INTO user_hidden_feed_items (user_id, entity_type, entity_id, reason)
		VALUES ($1::uuid, $2, $3, $4)
		ON CONFLICT (user_id, entity_type, entity_id)
		DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW()
	`
	for _, row := range rows {
		reason := strings.TrimSpace(row.Reason)
		if reason == "" {
			reason = "hidden"
		}
		if _, err := r.pool.Exec(ctx, q, userID, row.EntityType, row.EntityID, reason); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repo) UpsertActivityItem(ctx context.Context, input ActivityUpsert) error {
	mediaRaw, err := json.Marshal(jsonMapSliceOrEmpty(input.Media))
	if err != nil {
		return err
	}
	statsRaw, err := json.Marshal(jsonMapOrEmpty(input.Stats))
	if err != nil {
		return err
	}
	metadataRaw, err := json.Marshal(jsonMapOrEmpty(input.Metadata))
	if err != nil {
		return err
	}
	const q = `
		INSERT INTO activity_items (
			type,
			source_module,
			source_type,
			source_id,
			actor_user_id,
			target_type,
			target_id,
			visibility,
			state,
			area,
			dive_site_id,
			group_id,
			event_id,
			occurred_at,
			source_created_at,
			title,
			body,
			media,
			stats,
			metadata
		)
		VALUES (
			$1, $2, $3, $4::uuid, $5::uuid, $6, $7::uuid, $8, $9,
			$10, $11::uuid, $12::uuid, $13::uuid, $14, $15, $16, $17,
			$18::jsonb, $19::jsonb, $20::jsonb
		)
		ON CONFLICT (source_module, source_type, source_id, type)
		DO UPDATE SET
			actor_user_id = EXCLUDED.actor_user_id,
			target_type = EXCLUDED.target_type,
			target_id = EXCLUDED.target_id,
			visibility = EXCLUDED.visibility,
			state = EXCLUDED.state,
			area = EXCLUDED.area,
			dive_site_id = EXCLUDED.dive_site_id,
			group_id = EXCLUDED.group_id,
			event_id = EXCLUDED.event_id,
			occurred_at = EXCLUDED.occurred_at,
			source_created_at = EXCLUDED.source_created_at,
			title = EXCLUDED.title,
			body = EXCLUDED.body,
			media = EXCLUDED.media,
			stats = EXCLUDED.stats,
			metadata = EXCLUDED.metadata,
			updated_at = NOW()
	`
	state := strings.TrimSpace(input.State)
	if state == "" {
		state = "active"
	}
	sourceCreatedAt := input.SourceCreatedAt
	if sourceCreatedAt.IsZero() {
		sourceCreatedAt = input.OccurredAt
	}
	_, err = r.pool.Exec(ctx, q,
		input.Type,
		input.SourceModule,
		input.SourceType,
		input.SourceID,
		nullableText(input.ActorUserID),
		input.TargetType,
		input.TargetID,
		input.Visibility,
		state,
		nullableText(input.Area),
		nullableText(input.DiveSiteID),
		nullableText(input.GroupID),
		nullableText(input.EventID),
		input.OccurredAt,
		sourceCreatedAt,
		nullableText(input.Title),
		nullableText(input.Body),
		mediaRaw,
		statsRaw,
		metadataRaw,
	)
	return err
}

func (r *Repo) MarkActivityBySource(ctx context.Context, sourceModule, sourceType, sourceID, state string) error {
	const q = `
		UPDATE activity_items
		SET state = $4, updated_at = NOW()
		WHERE source_module = $1
		  AND source_type = $2
		  AND source_id = $3::uuid
	`
	_, err := r.pool.Exec(ctx, q, sourceModule, sourceType, sourceID, state)
	return err
}

func (r *Repo) RepairMediaPostActivityMedia(ctx context.Context) error {
	const q = `
		WITH live_media AS (
			SELECT
				mp.id AS media_post_id,
				jsonb_agg(
					jsonb_build_object(
						'id', mi.id::text,
						'mediaObjectId', mi.media_object_id::text,
						'type', mi.type,
						'width', mi.width,
						'height', mi.height,
						'caption', COALESCE(mi.caption, ''),
						'sortOrder', mi.sort_order,
						'playback',
							CASE
								WHEN mi.type = 'video' AND mi.provider = 'cloudflare_stream' THEN
									jsonb_build_object(
										'provider', 'cloudflare_stream',
										'iframeUrl', NULLIF(COALESCE(mi.playback_url, ''), ''),
										'hlsUrl',
											CASE
												WHEN NULLIF(COALESCE(mi.playback_uid, ''), '') IS NOT NULL THEN
													'https://videodelivery.net/' || mi.playback_uid || '/manifest/video.m3u8'
												ELSE NULL
											END,
										'posterUrl', NULLIF(COALESCE(mi.thumbnail_url, mi.preview_url, ''), '')
									)
								ELSE NULL
							END,
						'playbackUrl', COALESCE(mi.playback_url, ''),
						'thumbnailUrl', COALESCE(mi.thumbnail_url, ''),
						'previewUrl', COALESCE(mi.preview_url, '')
					)
					ORDER BY mi.sort_order ASC, mi.created_at ASC, mi.id ASC
				) AS media
			FROM media_posts mp
			JOIN media_items mi ON mi.post_id = mp.id
			JOIN media_objects mo ON mo.id = mi.media_object_id
			WHERE mp.deleted_at IS NULL
			  AND mi.status = 'active'
			  AND mi.deleted_at IS NULL
			  AND mi.moderation_status = 'approved'
			  AND (
				mi.type = 'photo'
				OR (
				  mi.type = 'video'
				  AND mi.provider = 'cloudflare_stream'
				  AND mi.processing_status = 'ready'
				)
			  )
			  AND mo.state = 'active'
			GROUP BY mp.id
		)
		UPDATE activity_items ai
		SET media = live_media.media,
		    updated_at = NOW()
		FROM live_media
		WHERE ai.type = 'media_post_created'
		  AND ai.source_module = 'media'
		  AND ai.source_type = 'media_post'
		  AND ai.source_id = live_media.media_post_id
		  AND (ai.media IS NULL OR ai.media = '[]'::jsonb)
	`
	_, err := r.pool.Exec(ctx, q)
	return err
}

func (r *Repo) ListActivityItems(ctx context.Context, input ActivityListInput) ([]ActivityRow, error) {
	const q = `
		SELECT
			ai.id::text,
			ai.type,
			ai.source_module,
			ai.source_type,
			ai.source_id::text,
			COALESCE(ai.actor_user_id::text, ''),
			COALESCE(NULLIF(u.display_name, ''), u.username, ''),
			COALESCE(u.username, ''),
			COALESCE(p.avatar_url, ''),
			ai.target_type,
			ai.target_id::text,
			ai.visibility,
			COALESCE(ai.area, ''),
			COALESCE(ai.dive_site_id::text, ''),
			COALESCE(ai.group_id::text, ''),
			COALESCE(ai.event_id::text, ''),
			ai.occurred_at,
			COALESCE(ai.title, ''),
			CASE
				WHEN ai.type = 'chika_thread_created' THEN COALESCE(NULLIF(ai.body, ''), live_chika_content.content, '')
				ELSE COALESCE(ai.body, '')
			END AS body,
			CASE
				WHEN ai.type = 'media_post_created' THEN COALESCE(live_media.items_json, '[]'::jsonb)
				ELSE ai.media
			END AS media,
			CASE
				WHEN ai.type = 'chika_thread_created' THEN
					COALESCE(ai.stats, '{}'::jsonb) ||
					jsonb_build_object(
						'replies',
						COALESCE(live_chika_stats.reply_count, 0),
						'replyCount',
						COALESCE(live_chika_stats.reply_count, 0),
						'reactions',
						COALESCE(live_chika_stats.vote_score, 0),
						'reactionCount',
						COALESCE(live_chika_stats.vote_score, 0),
						'voteCount',
						COALESCE(live_chika_stats.vote_score, 0)
					)
				WHEN ai.type = 'media_post_created' THEN
					COALESCE(ai.stats, '{}'::jsonb) ||
					jsonb_build_object(
						'likeCount',
						COALESCE((SELECT COUNT(*) FROM media_post_likes mpl WHERE mpl.media_post_id = ai.source_id), 0),
						'commentCount',
						COALESCE((SELECT COUNT(*) FROM media_post_comments mpc WHERE mpc.media_post_id = ai.source_id AND mpc.deleted_at IS NULL), 0),
						'viewerHasLiked',
						EXISTS(
							SELECT 1
							FROM media_post_likes viewer_like
							WHERE viewer_like.media_post_id = ai.source_id
							  AND viewer_like.user_id = $1::uuid
						),
						'viewerHasSaved',
						EXISTS(
							SELECT 1
							FROM media_post_saves viewer_save
							WHERE viewer_save.media_post_id = ai.source_id
							  AND viewer_save.user_id = $1::uuid
						)
					)
				ELSE ai.stats
			END AS stats,
			CASE
				WHEN ai.type = 'chika_thread_created' THEN
					COALESCE(ai.metadata, '{}'::jsonb) ||
					jsonb_build_object('threadSlug', COALESCE(live_chika_thread.slug, ''))
				WHEN ai.type = 'event_published' THEN
					COALESCE(ai.metadata, '{}'::jsonb) ||
					jsonb_build_object('eventSlug', COALESCE(live_event.slug, ''))
				ELSE ai.metadata
			END AS metadata
		FROM activity_items ai
		LEFT JOIN users u ON u.id = ai.actor_user_id
		LEFT JOIN profiles p ON p.user_id = ai.actor_user_id
		LEFT JOIN chika_threads live_chika_thread ON ai.type = 'chika_thread_created' AND live_chika_thread.id = ai.source_id
		LEFT JOIN events live_event ON ai.type = 'event_published' AND live_event.id = ai.source_id
		LEFT JOIN LATERAL (
			SELECT COALESCE(cp.content, '') AS content
			FROM chika_posts cp
			WHERE cp.thread_id = ai.source_id AND cp.deleted_at IS NULL
			ORDER BY cp.created_at ASC, cp.id ASC
			LIMIT 1
		) live_chika_content ON ai.type = 'chika_thread_created'
		LEFT JOIN LATERAL (
			SELECT
				jsonb_agg(
					jsonb_build_object(
						'id', mi.id::text,
						'mediaObjectId', mi.media_object_id::text,
						'type', mi.type,
						'width', mi.width,
						'height', mi.height,
						'caption', COALESCE(mi.caption, ''),
						'sortOrder', mi.sort_order,
						'playback',
							CASE
								WHEN mi.type = 'video' AND mi.provider = 'cloudflare_stream' THEN
									jsonb_build_object(
										'provider', 'cloudflare_stream',
										'iframeUrl', NULLIF(COALESCE(mi.playback_url, ''), ''),
										'hlsUrl',
											CASE
												WHEN NULLIF(COALESCE(mi.playback_uid, ''), '') IS NOT NULL THEN
													'https://videodelivery.net/' || mi.playback_uid || '/manifest/video.m3u8'
												ELSE NULL
											END,
										'posterUrl', NULLIF(COALESCE(mi.thumbnail_url, mi.preview_url, ''), '')
									)
								ELSE NULL
							END,
						'playbackUrl', COALESCE(mi.playback_url, ''),
						'thumbnailUrl', COALESCE(mi.thumbnail_url, ''),
						'previewUrl', COALESCE(mi.preview_url, ''),
						'objectKey', mo.object_key,
						'contextType', mo.context_type
					)
					ORDER BY mi.sort_order ASC, mi.created_at ASC, mi.id ASC
				) AS items_json
			FROM media_items mi
			JOIN media_objects mo ON mo.id = mi.media_object_id
			WHERE mi.post_id = ai.source_id
			  AND mi.status = 'active'
			  AND mi.deleted_at IS NULL
			  AND mi.moderation_status = 'approved'
			  AND (
				mi.type = 'photo'
				OR (
				  mi.type = 'video'
				  AND mi.provider = 'cloudflare_stream'
				  AND mi.processing_status = 'ready'
				)
			  )
			  AND mo.state = 'active'
		) live_media ON ai.type = 'media_post_created'
		LEFT JOIN LATERAL (
			SELECT
				COALESCE((
					SELECT COUNT(*)::bigint
					FROM chika_comments cc
					WHERE cc.thread_id = ai.source_id
					  AND cc.deleted_at IS NULL
				), 0) AS reply_count,
				COALESCE((
					SELECT SUM(CASE WHEN ctr.reaction_type = 'upvote' THEN 1 WHEN ctr.reaction_type = 'downvote' THEN -1 ELSE 0 END)::bigint
					FROM chika_thread_reactions ctr
					WHERE ctr.thread_id = ai.source_id
				), 0) AS vote_score
		) live_chika_stats ON ai.type = 'chika_thread_created'
		WHERE ai.state = 'active'
		  AND (ai.actor_user_id IS NULL OR u.account_status = 'active')
		  AND (
		    $1::uuid IS NULL AND ai.visibility = 'public'
		    OR
		    $1::uuid IS NOT NULL AND (
		      ai.visibility IN ('public', 'members')
		      OR (
		        ai.visibility = 'group_members'
		        AND ai.group_id IS NOT NULL
		        AND EXISTS (
		          SELECT 1
		          FROM group_memberships gm
		          WHERE gm.group_id = ai.group_id
		            AND gm.user_id = $1::uuid
		            AND gm.status = 'active'
		        )
		      )
		    )
		  )
		  AND ai.visibility <> 'private'
		  AND ai.visibility <> 'followers'
		  AND (
		    $2 = 'latest'
		    OR ($2 = 'nearby' AND $3 <> '' AND lower(COALESCE(ai.area, '')) LIKE '%' || lower($3) || '%')
		    OR ($2 = 'chika' AND ai.type = 'chika_thread_created')
		    OR ($2 = 'dive-reports' AND ai.type IN ('dive_site_update_added', 'media_post_created'))
		    OR ($2 = 'events' AND ai.type = 'event_published')
		  )
		  AND ($7::uuid IS NULL OR ai.dive_site_id = $7::uuid)
		  AND ($8::text[] IS NULL OR ai.type = ANY($8::text[]))
		  AND (
		    $1::uuid IS NULL
		    OR ai.actor_user_id IS NULL
		    OR ai.actor_user_id = $1::uuid
		    OR NOT EXISTS (
		      SELECT 1
		      FROM user_blocks ub
		      WHERE (ub.blocker_app_user_id = $1::uuid AND ub.blocked_app_user_id = ai.actor_user_id)
		         OR (ub.blocker_app_user_id = ai.actor_user_id AND ub.blocked_app_user_id = $1::uuid)
		    )
		  )
		  AND (
		    $1::uuid IS NULL
		    OR NOT EXISTS (
		      SELECT 1
		      FROM user_hidden_feed_items h
		      WHERE h.user_id = $1::uuid
		        AND (
		          (h.entity_type = 'activity_item' AND h.entity_id = ai.id::text)
		          OR
		          (h.entity_type = ai.source_type AND h.entity_id = ai.source_id::text)
		          OR (h.entity_type = ai.type AND h.entity_id = ai.source_id::text)
		          OR (h.entity_type = ai.target_type AND h.entity_id = ai.target_id::text)
		        )
		    )
		  )
		  AND (
		    (ai.type = 'chika_thread_created' AND EXISTS (
		      SELECT 1
		      FROM chika_threads t
		      WHERE t.id = ai.source_id
		        AND t.hidden_at IS NULL
		        AND t.deleted_at IS NULL
		    ))
		    OR (ai.type = 'dive_site_update_added' AND EXISTS (
		      SELECT 1
		      FROM dive_site_updates dsu
		      JOIN dive_sites ds ON ds.id = dsu.dive_site_id
		      WHERE dsu.id = ai.source_id
		        AND dsu.state = 'active'
		        AND ds.moderation_state = 'approved'
		    ))
		    OR (ai.type = 'event_published' AND EXISTS (
		      SELECT 1
		      FROM events e
		      LEFT JOIN groups g ON g.id = e.group_id
		      WHERE e.id = ai.source_id
		        AND e.status = 'published'
		        AND e.visibility IN ('public', 'group_members')
		        AND (e.group_id IS NULL OR g.status = 'active')
		    ))
		    OR (ai.type = 'buddy_intent_created' AND EXISTS (
		      SELECT 1
		      FROM buddy_intents bi
		      LEFT JOIN dive_sites ds ON ds.id = bi.dive_site_id
		      WHERE bi.id = ai.source_id
		        AND bi.state = 'active'
		        AND bi.visibility = 'members'
		        AND bi.expires_at > NOW()
		        AND (bi.dive_site_id IS NULL OR ds.moderation_state = 'approved')
		    ))
			    OR (ai.type = 'media_post_created' AND EXISTS (
			      SELECT 1
			      FROM media_posts mp
			      LEFT JOIN dive_sites ds ON ds.id = mp.dive_site_id
			      WHERE mp.id = ai.source_id
			        AND mp.deleted_at IS NULL
			        AND (mp.dive_site_id IS NULL OR ds.moderation_state = 'approved')
			        AND EXISTS (
		          SELECT 1
		          FROM media_items mi
		          JOIN media_objects mo ON mo.id = mi.media_object_id
		          WHERE mi.post_id = mp.id
		            AND mi.status = 'active'
		            AND mi.moderation_status = 'approved'
		            AND (
		              mi.type = 'photo'
		              OR (
		                mi.type = 'video'
		                AND mi.provider = 'cloudflare_stream'
		                AND mi.processing_status = 'ready'
		              )
		            )
		            AND mi.deleted_at IS NULL
		            AND mo.state = 'active'
		        )
		    ))
		  )
		  AND (ai.occurred_at, ai.id) < ($4::timestamptz, $5::uuid)
		ORDER BY ai.occurred_at DESC, ai.id DESC
		LIMIT $6
	`
	rows, err := r.pool.Query(ctx, q,
		userUUIDParam(input.UserID),
		normalizeActivityMode(input.Mode),
		strings.TrimSpace(input.Area),
		input.CursorOccurredAt,
		input.CursorID,
		input.Limit,
		userUUIDParam(input.DiveSiteID),
		activityTypeFilter(input.Types),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]ActivityRow, 0)
	for rows.Next() {
		var item ActivityRow
		var mediaRaw, statsRaw, metadataRaw []byte
		if scanErr := rows.Scan(
			&item.ID,
			&item.Type,
			&item.SourceModule,
			&item.SourceType,
			&item.SourceID,
			&item.ActorUserID,
			&item.ActorName,
			&item.ActorUsername,
			&item.ActorAvatarURL,
			&item.TargetType,
			&item.TargetID,
			&item.Visibility,
			&item.Area,
			&item.DiveSiteID,
			&item.GroupID,
			&item.EventID,
			&item.OccurredAt,
			&item.Title,
			&item.Body,
			&mediaRaw,
			&statsRaw,
			&metadataRaw,
		); scanErr != nil {
			return nil, scanErr
		}
		item.Media = decodeMapSlice(mediaRaw)
		item.Stats = decodeMap(statsRaw)
		item.Metadata = decodeMap(metadataRaw)
		items = append(items, item)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return items, nil
}

func (r *Repo) CountActivityItems(ctx context.Context, input ActivityListInput) (int64, error) {
	const q = `
		SELECT COUNT(*)::bigint
		FROM activity_items ai
		LEFT JOIN users u ON u.id = ai.actor_user_id
		WHERE ai.state = 'active'
		  AND (ai.actor_user_id IS NULL OR u.account_status = 'active')
		  AND (
		    $1::uuid IS NULL AND ai.visibility = 'public'
		    OR
		    $1::uuid IS NOT NULL AND (
		      ai.visibility IN ('public', 'members')
		      OR (
		        ai.visibility = 'group_members'
		        AND ai.group_id IS NOT NULL
		        AND EXISTS (
		          SELECT 1
		          FROM group_memberships gm
		          WHERE gm.group_id = ai.group_id
		            AND gm.user_id = $1::uuid
		            AND gm.status = 'active'
		        )
		      )
		    )
		  )
		  AND ai.visibility <> 'private'
		  AND ai.visibility <> 'followers'
		  AND (
		    $2 = 'latest'
		    OR ($2 = 'nearby' AND $3 <> '' AND lower(COALESCE(ai.area, '')) LIKE '%' || lower($3) || '%')
		    OR ($2 = 'chika' AND ai.type = 'chika_thread_created')
		    OR ($2 = 'dive-reports' AND ai.type IN ('dive_site_update_added', 'media_post_created'))
		    OR ($2 = 'events' AND ai.type = 'event_published')
		  )
		  AND ($4::uuid IS NULL OR ai.dive_site_id = $4::uuid)
		  AND ($5::text[] IS NULL OR ai.type = ANY($5::text[]))
		  AND (
		    $1::uuid IS NULL
		    OR ai.actor_user_id IS NULL
		    OR ai.actor_user_id = $1::uuid
		    OR NOT EXISTS (
		      SELECT 1
		      FROM user_blocks ub
		      WHERE (ub.blocker_app_user_id = $1::uuid AND ub.blocked_app_user_id = ai.actor_user_id)
		         OR (ub.blocker_app_user_id = ai.actor_user_id AND ub.blocked_app_user_id = $1::uuid)
		    )
		  )
		  AND (
		    $1::uuid IS NULL
		    OR NOT EXISTS (
		      SELECT 1
		      FROM user_hidden_feed_items h
		      WHERE h.user_id = $1::uuid
		        AND (
		          (h.entity_type = 'activity_item' AND h.entity_id = ai.id::text)
		          OR
		          (h.entity_type = ai.source_type AND h.entity_id = ai.source_id::text)
		          OR (h.entity_type = ai.type AND h.entity_id = ai.source_id::text)
		          OR (h.entity_type = ai.target_type AND h.entity_id = ai.target_id::text)
		        )
		    )
		  )
		  AND (
		    (ai.type = 'chika_thread_created' AND EXISTS (
		      SELECT 1
		      FROM chika_threads t
		      WHERE t.id = ai.source_id
		        AND t.hidden_at IS NULL
		        AND t.deleted_at IS NULL
		    ))
		    OR (ai.type = 'dive_site_update_added' AND EXISTS (
		      SELECT 1
		      FROM dive_site_updates dsu
		      JOIN dive_sites ds ON ds.id = dsu.dive_site_id
		      WHERE dsu.id = ai.source_id
		        AND dsu.state = 'active'
		        AND ds.moderation_state = 'approved'
		    ))
		    OR (ai.type = 'event_published' AND EXISTS (
		      SELECT 1
		      FROM events e
		      LEFT JOIN groups g ON g.id = e.group_id
		      WHERE e.id = ai.source_id
		        AND e.status = 'published'
		        AND e.visibility IN ('public', 'group_members')
		        AND (e.group_id IS NULL OR g.status = 'active')
		    ))
		    OR (ai.type = 'buddy_intent_created' AND EXISTS (
		      SELECT 1
		      FROM buddy_intents bi
		      LEFT JOIN dive_sites ds ON ds.id = bi.dive_site_id
		      WHERE bi.id = ai.source_id
		        AND bi.state = 'active'
		        AND bi.visibility = 'members'
		        AND bi.expires_at > NOW()
		        AND (bi.dive_site_id IS NULL OR ds.moderation_state = 'approved')
		    ))
			    OR (ai.type = 'media_post_created' AND EXISTS (
			      SELECT 1
			      FROM media_posts mp
			      LEFT JOIN dive_sites ds ON ds.id = mp.dive_site_id
			      WHERE mp.id = ai.source_id
			        AND mp.deleted_at IS NULL
			        AND (mp.dive_site_id IS NULL OR ds.moderation_state = 'approved')
			        AND EXISTS (
			          SELECT 1
			          FROM media_items mi
			          JOIN media_objects mo ON mo.id = mi.media_object_id
			          WHERE mi.post_id = mp.id
			            AND mi.status = 'active'
			            AND mi.moderation_status = 'approved'
			            AND (
			              mi.type = 'photo'
			              OR (
			                mi.type = 'video'
			                AND mi.provider = 'cloudflare_stream'
			                AND mi.processing_status = 'ready'
			              )
			            )
			            AND mi.deleted_at IS NULL
			            AND mo.state = 'active'
			        )
			    ))
		  )
	`
	var count int64
	err := r.pool.QueryRow(ctx, q,
		userUUIDParam(input.UserID),
		normalizeActivityMode(input.Mode),
		strings.TrimSpace(input.Area),
		userUUIDParam(input.DiveSiteID),
		activityTypeFilter(input.Types),
	).Scan(&count)
	return count, err
}

func nullableText(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func normalizeActivityMode(mode string) string {
	switch strings.TrimSpace(mode) {
	case "nearby", "chika", "dive-reports", "events":
		return strings.TrimSpace(mode)
	default:
		return "latest"
	}
}

func jsonMapOrEmpty(value map[string]any) map[string]any {
	if value == nil {
		return map[string]any{}
	}
	return value
}

func jsonMapSliceOrEmpty(value []map[string]any) []map[string]any {
	if value == nil {
		return []map[string]any{}
	}
	return value
}

func decodeMap(raw []byte) map[string]any {
	if len(raw) == 0 {
		return map[string]any{}
	}
	var decoded map[string]any
	if err := json.Unmarshal(raw, &decoded); err != nil || decoded == nil {
		return map[string]any{}
	}
	return decoded
}

func decodeMapSlice(raw []byte) []map[string]any {
	if len(raw) == 0 {
		return []map[string]any{}
	}
	var decoded []map[string]any
	if err := json.Unmarshal(raw, &decoded); err != nil || decoded == nil {
		return []map[string]any{}
	}
	return decoded
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

func activityTypeFilter(types []string) any {
	cleaned := make([]string, 0, len(types))
	for _, value := range types {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			cleaned = append(cleaned, trimmed)
		}
	}
	if len(cleaned) == 0 {
		return nil
	}
	return cleaned
}
