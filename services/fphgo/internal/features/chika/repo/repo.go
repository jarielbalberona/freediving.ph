package repo

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	pool *pgxpool.Pool
}

type Thread struct {
	ID              string
	Title           string
	Content         string
	VoteCount       int64
	CommentCount    int64
	ViewerReaction  string
	Mode            string
	CategoryID      string
	CategorySlug    string
	CategoryName    string
	Pseudonymous    bool
	CreatedByUserID string
	AuthorUsername  string
	AuthorPseudonym string
	HiddenAt        *time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type Post struct {
	ID           int64
	ThreadID     string
	AuthorUserID string
	Pseudonym    string
	Content      string
	CreatedAt    time.Time
}

type Comment struct {
	ID              int64
	ThreadID        string
	ParentID        *int64
	VoteCount       int64
	ReplyCount      int64
	ViewerReaction  string
	AuthorUserID    string
	AuthorAvatarURL string
	Pseudonym       string
	Content         string
	HiddenAt        *time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type Reaction struct {
	ThreadID string
	UserID   string
	Type     string
}

type MediaAsset struct {
	ID         string
	EntityType string
	EntityID   string
	StorageKey string
	URL        string
	MimeType   string
	SizeBytes  int64
}

type Category struct {
	ID           string
	Slug         string
	Name         string
	Pseudonymous bool
}

type CreateMediaAssetInput struct {
	OwnerUserID string
	EntityType  string
	EntityID    string
	StorageKey  string
	URL         string
	MimeType    string
	SizeBytes   int64
	Width       *int32
	Height      *int32
}

func New(pool *pgxpool.Pool) *Repo { return &Repo{pool: pool} }

func (r *Repo) PseudonymEnabled(ctx context.Context, userID string) (bool, error) {
	var enabled bool
	err := r.pool.QueryRow(ctx, `SELECT pseudonymous_enabled FROM profiles WHERE user_id = $1`, userID).Scan(&enabled)
	return enabled, err
}

func (r *Repo) GetThreadAlias(ctx context.Context, threadID, userID string) (string, error) {
	var alias string
	err := r.pool.QueryRow(ctx, `
		SELECT pseudonym
		FROM chika_thread_aliases
		WHERE thread_id = $1 AND user_id = $2
	`, threadID, userID).Scan(&alias)
	return alias, err
}

func (r *Repo) FindHistoricalThreadPseudonym(ctx context.Context, threadID, userID string) (string, error) {
	var alias string
	err := r.pool.QueryRow(ctx, `
		SELECT pseudonym
		FROM (
			SELECT pseudonym, created_at
			FROM chika_posts
			WHERE thread_id = $1 AND author_user_id = $2
			UNION ALL
			SELECT pseudonym, created_at
			FROM chika_comments
			WHERE thread_id = $1 AND author_user_id = $2
		) source
		ORDER BY created_at ASC
		LIMIT 1
	`, threadID, userID).Scan(&alias)
	return alias, err
}

func (r *Repo) UpsertThreadAlias(ctx context.Context, threadID, userID, pseudonym string) (string, error) {
	trimmed := pseudonym
	if trimmed == "" {
		return "", fmt.Errorf("pseudonym is required")
	}
	candidate := trimmed
	for attempt := 0; attempt < 6; attempt++ {
		var alias string
		err := r.pool.QueryRow(ctx, `
			INSERT INTO chika_thread_aliases (thread_id, user_id, pseudonym)
			VALUES ($1, $2, $3)
			ON CONFLICT (thread_id, user_id)
			DO UPDATE SET updated_at = NOW()
			RETURNING pseudonym
		`, threadID, userID, candidate).Scan(&alias)
		if err == nil {
			return alias, nil
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == "chika_thread_aliases_thread_id_pseudonym_key" {
			candidate = fmt.Sprintf("%s-%d", trimmed, attempt+2)
			continue
		}
		return "", err
	}
	return "", fmt.Errorf("failed to allocate unique pseudonym alias")
}

func (r *Repo) Username(ctx context.Context, userID string) (string, error) {
	var username string
	if err := r.pool.QueryRow(ctx, `SELECT username FROM users WHERE id = $1`, userID).Scan(&username); err != nil {
		return "", fmt.Errorf("username lookup failed: %w", err)
	}
	return username, nil
}

func (r *Repo) ListCategories(ctx context.Context) ([]Category, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, slug, name, pseudonymous
		FROM chika_categories
		ORDER BY name ASC, slug ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Category, 0)
	for rows.Next() {
		var item Category
		if err := rows.Scan(&item.ID, &item.Slug, &item.Name, &item.Pseudonymous); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) GetCategoryByID(ctx context.Context, categoryID string) (Category, error) {
	var item Category
	err := r.pool.QueryRow(ctx, `
		SELECT id, slug, name, pseudonymous
		FROM chika_categories
		WHERE id = $1
	`, categoryID).Scan(&item.ID, &item.Slug, &item.Name, &item.Pseudonymous)
	return item, err
}

func (r *Repo) CreateThread(ctx context.Context, title, mode, categoryID, actorID string) (Thread, error) {
	var thread Thread
	err := r.pool.QueryRow(ctx, `
		INSERT INTO chika_threads (title, mode, category_id, created_by_user_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id, title, mode, category_id, created_by_user_id, hidden_at, created_at, updated_at
	`, title, mode, categoryID, actorID).Scan(
		&thread.ID,
		&thread.Title,
		&thread.Mode,
		&thread.CategoryID,
		&thread.CreatedByUserID,
		&thread.HiddenAt,
		&thread.CreatedAt,
		&thread.UpdatedAt,
	)
	if err != nil {
		return thread, err
	}
	thread.Content = ""
	thread.VoteCount = 0
	thread.CommentCount = 0
	thread.ViewerReaction = ""
	if err := r.pool.QueryRow(ctx, `
		SELECT slug, name, pseudonymous
		FROM chika_categories
		WHERE id = $1
	`, thread.CategoryID).Scan(&thread.CategorySlug, &thread.CategoryName, &thread.Pseudonymous); err != nil {
		return thread, err
	}
	if err := r.pool.QueryRow(ctx, `SELECT COALESCE(username, '') FROM users WHERE id = $1`, thread.CreatedByUserID).Scan(&thread.AuthorUsername); err != nil {
		thread.AuthorUsername = ""
	}
	return thread, nil
}

func (r *Repo) GetThread(ctx context.Context, threadID string) (Thread, error) {
	var thread Thread
	err := r.pool.QueryRow(ctx, `
		SELECT t.id, t.title, COALESCE(fp.content, ''), COALESCE(rv.score, 0), COALESCE(cc.comment_count, 0), ''::text AS viewer_reaction, t.mode, t.category_id, c.slug, c.name, c.pseudonymous,
		       COALESCE(t.created_by_user_id::text, ''), COALESCE(u.username, ''), COALESCE(ta.pseudonym, ''),
		       t.hidden_at, t.created_at, t.updated_at
		FROM chika_threads t
		JOIN chika_categories c ON c.id = t.category_id
		LEFT JOIN users u ON u.id = t.created_by_user_id
		LEFT JOIN chika_thread_aliases ta ON ta.thread_id = t.id AND ta.user_id = t.created_by_user_id
		LEFT JOIN LATERAL (
			SELECT p.content
			FROM chika_posts p
			WHERE p.thread_id = t.id AND p.deleted_at IS NULL
			ORDER BY p.created_at ASC, p.id ASC
			LIMIT 1
		) fp ON TRUE
		LEFT JOIN LATERAL (
			SELECT SUM(CASE WHEN r.reaction_type = 'upvote' THEN 1 WHEN r.reaction_type = 'downvote' THEN -1 ELSE 0 END)::bigint AS score
			FROM chika_thread_reactions r
			WHERE r.thread_id = t.id
		) rv ON TRUE
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::bigint AS comment_count
			FROM chika_comments c
			WHERE c.thread_id = t.id AND c.deleted_at IS NULL
		) cc ON TRUE
		WHERE t.id = $1 AND t.deleted_at IS NULL
	`, threadID).Scan(
		&thread.ID,
		&thread.Title,
		&thread.Content,
		&thread.VoteCount,
		&thread.CommentCount,
		&thread.ViewerReaction,
		&thread.Mode,
		&thread.CategoryID,
		&thread.CategorySlug,
		&thread.CategoryName,
		&thread.Pseudonymous,
		&thread.CreatedByUserID,
		&thread.AuthorUsername,
		&thread.AuthorPseudonym,
		&thread.HiddenAt,
		&thread.CreatedAt,
		&thread.UpdatedAt,
	)
	return thread, err
}

func (r *Repo) GetThreadForViewer(ctx context.Context, threadID, viewerID string) (Thread, error) {
	var thread Thread
	err := r.pool.QueryRow(ctx, `
		SELECT t.id, t.title, COALESCE(fp.content, ''), COALESCE(rv.score, 0), COALESCE(cc.comment_count, 0), COALESCE(vr.reaction_type, ''), t.mode, t.category_id, c.slug, c.name, c.pseudonymous,
		       COALESCE(t.created_by_user_id::text, ''), COALESCE(u.username, ''), COALESCE(ta.pseudonym, ''),
		       t.hidden_at, t.created_at, t.updated_at
		FROM chika_threads t
		JOIN chika_categories c ON c.id = t.category_id
		LEFT JOIN users u ON u.id = t.created_by_user_id
		LEFT JOIN chika_thread_aliases ta ON ta.thread_id = t.id AND ta.user_id = t.created_by_user_id
		LEFT JOIN chika_thread_reactions vr ON vr.thread_id = t.id AND vr.user_id = $2
		LEFT JOIN LATERAL (
			SELECT p.content
			FROM chika_posts p
			WHERE p.thread_id = t.id AND p.deleted_at IS NULL
			ORDER BY p.created_at ASC, p.id ASC
			LIMIT 1
		) fp ON TRUE
		LEFT JOIN LATERAL (
			SELECT SUM(CASE WHEN r.reaction_type = 'upvote' THEN 1 WHEN r.reaction_type = 'downvote' THEN -1 ELSE 0 END)::bigint AS score
			FROM chika_thread_reactions r
			WHERE r.thread_id = t.id
		) rv ON TRUE
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::bigint AS comment_count
			FROM chika_comments c
			WHERE c.thread_id = t.id AND c.deleted_at IS NULL
		) cc ON TRUE
		WHERE t.id = $1 AND t.deleted_at IS NULL
	`, threadID, viewerID).Scan(
		&thread.ID,
		&thread.Title,
		&thread.Content,
		&thread.VoteCount,
		&thread.CommentCount,
		&thread.ViewerReaction,
		&thread.Mode,
		&thread.CategoryID,
		&thread.CategorySlug,
		&thread.CategoryName,
		&thread.Pseudonymous,
		&thread.CreatedByUserID,
		&thread.AuthorUsername,
		&thread.AuthorPseudonym,
		&thread.HiddenAt,
		&thread.CreatedAt,
		&thread.UpdatedAt,
	)
	return thread, err
}

func (r *Repo) ListThreads(ctx context.Context, viewerID string, includeHidden bool, cursorCreated time.Time, cursorThreadID string, limit int32) ([]Thread, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT t.id, t.title, COALESCE(fp.content, ''), COALESCE(rv.score, 0), COALESCE(cc.comment_count, 0), COALESCE(vr.reaction_type, ''), t.mode, t.category_id, c.slug, c.name, c.pseudonymous,
		       COALESCE(t.created_by_user_id::text, ''), COALESCE(u.username, ''), COALESCE(ta.pseudonym, ''),
		       t.hidden_at, t.created_at, t.updated_at
		FROM chika_threads t
		JOIN chika_categories c ON c.id = t.category_id
		LEFT JOIN users u ON u.id = t.created_by_user_id
		LEFT JOIN chika_thread_aliases ta ON ta.thread_id = t.id AND ta.user_id = t.created_by_user_id
		LEFT JOIN chika_thread_reactions vr ON vr.thread_id = t.id AND vr.user_id = $1
		LEFT JOIN LATERAL (
			SELECT p.content
			FROM chika_posts p
			WHERE p.thread_id = t.id AND p.deleted_at IS NULL
			ORDER BY p.created_at ASC, p.id ASC
			LIMIT 1
		) fp ON TRUE
		LEFT JOIN LATERAL (
			SELECT SUM(CASE WHEN r.reaction_type = 'upvote' THEN 1 WHEN r.reaction_type = 'downvote' THEN -1 ELSE 0 END)::bigint AS score
			FROM chika_thread_reactions r
			WHERE r.thread_id = t.id
		) rv ON TRUE
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::bigint AS comment_count
			FROM chika_comments c
			WHERE c.thread_id = t.id AND c.deleted_at IS NULL
		) cc ON TRUE
		WHERE t.deleted_at IS NULL
		  AND ($2::boolean OR t.hidden_at IS NULL)
		  AND (t.created_at < $3 OR (t.created_at = $3 AND t.id < $4))
		  AND NOT EXISTS (
			SELECT 1
			FROM user_blocks b
			WHERE (b.blocker_app_user_id = $1 AND b.blocked_app_user_id = t.created_by_user_id)
			   OR (b.blocker_app_user_id = t.created_by_user_id AND b.blocked_app_user_id = $1)
		  )
		ORDER BY t.created_at DESC, t.id DESC
		LIMIT $5
	`, viewerID, includeHidden, cursorCreated, cursorThreadID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Thread, 0)
	for rows.Next() {
		var item Thread
		if err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Content,
			&item.VoteCount,
			&item.CommentCount,
			&item.ViewerReaction,
			&item.Mode,
			&item.CategoryID,
			&item.CategorySlug,
			&item.CategoryName,
			&item.Pseudonymous,
			&item.CreatedByUserID,
			&item.AuthorUsername,
			&item.AuthorPseudonym,
			&item.HiddenAt,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) ListThreadsByCategory(ctx context.Context, viewerID string, includeHidden bool, categorySlug string, cursorCreated time.Time, cursorThreadID string, limit int32) ([]Thread, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT t.id, t.title, COALESCE(fp.content, ''), COALESCE(rv.score, 0), COALESCE(cc.comment_count, 0), COALESCE(vr.reaction_type, ''), t.mode, t.category_id, c.slug, c.name, c.pseudonymous,
		       COALESCE(t.created_by_user_id::text, ''), COALESCE(u.username, ''), COALESCE(ta.pseudonym, ''),
		       t.hidden_at, t.created_at, t.updated_at
		FROM chika_threads t
		JOIN chika_categories c ON c.id = t.category_id
		LEFT JOIN users u ON u.id = t.created_by_user_id
		LEFT JOIN chika_thread_aliases ta ON ta.thread_id = t.id AND ta.user_id = t.created_by_user_id
		LEFT JOIN chika_thread_reactions vr ON vr.thread_id = t.id AND vr.user_id = $1
		LEFT JOIN LATERAL (
			SELECT p.content
			FROM chika_posts p
			WHERE p.thread_id = t.id AND p.deleted_at IS NULL
			ORDER BY p.created_at ASC, p.id ASC
			LIMIT 1
		) fp ON TRUE
		LEFT JOIN LATERAL (
			SELECT SUM(CASE WHEN r.reaction_type = 'upvote' THEN 1 WHEN r.reaction_type = 'downvote' THEN -1 ELSE 0 END)::bigint AS score
			FROM chika_thread_reactions r
			WHERE r.thread_id = t.id
		) rv ON TRUE
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::bigint AS comment_count
			FROM chika_comments c
			WHERE c.thread_id = t.id AND c.deleted_at IS NULL
		) cc ON TRUE
		WHERE t.deleted_at IS NULL
		  AND ($2::boolean OR t.hidden_at IS NULL)
		  AND (t.created_at < $3 OR (t.created_at = $3 AND t.id < $4))
		  AND c.slug = $6
		  AND NOT EXISTS (
			SELECT 1
			FROM user_blocks b
			WHERE (b.blocker_app_user_id = $1 AND b.blocked_app_user_id = t.created_by_user_id)
			   OR (b.blocker_app_user_id = t.created_by_user_id AND b.blocked_app_user_id = $1)
		  )
		ORDER BY t.created_at DESC, t.id DESC
		LIMIT $5
	`, viewerID, includeHidden, cursorCreated, cursorThreadID, limit, categorySlug)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Thread, 0)
	for rows.Next() {
		var item Thread
		if err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Content,
			&item.VoteCount,
			&item.CommentCount,
			&item.ViewerReaction,
			&item.Mode,
			&item.CategoryID,
			&item.CategorySlug,
			&item.CategoryName,
			&item.Pseudonymous,
			&item.CreatedByUserID,
			&item.AuthorUsername,
			&item.AuthorPseudonym,
			&item.HiddenAt,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) UpdateThread(ctx context.Context, threadID, title string) (Thread, error) {
	var thread Thread
	err := r.pool.QueryRow(ctx, `
		UPDATE chika_threads t
		SET title = $2, updated_at = NOW()
		FROM chika_categories c
		LEFT JOIN users u ON u.id = t.created_by_user_id
		LEFT JOIN chika_thread_aliases ta ON ta.thread_id = t.id AND ta.user_id = t.created_by_user_id
		LEFT JOIN LATERAL (
			SELECT p.content
			FROM chika_posts p
			WHERE p.thread_id = t.id AND p.deleted_at IS NULL
			ORDER BY p.created_at ASC, p.id ASC
			LIMIT 1
		) fp ON TRUE
		LEFT JOIN LATERAL (
			SELECT SUM(CASE WHEN r.reaction_type = 'upvote' THEN 1 WHEN r.reaction_type = 'downvote' THEN -1 ELSE 0 END)::bigint AS score
			FROM chika_thread_reactions r
			WHERE r.thread_id = t.id
		) rv ON TRUE
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::bigint AS comment_count
			FROM chika_comments cmt
			WHERE cmt.thread_id = t.id AND cmt.deleted_at IS NULL
		) cc ON TRUE
		WHERE t.id = $1 AND t.deleted_at IS NULL AND c.id = t.category_id
		RETURNING t.id, t.title, COALESCE(fp.content, ''), COALESCE(rv.score, 0), COALESCE(cc.comment_count, 0), ''::text AS viewer_reaction, t.mode, t.category_id, c.slug, c.name, c.pseudonymous,
		          COALESCE(t.created_by_user_id::text, ''), COALESCE(u.username, ''), COALESCE(ta.pseudonym, ''),
		          t.hidden_at, t.created_at, t.updated_at
	`, threadID, title).Scan(
		&thread.ID,
		&thread.Title,
		&thread.Content,
		&thread.VoteCount,
		&thread.CommentCount,
		&thread.ViewerReaction,
		&thread.Mode,
		&thread.CategoryID,
		&thread.CategorySlug,
		&thread.CategoryName,
		&thread.Pseudonymous,
		&thread.CreatedByUserID,
		&thread.AuthorUsername,
		&thread.AuthorPseudonym,
		&thread.HiddenAt,
		&thread.CreatedAt,
		&thread.UpdatedAt,
	)
	return thread, err
}

func (r *Repo) SoftDeleteThread(ctx context.Context, threadID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE chika_threads
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`, threadID)
	return err
}

func (r *Repo) CreatePost(ctx context.Context, threadID, userID, pseudonym, content string) (Post, error) {
	var post Post
	err := r.pool.QueryRow(ctx, `
		INSERT INTO chika_posts (thread_id, author_user_id, pseudonym, content)
		VALUES ($1, $2, $3, $4)
		RETURNING id, thread_id, author_user_id, pseudonym, content, created_at
	`, threadID, userID, pseudonym, content).Scan(
		&post.ID, &post.ThreadID, &post.AuthorUserID, &post.Pseudonym, &post.Content, &post.CreatedAt,
	)
	return post, err
}

func (r *Repo) ListPosts(ctx context.Context, threadID, viewerID string, limit, offset int32) ([]Post, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, thread_id, author_user_id, pseudonym, content, created_at
		FROM chika_posts
		WHERE thread_id = $1 AND deleted_at IS NULL
		  AND NOT EXISTS (
			SELECT 1
			FROM user_blocks b
			WHERE (b.blocker_app_user_id = $2 AND b.blocked_app_user_id = chika_posts.author_user_id)
			   OR (b.blocker_app_user_id = chika_posts.author_user_id AND b.blocked_app_user_id = $2)
		  )
		ORDER BY created_at DESC, id DESC
		LIMIT $3 OFFSET $4
	`, threadID, viewerID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Post, 0)
	for rows.Next() {
		var item Post
		if err := rows.Scan(&item.ID, &item.ThreadID, &item.AuthorUserID, &item.Pseudonym, &item.Content, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) CreateComment(ctx context.Context, threadID, userID, pseudonym, content string, parentCommentID *int64) (Comment, error) {
	var comment Comment
	err := r.pool.QueryRow(ctx, `
		INSERT INTO chika_comments (thread_id, author_user_id, pseudonym, content, parent_comment_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, thread_id, parent_comment_id, author_user_id, pseudonym, content, hidden_at, created_at, updated_at
	`, threadID, userID, pseudonym, content, parentCommentID).Scan(
		&comment.ID, &comment.ThreadID, &comment.ParentID, &comment.AuthorUserID, &comment.Pseudonym, &comment.Content, &comment.HiddenAt, &comment.CreatedAt, &comment.UpdatedAt,
	)
	comment.VoteCount = 0
	comment.ReplyCount = 0
	comment.ViewerReaction = ""
	return comment, err
}

func (r *Repo) ListComments(ctx context.Context, threadID, viewerID string, includeHidden bool, cursorCreated time.Time, cursorCommentID int64, limit int32) ([]Comment, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT c.id, c.thread_id, c.parent_comment_id, c.author_user_id, COALESCE(p.avatar_url, '') AS author_avatar_url, c.pseudonym, c.content, c.hidden_at, c.created_at, c.updated_at,
		       COALESCE(rv.score, 0) AS vote_count,
		       COALESCE(rc.reply_count, 0) AS reply_count,
		       COALESCE(vr.reaction_type, '') AS viewer_reaction
		FROM chika_comments c
		LEFT JOIN profiles p ON p.user_id = c.author_user_id
		LEFT JOIN chika_comment_reactions vr ON vr.comment_id = c.id AND vr.user_id = $2
		LEFT JOIN LATERAL (
			SELECT SUM(CASE WHEN r.reaction_type = 'upvote' THEN 1 WHEN r.reaction_type = 'downvote' THEN -1 ELSE 0 END)::bigint AS score
			FROM chika_comment_reactions r
			WHERE r.comment_id = c.id
		) rv ON TRUE
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::bigint AS reply_count
			FROM chika_comments child
			WHERE child.parent_comment_id = c.id AND child.deleted_at IS NULL
		) rc ON TRUE
		WHERE c.thread_id = $1 AND c.deleted_at IS NULL
		  AND ($3::boolean OR c.hidden_at IS NULL)
		  AND (c.created_at < $4 OR (c.created_at = $4 AND c.id < $5))
		  AND NOT EXISTS (
			SELECT 1
			FROM user_blocks b
			WHERE (b.blocker_app_user_id = $2 AND b.blocked_app_user_id = c.author_user_id)
			   OR (b.blocker_app_user_id = c.author_user_id AND b.blocked_app_user_id = $2)
		  )
		ORDER BY c.created_at DESC, c.id DESC
		LIMIT $6
	`, threadID, viewerID, includeHidden, cursorCreated, cursorCommentID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Comment, 0)
	for rows.Next() {
		var item Comment
		if err := rows.Scan(
			&item.ID,
			&item.ThreadID,
			&item.ParentID,
			&item.AuthorUserID,
			&item.AuthorAvatarURL,
			&item.Pseudonym,
			&item.Content,
			&item.HiddenAt,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.VoteCount,
			&item.ReplyCount,
			&item.ViewerReaction,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) GetComment(ctx context.Context, commentID int64) (Comment, error) {
	var comment Comment
	err := r.pool.QueryRow(ctx, `
		SELECT c.id, c.thread_id, c.parent_comment_id, c.author_user_id, COALESCE(p.avatar_url, '') AS author_avatar_url, c.pseudonym, c.content, c.hidden_at, c.created_at, c.updated_at,
		       0::bigint AS vote_count, 0::bigint AS reply_count, ''::text AS viewer_reaction
		FROM chika_comments c
		LEFT JOIN profiles p ON p.user_id = c.author_user_id
		WHERE c.id = $1 AND c.deleted_at IS NULL
	`, commentID).Scan(&comment.ID, &comment.ThreadID, &comment.ParentID, &comment.AuthorUserID, &comment.AuthorAvatarURL, &comment.Pseudonym, &comment.Content, &comment.HiddenAt, &comment.CreatedAt, &comment.UpdatedAt, &comment.VoteCount, &comment.ReplyCount, &comment.ViewerReaction)
	return comment, err
}

func (r *Repo) UpdateComment(ctx context.Context, commentID int64, content string) (Comment, error) {
	var comment Comment
	err := r.pool.QueryRow(ctx, `
		WITH updated AS (
			UPDATE chika_comments
			SET content = $2, updated_at = NOW()
			WHERE id = $1 AND deleted_at IS NULL
			RETURNING id, thread_id, parent_comment_id, author_user_id, pseudonym, content, hidden_at, created_at, updated_at
		)
		SELECT u.id, u.thread_id, u.parent_comment_id, u.author_user_id, COALESCE(p.avatar_url, ''), u.pseudonym, u.content, u.hidden_at, u.created_at, u.updated_at,
		       0::bigint, 0::bigint, ''::text
		FROM updated u
		LEFT JOIN profiles p ON p.user_id = u.author_user_id
	`, commentID, content).Scan(&comment.ID, &comment.ThreadID, &comment.ParentID, &comment.AuthorUserID, &comment.AuthorAvatarURL, &comment.Pseudonym, &comment.Content, &comment.HiddenAt, &comment.CreatedAt, &comment.UpdatedAt, &comment.VoteCount, &comment.ReplyCount, &comment.ViewerReaction)
	return comment, err
}

func (r *Repo) SoftDeleteComment(ctx context.Context, commentID int64) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE chika_comments
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`, commentID)
	return err
}

