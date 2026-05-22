package repo

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	pool *pgxpool.Pool
}

type ListInput struct {
	Page  int
	Limit int
}

type Profile struct {
	UserID        string
	Username      string
	DisplayName   string
	GlobalRole    string
	AccountStatus string
	EmailVerified bool
	PhoneVerified bool
	AvatarURL     string
	HomeArea      string
	CertLevel     string
	BuddyCount    int64
	ReportCount   int64
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type DiveSite struct {
	ID                 string
	Slug               string
	Name               string
	Area               string
	ModerationState    string
	VerificationStatus string
	EntryDifficulty    string
	UpdateCount        int64
	LikeCount          int64
	CreatedAt          time.Time
	UpdatedAt          time.Time
	LastUpdatedAt      time.Time
}

type Group struct {
	ID          string
	Name        string
	Slug        string
	Visibility  string
	Status      string
	JoinPolicy  string
	MemberCount int64
	EventCount  int64
	PostCount   int64
	CreatedBy   string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type UpdateGroupInput struct {
	Name       *string
	Visibility *string
	Status     *string
	JoinPolicy *string
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool}
}

func IsNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

func (r *Repo) ListProfiles(ctx context.Context, input ListInput) ([]Profile, int, error) {
	const q = `
		WITH buddy_counts AS (
			SELECT app_user_id, COUNT(*)::bigint AS buddy_count
			FROM (
				SELECT app_user_id_a AS app_user_id FROM buddies
				UNION ALL
				SELECT app_user_id_b AS app_user_id FROM buddies
			) pairs
			GROUP BY app_user_id
		),
		report_counts AS (
			SELECT target_app_user_id AS user_id, COUNT(*)::bigint AS report_count
			FROM reports
			WHERE target_app_user_id IS NOT NULL
			GROUP BY target_app_user_id
		)
		SELECT
			u.id,
			u.username,
			u.display_name,
			u.global_role,
			u.account_status,
			u.email_verified,
			u.phone_verified,
			COALESCE(p.avatar_url, '') AS avatar_url,
			COALESCE(p.home_area, '') AS home_area,
			COALESCE(p.cert_level, '') AS cert_level,
			COALESCE(bc.buddy_count, 0)::bigint AS buddy_count,
			COALESCE(rc.report_count, 0)::bigint AS report_count,
			u.created_at,
			COALESCE(p.updated_at, u.created_at) AS updated_at,
			COUNT(*) OVER()::int AS total_count
		FROM users u
		LEFT JOIN profiles p ON p.user_id = u.id
		LEFT JOIN buddy_counts bc ON bc.app_user_id = u.id
		LEFT JOIN report_counts rc ON rc.user_id = u.id
		ORDER BY u.created_at DESC, u.id DESC
		OFFSET $1
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, q, offset(input), input.Limit)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]Profile, 0)
	total := 0
	for rows.Next() {
		var (
			id    pgtype.UUID
			item  Profile
			count int
		)
		if err := rows.Scan(
			&id,
			&item.Username,
			&item.DisplayName,
			&item.GlobalRole,
			&item.AccountStatus,
			&item.EmailVerified,
			&item.PhoneVerified,
			&item.AvatarURL,
			&item.HomeArea,
			&item.CertLevel,
			&item.BuddyCount,
			&item.ReportCount,
			&item.CreatedAt,
			&item.UpdatedAt,
			&count,
		); err != nil {
			return nil, 0, err
		}
		item.UserID = id.String()
		total = count
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *Repo) ListDiveSites(ctx context.Context, input ListInput) ([]DiveSite, int, error) {
	const q = `
		SELECT
			s.id,
			s.slug,
			s.name,
			s.area,
			s.moderation_state,
			s.verification_status,
			s.entry_difficulty,
			COALESCE(du.update_count, 0)::bigint AS update_count,
			COALESCE(dl.like_count, 0)::bigint AS like_count,
			s.created_at,
			s.updated_at,
			s.last_updated_at,
			COUNT(*) OVER()::int AS total_count
		FROM dive_sites s
		LEFT JOIN (
			SELECT dive_site_id, COUNT(*)::bigint AS update_count
			FROM dive_site_updates
			GROUP BY dive_site_id
		) du ON du.dive_site_id = s.id
		LEFT JOIN (
			SELECT dive_site_id, COUNT(*)::bigint AS like_count
			FROM dive_site_likes
			GROUP BY dive_site_id
		) dl ON dl.dive_site_id = s.id
		ORDER BY s.created_at DESC, s.id DESC
		OFFSET $1
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, q, offset(input), input.Limit)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]DiveSite, 0)
	total := 0
	for rows.Next() {
		var (
			id    pgtype.UUID
			item  DiveSite
			count int
		)
		if err := rows.Scan(
			&id,
			&item.Slug,
			&item.Name,
			&item.Area,
			&item.ModerationState,
			&item.VerificationStatus,
			&item.EntryDifficulty,
			&item.UpdateCount,
			&item.LikeCount,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.LastUpdatedAt,
			&count,
		); err != nil {
			return nil, 0, err
		}
		item.ID = id.String()
		total = count
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *Repo) ListGroups(ctx context.Context, input ListInput) ([]Group, int, error) {
	const q = `
		SELECT
			g.id,
			g.name,
			g.slug,
			g.visibility,
			g.status,
			g.join_policy,
			COALESCE((SELECT COUNT(*) FROM group_memberships m WHERE m.group_id = g.id AND m.status = 'active'), 0)::bigint AS member_count,
			COALESCE((SELECT COUNT(*) FROM events e WHERE e.group_id = g.id AND e.status = 'published'), 0)::bigint AS event_count,
			COALESCE((SELECT COUNT(*) FROM group_posts p WHERE p.group_id = g.id AND p.status = 'active'), 0)::bigint AS post_count,
			g.created_by,
			g.created_at,
			g.updated_at,
			COUNT(*) OVER()::int AS total_count
		FROM groups g
		ORDER BY g.created_at DESC, g.id DESC
		OFFSET $1
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, q, offset(input), input.Limit)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]Group, 0)
	total := 0
	for rows.Next() {
		var (
			id        pgtype.UUID
			createdBy pgtype.UUID
			item      Group
			count     int
		)
		if err := rows.Scan(
			&id,
			&item.Name,
			&item.Slug,
			&item.Visibility,
			&item.Status,
			&item.JoinPolicy,
			&item.MemberCount,
			&item.EventCount,
			&item.PostCount,
			&createdBy,
			&item.CreatedAt,
			&item.UpdatedAt,
			&count,
		); err != nil {
			return nil, 0, err
		}
		item.ID = id.String()
		if createdBy.Valid {
			item.CreatedBy = createdBy.String()
		}
		total = count
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *Repo) GetGroup(ctx context.Context, groupID string) (Group, error) {
	row := r.pool.QueryRow(ctx, adminGroupSelectSQL("WHERE g.id = $1::uuid"), groupID)
	return scanGroup(row)
}

func (r *Repo) UpdateGroup(ctx context.Context, groupID string, input UpdateGroupInput) (Group, error) {
	const q = `
		UPDATE groups g
		SET
			name = CASE WHEN $2::boolean THEN $3 ELSE name END,
			visibility = CASE WHEN $4::boolean THEN $5 ELSE visibility END,
			status = CASE WHEN $6::boolean THEN $7 ELSE status END,
			join_policy = CASE WHEN $8::boolean THEN $9 ELSE join_policy END,
			updated_at = NOW()
		WHERE g.id = $1::uuid
		RETURNING
			g.id,
			g.name,
			g.slug,
			g.visibility,
			g.status,
			g.join_policy,
			COALESCE((SELECT COUNT(*) FROM group_memberships m WHERE m.group_id = g.id AND m.status = 'active'), 0)::bigint AS member_count,
			COALESCE((SELECT COUNT(*) FROM events e WHERE e.group_id = g.id AND e.status = 'published'), 0)::bigint AS event_count,
			COALESCE((SELECT COUNT(*) FROM group_posts p WHERE p.group_id = g.id AND p.status = 'active'), 0)::bigint AS post_count,
			g.created_by,
			g.created_at,
			g.updated_at
	`
	row := r.pool.QueryRow(
		ctx,
		q,
		groupID,
		input.Name != nil,
		valueOrEmpty(input.Name),
		input.Visibility != nil,
		valueOrEmpty(input.Visibility),
		input.Status != nil,
		valueOrEmpty(input.Status),
		input.JoinPolicy != nil,
		valueOrEmpty(input.JoinPolicy),
	)
	return scanGroup(row)
}

func offset(input ListInput) int {
	page := input.Page
	if page < 1 {
		page = 1
	}
	return (page - 1) * input.Limit
}

type rowScanner interface {
	Scan(dest ...any) error
}

func adminGroupSelectSQL(where string) string {
	return `
		SELECT
			g.id,
			g.name,
			g.slug,
			g.visibility,
			g.status,
			g.join_policy,
			COALESCE((SELECT COUNT(*) FROM group_memberships m WHERE m.group_id = g.id AND m.status = 'active'), 0)::bigint AS member_count,
			COALESCE((SELECT COUNT(*) FROM events e WHERE e.group_id = g.id AND e.status = 'published'), 0)::bigint AS event_count,
			COALESCE((SELECT COUNT(*) FROM group_posts p WHERE p.group_id = g.id AND p.status = 'active'), 0)::bigint AS post_count,
			g.created_by,
			g.created_at,
			g.updated_at
		FROM groups g
		` + where
}

func scanGroup(row rowScanner) (Group, error) {
	var (
		id        pgtype.UUID
		createdBy pgtype.UUID
		item      Group
	)
	if err := row.Scan(
		&id,
		&item.Name,
		&item.Slug,
		&item.Visibility,
		&item.Status,
		&item.JoinPolicy,
		&item.MemberCount,
		&item.EventCount,
		&item.PostCount,
		&createdBy,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return Group{}, err
	}
	item.ID = id.String()
	if createdBy.Valid {
		item.CreatedBy = createdBy.String()
	}
	return item, nil
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
