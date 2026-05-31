package repo

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestRecomputeUserDiveSiteFromOwnedMediaPosts(t *testing.T) {
	dsn := os.Getenv("TEST_DB_DSN")
	if dsn == "" {
		t.Skip("TEST_DB_DSN is not set")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("connect test db: %v", err)
	}
	defer pool.Close()

	ownerID := "10000000-0000-4000-8000-000000000001"
	otherID := "10000000-0000-4000-8000-000000000002"
	siteID := "20000000-0000-4000-8000-000000000001"
	nextSiteID := "20000000-0000-4000-8000-000000000002"
	firstPostID := "30000000-0000-4000-8000-000000000001"
	secondPostID := "30000000-0000-4000-8000-000000000002"
	otherPostID := "30000000-0000-4000-8000-000000000003"

	defer func() {
		_, _ = pool.Exec(ctx, `DELETE FROM users WHERE id IN ($1, $2)`, ownerID, otherID)
		_, _ = pool.Exec(ctx, `DELETE FROM dive_sites WHERE id IN ($1, $2)`, siteID, nextSiteID)
	}()

	seedUser(t, ctx, pool, ownerID, "dive-map-owner")
	seedUser(t, ctx, pool, otherID, "dive-map-other")
	seedDiveSite(t, ctx, pool, siteID, "dive-map-site-one")
	seedDiveSite(t, ctx, pool, nextSiteID, "dive-map-site-two")
	seedProofPost(t, ctx, pool, firstPostID, "40000000-0000-4000-8000-000000000001", "50000000-0000-4000-8000-000000000001", ownerID, siteID, time.Date(2026, 5, 1, 8, 0, 0, 0, time.UTC))
	seedProofPost(t, ctx, pool, otherPostID, "40000000-0000-4000-8000-000000000003", "50000000-0000-4000-8000-000000000003", otherID, siteID, time.Date(2026, 5, 2, 8, 0, 0, 0, time.UTC))

	repository := New(pool)
	if err := repository.RecomputeUserDiveSite(ctx, ownerID, siteID); err != nil {
		t.Fatalf("recompute first proof: %v", err)
	}
	assertDiveSiteSummary(t, ctx, pool, ownerID, siteID, 1, firstPostID, firstPostID)

	if err := repository.RecomputeUserDiveSite(ctx, otherID, siteID); err != nil {
		t.Fatalf("recompute other user's proof: %v", err)
	}
	assertDiveSiteSummary(t, ctx, pool, ownerID, siteID, 1, firstPostID, firstPostID)

	seedProofPost(t, ctx, pool, secondPostID, "40000000-0000-4000-8000-000000000002", "50000000-0000-4000-8000-000000000002", ownerID, siteID, time.Date(2026, 5, 3, 8, 0, 0, 0, time.UTC))
	if err := repository.RecomputeUserDiveSite(ctx, ownerID, siteID); err != nil {
		t.Fatalf("recompute multiple proofs: %v", err)
	}
	assertDiveSiteSummary(t, ctx, pool, ownerID, siteID, 2, firstPostID, secondPostID)

	if _, err := pool.Exec(ctx, `UPDATE media_posts SET deleted_at = NOW() WHERE id = $1`, firstPostID); err != nil {
		t.Fatalf("soft delete first proof: %v", err)
	}
	if err := repository.RecomputeUserDiveSite(ctx, ownerID, siteID); err != nil {
		t.Fatalf("recompute after delete: %v", err)
	}
	assertDiveSiteSummary(t, ctx, pool, ownerID, siteID, 1, secondPostID, secondPostID)

	if _, err := pool.Exec(ctx, `UPDATE media_items SET dive_site_id = $2 WHERE post_id = $1`, secondPostID, nextSiteID); err != nil {
		t.Fatalf("retag media item: %v", err)
	}
	if _, err := pool.Exec(ctx, `UPDATE media_posts SET dive_site_id = $2 WHERE id = $1`, secondPostID, nextSiteID); err != nil {
		t.Fatalf("retag media post: %v", err)
	}
	if err := repository.RecomputeUserDiveSite(ctx, ownerID, siteID); err != nil {
		t.Fatalf("recompute old site after retag: %v", err)
	}
	assertNoDiveSiteSummary(t, ctx, pool, ownerID, siteID)
	if err := repository.RecomputeUserDiveSite(ctx, ownerID, nextSiteID); err != nil {
		t.Fatalf("recompute new site after retag: %v", err)
	}
	assertDiveSiteSummary(t, ctx, pool, ownerID, nextSiteID, 1, secondPostID, secondPostID)

	if _, err := pool.Exec(ctx, `UPDATE media_items SET dive_site_id = NULL WHERE post_id = $1`, secondPostID); err != nil {
		t.Fatalf("untag media item: %v", err)
	}
	if _, err := pool.Exec(ctx, `UPDATE media_posts SET dive_site_id = NULL WHERE id = $1`, secondPostID); err != nil {
		t.Fatalf("untag media post: %v", err)
	}
	if err := repository.RecomputeUserDiveSite(ctx, ownerID, nextSiteID); err != nil {
		t.Fatalf("recompute after untag: %v", err)
	}
	assertNoDiveSiteSummary(t, ctx, pool, ownerID, nextSiteID)
}