func (r *Repo) SetThreadReaction(ctx context.Context, threadID, userID, reactionType string) (Reaction, error) {
	var reaction Reaction
	err := r.pool.QueryRow(ctx, `
		INSERT INTO chika_thread_reactions (thread_id, user_id, reaction_type)
		VALUES ($1, $2, $3)
		ON CONFLICT (thread_id, user_id)
		DO UPDATE SET reaction_type = EXCLUDED.reaction_type, created_at = NOW()
		RETURNING thread_id, user_id, reaction_type
	`, threadID, userID, reactionType).Scan(&reaction.ThreadID, &reaction.UserID, &reaction.Type)
	return reaction, err
}

func (r *Repo) RemoveThreadReaction(ctx context.Context, threadID, userID string) error {
	_, err := r.pool.Exec(ctx, `
		DELETE FROM chika_thread_reactions
		WHERE thread_id = $1 AND user_id = $2
	`, threadID, userID)
	return err
}

func (r *Repo) SetCommentReaction(ctx context.Context, commentID int64, userID, reactionType string) (Reaction, error) {
	var reaction Reaction
	err := r.pool.QueryRow(ctx, `
		INSERT INTO chika_comment_reactions (comment_id, user_id, reaction_type)
		VALUES ($1, $2, $3)
		ON CONFLICT (comment_id, user_id)
		DO UPDATE SET reaction_type = EXCLUDED.reaction_type, created_at = NOW()
		RETURNING comment_id::text, user_id, reaction_type
	`, commentID, userID, reactionType).Scan(&reaction.ThreadID, &reaction.UserID, &reaction.Type)
	return reaction, err
}

