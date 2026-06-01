package db_test

import (
	"context"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestDiveMapBackfillMigrationMatchesProofContract(t *testing.T) {
	raw, err := os.ReadFile("migrations/0091_backfill_user_dive_sites.sql")
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}
	migration := normalizeSQLForContract(string(raw))

	required := []string{
		"insert into user_dive_sites",
		"from media_posts p",
		"join dive_sites ds on ds.id = p.dive_site_id",
		"ds.moderation_state = 'approved'",
		"mi.author_app_user_id = p.author_app_user_id",
		"mi.dive_site_id = p.dive_site_id",
		"mi.status = 'active'",
		"mi.processing_status = 'ready'",
		"mi.moderation_status = 'approved'",
		"on conflict (user_id, dive_site_id) do update",
	}
	for _, expected := range required {
		if !strings.Contains(migration, expected) {
			t.Fatalf("migration is missing proof contract fragment %q", expected)
		}
	}
	if strings.Contains(migration, "visibility = excluded.visibility") {
		t.Fatal("backfill must not overwrite existing user_dive_sites visibility")
	}
}

func TestDiveMapBackfillMigrationPopulatesLegacyUserDiveSites(t *testing.T) {
	baseDSN := os.Getenv("TEST_DB_DSN")
	if baseDSN == "" {
		t.Skip("TEST_DB_DSN is not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	baseCfg, err := pgxpool.ParseConfig(baseDSN)
	if err != nil {
		t.Fatalf("parse TEST_DB_DSN: %v", err)
	}

	adminCfg := baseCfg.Copy()
	adminCfg.ConnConfig.Database = "postgres"
	adminPool, err := pgxpool.NewWithConfig(ctx, adminCfg)
	if err != nil {
		t.Fatalf("connect admin db: %v", err)
	}
	defer adminPool.Close()

	testDBName := fmt.Sprintf("fph_dive_map_0091_test_%d", time.Now().UnixNano())
	if _, err := adminPool.Exec(ctx, fmt.Sprintf(`CREATE DATABASE "%s"`, testDBName)); err != nil {
		t.Fatalf("create temp db: %v", err)
	}
	defer func() {
		_, _ = adminPool.Exec(context.Background(), `
			SELECT pg_terminate_backend(pid)
			FROM pg_stat_activity
			WHERE datname = $1 AND pid <> pg_backend_pid()
		`, testDBName)
		_, _ = adminPool.Exec(context.Background(), fmt.Sprintf(`DROP DATABASE IF EXISTS "%s"`, testDBName))
	}()

	testDSN, err := dsnWithDatabase(baseDSN, testDBName)
	if err != nil {
		t.Fatalf("build temp db dsn: %v", err)
	}
	if err := runGoose(t, testDSN, "up-to", "90"); err != nil {
		t.Fatalf("goose up-to 90 failed: %v", err)
	}

	pool, err := pgxpool.New(ctx, testDSN)
	if err != nil {
		t.Fatalf("connect temp db: %v", err)
	}
	defer pool.Close()

	seedDiveMapBackfill0091(ctx, t, pool)

	if err := runGoose(t, testDSN, "up-to", "91"); err != nil {
		t.Fatalf("goose up-to 91 failed: %v", err)
	}

	assertDiveMapBackfill0091(ctx, t, pool)
}

func seedDiveMapBackfill0091(ctx context.Context, t *testing.T, pool *pgxpool.Pool) {
	t.Helper()

	mustExec := func(label, query string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, query, args...); err != nil {
			t.Fatalf("%s: %v", label, err)
		}
	}

	mustExec("insert users", `
		INSERT INTO users (id, username, display_name, account_status)
		VALUES
			('10000000-0000-4000-8000-000000009101', 'dive-map-backfill-owner', 'Dive Map Owner', 'active'),
			('10000000-0000-4000-8000-000000009102', 'dive-map-backfill-other', 'Dive Map Other', 'active')
	`)
	mustExec("insert dive sites", `
		INSERT INTO dive_sites (id, name, slug, area, entry_difficulty, moderation_state)
		VALUES
			('20000000-0000-4000-8000-000000009101', 'Backfill Apo', 'backfill-apo', 'Negros Oriental', 'easy', 'approved'),
			('20000000-0000-4000-8000-000000009102', 'Backfill Balicasag', 'backfill-balicasag', 'Bohol', 'moderate', 'approved'),
			('20000000-0000-4000-8000-000000009103', 'Backfill Pending', 'backfill-pending', 'Cebu', 'easy', 'pending')
	`)
	mustExec("insert legacy media proof", `
		INSERT INTO media_upload_groups (id, author_app_user_id, source, item_count, created_at)
		VALUES
			('30000000-0000-4000-8000-000000009101', '10000000-0000-4000-8000-000000009101', 'create_post', 1, '2026-05-01T08:00:00Z'),
			('30000000-0000-4000-8000-000000009102', '10000000-0000-4000-8000-000000009101', 'create_post', 1, '2026-05-03T08:00:00Z'),
			('30000000-0000-4000-8000-000000009103', '10000000-0000-4000-8000-000000009101', 'create_post', 1, '2026-05-05T08:00:00Z'),
			('30000000-0000-4000-8000-000000009104', '10000000-0000-4000-8000-000000009101', 'create_post', 1, '2026-05-07T08:00:00Z'),
			('30000000-0000-4000-8000-000000009105', '10000000-0000-4000-8000-000000009101', 'create_post', 1, '2026-05-09T08:00:00Z'),
			('30000000-0000-4000-8000-000000009106', '10000000-0000-4000-8000-000000009102', 'create_post', 1, '2026-05-11T08:00:00Z')
	`)
	mustExec("insert media objects", `
		INSERT INTO media_objects (
			id, owner_app_user_id, context_type, object_key, mime_type,
			size_bytes, width, height, state
		)
		VALUES
			('40000000-0000-4000-8000-000000009101', '10000000-0000-4000-8000-000000009101', 'profile_feed', 'backfill/first.jpg', 'image/jpeg', 1024, 100, 100, 'active'),
			('40000000-0000-4000-8000-000000009102', '10000000-0000-4000-8000-000000009101', 'profile_feed', 'backfill/second.jpg', 'image/jpeg', 1024, 100, 100, 'active'),
			('40000000-0000-4000-8000-000000009103', '10000000-0000-4000-8000-000000009101', 'profile_feed', 'backfill/deleted.jpg', 'image/jpeg', 1024, 100, 100, 'active'),
			('40000000-0000-4000-8000-000000009104', '10000000-0000-4000-8000-000000009101', 'profile_feed', 'backfill/rejected.jpg', 'image/jpeg', 1024, 100, 100, 'active'),
			('40000000-0000-4000-8000-000000009105', '10000000-0000-4000-8000-000000009101', 'profile_feed', 'backfill/pending-site.jpg', 'image/jpeg', 1024, 100, 100, 'active'),
			('40000000-0000-4000-8000-000000009106', '10000000-0000-4000-8000-000000009102', 'profile_feed', 'backfill/other.jpg', 'image/jpeg', 1024, 100, 100, 'active')
	`)
	mustExec("insert media posts", `
		INSERT INTO media_posts (id, author_app_user_id, upload_group_id, dive_site_id, created_at, deleted_at)
		VALUES
			('50000000-0000-4000-8000-000000009101', '10000000-0000-4000-8000-000000009101', '30000000-0000-4000-8000-000000009101', '20000000-0000-4000-8000-000000009101', '2026-05-01T08:00:00Z', NULL),
			('50000000-0000-4000-8000-000000009102', '10000000-0000-4000-8000-000000009101', '30000000-0000-4000-8000-000000009102', '20000000-0000-4000-8000-000000009101', '2026-05-03T08:00:00Z', NULL),
			('50000000-0000-4000-8000-000000009103', '10000000-0000-4000-8000-000000009101', '30000000-0000-4000-8000-000000009103', '20000000-0000-4000-8000-000000009102', '2026-05-05T08:00:00Z', '2026-05-06T08:00:00Z'),
			('50000000-0000-4000-8000-000000009104', '10000000-0000-4000-8000-000000009101', '30000000-0000-4000-8000-000000009104', '20000000-0000-4000-8000-000000009102', '2026-05-07T08:00:00Z', NULL),
			('50000000-0000-4000-8000-000000009105', '10000000-0000-4000-8000-000000009101', '30000000-0000-4000-8000-000000009105', '20000000-0000-4000-8000-000000009103', '2026-05-09T08:00:00Z', NULL),
			('50000000-0000-4000-8000-000000009106', '10000000-0000-4000-8000-000000009102', '30000000-0000-4000-8000-000000009106', '20000000-0000-4000-8000-000000009101', '2026-05-11T08:00:00Z', NULL)
	`)
	mustExec("insert media items", `
		INSERT INTO media_items (
			post_id, media_object_id, author_app_user_id, upload_group_id, dive_site_id,
			type, storage_key, mime_type, width, height, status,
			processing_status, moderation_status, created_at
		)
		VALUES
			('50000000-0000-4000-8000-000000009101', '40000000-0000-4000-8000-000000009101', '10000000-0000-4000-8000-000000009101', '30000000-0000-4000-8000-000000009101', '20000000-0000-4000-8000-000000009101', 'photo', 'backfill/first.jpg', 'image/jpeg', 100, 100, 'active', 'ready', 'approved', '2026-05-01T08:00:00Z'),
			('50000000-0000-4000-8000-000000009102', '40000000-0000-4000-8000-000000009102', '10000000-0000-4000-8000-000000009101', '30000000-0000-4000-8000-000000009102', '20000000-0000-4000-8000-000000009101', 'photo', 'backfill/second.jpg', 'image/jpeg', 100, 100, 'active', 'ready', 'approved', '2026-05-03T08:00:00Z'),
			('50000000-0000-4000-8000-000000009103', '40000000-0000-4000-8000-000000009103', '10000000-0000-4000-8000-000000009101', '30000000-0000-4000-8000-000000009103', '20000000-0000-4000-8000-000000009102', 'photo', 'backfill/deleted.jpg', 'image/jpeg', 100, 100, 'active', 'ready', 'approved', '2026-05-05T08:00:00Z'),
			('50000000-0000-4000-8000-000000009104', '40000000-0000-4000-8000-000000009104', '10000000-0000-4000-8000-000000009101', '30000000-0000-4000-8000-000000009104', '20000000-0000-4000-8000-000000009102', 'photo', 'backfill/rejected.jpg', 'image/jpeg', 100, 100, 'active', 'ready', 'rejected', '2026-05-07T08:00:00Z'),
			('50000000-0000-4000-8000-000000009105', '40000000-0000-4000-8000-000000009105', '10000000-0000-4000-8000-000000009101', '30000000-0000-4000-8000-000000009105', '20000000-0000-4000-8000-000000009103', 'photo', 'backfill/pending-site.jpg', 'image/jpeg', 100, 100, 'active', 'ready', 'approved', '2026-05-09T08:00:00Z'),
			('50000000-0000-4000-8000-000000009106', '40000000-0000-4000-8000-000000009106', '10000000-0000-4000-8000-000000009102', '30000000-0000-4000-8000-000000009106', '20000000-0000-4000-8000-000000009101', 'photo', 'backfill/other.jpg', 'image/jpeg', 100, 100, 'active', 'ready', 'approved', '2026-05-11T08:00:00Z')
	`)
	mustExec("insert existing private marker", `
		INSERT INTO user_dive_sites (
			user_id, dive_site_id, first_post_id, first_visited_at, last_post_id,
			last_visited_at, media_post_count, visibility
		)
		VALUES (
			'10000000-0000-4000-8000-000000009101',
			'20000000-0000-4000-8000-000000009101',
			'50000000-0000-4000-8000-000000009101',
			'2026-05-01T08:00:00Z',
			'50000000-0000-4000-8000-000000009101',
			'2026-05-01T08:00:00Z',
			1,
			'private'
		)
	`)
}

func assertDiveMapBackfill0091(ctx context.Context, t *testing.T, pool *pgxpool.Pool) {
	t.Helper()

	var (
		firstPostID    string
		lastPostID     string
		mediaPostCount int
		visibility     string
	)
	if err := pool.QueryRow(ctx, `
		SELECT first_post_id::text, last_post_id::text, media_post_count, visibility
		FROM user_dive_sites
		WHERE user_id = '10000000-0000-4000-8000-000000009101'
		  AND dive_site_id = '20000000-0000-4000-8000-000000009101'
	`).Scan(&firstPostID, &lastPostID, &mediaPostCount, &visibility); err != nil {
		t.Fatalf("query owner backfilled marker: %v", err)
	}
	if firstPostID != "50000000-0000-4000-8000-000000009101" ||
		lastPostID != "50000000-0000-4000-8000-000000009102" ||
		mediaPostCount != 2 ||
		visibility != "private" {
		t.Fatalf("unexpected owner marker summary: first=%s last=%s count=%d visibility=%s", firstPostID, lastPostID, mediaPostCount, visibility)
	}

	var otherCount int
	if err := pool.QueryRow(ctx, `
		SELECT media_post_count
		FROM user_dive_sites
		WHERE user_id = '10000000-0000-4000-8000-000000009102'
		  AND dive_site_id = '20000000-0000-4000-8000-000000009101'
	`).Scan(&otherCount); err != nil {
		t.Fatalf("query other user's marker: %v", err)
	}
	if otherCount != 1 {
		t.Fatalf("other user's marker count = %d, want 1", otherCount)
	}

	var ownerVisitedCount int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(DISTINCT s.id)::int
		FROM user_dive_sites uds
		JOIN dive_sites s ON s.id = uds.dive_site_id
		WHERE uds.user_id = '10000000-0000-4000-8000-000000009101'
		  AND s.moderation_state = 'approved'
	`).Scan(&ownerVisitedCount); err != nil {
		t.Fatalf("query owner visited count: %v", err)
	}
	if ownerVisitedCount != 1 {
		t.Fatalf("owner visited count = %d, want 1", ownerVisitedCount)
	}

	var excludedRows int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*)::int
		FROM user_dive_sites
		WHERE user_id = '10000000-0000-4000-8000-000000009101'
		  AND dive_site_id IN (
		    '20000000-0000-4000-8000-000000009102',
		    '20000000-0000-4000-8000-000000009103'
		  )
	`).Scan(&excludedRows); err != nil {
		t.Fatalf("query excluded marker rows: %v", err)
	}
	if excludedRows != 0 {
		t.Fatalf("excluded legacy proof created %d marker rows, want 0", excludedRows)
	}
}
