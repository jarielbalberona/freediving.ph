package repo

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	pool *pgxpool.Pool
}

type Group struct {
	ID          string
	Name        string
	Slug        string
	Description string
	Visibility  string
	Status      string
	JoinPolicy  string
	Location    string
	MemberCount int
	EventCount  int
	PostCount   int
	CreatedBy   string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type GroupMember struct {
	GroupID     string
	UserID      string
	Role        string
	Status      string
	JoinedAt    *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
	Username    string
	DisplayName string
	AvatarURL   string
}

type GroupPost struct {
	ID              string
	GroupID         string
	AuthorUserID    string
	Title           string
	Content         string
	Status          string
	LikeCount       int64
	CommentCount    int64
	CreatedAt       time.Time
	UpdatedAt       time.Time
	AuthorName      string
	AuthorUsername  string
	AuthorAvatarURL string
}

type ListGroupsInput struct {
	ViewerUserID string
	Search       string
	Visibility   string
	Mine         bool
	Page         int
	Limit        int
}

type ListGroupMembersInput struct {
	GroupID string
	Page    int
	Limit   int
}

type ListGroupPostsInput struct {
	GroupID string
	Page    int
	Limit   int
}

type CreateGroupInput struct {
	Name        string
	Slug        string
	Description string
	Visibility  string
	JoinPolicy  string
	Location    string
	CreatedBy   string
}

type UpdateGroupInput struct {
	GroupID     string
	Name        *string
	Description *string
	Visibility  *string
	Status      *string
	JoinPolicy  *string
	Location    *string
}

type CreateGroupPostInput struct {
	GroupID      string
	AuthorUserID string
	Title        string
	Content      string
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool}
}

func (r *Repo) ListGroups(ctx context.Context, input ListGroupsInput) ([]Group, int, error) {
	where := []string{"g.status = 'active'"}
	args := []any{}
	idx := 1

	if input.Mine {
		if strings.TrimSpace(input.ViewerUserID) == "" {
			return []Group{}, 0, nil
		}
		args = append(args, input.ViewerUserID)
		where = append(where, fmt.Sprintf("EXISTS (SELECT 1 FROM group_memberships gm WHERE gm.group_id = g.id AND gm.user_id = $%d::uuid AND gm.status = 'active')", idx))
		idx++
	} else if strings.TrimSpace(input.ViewerUserID) == "" {
		where = append(where, "g.visibility = 'public'")
	} else {
		args = append(args, input.ViewerUserID)
		where = append(where, fmt.Sprintf("(g.visibility = 'public' OR EXISTS (SELECT 1 FROM group_memberships gm WHERE gm.group_id = g.id AND gm.user_id = $%d::uuid AND gm.status = 'active'))", idx))
		idx++
	}

	if value := strings.TrimSpace(input.Visibility); value != "" {
		args = append(args, value)
		where = append(where, fmt.Sprintf("g.visibility = $%d", idx))
		idx++
	}
	if value := strings.TrimSpace(input.Search); value != "" {
		args = append(args, "%"+strings.ToLower(value)+"%")
		where = append(where, fmt.Sprintf("(lower(g.name) LIKE $%d OR lower(coalesce(g.description, '')) LIKE $%d)", idx, idx))
		idx++
	}

	if input.Page < 1 {
		input.Page = 1
	}
	if input.Limit < 1 {
		input.Limit = 20
	}
	offset := (input.Page - 1) * input.Limit
	args = append(args, input.Limit, offset)
	limitArg := idx
	offsetArg := idx + 1

	q := fmt.Sprintf(`
		SELECT
			g.id::text,
			g.name,
			g.slug,
			coalesce(g.description, ''),
			g.visibility,
			g.status,
			g.join_policy,
			coalesce(g.location, ''),
			coalesce((SELECT COUNT(*) FROM group_memberships m WHERE m.group_id = g.id AND m.status = 'active'), 0)::int,
			coalesce((SELECT COUNT(*) FROM events e WHERE e.group_id = g.id AND e.status = 'published'), 0)::int,
			coalesce((SELECT COUNT(*) FROM group_posts p WHERE p.group_id = g.id AND p.status = 'active'), 0)::int,
			coalesce(g.created_by::text, ''),
			g.created_at,
			g.updated_at,
			COUNT(*) OVER()::int AS total_count
		FROM groups g
		WHERE %s
		ORDER BY g.created_at DESC, g.id DESC
		LIMIT $%d OFFSET $%d
	`, strings.Join(where, " AND "), limitArg, offsetArg)

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]Group, 0)
	total := 0
	for rows.Next() {
		var item Group
		if err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Slug,
			&item.Description,
			&item.Visibility,
			&item.Status,
			&item.JoinPolicy,
			&item.Location,
			&item.MemberCount,
			&item.EventCount,
			&item.PostCount,
			&item.CreatedBy,
			&item.CreatedAt,
			&item.UpdatedAt,
			&total,
		); err != nil {
			return nil, 0, err
		}
		item.CreatedAt = item.CreatedAt.UTC()
		item.UpdatedAt = item.UpdatedAt.UTC()
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *Repo) GetGroupByID(ctx context.Context, groupID string) (Group, error) {
	const q = `
		SELECT
			g.id::text,
			g.name,
			g.slug,
			coalesce(g.description, ''),
			g.visibility,
			g.status,
			g.join_policy,
			coalesce(g.location, ''),
			coalesce((SELECT COUNT(*) FROM group_memberships m WHERE m.group_id = g.id AND m.status = 'active'), 0)::int,
			coalesce((SELECT COUNT(*) FROM events e WHERE e.group_id = g.id AND e.status = 'published'), 0)::int,
			coalesce((SELECT COUNT(*) FROM group_posts p WHERE p.group_id = g.id AND p.status = 'active'), 0)::int,
			coalesce(g.created_by::text, ''),
			g.created_at,
			g.updated_at
		FROM groups g
		WHERE g.id = $1::uuid
	`
	var item Group
	if err := r.pool.QueryRow(ctx, q, groupID).Scan(
		&item.ID,
		&item.Name,
		&item.Slug,
		&item.Description,
		&item.Visibility,
		&item.Status,
		&item.JoinPolicy,
		&item.Location,
		&item.MemberCount,
		&item.EventCount,
		&item.PostCount,
		&item.CreatedBy,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return Group{}, err
	}
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	return item, nil
}

