package repo

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestJourneyRepositoryVisibilityAndNoDiveMapMutation(t *testing.T) {
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

	ownerID := "61000000-0000-4000-8000-000000000001"
	followerID := "61000000-0000-4000-8000-000000000002"
	strangerID := "61000000-0000-4000-8000-000000000003"
	entryPublic := "62000000-0000-4000-8000-000000000001"
	entryFollowers := "62000000-0000-4000-8000-000000000002"
	entryPrivate := "62000000-0000-4000-8000-000000000003"
	ownedMediaID := "63000000-0000-4000-8000-000000000001"
	otherMediaID := "63000000-0000-4000-8000-000000000002"

	cleanupJourneyRepositoryRows(t, ctx, pool, []string{entryPublic, entryFollowers, entryPrivate}, []string{ownerID, followerID, strangerID}, []string{ownedMediaID, otherMediaID})
	defer func() {
		cleanupJourneyRepositoryRows(t, ctx, pool, []string{entryPublic, entryFollowers, entryPrivate}, []string{ownerID, followerID, strangerID}, []string{ownedMediaID, otherMediaID})
	}()

	seedJourneyUser(t, ctx, pool, ownerID, "journey-owner")
	seedJourneyUser(t, ctx, pool, followerID, "journey-follower")
	seedJourneyUser(t, ctx, pool, strangerID, "journey-stranger")
	seedJourneyMedia(t, ctx, pool, ownedMediaID, ownerID, "journey/owned.jpg")
	seedJourneyMedia(t, ctx, pool, otherMediaID, strangerID, "journey/other.jpg")
	if _, err := pool.Exec(ctx, `
		INSERT INTO saved_users (viewer_app_user_id, saved_app_user_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, followerID, ownerID); err != nil {
		t.Fatalf("insert follow: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO journey_entries (id, user_id, type, title, body, visibility, occurred_at)
		VALUES
			($1, $4, 'custom', 'Public story', '', 'public', $5),
			($2, $4, 'custom', 'Follower story', '', 'followers', $5),
			($3, $4, 'custom', 'Private story', '', 'private', $5)
	`, entryPublic, entryFollowers, entryPrivate, ownerID, time.Date(2026, 5, 31, 9, 0, 0, 0, time.UTC)); err != nil {
		t.Fatalf("insert journey entries: %v", err)
	}

	repository := New(pool)
	owner, err := repository.GetOwnerByUsername(ctx, "journey-owner", followerID)
	if err != nil {
		t.Fatalf("get owner: %v", err)
	}
	if !owner.ViewerFollows || owner.ViewerIsSelf {
		t.Fatalf("expected follower relationship, got %+v", owner)
	}
	followerItems, err := repository.ListForProfile(ctx, ListProfileInput{
		TargetUserID:  owner.UserID,
		ViewerFollows: owner.ViewerFollows,
		Limit:         20,
	})
	if err != nil {
		t.Fatalf("list follower journey: %v", err)
	}
	if len(followerItems) != 2 {
		t.Fatalf("expected public+followers entries, got %d", len(followerItems))
	}

	strangerOwner, err := repository.GetOwnerByUsername(ctx, "journey-owner", strangerID)
	if err != nil {
		t.Fatalf("get stranger owner: %v", err)
	}
	strangerItems, err := repository.ListForProfile(ctx, ListProfileInput{
		TargetUserID:  strangerOwner.UserID,
		ViewerFollows: strangerOwner.ViewerFollows,
		Limit:         20,
	})
	if err != nil {
		t.Fatalf("list stranger journey: %v", err)
	}
	if len(strangerItems) != 1 || strangerItems[0].ID != entryPublic {
		t.Fatalf("expected public-only stranger visibility, got %+v", strangerItems)
	}

	created, err := repository.CreateManual(ctx, UpsertManualInput{
		UserID:     ownerID,
		Title:      "No proof story",
		Visibility: "public",
		OccurredAt: time.Date(2026, 5, 31, 10, 0, 0, 0, time.UTC),
		MediaIDs:   []string{ownedMediaID},
	})
	if err != nil {
		t.Fatalf("create manual journey: %v", err)
	}
	if created.DiveSiteID != "" {
		t.Fatalf("manual journey should allow no dive site, got %q", created.DiveSiteID)
	}
	if len(created.MediaIDs) != 1 || created.MediaIDs[0] != ownedMediaID {
		t.Fatalf("expected owned media attachment, got %#v", created.MediaIDs)
	}
	owned, err := repository.ListOwnedActiveMedia(ctx, ownerID, []string{ownedMediaID, otherMediaID})
	if err != nil {
		t.Fatalf("list owned active media: %v", err)
	}
	if _, ok := owned[ownedMediaID]; !ok {
		t.Fatalf("expected owned media to be attachable")
	}
	if _, ok := owned[otherMediaID]; ok {
		t.Fatalf("unowned media must not be attachable")
	}
	var mapRows int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM user_dive_sites WHERE user_id = $1`, ownerID).Scan(&mapRows); err != nil {
		t.Fatalf("count user_dive_sites: %v", err)
	}
	if mapRows != 0 {
		t.Fatalf("Journey writes must not unlock Dive Map sites, got %d rows", mapRows)
	}
}

func TestJourneyRepositoryUpsertGeneratedIsIdempotentBySource(t *testing.T) {
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

	ownerID := "61000000-0000-4000-8000-000000000101"
	sourceType := "dive_map"
	sourceID := "user_dive_site:61000000-0000-4000-8000-000000000101:site-1"

	defer func() {
		cleanupJourneyRepositoryRows(t, ctx, pool, nil, []string{ownerID}, nil)
	}()

	cleanupJourneyRepositoryRows(t, ctx, pool, nil, []string{ownerID}, nil)
	seedJourneyUser(t, ctx, pool, ownerID, "journey-generated-owner")
	repository := New(pool)
	occurredAt := time.Date(2026, 5, 31, 12, 0, 0, 0, time.UTC)

	first, err := repository.UpsertGenerated(ctx, UpsertGeneratedInput{
		UserID:     ownerID,
		Type:       "map_milestone",
		Title:      "First title",
		Body:       "Initial generated display row.",
		SourceType: sourceType,
		SourceID:   sourceID,
		Visibility: "public",
		OccurredAt: occurredAt,
	})
	if err != nil {
		t.Fatalf("first generated upsert: %v", err)
	}
	second, err := repository.UpsertGenerated(ctx, UpsertGeneratedInput{
		UserID:     ownerID,
		Type:       "map_milestone",
		Title:      "Updated title",
		Body:       "Regenerated display row.",
		SourceType: sourceType,
		SourceID:   sourceID,
		Visibility: "followers",
		OccurredAt: occurredAt.Add(time.Hour),
	})
	if err != nil {
		t.Fatalf("second generated upsert: %v", err)
	}
	if first.ID != second.ID {
		t.Fatalf("expected regeneration to update same row, first=%s second=%s", first.ID, second.ID)
	}
	if second.Title != "Updated title" || second.Visibility != "followers" {
		t.Fatalf("expected regenerated values, got %#v", second)
	}
	var rows int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM journey_entries
		WHERE user_id = $1
		  AND source_type = $2
		  AND source_id = $3
		  AND type = 'map_milestone'
	`, ownerID, sourceType, sourceID).Scan(&rows); err != nil {
		t.Fatalf("count generated rows: %v", err)
	}
	if rows != 1 {
		t.Fatalf("expected exactly one generated journey row after regeneration, got %d", rows)
	}
	if err := repository.HideGenerated(ctx, UpsertGeneratedInput{
		UserID:     ownerID,
		Type:       "map_milestone",
		SourceType: sourceType,
		SourceID:   sourceID,
	}); err != nil {
		t.Fatalf("hide generated row: %v", err)
	}
	var state string
	var hidden bool
	if err := pool.QueryRow(ctx, `
		SELECT state, hidden_at IS NOT NULL
		FROM journey_entries
		WHERE id = $1
	`, second.ID).Scan(&state, &hidden); err != nil {
		t.Fatalf("load hidden generated row: %v", err)
	}
	if state != "hidden" || !hidden {
		t.Fatalf("expected generated row to be hidden, got state=%q hidden_at=%v", state, hidden)
	}
	visibleRows, err := repository.ListForProfile(ctx, ListProfileInput{
		TargetUserID: ownerID,
		ViewerIsSelf: true,
		Limit:        20,
	})
	if err != nil {
		t.Fatalf("list after generated hide: %v", err)
	}
	if len(visibleRows) != 0 {
		t.Fatalf("hidden generated rows must not be profile-visible, got %#v", visibleRows)
	}
	var mapRows int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM user_dive_sites WHERE user_id = $1`, ownerID).Scan(&mapRows); err != nil {
		t.Fatalf("count user_dive_sites: %v", err)
	}
	if mapRows != 0 {
		t.Fatalf("generated Journey entries must not unlock Dive Map sites, got %d rows", mapRows)
	}
}

func cleanupJourneyRepositoryRows(t *testing.T, ctx context.Context, pool *pgxpool.Pool, entryIDs, userIDs, mediaIDs []string) {
	t.Helper()
	if len(entryIDs) > 0 {
		if _, err := pool.Exec(ctx, `DELETE FROM journey_entries WHERE id = ANY($1::uuid[])`, entryIDs); err != nil {
			t.Fatalf("cleanup journey entries: %v", err)
		}
	}
	if len(mediaIDs) > 0 {
		if _, err := pool.Exec(ctx, `DELETE FROM journey_entry_media WHERE media_id = ANY($1::uuid[])`, mediaIDs); err != nil {
			t.Fatalf("cleanup journey media: %v", err)
		}
		if _, err := pool.Exec(ctx, `DELETE FROM media_objects WHERE id = ANY($1::uuid[])`, mediaIDs); err != nil {
			t.Fatalf("cleanup media: %v", err)
		}
	}
	if len(userIDs) > 0 {
		if _, err := pool.Exec(ctx, `DELETE FROM journey_entries WHERE user_id = ANY($1::uuid[])`, userIDs); err != nil {
			t.Fatalf("cleanup user journey entries: %v", err)
		}
		if _, err := pool.Exec(ctx, `DELETE FROM saved_users WHERE viewer_app_user_id = ANY($1::uuid[]) OR saved_app_user_id = ANY($1::uuid[])`, userIDs); err != nil {
			t.Fatalf("cleanup saved users: %v", err)
		}
		if _, err := pool.Exec(ctx, `DELETE FROM users WHERE id = ANY($1::uuid[])`, userIDs); err != nil {
			t.Fatalf("cleanup users: %v", err)
		}
	}
}

func seedJourneyUser(t *testing.T, ctx context.Context, pool *pgxpool.Pool, id, username string) {
	t.Helper()
	if _, err := pool.Exec(ctx, `
		INSERT INTO users (id, username, display_name, account_status)
		VALUES ($1, $2, $2, 'active')
		ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, account_status = 'active'
	`, id, username); err != nil {
		t.Fatalf("seed user: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO profiles (user_id)
		VALUES ($1)
		ON CONFLICT (user_id) DO NOTHING
	`, id); err != nil {
		t.Fatalf("seed profile: %v", err)
	}
}

func seedJourneyMedia(t *testing.T, ctx context.Context, pool *pgxpool.Pool, id, ownerID, key string) {
	t.Helper()
	if _, err := pool.Exec(ctx, `
		INSERT INTO media_objects (
			id, owner_app_user_id, context_type, object_key, mime_type,
			size_bytes, width, height, state
		)
		VALUES ($1, $2, 'profile_feed', $3, 'image/jpeg', 1200, 100, 100, 'active')
		ON CONFLICT (id) DO UPDATE SET owner_app_user_id = EXCLUDED.owner_app_user_id, state = 'active'
	`, id, ownerID, key); err != nil {
		t.Fatalf("seed media: %v", err)
	}
}