func seedUser(t *testing.T, ctx context.Context, pool *pgxpool.Pool, id, username string) {
	t.Helper()
	_, err := pool.Exec(ctx, `
		INSERT INTO users (id, username, display_name, account_status)
		VALUES ($1, $2, $2, 'active')
		ON CONFLICT (id) DO NOTHING
	`, id, username)
	if err != nil {
		t.Fatalf("seed user %s: %v", id, err)
	}
}

func seedDiveSite(t *testing.T, ctx context.Context, pool *pgxpool.Pool, id, slug string) {
	t.Helper()
	_, err := pool.Exec(ctx, `
		INSERT INTO dive_sites (id, name, slug, area, entry_difficulty, moderation_state)
		VALUES ($1, $2, $2, 'Batangas', 'easy', 'approved')
		ON CONFLICT (id) DO NOTHING
	`, id, slug)
	if err != nil {
		t.Fatalf("seed dive site %s: %v", id, err)
	}
}

func seedProofPost(t *testing.T, ctx context.Context, pool *pgxpool.Pool, postID, groupID, objectID, userID, siteID string, createdAt time.Time) {
	t.Helper()
	_, err := pool.Exec(ctx, `
		INSERT INTO media_objects (id, owner_app_user_id, context_type, object_key, mime_type, size_bytes, width, height, state, created_at)
		VALUES ($1, $2, 'profile_feed', $3, 'image/jpeg', 1024, 100, 100, 'active', $4)
	`, objectID, userID, objectID+".jpg", createdAt)
	if err != nil {
		t.Fatalf("seed media object %s: %v", objectID, err)
	}
	_, err = pool.Exec(ctx, `
		INSERT INTO media_upload_groups (id, author_app_user_id, source, item_count, created_at)
		VALUES ($1, $2, 'create_post', 1, $3)
	`, groupID, userID, createdAt)
	if err != nil {
		t.Fatalf("seed media group %s: %v", groupID, err)
	}
	_, err = pool.Exec(ctx, `
		INSERT INTO media_posts (id, author_app_user_id, upload_group_id, dive_site_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $5)
	`, postID, userID, groupID, siteID, createdAt)
	if err != nil {
		t.Fatalf("seed media post %s: %v", postID, err)
	}
	_, err = pool.Exec(ctx, `
		INSERT INTO media_items (post_id, media_object_id, author_app_user_id, upload_group_id, dive_site_id, type, storage_key, mime_type, width, height, sort_order, status, processing_status, moderation_status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, 'photo', $6, 'image/jpeg', 100, 100, 0, 'active', 'ready', 'approved', $7, $7)
	`, postID, objectID, userID, groupID, siteID, objectID+".jpg", createdAt)
	if err != nil {
		t.Fatalf("seed media item for post %s: %v", postID, err)
	}
}

func assertDiveSiteSummary(t *testing.T, ctx context.Context, pool *pgxpool.Pool, userID, siteID string, expectedCount int32, expectedFirstPostID, expectedLastPostID string) {
	t.Helper()
	var count int32
	var firstPostID string
	var lastPostID string
	err := pool.QueryRow(ctx, `
		SELECT media_post_count, first_post_id::text, last_post_id::text
		FROM user_dive_sites
		WHERE user_id = $1 AND dive_site_id = $2
	`, userID, siteID).Scan(&count, &firstPostID, &lastPostID)
	if err != nil {
		t.Fatalf("load user dive site summary: %v", err)
	}
	if count != expectedCount || firstPostID != expectedFirstPostID || lastPostID != expectedLastPostID {
		t.Fatalf("unexpected summary count=%d first=%s last=%s", count, firstPostID, lastPostID)
	}
}

func assertNoDiveSiteSummary(t *testing.T, ctx context.Context, pool *pgxpool.Pool, userID, siteID string) {
	t.Helper()
	var count int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM user_dive_sites WHERE user_id = $1 AND dive_site_id = $2`, userID, siteID).Scan(&count); err != nil {
		t.Fatalf("count user dive site summary: %v", err)
	}
	if count != 0 {
		t.Fatalf("expected no user dive site summary, got %d", count)
	}
}
