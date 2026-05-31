package repo

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestDiveMemoryRepositoryFoundationsDoNotMutateDiveMap(t *testing.T) {
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

	authorID := "71000000-0000-4000-8000-000000000001"
	taggedID := "71000000-0000-4000-8000-000000000002"
	siteID := "72000000-0000-4000-8000-000000000001"
	mediaID := "73000000-0000-4000-8000-000000000001"

	cleanupDiveMemoryRows(t, ctx, pool, []string{authorID, taggedID}, []string{siteID}, []string{mediaID})
	defer cleanupDiveMemoryRows(t, ctx, pool, []string{authorID, taggedID}, []string{siteID}, []string{mediaID})

	seedDiveMemoryUser(t, ctx, pool, authorID, "memory-author")
	seedDiveMemoryUser(t, ctx, pool, taggedID, "memory-tagged")
	seedDiveMemorySite(t, ctx, pool, siteID, "memory-site")
	seedDiveMemoryMedia(t, ctx, pool, mediaID, authorID, "memory/one.jpg")

	repository := New(pool)
	created, err := repository.Create(ctx, UpsertMemoryInput{
		AuthorUserID: authorID,
		DiveSiteID:   siteID,
		Title:        "Context, not proof",
		Body:         "Social dive note.",
		Visibility:   "tagged",
		OccurredAt:   time.Date(2026, 5, 31, 8, 0, 0, 0, time.UTC),
		MediaIDs:     []string{mediaID},
	})
	if err != nil {
		t.Fatalf("create memory: %v", err)
	}
	if created.ID == "" || created.DiveSiteID != siteID || created.Visibility != "tagged" {
		t.Fatalf("unexpected created memory: %#v", created)
	}
	mediaRows, err := repository.ListMedia(ctx, created.ID)
	if err != nil {
		t.Fatalf("list memory media: %v", err)
	}
	if len(mediaRows) != 1 || mediaRows[0].MediaID != mediaID || mediaRows[0].SortOrder != 0 {
		t.Fatalf("unexpected media rows: %#v", mediaRows)
	}

	tag, err := repository.UpsertTag(ctx, created.ID, taggedID)
	if err != nil {
		t.Fatalf("upsert tag: %v", err)
	}
	if tag.Status != "pending" {
		t.Fatalf("new tags must start pending, got %q", tag.Status)
	}
	accepted, err := repository.UpdateTagStatus(ctx, created.ID, taggedID, "accepted")
	if err != nil {
		t.Fatalf("accept tag: %v", err)
	}
	if accepted.Status != "accepted" {
		t.Fatalf("expected accepted tag, got %#v", accepted)
	}

	own, err := repository.ListOwn(ctx, authorID, 10)
	if err != nil {
		t.Fatalf("list own memories: %v", err)
	}
	if len(own) != 1 || own[0].ID != created.ID {
		t.Fatalf("expected created memory in own list, got %#v", own)
	}

	mapMemories, err := repository.ListForOwnedMapSite(ctx, authorID, siteID, 10)
	if err != nil {
		t.Fatalf("list map-gated memories: %v", err)
	}
	if len(mapMemories) != 0 {
		t.Fatalf("memory must not appear in Dive Map marker without user_dive_sites ownership, got %#v", mapMemories)
	}
	assertNoDiveMemoryMapOwnership(t, ctx, pool, authorID, siteID)

	updated, err := repository.Update(ctx, UpsertMemoryInput{
		ID:           created.ID,
		AuthorUserID: authorID,
		DiveSiteID:   siteID,
		Title:        "Updated context",
		Body:         "Still not proof.",
		Visibility:   "followers",
		OccurredAt:   time.Date(2026, 5, 31, 9, 0, 0, 0, time.UTC),
	})
	if err != nil {
		t.Fatalf("update memory: %v", err)
	}
	if updated.Title != "Updated context" || updated.Visibility != "followers" {
		t.Fatalf("unexpected updated memory: %#v", updated)
	}
	assertNoDiveMemoryMapOwnership(t, ctx, pool, authorID, siteID)

	if err := repository.SoftDelete(ctx, authorID, created.ID); err != nil {
		t.Fatalf("soft delete memory: %v", err)
	}
	if _, err := repository.Update(ctx, UpsertMemoryInput{
		ID:           created.ID,
		AuthorUserID: authorID,
		DiveSiteID:   siteID,
		Title:        "Cannot update",
		Visibility:   "private",
		OccurredAt:   time.Date(2026, 5, 31, 10, 0, 0, 0, time.UTC),
	}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound updating deleted memory, got %v", err)
	}
	assertNoDiveMemoryMapOwnership(t, ctx, pool, authorID, siteID)
}

func cleanupDiveMemoryRows(t *testing.T, ctx context.Context, pool *pgxpool.Pool, userIDs []string, siteIDs []string, mediaIDs []string) {
	t.Helper()
	for _, userID := range userIDs {
		if _, err := pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID); err != nil {
			t.Fatalf("delete user %s: %v", userID, err)
		}
	}
	for _, mediaID := range mediaIDs {
		if _, err := pool.Exec(ctx, `DELETE FROM media_objects WHERE id = $1`, mediaID); err != nil {
			t.Fatalf("delete media %s: %v", mediaID, err)
		}
	}
	for _, siteID := range siteIDs {
		if _, err := pool.Exec(ctx, `DELETE FROM dive_sites WHERE id = $1`, siteID); err != nil {
			t.Fatalf("delete dive site %s: %v", siteID, err)
		}
	}
}

func seedDiveMemoryUser(t *testing.T, ctx context.Context, pool *pgxpool.Pool, id, username string) {
	t.Helper()
	if _, err := pool.Exec(ctx, `
		INSERT INTO users (id, username, display_name, account_status)
		VALUES ($1, $2, $2, 'active')
		ON CONFLICT (id) DO NOTHING
	`, id, username); err != nil {
		t.Fatalf("seed user %s: %v", id, err)
	}
}

func seedDiveMemorySite(t *testing.T, ctx context.Context, pool *pgxpool.Pool, id, slug string) {
	t.Helper()
	if _, err := pool.Exec(ctx, `
		INSERT INTO dive_sites (id, name, slug, area, entry_difficulty, moderation_state)
		VALUES ($1, $2, $2, 'Batangas', 'easy', 'approved')
		ON CONFLICT (id) DO NOTHING
	`, id, slug); err != nil {
		t.Fatalf("seed dive site %s: %v", id, err)
	}
}

func seedDiveMemoryMedia(t *testing.T, ctx context.Context, pool *pgxpool.Pool, id, ownerID, objectKey string) {
	t.Helper()
	if _, err := pool.Exec(ctx, `
		INSERT INTO media_objects (id, owner_app_user_id, context_type, object_key, mime_type, size_bytes, width, height, state)
		VALUES ($1, $2, 'profile_feed', $3, 'image/jpeg', 1024, 100, 100, 'active')
		ON CONFLICT (id) DO NOTHING
	`, id, ownerID, objectKey); err != nil {
		t.Fatalf("seed media %s: %v", id, err)
	}
}

func assertNoDiveMemoryMapOwnership(t *testing.T, ctx context.Context, pool *pgxpool.Pool, userID, siteID string) {
	t.Helper()
	var rows int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM user_dive_sites WHERE user_id = $1 AND dive_site_id = $2`, userID, siteID).Scan(&rows); err != nil {
		t.Fatalf("count user_dive_sites: %v", err)
	}
	if rows != 0 {
		t.Fatalf("Dive Memories must not create user_dive_sites rows, got %d", rows)
	}
}
