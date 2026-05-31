package repo

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	profilesqlc "fphgo/internal/features/profiles/repo/sqlc"
)

type Repo struct {
	pool    *pgxpool.Pool
	queries *profilesqlc.Queries
}

type Profile struct {
	UserID        string
	Username      string
	DisplayName   string
	EmailVerified bool
	PhoneVerified bool
	BuddyCount    int64
	ReportCount   int64
	Bio           string
	AvatarURL     string
	Location      string
	HomeArea      string
	Interests     []string
	CertLevel     string
	Socials       map[string]string
}

type UpsertProfileInput struct {
	UserID      string
	DisplayName string
	Bio         string
	AvatarURL   string
	Location    string
	HomeArea    string
	Interests   []string
	CertLevel   string
	Socials     map[string]string
	UpdateName  bool
}

type SearchUser struct {
	UserID      string
	Username    string
	DisplayName string
	AvatarURL   string
	Location    string
}

type SavedSite struct {
	ID                   string
	Slug                 string
	Name                 string
	Area                 string
	Difficulty           string
	LastUpdatedAt        string
	LastConditionSummary string
	SavedAt              string
}

type SavedUser struct {
	UserID        string
	Username      string
	DisplayName   string
	EmailVerified bool
	PhoneVerified bool
	AvatarURL     string
	HomeArea      string
	CertLevel     string
	BuddyCount    int64
	ReportCount   int64
	SavedAt       string
}

type ProfileView struct {
	UserID         string
	Username       string
	DisplayName    string
	Bio            string
	AvatarURL      string
	LocationText   string
	CreatedAt      time.Time
	PostsCount     int64
	FollowersCount int64
	FollowingCount int64
	IsFollowing    bool
	IsBlocked      bool
	HasBlocked     bool
}

type ProfileBucketListItem struct {
	SiteID   string
	SiteSlug string
	SiteName string
	SiteArea string
	PinnedAt string
	HasDived bool
}

type ProfileDivePresence struct {
	ID               string
	DiveSiteID       string
	DiveSiteSlug     string
	DiveSiteName     string
	DiveSiteArea     string
	PresenceType     string
	StartAt          *time.Time
	EndAt            *time.Time
	Visibility       string
	ContactEnabled   bool
	ViewerCanContact bool
	Note             string
	CreatedAt        time.Time
}