func (r *Repo) RemoveCommentReaction(ctx context.Context, commentID int64, userID string) error {
	_, err := r.pool.Exec(ctx, `
		DELETE FROM chika_comment_reactions
		WHERE comment_id = $1 AND user_id = $2
	`, commentID, userID)
	return err
}

func (r *Repo) IsBlockedEither(ctx context.Context, a, b string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM user_blocks
			WHERE (blocker_app_user_id = $1 AND blocked_app_user_id = $2)
			   OR (blocker_app_user_id = $2 AND blocked_app_user_id = $1)
		)
	`, a, b).Scan(&exists)
	return exists, err
}

func (r *Repo) CreateMediaAsset(ctx context.Context, input CreateMediaAssetInput) (MediaAsset, error) {
	var asset MediaAsset
	err := r.pool.QueryRow(ctx, `
		INSERT INTO media_assets (
			owner_user_id, entity_type, entity_id, storage_key, url, mime_type, size_bytes, width, height
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, entity_type, entity_id, storage_key, url, mime_type, size_bytes
	`, input.OwnerUserID, input.EntityType, input.EntityID, input.StorageKey, input.URL, input.MimeType, input.SizeBytes, input.Width, input.Height).Scan(
		&asset.ID, &asset.EntityType, &asset.EntityID, &asset.StorageKey, &asset.URL, &asset.MimeType, &asset.SizeBytes,
	)
	return asset, err
}

func (r *Repo) ListMediaByEntity(ctx context.Context, entityType, entityID string) ([]MediaAsset, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, entity_type, entity_id, storage_key, url, mime_type, size_bytes
		FROM media_assets
		WHERE entity_type = $1 AND entity_id = $2
		ORDER BY created_at DESC, id DESC
	`, entityType, entityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]MediaAsset, 0)
	for rows.Next() {
		var item MediaAsset
		if err := rows.Scan(&item.ID, &item.EntityType, &item.EntityID, &item.StorageKey, &item.URL, &item.MimeType, &item.SizeBytes); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

// EntityExists checks that the referenced entity exists and is not soft-deleted.
func (r *Repo) EntityExists(ctx context.Context, entityType, entityID string) (bool, error) {
	switch entityType {
	case "thread":
		var n int
		err := r.pool.QueryRow(ctx, `SELECT 1 FROM chika_threads WHERE id = $1 AND deleted_at IS NULL`, entityID).Scan(&n)
		if err == pgx.ErrNoRows {
			return false, nil
		}
		return err == nil, err
	case "post":
		id, err := strconv.ParseInt(entityID, 10, 64)
		if err != nil {
			return false, nil
		}
		var n int
		err = r.pool.QueryRow(ctx, `SELECT 1 FROM chika_posts WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&n)
		if err == pgx.ErrNoRows {
			return false, nil
		}
		return err == nil, err
	case "comment":
		id, err := strconv.ParseInt(entityID, 10, 64)
		if err != nil {
			return false, nil
		}
		var n int
		err = r.pool.QueryRow(ctx, `SELECT 1 FROM chika_comments WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&n)
		if err == pgx.ErrNoRows {
			return false, nil
		}
		return err == nil, err
	default:
		return false, nil
	}
}

func IsNoRows(err error) bool { return err == pgx.ErrNoRows }