func (r *Repo) CreateGroup(ctx context.Context, input CreateGroupInput) (Group, error) {
	const q = `
		INSERT INTO groups (name, slug, description, visibility, status, join_policy, location, created_by)
		VALUES ($1, $2, $3, $4, 'active', $5, $6, $7::uuid)
		RETURNING id::text, name, slug, coalesce(description, ''), visibility, status, join_policy, coalesce(location, ''), coalesce(created_by::text, ''), created_at, updated_at
	`
	var item Group
	if err := r.pool.QueryRow(ctx, q,
		input.Name,
		input.Slug,
		input.Description,
		input.Visibility,
		input.JoinPolicy,
		input.Location,
		input.CreatedBy,
	).Scan(
		&item.ID,
		&item.Name,
		&item.Slug,
		&item.Description,
		&item.Visibility,
		&item.Status,
		&item.JoinPolicy,
		&item.Location,
		&item.CreatedBy,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return Group{}, err
	}
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	return item, nil
}

func (r *Repo) AddOwnerMembership(ctx context.Context, groupID, userID string) error {
	const q = `
		INSERT INTO group_memberships (group_id, user_id, role, status, invited_by, joined_at)
		VALUES ($1::uuid, $2::uuid, 'owner', 'active', $2::uuid, NOW())
		ON CONFLICT (group_id, user_id)
		DO UPDATE SET role = 'owner', status = 'active', updated_at = NOW(), joined_at = COALESCE(group_memberships.joined_at, NOW())
	`
	_, err := r.pool.Exec(ctx, q, groupID, userID)
	return err
}