type ProfileDiveSiteAffinity struct {
	ID               string
	DiveSiteID       string
	DiveSiteSlug     string
	DiveSiteName     string
	DiveSiteArea     string
	Relationship     string
	Visibility       string
	ContactEnabled   bool
	ViewerCanContact bool
	Note             string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type ProfileDiving struct {
	Presences  []ProfileDivePresence
	Affinities []ProfileDiveSiteAffinity
}

type ProfileDiveMapMarker struct {
	UserID           string
	DiveSiteID       string
	DiveSiteSlug     string
	DiveSiteName     string
	DiveSiteArea     string
	Latitude         *float64
	Longitude        *float64
	FirstPostID      string
	FirstVisitedAt   time.Time
	LastPostID       string
	LastVisitedAt    time.Time
	MediaPostCount   int32
	Visibility       string
	UnlockedAt       time.Time
	LastProofAddedAt time.Time
}

type ProfileDiveMap struct {
	VisitedSiteCount int64
	Markers          []ProfileDiveMapMarker
}

type ProfileDiveMapProofMedia struct {
	PostID        string
	MediaItemID   string
	MediaObjectID string
	Type          string
	StorageKey    string
	MimeType      string
	Width         int32
	Height        int32
	Caption       string
	CreatedAt     time.Time
}

type ProfileDiveMapMemory struct {
	ID           string
	AuthorUserID string
	DiveSiteID   string
	Title        string
	Body         string
	MediaIDs     []string
	Visibility   string
	OccurredAt   time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type ProfileDiveMapSiteDetail struct {
	Marker   ProfileDiveMapMarker
	Media    []ProfileDiveMapProofMedia
	Memories []ProfileDiveMapMemory
}

type BadgeTemplate struct {
	ID           string
	Slug         string
	Name         string
	Category     string
	ValueType    string
	Unit         string
	Icon         string
	Description  string
	IsSystem     bool
	DisplayOrder int32
	Rarity       string
	IsPublic     bool
	IsRepeatable bool
	SourceModule string
	MetadataJSON map[string]any
}

type UserBadge struct {
	ID                  string
	UserID              string
	Template            BadgeTemplate
	ValueText           string
	ValueNumber         *float64
	ValueMinutes        *int32
	ValueSeconds        *int32
	ReferenceLabel      string
	ReferenceValue      string
	ProofMediaID        string
	ProofMediaObjectKey string
	VerificationStatus  string
	VerifiedAt          *time.Time
	VerifiedBy          string
	SourceType          string
	SourceID            string
	EarnedAt            *time.Time
	Visibility          string
	DisplayOrder        int32
	MetadataJSON        map[string]any
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type UpsertUserBadgeInput struct {
	ID             string
	UserID         string
	TemplateID     string
	ValueText      *string
	ValueNumber    *float64
	ValueMinutes   *int32
	ValueSeconds   *int32
	ReferenceLabel *string
	ReferenceValue *string
	ProofMediaID   *string
	SourceType     string
	SourceID       *string
	EarnedAt       *time.Time
	Visibility     string
	DisplayOrder   int32
	MetadataJSON   map[string]any
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool, queries: profilesqlc.New(pool)}
}

func (r *Repo) GetProfileByUserID(ctx context.Context, userID string) (Profile, error) {
	row, err := r.queries.GetProfileByUserID(ctx, toUUID(userID))
	if err != nil {
		return Profile{}, err
	}

	socials, err := decodeSocials(row.Socials)
	if err != nil {
		return Profile{}, err
	}

	return Profile{
		UserID:        row.UserID.String(),
		Username:      row.Username,
		DisplayName:   row.DisplayName,
		EmailVerified: row.EmailVerified,
		PhoneVerified: row.PhoneVerified,
		BuddyCount:    row.BuddyCount,
		ReportCount:   row.ReportCount,
		Bio:           row.Bio,
		AvatarURL:     row.AvatarUrl,
		Location:      row.Location,
		HomeArea:      row.HomeArea,
		Interests:     row.Interests,
		CertLevel:     valueOrEmpty(row.CertLevel),
		Socials:       socials,
	}, nil
}

func (r *Repo) UpsertMyProfile(ctx context.Context, input UpsertProfileInput) (Profile, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Profile{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	qtx := r.queries.WithTx(tx)
	userID := toUUID(input.UserID)

	if input.UpdateName {
		if err := qtx.UpdateDisplayName(ctx, profilesqlc.UpdateDisplayNameParams{
			ID:          userID,
			DisplayName: input.DisplayName,
		}); err != nil {
			return Profile{}, err
		}
	}

	socialsJSON, err := json.Marshal(input.Socials)
	if err != nil {
		return Profile{}, err
	}

	if _, err := qtx.UpsertMyProfile(ctx, profilesqlc.UpsertMyProfileParams{
		UserID:    userID,
		Bio:       input.Bio,
		AvatarUrl: input.AvatarURL,
		Location:  input.Location,
		HomeArea:  input.HomeArea,
		Interests: input.Interests,
		CertLevel: stringPtr(input.CertLevel),
		Socials:   socialsJSON,
	}); err != nil {
		return Profile{}, err
	}

	profileRow, err := qtx.GetProfileByUserID(ctx, userID)
	if err != nil {
		return Profile{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return Profile{}, err
	}

	socials, err := decodeSocials(profileRow.Socials)
	if err != nil {
		return Profile{}, err
	}

	return Profile{
		UserID:        profileRow.UserID.String(),
		Username:      profileRow.Username,
		DisplayName:   profileRow.DisplayName,
		EmailVerified: profileRow.EmailVerified,
		PhoneVerified: profileRow.PhoneVerified,
		BuddyCount:    profileRow.BuddyCount,
		ReportCount:   profileRow.ReportCount,
		Bio:           profileRow.Bio,
		AvatarURL:     profileRow.AvatarUrl,
		Location:      profileRow.Location,
		HomeArea:      profileRow.HomeArea,
		Interests:     profileRow.Interests,
		CertLevel:     valueOrEmpty(profileRow.CertLevel),
		Socials:       socials,
	}, nil
}

func (r *Repo) ListSavedSitesForUser(ctx context.Context, appUserID string) ([]SavedSite, error) {
	rows, err := r.queries.ListSavedSitesForUser(ctx, toUUID(appUserID))
	if err != nil {
		return nil, err
	}
	items := make([]SavedSite, 0, len(rows))
	for _, row := range rows {
		items = append(items, SavedSite{
			ID:                   row.ID.String(),
			Slug:                 row.Slug,
			Name:                 row.Name,
			Area:                 row.Area,
			Difficulty:           row.EntryDifficulty,
			LastUpdatedAt:        row.LastUpdatedAt.Time.UTC().Format(time.RFC3339),
			LastConditionSummary: anyString(row.LastConditionSummary),
			SavedAt:              row.SavedAt.Time.UTC().Format(time.RFC3339),
		})
	}
	return items, nil
}

func (r *Repo) ListSavedUsersForUser(ctx context.Context, viewerUserID string) ([]SavedUser, error) {
	rows, err := r.queries.ListSavedUsersForUser(ctx, toUUID(viewerUserID))
	if err != nil {
		return nil, err
	}
	items := make([]SavedUser, 0, len(rows))
	for _, row := range rows {
		items = append(items, SavedUser{
			UserID:        row.UserID.String(),
			Username:      row.Username,
			DisplayName:   row.DisplayName,
			EmailVerified: row.EmailVerified,
			PhoneVerified: row.PhoneVerified,
			AvatarURL:     row.AvatarUrl,
			HomeArea:      row.HomeArea,
			CertLevel:     row.CertLevel,
			BuddyCount:    row.BuddyCount,
			ReportCount:   row.ReportCount,
			SavedAt:       row.SavedAt.Time.UTC().Format(time.RFC3339),
		})
	}
	return items, nil
}

func (r *Repo) SearchUsers(ctx context.Context, viewerID, q string, limit int32) ([]SearchUser, error) {
	rows, err := r.queries.SearchUsers(ctx, profilesqlc.SearchUsersParams{
		ID:        toUUID(viewerID),
		Q:         q,
		LimitRows: limit,
	})
	if err != nil {
		return nil, err
	}

	items := make([]SearchUser, 0, len(rows))
	for _, row := range rows {
		items = append(items, SearchUser{
			UserID:      row.UserID.String(),
			Username:    row.Username,
			DisplayName: row.DisplayName,
			AvatarURL:   row.AvatarUrl,
			Location:    row.Location,
		})
	}

	return items, nil
}

func (r *Repo) GetProfileViewByUsername(ctx context.Context, username, viewerUserID string) (ProfileView, error) {
	const q = `
		SELECT
			u.id,
			u.username,
			u.display_name,
			COALESCE(p.bio, '') AS bio,
			COALESCE(p.avatar_url, '') AS avatar_url,
			COALESCE(NULLIF(p.home_area, ''), NULLIF(p.location, ''), '') AS location_text,
			u.created_at,
			COALESCE((
				SELECT COUNT(*)::bigint
				FROM media_items mi
				WHERE mi.author_app_user_id = u.id
				  AND mi.status = 'active'
				  AND mi.deleted_at IS NULL
			), 0)::bigint AS posts_count,
			COALESCE((
				SELECT COUNT(*)::bigint
				FROM saved_users su
				WHERE su.saved_app_user_id = u.id
			), 0)::bigint AS followers_count,
			COALESCE((
				SELECT COUNT(*)::bigint
				FROM saved_users su
				WHERE su.viewer_app_user_id = u.id
			), 0)::bigint AS following_count,
			COALESCE((
				SELECT EXISTS (
					SELECT 1
					FROM saved_users su
					WHERE su.viewer_app_user_id = NULLIF($2, '')::uuid
					  AND su.saved_app_user_id = u.id
				)
			), false) AS is_following,
			COALESCE((
				SELECT EXISTS (
					SELECT 1
					FROM user_blocks b
					WHERE b.blocker_app_user_id = NULLIF($2, '')::uuid
					  AND b.blocked_app_user_id = u.id
				)
			), false) AS viewer_blocked_profile,
			COALESCE((
				SELECT EXISTS (
					SELECT 1
					FROM user_blocks b
					WHERE b.blocker_app_user_id = u.id
					  AND b.blocked_app_user_id = NULLIF($2, '')::uuid
				)
			), false) AS profile_blocked_viewer
		FROM users u
		LEFT JOIN profiles p ON p.user_id = u.id
		WHERE lower(u.username) = lower($1)
		  AND u.account_status = 'active'
		LIMIT 1
	`

	var (
		userID pgtype.UUID
		result ProfileView
	)
	err := r.pool.QueryRow(ctx, q, username, viewerUserID).Scan(
		&userID,
		&result.Username,
		&result.DisplayName,
		&result.Bio,
		&result.AvatarURL,
		&result.LocationText,
		&result.CreatedAt,
		&result.PostsCount,
		&result.FollowersCount,
		&result.FollowingCount,
		&result.IsFollowing,
		&result.IsBlocked,
		&result.HasBlocked,
	)
	if err != nil {
		return ProfileView{}, err
	}
	result.UserID = userID.String()
	return result, nil
}

func (r *Repo) ListProfileBucketListByUsername(ctx context.Context, username string, limit int32) ([]ProfileBucketListItem, error) {
	const q = `
		SELECT
			s.id AS site_id,
			s.slug AS site_slug,
			s.name AS site_name,
			s.area AS site_area,
			ss.created_at AS pinned_at,
			EXISTS (
				SELECT 1
				FROM dive_site_updates d
				WHERE d.author_app_user_id = u.id
				  AND d.dive_site_id = s.id
				  AND d.state = 'active'
			) AS has_dived
		FROM users u
		JOIN dive_site_saves ss ON ss.app_user_id = u.id
		JOIN dive_sites s ON s.id = ss.dive_site_id
		WHERE lower(u.username) = lower($1)
		  AND u.account_status = 'active'
		  AND s.moderation_state = 'approved'
		ORDER BY ss.created_at DESC, s.id DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, q, username, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]ProfileBucketListItem, 0)
	for rows.Next() {
		var (
			siteID   pgtype.UUID
			pinnedAt pgtype.Timestamptz
			item     ProfileBucketListItem
		)
		if err := rows.Scan(
			&siteID,
			&item.SiteSlug,
			&item.SiteName,
			&item.SiteArea,
			&pinnedAt,
			&item.HasDived,
		); err != nil {
			return nil, err
		}
		item.SiteID = siteID.String()
		item.PinnedAt = pinnedAt.Time.UTC().Format(time.RFC3339)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func (r *Repo) ListProfileDivingByUsername(ctx context.Context, username, viewerUserID string) (ProfileDiving, error) {
	const presencesQuery = `
		WITH viewer AS (
			SELECT NULLIF($2, '')::uuid AS id
		)
		SELECT
			dp.id,
			s.id AS dive_site_id,
			s.slug AS dive_site_slug,
			s.name AS dive_site_name,
			s.area AS dive_site_area,
			dp.presence_type,
			dp.start_at,
			dp.end_at,
			dp.visibility,
			dp.contact_enabled,
			(
				dp.contact_enabled
				AND viewer.id IS NOT NULL
				AND viewer.id <> u.id
			) AS viewer_can_contact,
			COALESCE(dp.note, '') AS note,
			dp.created_at
		FROM users u
		CROSS JOIN viewer
		JOIN dive_presences dp ON dp.user_id = u.id
		JOIN dive_sites s ON s.id = dp.dive_site_id
		WHERE lower(u.username) = lower($1)
		  AND u.account_status = 'active'
		  AND dp.status = 'active'
		  AND (dp.end_at IS NULL OR dp.end_at > NOW())
		  AND s.moderation_state = 'approved'
		  AND (
		    dp.visibility = 'public'
		    OR (dp.visibility = 'members' AND viewer.id IS NOT NULL)
		    OR (dp.visibility = 'private' AND viewer.id = u.id)
		  )
		  AND (
		    viewer.id IS NULL
		    OR viewer.id = u.id
		    OR NOT EXISTS (
		      SELECT 1
		      FROM user_blocks ub
		      WHERE (ub.blocker_app_user_id = viewer.id AND ub.blocked_app_user_id = u.id)
		         OR (ub.blocker_app_user_id = u.id AND ub.blocked_app_user_id = viewer.id)
		    )
		  )
		ORDER BY dp.start_at ASC NULLS LAST, dp.created_at DESC, dp.id DESC
		LIMIT 50
	`

	presenceRows, err := r.pool.Query(ctx, presencesQuery, username, viewerUserID)
	if err != nil {
		return ProfileDiving{}, err
	}
	defer presenceRows.Close()

	presences := make([]ProfileDivePresence, 0)
	for presenceRows.Next() {
		var (
			id        pgtype.UUID
			siteID    pgtype.UUID
			startAt   pgtype.Timestamptz
			endAt     pgtype.Timestamptz
			createdAt pgtype.Timestamptz
			item      ProfileDivePresence
		)
		if err := presenceRows.Scan(
			&id,
			&siteID,
			&item.DiveSiteSlug,
			&item.DiveSiteName,
			&item.DiveSiteArea,
			&item.PresenceType,
			&startAt,
			&endAt,
			&item.Visibility,
			&item.ContactEnabled,
			&item.ViewerCanContact,
			&item.Note,
			&createdAt,
		); err != nil {
			return ProfileDiving{}, err
		}
		item.ID = id.String()
		item.DiveSiteID = siteID.String()
		if startAt.Valid {
			value := startAt.Time.UTC()
			item.StartAt = &value
		}
		if endAt.Valid {
			value := endAt.Time.UTC()
			item.EndAt = &value
		}
		item.CreatedAt = createdAt.Time.UTC()
		presences = append(presences, item)
	}
	if err := presenceRows.Err(); err != nil {
		return ProfileDiving{}, err
	}

	const affinitiesQuery = `
		WITH viewer AS (
			SELECT NULLIF($2, '')::uuid AS id
		)
		SELECT
			a.id,
			s.id AS dive_site_id,
			s.slug AS dive_site_slug,
			s.name AS dive_site_name,
			s.area AS dive_site_area,
			a.relationship,
			a.visibility,
			a.contact_enabled,
			(
				a.contact_enabled
				AND viewer.id IS NOT NULL
				AND viewer.id <> u.id
			) AS viewer_can_contact,
			COALESCE(a.note, '') AS note,
			a.created_at,
			a.updated_at
		FROM users u
		CROSS JOIN viewer
		JOIN user_dive_site_affinities a ON a.user_id = u.id
		JOIN dive_sites s ON s.id = a.dive_site_id
		WHERE lower(u.username) = lower($1)
		  AND u.account_status = 'active'
		  AND s.moderation_state = 'approved'
		  AND (
		    a.visibility = 'public'
		    OR (a.visibility = 'members' AND viewer.id IS NOT NULL)
		    OR (a.visibility = 'private' AND viewer.id = u.id)
		  )
		  AND (
		    viewer.id IS NULL
		    OR viewer.id = u.id
		    OR NOT EXISTS (
		      SELECT 1
		      FROM user_blocks ub
		      WHERE (ub.blocker_app_user_id = viewer.id AND ub.blocked_app_user_id = u.id)
		         OR (ub.blocker_app_user_id = u.id AND ub.blocked_app_user_id = viewer.id)
		    )
		  )
		ORDER BY a.relationship, a.updated_at DESC, a.id DESC
		LIMIT 50
	`

	affinityRows, err := r.pool.Query(ctx, affinitiesQuery, username, viewerUserID)
	if err != nil {
		return ProfileDiving{}, err
	}
	defer affinityRows.Close()

	affinities := make([]ProfileDiveSiteAffinity, 0)
	for affinityRows.Next() {
		var (
			id        pgtype.UUID
			siteID    pgtype.UUID
			createdAt pgtype.Timestamptz
			updatedAt pgtype.Timestamptz
			item      ProfileDiveSiteAffinity
		)
		if err := affinityRows.Scan(
			&id,
			&siteID,
			&item.DiveSiteSlug,
			&item.DiveSiteName,
			&item.DiveSiteArea,
			&item.Relationship,
			&item.Visibility,
			&item.ContactEnabled,
			&item.ViewerCanContact,
			&item.Note,
			&createdAt,
			&updatedAt,
		); err != nil {
			return ProfileDiving{}, err
		}
		item.ID = id.String()
		item.DiveSiteID = siteID.String()
		item.CreatedAt = createdAt.Time.UTC()
		item.UpdatedAt = updatedAt.Time.UTC()
		affinities = append(affinities, item)
	}
	if err := affinityRows.Err(); err != nil {
		return ProfileDiving{}, err
	}

	return ProfileDiving{Presences: presences, Affinities: affinities}, nil
}

func (r *Repo) GetProfileDiveMapByUsername(ctx context.Context, username, viewerUserID string) (ProfileDiveMap, error) {
	const q = `
		WITH viewer AS (
			SELECT NULLIF($2, '')::uuid AS id
		),
		visible_markers AS (
			SELECT
				uds.*,
				s.slug AS dive_site_slug,
				s.name AS dive_site_name,
				s.area AS dive_site_area,
				s.latitude,
				s.longitude
			FROM users u
			CROSS JOIN viewer
			JOIN user_dive_sites uds ON uds.user_id = u.id
			JOIN dive_sites s ON s.id = uds.dive_site_id
			WHERE lower(u.username) = lower($1)
			  AND u.account_status = 'active'
			  AND s.moderation_state = 'approved'
			  AND (
			    uds.visibility = 'public'
			    OR (uds.visibility = 'members' AND viewer.id IS NOT NULL)
			    OR (uds.visibility = 'private' AND viewer.id = u.id)
			  )
			  AND (
			    viewer.id IS NULL
			    OR viewer.id = u.id
			    OR NOT EXISTS (
			      SELECT 1
			      FROM user_blocks ub
			      WHERE (ub.blocker_app_user_id = viewer.id AND ub.blocked_app_user_id = u.id)
			         OR (ub.blocker_app_user_id = u.id AND ub.blocked_app_user_id = viewer.id)
			    )
			  )
		)
		SELECT
			COUNT(*) OVER ()::bigint AS visited_site_count,
			user_id,
			dive_site_id,
			dive_site_slug,
			dive_site_name,
			dive_site_area,
			latitude,
			longitude,
			first_post_id,
			first_visited_at,
			last_post_id,
			last_visited_at,
			media_post_count,
			visibility,
			created_at,
			updated_at
		FROM visible_markers
		ORDER BY updated_at DESC, dive_site_id
		LIMIT 500
	`
	rows, err := r.pool.Query(ctx, q, username, viewerUserID)
	if err != nil {
		return ProfileDiveMap{}, err
	}
	defer rows.Close()

	result := ProfileDiveMap{Markers: []ProfileDiveMapMarker{}}
	for rows.Next() {
		var visitedSiteCount int64
		marker, err := scanDiveMapMarker(rows.Scan, &visitedSiteCount)
		if err != nil {
			return ProfileDiveMap{}, err
		}
		result.VisitedSiteCount = visitedSiteCount
		result.Markers = append(result.Markers, marker)
	}
	if err := rows.Err(); err != nil {
		return ProfileDiveMap{}, err
	}
	return result, nil
}

func (r *Repo) GetProfileDiveMapSiteByUsername(ctx context.Context, username, diveSiteID, viewerUserID string) (ProfileDiveMapSiteDetail, error) {
	const markerQuery = `
		WITH viewer AS (
			SELECT NULLIF($3, '')::uuid AS id
		)
		SELECT
			1::bigint AS visited_site_count,
			uds.user_id,
			uds.dive_site_id,
			s.slug AS dive_site_slug,
			s.name AS dive_site_name,
			s.area AS dive_site_area,
			s.latitude,
			s.longitude,
			uds.first_post_id,
			uds.first_visited_at,
			uds.last_post_id,
			uds.last_visited_at,
			uds.media_post_count,
			uds.visibility,
			uds.created_at,
			uds.updated_at
		FROM users u
		CROSS JOIN viewer
		JOIN user_dive_sites uds ON uds.user_id = u.id
		JOIN dive_sites s ON s.id = uds.dive_site_id
		WHERE lower(u.username) = lower($1)
		  AND u.account_status = 'active'
		  AND uds.dive_site_id = $2
		  AND s.moderation_state = 'approved'
		  AND (
		    uds.visibility = 'public'
		    OR (uds.visibility = 'members' AND viewer.id IS NOT NULL)
		    OR (uds.visibility = 'private' AND viewer.id = u.id)
		  )
		  AND (
		    viewer.id IS NULL
		    OR viewer.id = u.id
		    OR NOT EXISTS (
		      SELECT 1
		      FROM user_blocks ub
		      WHERE (ub.blocker_app_user_id = viewer.id AND ub.blocked_app_user_id = u.id)
		         OR (ub.blocker_app_user_id = u.id AND ub.blocked_app_user_id = viewer.id)
		    )
		  )
	`
	var ignoredCount int64
	marker, err := scanDiveMapMarker(func(dest ...any) error {
		return r.pool.QueryRow(ctx, markerQuery, username, toUUID(diveSiteID), viewerUserID).Scan(dest...)
	}, &ignoredCount)
	if err != nil {
		return ProfileDiveMapSiteDetail{}, err
	}

	const mediaQuery = `
		SELECT
			p.id AS post_id,
			mi.id AS media_item_id,
			mi.media_object_id,
			mi.type,
			mi.storage_key,
			mi.mime_type,
			mi.width,
			mi.height,
			COALESCE(mi.caption, p.post_caption, '') AS caption,
			mi.created_at
		FROM media_posts p
		JOIN media_items mi ON mi.post_id = p.id
		JOIN dive_sites s ON s.id = p.dive_site_id
		WHERE p.author_app_user_id = $1
		  AND p.dive_site_id = $2
		  AND p.deleted_at IS NULL
		  AND s.moderation_state = 'approved'
		  AND mi.author_app_user_id = p.author_app_user_id
		  AND mi.dive_site_id = p.dive_site_id
		  AND mi.status = 'active'
		  AND mi.processing_status = 'ready'
		  AND mi.moderation_status = 'approved'
		  AND mi.deleted_at IS NULL
		ORDER BY mi.created_at DESC, mi.id DESC
		LIMIT 120
	`
	rows, err := r.pool.Query(ctx, mediaQuery, toUUID(marker.UserID), toUUID(marker.DiveSiteID))
	if err != nil {
		return ProfileDiveMapSiteDetail{}, err
	}
	defer rows.Close()

	media := make([]ProfileDiveMapProofMedia, 0)
	for rows.Next() {
		var (
			postID    pgtype.UUID
			itemID    pgtype.UUID
			objectID  pgtype.UUID
			createdAt pgtype.Timestamptz
			item      ProfileDiveMapProofMedia
		)
		if err := rows.Scan(
			&postID,
			&itemID,
			&objectID,
			&item.Type,
			&item.StorageKey,
			&item.MimeType,
			&item.Width,
			&item.Height,
			&item.Caption,
			&createdAt,
		); err != nil {
			return ProfileDiveMapSiteDetail{}, err
		}
		item.PostID = postID.String()
		item.MediaItemID = itemID.String()
		item.MediaObjectID = objectID.String()
		item.CreatedAt = createdAt.Time.UTC()
		media = append(media, item)
	}
	if err := rows.Err(); err != nil {
		return ProfileDiveMapSiteDetail{}, err
	}

	const memoriesQuery = `
		WITH viewer AS (
			SELECT NULLIF($3, '')::uuid AS id
		)
		SELECT
			dm.id,
			dm.author_user_id,
			dm.dive_site_id,
			dm.title,
			dm.body,
			COALESCE((
				SELECT array_agg(dmm.media_id::text ORDER BY dmm.sort_order ASC, dmm.id ASC)
				FROM dive_memory_media dmm
				WHERE dmm.memory_id = dm.id
			), '{}'::text[]) AS media_ids,
			dm.visibility,
			dm.occurred_at,
			dm.created_at,
			dm.updated_at
		FROM dive_memories dm
		CROSS JOIN viewer
		WHERE dm.dive_site_id = $2
		  AND dm.deleted_at IS NULL
		  AND EXISTS (
		    SELECT 1
		    FROM user_dive_sites uds
		    WHERE uds.user_id = $1
		      AND uds.dive_site_id = dm.dive_site_id
		  )
		  AND (
		    dm.author_user_id = $1
		    OR EXISTS (
		      SELECT 1
		      FROM dive_memory_tagged_users dmtu
		      WHERE dmtu.memory_id = dm.id
		        AND dmtu.tagged_user_id = $1
		        AND dmtu.status = 'accepted'
		    )
		  )
		  AND (
		    viewer.id IS NULL
		    OR viewer.id = dm.author_user_id
		    OR NOT EXISTS (
		      SELECT 1
		      FROM user_blocks ub
		      WHERE (ub.blocker_app_user_id = viewer.id AND ub.blocked_app_user_id = dm.author_user_id)
		         OR (ub.blocker_app_user_id = dm.author_user_id AND ub.blocked_app_user_id = viewer.id)
		    )
		  )
		  AND (
		    dm.visibility = 'public'
		    OR (viewer.id = dm.author_user_id AND dm.visibility IN ('private', 'followers', 'tagged'))
		    OR (
		      dm.visibility = 'followers'
		      AND (
		        viewer.id = dm.author_user_id
		        OR EXISTS (
		          SELECT 1
		          FROM saved_users su
		          WHERE su.viewer_app_user_id = viewer.id
		            AND su.saved_app_user_id = dm.author_user_id
		        )
		      )
		    )
		    OR (
		      dm.visibility = 'tagged'
		      AND (
		        viewer.id = dm.author_user_id
		        OR EXISTS (
		          SELECT 1
		          FROM dive_memory_tagged_users dmtu
		          WHERE dmtu.memory_id = dm.id
		            AND dmtu.tagged_user_id = viewer.id
		            AND dmtu.status = 'accepted'
		        )
		      )
		    )
		  )
		ORDER BY dm.occurred_at DESC, dm.id DESC
		LIMIT 20
	`
	memoryRows, err := r.pool.Query(ctx, memoriesQuery, toUUID(marker.UserID), toUUID(marker.DiveSiteID), viewerUserID)
	if err != nil {
		return ProfileDiveMapSiteDetail{}, err
	}
	defer memoryRows.Close()

	memories := make([]ProfileDiveMapMemory, 0)
	for memoryRows.Next() {
		var (
			id           pgtype.UUID
			authorUserID pgtype.UUID
			siteID       pgtype.UUID
			occurredAt   pgtype.Timestamptz
			createdAt    pgtype.Timestamptz
			updatedAt    pgtype.Timestamptz
			item         ProfileDiveMapMemory
		)
		if err := memoryRows.Scan(
			&id,
			&authorUserID,
			&siteID,
			&item.Title,
			&item.Body,
			&item.MediaIDs,
			&item.Visibility,
			&occurredAt,
			&createdAt,
			&updatedAt,
		); err != nil {
			return ProfileDiveMapSiteDetail{}, err
		}
		item.ID = id.String()
		item.AuthorUserID = authorUserID.String()
		item.DiveSiteID = siteID.String()
		item.OccurredAt = occurredAt.Time.UTC()
		item.CreatedAt = createdAt.Time.UTC()
		item.UpdatedAt = updatedAt.Time.UTC()
		memories = append(memories, item)
	}
	if err := memoryRows.Err(); err != nil {
		return ProfileDiveMapSiteDetail{}, err
	}
	return ProfileDiveMapSiteDetail{Marker: marker, Media: media, Memories: memories}, nil
}

func (r *Repo) ListBadgeTemplates(ctx context.Context) ([]BadgeTemplate, error) {
	const q = `
		SELECT
			id,
			slug,
			name,
			category,
			value_type,
			COALESCE(unit, ''),
			COALESCE(icon, ''),
			COALESCE(description, ''),
			is_system,
			display_order,
			rarity,
			is_public,
			is_repeatable,
			source_module,
			metadata_json
		FROM badge_templates
		WHERE is_public = TRUE
		ORDER BY
			CASE category
				WHEN 'personal_best' THEN 1
				WHEN 'certification' THEN 2
				WHEN 'experience' THEN 3
				WHEN 'auto_stat' THEN 4
				ELSE 5
			END,
			display_order,
			name
	`
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]BadgeTemplate, 0)
	for rows.Next() {
		var (
			id          pgtype.UUID
			metadataRaw []byte
		)
		var item BadgeTemplate
		if err := rows.Scan(
			&id,
			&item.Slug,
			&item.Name,
			&item.Category,
			&item.ValueType,
			&item.Unit,
			&item.Icon,
			&item.Description,
			&item.IsSystem,
			&item.DisplayOrder,
			&item.Rarity,
			&item.IsPublic,
			&item.IsRepeatable,
			&item.SourceModule,
			&metadataRaw,
		); err != nil {
			return nil, err
		}
		item.ID = id.String()
		item.MetadataJSON = decodeMetadata(metadataRaw)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) GetBadgeTemplate(ctx context.Context, templateID string) (BadgeTemplate, error) {
	const q = `
		SELECT
			id,
			slug,
			name,
			category,
			value_type,
			COALESCE(unit, ''),
			COALESCE(icon, ''),
			COALESCE(description, ''),
			is_system,
			display_order,
			rarity,
			is_public,
			is_repeatable,
			source_module,
			metadata_json
		FROM badge_templates
		WHERE id = $1
	`
	var (
		id          pgtype.UUID
		metadataRaw []byte
	)
	var item BadgeTemplate
	err := r.pool.QueryRow(ctx, q, toUUID(templateID)).Scan(
		&id,
		&item.Slug,
		&item.Name,
		&item.Category,
		&item.ValueType,
		&item.Unit,
		&item.Icon,
		&item.Description,
		&item.IsSystem,
		&item.DisplayOrder,
		&item.Rarity,
		&item.IsPublic,
		&item.IsRepeatable,
		&item.SourceModule,
		&metadataRaw,
	)
	if err != nil {
		return BadgeTemplate{}, err
	}
	item.ID = id.String()
	item.MetadataJSON = decodeMetadata(metadataRaw)
	return item, nil
}

func (r *Repo) ListUserBadgesByUserID(ctx context.Context, userID string) ([]UserBadge, error) {
	return r.listUserBadges(ctx, "u.id = $1", toUUID(userID))
}

func (r *Repo) ListProfileBadgesByUsername(ctx context.Context, username string) ([]UserBadge, error) {
	return r.listUserBadges(ctx, "lower(u.username) = lower($1) AND ub.visibility = 'public'", username)
}

func (r *Repo) listUserBadges(ctx context.Context, userPredicate string, arg any) ([]UserBadge, error) {
	q := `
		SELECT
			ub.id,
			ub.user_id,
			bt.id,
			bt.slug,
			bt.name,
			bt.category,
			bt.value_type,
			COALESCE(bt.unit, ''),
			COALESCE(bt.icon, ''),
			COALESCE(bt.description, ''),
			bt.is_system,
			bt.display_order,
			bt.rarity,
			bt.is_public,
			bt.is_repeatable,
			bt.source_module,
			bt.metadata_json,
			COALESCE(ub.value_text, ''),
			ub.value_number,
			ub.value_minutes,
			ub.value_seconds,
			COALESCE(ub.reference_label, ''),
			COALESCE(ub.reference_value, ''),
			ub.proof_media_id,
			COALESCE(mo.object_key, ''),
			ub.verification_status,
			ub.verified_at,
			ub.verified_by,
			ub.source_type,
			COALESCE(ub.source_id, ''),
			ub.earned_at,
			ub.visibility,
			ub.display_order,
			ub.metadata_json,
			ub.created_at,
			ub.updated_at
		FROM users u
		JOIN user_badges ub ON ub.user_id = u.id
		JOIN badge_templates bt ON bt.id = ub.badge_template_id
		LEFT JOIN media_objects mo ON mo.id = ub.proof_media_id AND mo.state = 'active'
		WHERE ` + userPredicate + `
		  AND u.account_status = 'active'
		ORDER BY
			CASE bt.category
				WHEN 'personal_best' THEN 1
				WHEN 'certification' THEN 2
				WHEN 'experience' THEN 3
				ELSE 4
			END,
			ub.display_order,
			bt.display_order,
			ub.created_at DESC,
			ub.id DESC
	`
	rows, err := r.pool.Query(ctx, q, arg)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]UserBadge, 0)
	for rows.Next() {
		item, err := scanUserBadge(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) CreateUserBadge(ctx context.Context, input UpsertUserBadgeInput) (UserBadge, error) {
	const q = `
		INSERT INTO user_badges (
			user_id,
			badge_template_id,
			value_text,
			value_number,
			value_minutes,
			value_seconds,
			reference_label,
			reference_value,
			proof_media_id,
			source_type,
			source_id,
			earned_at,
			visibility,
			display_order,
			metadata_json
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id
	`
	metadataJSON, err := json.Marshal(input.MetadataJSON)
	if err != nil {
		return UserBadge{}, err
	}
	var id pgtype.UUID
	if err := r.pool.QueryRow(ctx, q,
		toUUID(input.UserID),
		toUUID(input.TemplateID),
		input.ValueText,
		numericValue(input.ValueNumber),
		input.ValueMinutes,
		input.ValueSeconds,
		input.ReferenceLabel,
		input.ReferenceValue,
		uuidPtr(input.ProofMediaID),
		defaultString(input.SourceType, "manual"),
		input.SourceID,
		input.EarnedAt,
		defaultString(input.Visibility, "public"),
		input.DisplayOrder,
		metadataJSON,
	).Scan(&id); err != nil {
		return UserBadge{}, err
	}
	return r.GetUserBadgeByID(ctx, id.String(), input.UserID)
}

func (r *Repo) UpdateUserBadge(ctx context.Context, input UpsertUserBadgeInput) (UserBadge, error) {
	const q = `
		UPDATE user_badges
		SET
			badge_template_id = $3,
			value_text = $4,
			value_number = $5,
			value_minutes = $6,
			value_seconds = $7,
			reference_label = $8,
			reference_value = $9,
			proof_media_id = $10,
			source_type = $11,
			source_id = $12,
			earned_at = COALESCE($13, earned_at),
			visibility = $14,
			display_order = $15,
			metadata_json = $16,
			verification_status = CASE WHEN verification_status = 'verified' THEN 'unverified' ELSE verification_status END,
			verified_at = CASE WHEN verification_status = 'verified' THEN NULL ELSE verified_at END,
			verified_by = CASE WHEN verification_status = 'verified' THEN NULL ELSE verified_by END,
			updated_at = NOW()
		WHERE id = $1
		  AND user_id = $2
		RETURNING id
	`
	metadataJSON, err := json.Marshal(input.MetadataJSON)
	if err != nil {
		return UserBadge{}, err
	}
	var id pgtype.UUID
	if err := r.pool.QueryRow(ctx, q,
		toUUID(input.ID),
		toUUID(input.UserID),
		toUUID(input.TemplateID),
		input.ValueText,
		numericValue(input.ValueNumber),
		input.ValueMinutes,
		input.ValueSeconds,
		input.ReferenceLabel,
		input.ReferenceValue,
		uuidPtr(input.ProofMediaID),
		defaultString(input.SourceType, "manual"),
		input.SourceID,
		input.EarnedAt,
		defaultString(input.Visibility, "public"),
		input.DisplayOrder,
		metadataJSON,
	).Scan(&id); err != nil {
		return UserBadge{}, err
	}
	return r.GetUserBadgeByID(ctx, id.String(), input.UserID)
}

func (r *Repo) DeleteUserBadge(ctx context.Context, badgeID, userID string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM user_badges WHERE id = $1 AND user_id = $2`, toUUID(badgeID), toUUID(userID))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *Repo) GetUserBadgeByID(ctx context.Context, badgeID, userID string) (UserBadge, error) {
	const q = `
		SELECT
			ub.id,
			ub.user_id,
			bt.id,
			bt.slug,
			bt.name,
			bt.category,
			bt.value_type,
			COALESCE(bt.unit, ''),
			COALESCE(bt.icon, ''),
			COALESCE(bt.description, ''),
			bt.is_system,
			bt.display_order,
			bt.rarity,
			bt.is_public,
			bt.is_repeatable,
			bt.source_module,
			bt.metadata_json,
			COALESCE(ub.value_text, ''),
			ub.value_number,
			ub.value_minutes,
			ub.value_seconds,
			COALESCE(ub.reference_label, ''),
			COALESCE(ub.reference_value, ''),
			ub.proof_media_id,
			COALESCE(mo.object_key, ''),
			ub.verification_status,
			ub.verified_at,
			ub.verified_by,
			ub.source_type,
			COALESCE(ub.source_id, ''),
			ub.earned_at,
			ub.visibility,
			ub.display_order,
			ub.metadata_json,
			ub.created_at,
			ub.updated_at
		FROM user_badges ub
		JOIN badge_templates bt ON bt.id = ub.badge_template_id
		LEFT JOIN media_objects mo ON mo.id = ub.proof_media_id AND mo.state = 'active'
		WHERE ub.id = $1
		  AND ub.user_id = $2
	`
	row := r.pool.QueryRow(ctx, q, toUUID(badgeID), toUUID(userID))
	return scanUserBadge(row)
}

func (r *Repo) CountDiveSitesVisitedByUsername(ctx context.Context, username string) (int64, error) {
	return r.countDiveSitesVisitedFromUserDiveSitesByUsername(ctx, username)
}

func (r *Repo) CountDiveSitesVisitedByUserID(ctx context.Context, userID string) (int64, error) {
	return r.countDiveSitesVisitedFromUserDiveSitesByUserID(ctx, userID)
}

func (r *Repo) countDiveSitesVisitedFromUserDiveSitesByUsername(ctx context.Context, username string) (int64, error) {
	const q = `
		SELECT COUNT(DISTINCT s.id)::bigint
		FROM users u
		JOIN user_dive_sites uds ON uds.user_id = u.id
		JOIN dive_sites s ON s.id = uds.dive_site_id
		WHERE lower(u.username) = lower($1)
		  AND u.account_status = 'active'
		  AND s.moderation_state = 'approved'
	`
	var count int64
	if err := r.pool.QueryRow(ctx, q, username).Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

func (r *Repo) countDiveSitesVisitedFromUserDiveSitesByUserID(ctx context.Context, userID string) (int64, error) {
	const q = `
		SELECT COUNT(DISTINCT s.id)::bigint
		FROM user_dive_sites uds
		JOIN dive_sites s ON s.id = uds.dive_site_id
		WHERE uds.user_id = $1
		  AND s.moderation_state = 'approved'
	`
	var count int64
	if err := r.pool.QueryRow(ctx, q, toUUID(userID)).Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

type scanFunc func(dest ...any) error

func scanDiveMapMarker(scan scanFunc, visitedSiteCount *int64) (ProfileDiveMapMarker, error) {
	var (
		userID         pgtype.UUID
		siteID         pgtype.UUID
		firstPostID    pgtype.UUID
		firstVisitedAt pgtype.Timestamptz
		lastPostID     pgtype.UUID
		lastVisitedAt  pgtype.Timestamptz
		latitude       pgtype.Float8
		longitude      pgtype.Float8
		unlockedAt     pgtype.Timestamptz
		updatedAt      pgtype.Timestamptz
		marker         ProfileDiveMapMarker
	)
	if err := scan(
		visitedSiteCount,
		&userID,
		&siteID,
		&marker.DiveSiteSlug,
		&marker.DiveSiteName,
		&marker.DiveSiteArea,
		&latitude,
		&longitude,
		&firstPostID,
		&firstVisitedAt,
		&lastPostID,
		&lastVisitedAt,
		&marker.MediaPostCount,
		&marker.Visibility,
		&unlockedAt,
		&updatedAt,
	); err != nil {
		return ProfileDiveMapMarker{}, err
	}
	marker.UserID = userID.String()
	marker.DiveSiteID = siteID.String()
	if latitude.Valid {
		value := latitude.Float64
		marker.Latitude = &value
	}
	if longitude.Valid {
		value := longitude.Float64
		marker.Longitude = &value
	}
	marker.FirstPostID = firstPostID.String()
	marker.FirstVisitedAt = firstVisitedAt.Time.UTC()
	marker.LastPostID = lastPostID.String()
	marker.LastVisitedAt = lastVisitedAt.Time.UTC()
	marker.UnlockedAt = unlockedAt.Time.UTC()
	marker.LastProofAddedAt = updatedAt.Time.UTC()
	return marker, nil
}

func (r *Repo) UserOwnsProofMedia(ctx context.Context, userID, mediaID string) (bool, error) {
	const q = `
		SELECT EXISTS (
			SELECT 1
			FROM media_objects
			WHERE id = $1
			  AND owner_app_user_id = $2
			  AND context_type = 'badge_proof'
			  AND state = 'active'
		)
	`
	var exists bool
	if err := r.pool.QueryRow(ctx, q, toUUID(mediaID), toUUID(userID)).Scan(&exists); err != nil {
		return false, err
	}
	return exists, nil
}

func IsNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

func toUUID(value string) pgtype.UUID {
	parsed, err := uuid.Parse(value)
	if err != nil {
		return pgtype.UUID{}
	}
	id := pgtype.UUID{Valid: true}
	copy(id.Bytes[:], parsed[:])
	return id
}

func decodeSocials(raw []byte) (map[string]string, error) {
	if len(raw) == 0 {
		return map[string]string{}, nil
	}
	result := map[string]string{}
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, err
	}
	return result, nil
}

func valueOrEmpty(input *string) string {
	if input == nil {
		return ""
	}
	return *input
}

func stringPtr(input string) *string {
	if input == "" {
		return nil
	}
	return &input
}

func anyString(input any) string {
	switch value := input.(type) {
	case nil:
		return ""
	case string:
		return value
	case []byte:
		return string(value)
	default:
		return ""
	}
}

type badgeScanner interface {
	Scan(dest ...any) error
}

func scanUserBadge(row badgeScanner) (UserBadge, error) {
	var (
		id                  pgtype.UUID
		userID              pgtype.UUID
		templateID          pgtype.UUID
		valueNumber         pgtype.Numeric
		valueMinutes        *int32
		valueSeconds        *int32
		proofMediaID        pgtype.UUID
		verifiedAt          pgtype.Timestamptz
		verifiedBy          pgtype.UUID
		earnedAt            pgtype.Timestamptz
		createdAt           pgtype.Timestamptz
		updatedAt           pgtype.Timestamptz
		templateMetadataRaw []byte
		badgeMetadataRaw    []byte
		item                UserBadge
	)
	if err := row.Scan(
		&id,
		&userID,
		&templateID,
		&item.Template.Slug,
		&item.Template.Name,
		&item.Template.Category,
		&item.Template.ValueType,
		&item.Template.Unit,
		&item.Template.Icon,
		&item.Template.Description,
		&item.Template.IsSystem,
		&item.Template.DisplayOrder,
		&item.Template.Rarity,
		&item.Template.IsPublic,
		&item.Template.IsRepeatable,
		&item.Template.SourceModule,
		&templateMetadataRaw,
		&item.ValueText,
		&valueNumber,
		&valueMinutes,
		&valueSeconds,
		&item.ReferenceLabel,
		&item.ReferenceValue,
		&proofMediaID,
		&item.ProofMediaObjectKey,
		&item.VerificationStatus,
		&verifiedAt,
		&verifiedBy,
		&item.SourceType,
		&item.SourceID,
		&earnedAt,
		&item.Visibility,
		&item.DisplayOrder,
		&badgeMetadataRaw,
		&createdAt,
		&updatedAt,
	); err != nil {
		return UserBadge{}, err
	}
	item.ID = id.String()
	item.UserID = userID.String()
	item.Template.ID = templateID.String()
	item.ValueNumber = numericPtr(valueNumber)
	item.ValueMinutes = valueMinutes
	item.ValueSeconds = valueSeconds
	if proofMediaID.Valid {
		item.ProofMediaID = proofMediaID.String()
	}
	if verifiedAt.Valid {
		value := verifiedAt.Time.UTC()
		item.VerifiedAt = &value
	}
	if verifiedBy.Valid {
		item.VerifiedBy = verifiedBy.String()
	}
	if earnedAt.Valid {
		value := earnedAt.Time.UTC()
		item.EarnedAt = &value
	}
	item.Template.MetadataJSON = decodeMetadata(templateMetadataRaw)
	item.MetadataJSON = decodeMetadata(badgeMetadataRaw)
	if createdAt.Valid {
		item.CreatedAt = createdAt.Time.UTC()
	}
	if updatedAt.Valid {
		item.UpdatedAt = updatedAt.Time.UTC()
	}
	return item, nil
}

func numericPtr(value pgtype.Numeric) *float64 {
	if !value.Valid {
		return nil
	}
	floatVal, err := value.Float64Value()
	if err != nil || !floatVal.Valid {
		return nil
	}
	result := floatVal.Float64
	return &result
}

func numericValue(value *float64) pgtype.Numeric {
	if value == nil {
		return pgtype.Numeric{}
	}
	var numeric pgtype.Numeric
	_ = numeric.Scan(*value)
	return numeric
}

func uuidPtr(value *string) pgtype.UUID {
	if value == nil || strings.TrimSpace(*value) == "" {
		return pgtype.UUID{}
	}
	return toUUID(strings.TrimSpace(*value))
}

func decodeMetadata(raw []byte) map[string]any {
	if len(raw) == 0 {
		return map[string]any{}
	}
	result := map[string]any{}
	if err := json.Unmarshal(raw, &result); err != nil {
		return map[string]any{}
	}
	return result
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}