func (r *Repo) UpdateGroup(ctx context.Context, input UpdateGroupInput) (Group, error) {
	set := []string{"updated_at = NOW()"}
	args := []any{}
	idx := 1
	if input.Name != nil {
		args = append(args, strings.TrimSpace(*input.Name))
		set = append(set, fmt.Sprintf("name = $%d", idx))
		idx++
	}
	if input.Description != nil {
		args = append(args, strings.TrimSpace(*input.Description))
		set = append(set, fmt.Sprintf("description = $%d", idx))
		idx++
	}
	if input.Visibility != nil {
		args = append(args, strings.TrimSpace(*input.Visibility))
		set = append(set, fmt.Sprintf("visibility = $%d", idx))
		idx++
	}
	if input.Status != nil {
		args = append(args, strings.TrimSpace(*input.Status))
		set = append(set, fmt.Sprintf("status = $%d", idx))
		idx++
	}
	if input.JoinPolicy != nil {
		args = append(args, strings.TrimSpace(*input.JoinPolicy))
		set = append(set, fmt.Sprintf("join_policy = $%d", idx))
		idx++
	}
	if input.Location != nil {
		args = append(args, strings.TrimSpace(*input.Location))
		set = append(set, fmt.Sprintf("location = $%d", idx))
		idx++
	}

	args = append(args, input.GroupID)
	q := fmt.Sprintf(`
		UPDATE groups
		SET %s
		WHERE id = $%d::uuid
		RETURNING id::text, name, slug, coalesce(description, ''), visibility, status, join_policy, coalesce(location, ''), coalesce(created_by::text, ''), created_at, updated_at
	`, strings.Join(set, ", "), idx)

	var item Group
	if err := r.pool.QueryRow(ctx, q, args...).Scan(
		&item.ID,
		&item.Name,
		&item.Slug,
		&item.Description,
		&item.Visibility,
		&item.Status,
		&item.JoinPolicy,
		&item.Location,
		&item.CreatedBy,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return Group{}, err
	}
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	return item, nil
}

func (r *Repo) GetMembership(ctx context.Context, groupID, userID string) (GroupMember, error) {
	const q = `
		SELECT group_id::text, user_id::text, role, status, joined_at, created_at, updated_at
		FROM group_memberships
		WHERE group_id = $1::uuid AND user_id = $2::uuid
	`
	var item GroupMember
	if err := r.pool.QueryRow(ctx, q, groupID, userID).Scan(
		&item.GroupID,
		&item.UserID,
		&item.Role,
		&item.Status,
		&item.JoinedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return GroupMember{}, err
	}
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	if item.JoinedAt != nil {
		t := item.JoinedAt.UTC()
		item.JoinedAt = &t
	}
	return item, nil
}

func (r *Repo) UpsertMembership(ctx context.Context, groupID, userID, role, status string) (GroupMember, error) {
	const q = `
		INSERT INTO group_memberships (group_id, user_id, role, status, invited_by, joined_at)
		VALUES ($1::uuid, $2::uuid, $3, $4, $2::uuid, CASE WHEN $4 = 'active' THEN NOW() ELSE NULL END)
		ON CONFLICT (group_id, user_id)
		DO UPDATE SET
			role = EXCLUDED.role,
			status = EXCLUDED.status,
			joined_at = CASE
				WHEN EXCLUDED.status = 'active' THEN COALESCE(group_memberships.joined_at, NOW())
				ELSE group_memberships.joined_at
			END,
			left_at = CASE
				WHEN EXCLUDED.status = 'active' THEN NULL
				ELSE group_memberships.left_at
			END,
			updated_at = NOW()
		RETURNING group_id::text, user_id::text, role, status, joined_at, created_at, updated_at
	`
	var item GroupMember
	if err := r.pool.QueryRow(ctx, q, groupID, userID, role, status).Scan(
		&item.GroupID,
		&item.UserID,
		&item.Role,
		&item.Status,
		&item.JoinedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return GroupMember{}, err
	}
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	if item.JoinedAt != nil {
		t := item.JoinedAt.UTC()
		item.JoinedAt = &t
	}
	return item, nil
}

func (r *Repo) LeaveGroup(ctx context.Context, groupID, userID string) error {
	const q = `
		UPDATE group_memberships
		SET status = 'blocked', left_at = NOW(), updated_at = NOW()
		WHERE group_id = $1::uuid AND user_id = $2::uuid AND status = 'active'
	`
	res, err := r.pool.Exec(ctx, q, groupID, userID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *Repo) ListMembers(ctx context.Context, input ListGroupMembersInput) ([]GroupMember, int, error) {
	const q = `
		SELECT
			gm.group_id::text,
			gm.user_id::text,
			gm.role,
			gm.status,
			gm.joined_at,
			gm.created_at,
			gm.updated_at,
			coalesce(u.username, ''),
			coalesce(u.display_name, ''),
			coalesce(p.avatar_url, ''),
			COUNT(*) OVER()::int AS total_count
		FROM group_memberships gm
		LEFT JOIN users u ON u.id = gm.user_id
		LEFT JOIN profiles p ON p.user_id = gm.user_id
		WHERE gm.group_id = $1::uuid AND gm.status = 'active'
		ORDER BY gm.joined_at DESC NULLS LAST, gm.created_at DESC, gm.user_id DESC
		LIMIT $2 OFFSET $3
	`
	offset := (input.Page - 1) * input.Limit
	rows, err := r.pool.Query(ctx, q, input.GroupID, input.Limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]GroupMember, 0)
	total := 0
	for rows.Next() {
		var item GroupMember
		if err := rows.Scan(
			&item.GroupID,
			&item.UserID,
			&item.Role,
			&item.Status,
			&item.JoinedAt,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.Username,
			&item.DisplayName,
			&item.AvatarURL,
			&total,
		); err != nil {
			return nil, 0, err
		}
		item.CreatedAt = item.CreatedAt.UTC()
		item.UpdatedAt = item.UpdatedAt.UTC()
		if item.JoinedAt != nil {
			t := item.JoinedAt.UTC()
			item.JoinedAt = &t
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *Repo) ListPosts(ctx context.Context, input ListGroupPostsInput) ([]GroupPost, int, error) {
	const q = `
		SELECT
			p.id::text,
			p.group_id::text,
			p.author_user_id::text,
			coalesce(p.title, ''),
			p.content,
			p.status,
			p.like_count,
			p.comment_count,
			p.created_at,
			p.updated_at,
			coalesce(u.display_name, ''),
			coalesce(u.username, ''),
			coalesce(pr.avatar_url, ''),
			COUNT(*) OVER()::int AS total_count
		FROM group_posts p
		LEFT JOIN users u ON u.id = p.author_user_id
		LEFT JOIN profiles pr ON pr.user_id = p.author_user_id
		WHERE p.group_id = $1::uuid AND p.status = 'active'
		ORDER BY p.created_at DESC, p.id DESC
		LIMIT $2 OFFSET $3
	`
	offset := (input.Page - 1) * input.Limit
	rows, err := r.pool.Query(ctx, q, input.GroupID, input.Limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]GroupPost, 0)
	total := 0
	for rows.Next() {
		var item GroupPost
		if err := rows.Scan(
			&item.ID,
			&item.GroupID,
			&item.AuthorUserID,
			&item.Title,
			&item.Content,
			&item.Status,
			&item.LikeCount,
			&item.CommentCount,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.AuthorName,
			&item.AuthorUsername,
			&item.AuthorAvatarURL,
			&total,
		); err != nil {
			return nil, 0, err
		}
		item.CreatedAt = item.CreatedAt.UTC()
		item.UpdatedAt = item.UpdatedAt.UTC()
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *Repo) CreatePost(ctx context.Context, input CreateGroupPostInput) (GroupPost, error) {
	const q = `
		INSERT INTO group_posts (group_id, author_user_id, title, content, status)
		VALUES ($1::uuid, $2::uuid, nullif($3, ''), $4, 'active')
		RETURNING id::text, group_id::text, author_user_id::text, coalesce(title, ''), content, status, like_count, comment_count, created_at, updated_at
	`
	var item GroupPost
	if err := r.pool.QueryRow(ctx, q, input.GroupID, input.AuthorUserID, input.Title, input.Content).Scan(
		&item.ID,
		&item.GroupID,
		&item.AuthorUserID,
		&item.Title,
		&item.Content,
		&item.Status,
		&item.LikeCount,
		&item.CommentCount,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return GroupPost{}, err
	}
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	return item, nil
}

func IsNoRows(err error) bool {
	return err == pgx.ErrNoRows
}
