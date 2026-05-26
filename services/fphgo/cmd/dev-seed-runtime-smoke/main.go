package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const confirmEnv = "CONFIRM_DEV_SEED_RUNTIME_SMOKE"

type userRef struct {
	ID          string
	Username    string
	DisplayName string
}

func main() {
	var inspectOnly bool
	flag.BoolVar(&inspectOnly, "inspect", false, "inspect local runtime-smoke fixture state without changing data")
	flag.Parse()

	if err := loadDotEnv(".env"); err != nil {
		die("load .env: %v", err)
	}

	dsn := strings.TrimSpace(os.Getenv("DB_DSN"))
	if dsn == "" {
		die("DB_DSN is required")
	}
	appEnv := strings.TrimSpace(os.Getenv("APP_ENV"))
	if err := ensureLocalDevTarget(dsn, appEnv); err != nil {
		die("%v", err)
	}
	if !inspectOnly && os.Getenv(confirmEnv) != "1" {
		die("%s=1 is required to seed runtime-smoke fixtures", confirmEnv)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		die("connect db: %v", err)
	}
	defer pool.Close()

	viewer, err := resolveViewer(ctx, pool)
	if err != nil {
		die("resolve smoke viewer: %v", err)
	}

	counts, err := loadCounts(ctx, pool)
	if err != nil {
		die("inspect counts: %v", err)
	}
	fmt.Println("Runtime smoke local DB target accepted.")
	fmt.Printf("viewer=%s username=%s displayName=%q\n", viewer.ID, viewer.Username, viewer.DisplayName)
	for _, key := range sortedKeys(counts) {
		fmt.Printf("count.%s=%d\n", key, counts[key])
	}

	if inspectOnly {
		return
	}

	if err := seed(ctx, pool, viewer); err != nil {
		die("seed fixtures: %v", err)
	}

	fmt.Println("Runtime smoke fixtures seeded.")
	fmt.Println("users:")
	fmt.Println("- runtime_smoke_event_owner")
	fmt.Println("- runtime_smoke_buddy")
	fmt.Println("- runtime_smoke_messenger")
	fmt.Println("- runtime_smoke_requester")
	fmt.Println("- runtime_smoke_group_owner")
	fmt.Println("events:")
	fmt.Println("- runtime-smoke-joinable-event")
	fmt.Println("buddies:")
	fmt.Println("- runtime smoke buddy intent owned by runtime_smoke_buddy")
	fmt.Println("messages:")
	fmt.Println("- primary thread: 30000000-0000-4000-8000-000000000001")
	fmt.Println("- request thread: 30000000-0000-4000-8000-000000000002")
	fmt.Println("groups:")
	fmt.Println("- runtime-smoke-joinable-group")
	fmt.Println("- runtime-smoke-member-group")
}

func loadDotEnv(path string) error {
	abs, err := filepath.Abs(path)
	if err != nil {
		return err
	}
	data, err := os.ReadFile(abs)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") || !strings.Contains(line, "=") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"'`)
		if key == "" {
			continue
		}
		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, value)
		}
	}
	return nil
}

func ensureLocalDevTarget(dsn string, appEnv string) error {
	env := strings.ToLower(strings.TrimSpace(appEnv))
	if env == "production" || env == "prod" {
		return fmt.Errorf("refusing to run with APP_ENV=%q", appEnv)
	}
	parsed, err := url.Parse(dsn)
	if err != nil {
		return fmt.Errorf("invalid DB_DSN: %w", err)
	}
	host := strings.ToLower(parsed.Hostname())
	dbName := strings.TrimPrefix(parsed.Path, "/")
	if host != "localhost" && host != "127.0.0.1" && host != "::1" {
		return fmt.Errorf("refusing non-local DB host %q", host)
	}
	if strings.Contains(strings.ToLower(dbName), "prod") || strings.Contains(strings.ToLower(dbName), "production") {
		return fmt.Errorf("refusing production-looking database name %q", dbName)
	}
	productionMarkers := []string{"render.com", "amazonaws.com", "neon.tech", "supabase", "railway", "freediving-ph-db"}
	lowerDSN := strings.ToLower(dsn)
	for _, marker := range productionMarkers {
		if strings.Contains(lowerDSN, marker) {
			return fmt.Errorf("refusing production-looking DB_DSN containing %q", marker)
		}
	}
	return nil
}

func resolveViewer(ctx context.Context, pool *pgxpool.Pool) (userRef, error) {
	if id := strings.TrimSpace(os.Getenv("SMOKE_VIEWER_USER_ID")); id != "" {
		return getViewer(ctx, pool, "id = $1", id)
	}
	if username := strings.TrimSpace(os.Getenv("SMOKE_VIEWER_USERNAME")); username != "" {
		return getViewer(ctx, pool, "username = $1", username)
	}
	rows, err := pool.Query(ctx, `
		SELECT id::text, username, display_name
		FROM users
		WHERE auth_provider <> 'seed'
		  AND username NOT LIKE 'runtime_smoke_%'
		  AND account_status = 'active'
		ORDER BY created_at DESC
		LIMIT 2
	`)
	if err != nil {
		return userRef{}, err
	}
	defer rows.Close()
	var users []userRef
	for rows.Next() {
		var user userRef
		if err := rows.Scan(&user.ID, &user.Username, &user.DisplayName); err != nil {
			return userRef{}, err
		}
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		return userRef{}, err
	}
	if len(users) == 0 {
		return userRef{}, errors.New("no active non-seed local user found; set SMOKE_VIEWER_USERNAME or sign in first")
	}
	if len(users) > 1 {
		candidates := make([]string, 0, len(users))
		for _, user := range users {
			candidates = append(candidates, fmt.Sprintf("%s(%s)", user.Username, user.ID))
		}
		return userRef{}, fmt.Errorf("multiple active non-seed users found; set SMOKE_VIEWER_USERNAME or SMOKE_VIEWER_USER_ID explicitly; candidates: %s", strings.Join(candidates, ", "))
	}
	return users[0], nil
}

func getViewer(ctx context.Context, pool *pgxpool.Pool, where string, value string) (userRef, error) {
	var user userRef
	err := pool.QueryRow(ctx, `
		SELECT id::text, username, display_name
		FROM users
		WHERE `+where+`
		  AND account_status = 'active'
	`, value).Scan(&user.ID, &user.Username, &user.DisplayName)
	if err != nil {
		return userRef{}, err
	}
	return user, nil
}

func loadCounts(ctx context.Context, pool *pgxpool.Pool) (map[string]int64, error) {
	tables := []string{
		"users",
		"profiles",
		"events",
		"event_participations",
		"event_interests",
		"buddy_intents",
		"message_threads",
		"message_thread_members",
		"thread_messages",
		"groups",
		"group_memberships",
		"group_posts",
	}
	counts := make(map[string]int64, len(tables))
	for _, table := range tables {
		var count int64
		if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM "+table).Scan(&count); err != nil {
			return nil, fmt.Errorf("%s: %w", table, err)
		}
		counts[table] = count
	}
	return counts, nil
}

func seed(ctx context.Context, pool *pgxpool.Pool, viewer userRef) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if err := cleanupFixtures(ctx, tx); err != nil {
		return err
	}
	if err := seedUsers(ctx, tx); err != nil {
		return err
	}
	if err := seedEvent(ctx, tx, viewer.ID); err != nil {
		return err
	}
	if err := seedBuddy(ctx, tx); err != nil {
		return err
	}
	if err := seedMessages(ctx, tx, viewer.ID); err != nil {
		return err
	}
	if err := seedGroups(ctx, tx, viewer.ID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func cleanupFixtures(ctx context.Context, tx pgx.Tx) error {
	statements := []string{
		`DELETE FROM event_update_reactions WHERE event_update_id IN (SELECT id FROM event_posts WHERE event_id IN (SELECT id FROM events WHERE slug = 'runtime-smoke-joinable-event'))`,
		`DELETE FROM event_posts WHERE event_id IN (SELECT id FROM events WHERE slug = 'runtime-smoke-joinable-event')`,
		`DELETE FROM event_interests WHERE event_id IN (SELECT id FROM events WHERE slug = 'runtime-smoke-joinable-event')`,
		`DELETE FROM event_participations WHERE event_id IN (SELECT id FROM events WHERE slug = 'runtime-smoke-joinable-event')`,
		`DELETE FROM event_memberships WHERE event_id IN (SELECT id FROM events WHERE slug = 'runtime-smoke-joinable-event')`,
		`DELETE FROM events WHERE slug = 'runtime-smoke-joinable-event'`,
		`DELETE FROM group_posts WHERE group_id IN (SELECT id FROM groups WHERE slug IN ('runtime-smoke-joinable-group', 'runtime-smoke-member-group'))`,
		`DELETE FROM group_memberships WHERE group_id IN (SELECT id FROM groups WHERE slug IN ('runtime-smoke-joinable-group', 'runtime-smoke-member-group'))`,
		`DELETE FROM groups WHERE slug IN ('runtime-smoke-joinable-group', 'runtime-smoke-member-group')`,
		`DELETE FROM message_threads WHERE id IN ('30000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002')`,
		`DELETE FROM buddy_intents WHERE author_app_user_id IN (SELECT id FROM users WHERE username LIKE 'runtime_smoke_%')`,
		`DELETE FROM users WHERE username LIKE 'runtime_smoke_%'`,
	}
	for _, stmt := range statements {
		if _, err := tx.Exec(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}

func seedUsers(ctx context.Context, tx pgx.Tx) error {
	users := []struct {
		id, username, displayName string
	}{
		{"20000000-0000-4000-8000-000000000001", "runtime_smoke_event_owner", "Runtime Event Owner"},
		{"20000000-0000-4000-8000-000000000002", "runtime_smoke_buddy", "Runtime Buddy Diver"},
		{"20000000-0000-4000-8000-000000000003", "runtime_smoke_messenger", "Runtime Messenger"},
		{"20000000-0000-4000-8000-000000000004", "runtime_smoke_requester", "Runtime Requester"},
		{"20000000-0000-4000-8000-000000000005", "runtime_smoke_group_owner", "Runtime Group Owner"},
	}
	for _, user := range users {
		if _, err := tx.Exec(ctx, `
			INSERT INTO users (
				id,
				username,
				display_name,
				auth_provider,
				auth_provider_user_id,
				email_verified,
				phone_verified,
				global_role,
				account_status
			)
			VALUES ($1, $2, $3, 'runtime_smoke', $2, TRUE, TRUE, 'member', 'active')
		`, user.id, user.username, user.displayName); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO profiles (
				user_id,
				bio,
				avatar_url,
				pseudonymous_enabled,
				location,
				home_area,
				interests,
				cert_level
			)
			VALUES ($1, 'Local runtime smoke fixture account.', '', TRUE, 'Cebu, Philippines', 'Cebu', ARRAY['fun_dive', 'training'], 'AIDA 3')
			ON CONFLICT (user_id)
			DO UPDATE SET
				bio = EXCLUDED.bio,
				location = EXCLUDED.location,
				home_area = EXCLUDED.home_area,
				interests = EXCLUDED.interests,
				cert_level = EXCLUDED.cert_level,
				updated_at = NOW()
		`, user.id); err != nil {
			return err
		}
	}
	return nil
}

func seedEvent(ctx context.Context, tx pgx.Tx, viewerID string) error {
	eventID := "40000000-0000-4000-8000-000000000001"
	ownerID := "20000000-0000-4000-8000-000000000001"
	if _, err := tx.Exec(ctx, `
		INSERT INTO events (
			id,
			title,
			slug,
			description,
			short_description,
			description_markdown,
			location,
			starts_at,
			ends_at,
			status,
			visibility,
			event_type,
			difficulty,
			current_attendees,
			organizer_user_id,
			timezone,
			capacity,
			requires_approval,
			is_paid,
			beginner_friendly,
			published_at,
			posts_enabled,
			post_create_policy
		)
		VALUES (
			$1,
			'Runtime Smoke Joinable Event',
			'runtime-smoke-joinable-event',
			'Local-only event fixture for mobile runtime smoke.',
			'Local-only event fixture for mobile runtime smoke.',
			'Local-only event fixture for mobile runtime smoke.',
			'Moalboal, Cebu',
			NOW() + INTERVAL '7 days',
			NOW() + INTERVAL '7 days 3 hours',
			'published',
			'public',
			'fun_dive',
			'beginner',
			0,
			$2,
			'Asia/Manila',
			12,
			FALSE,
			FALSE,
			TRUE,
			NOW(),
			TRUE,
			'participants'
		)
	`, eventID, ownerID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO event_participations (event_id, user_id, role, status, participant_note, approved_at, approved_by)
		VALUES ($1, $2, 'organizer', 'confirmed', 'Runtime fixture organizer.', NOW(), $2)
	`, eventID, ownerID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		DELETE FROM event_participations WHERE event_id = $1 AND user_id = $2
	`, eventID, viewerID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		DELETE FROM event_interests WHERE event_id = $1 AND user_id = $2
	`, eventID, viewerID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO event_posts (event_id, author_user_id, title, body_markdown, post_type, status)
		VALUES ($1, $2, 'Runtime fixture update', 'Seeded event update for fish reaction proof.', 'general', 'published')
	`, eventID, ownerID); err != nil {
		return err
	}
	return nil
}

func seedBuddy(ctx context.Context, tx pgx.Tx) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO buddy_intents (
			id,
			author_app_user_id,
			area,
			intent_type,
			time_window,
			note,
			expires_at
		)
		VALUES (
			'50000000-0000-4000-8000-000000000001',
			'20000000-0000-4000-8000-000000000002',
			'Moalboal, Cebu',
			'fun_dive',
			'weekend',
			'Local-only buddy intent for message-entry proof.',
			NOW() + INTERVAL '14 days'
		)
	`)
	return err
}

func seedMessages(ctx context.Context, tx pgx.Tx, viewerID string) error {
	primaryThreadID := "30000000-0000-4000-8000-000000000001"
	requestThreadID := "30000000-0000-4000-8000-000000000002"
	messengerID := "20000000-0000-4000-8000-000000000003"
	requesterID := "20000000-0000-4000-8000-000000000004"
	if err := seedThread(ctx, tx, primaryThreadID, viewerID, messengerID, viewerID, "primary"); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO thread_messages (thread_id, sender_user_id, client_id, kind, body, created_at)
		VALUES
			($1, $2, 'runtime-smoke-primary-other', 'text', 'Seeded message from runtime messenger.', NOW() - INTERVAL '4 minutes'),
			($1, $3, 'runtime-smoke-primary-viewer', 'text', 'Seeded reply from signed-in smoke user.', NOW() - INTERVAL '3 minutes')
	`, primaryThreadID, messengerID, viewerID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE message_threads
		SET last_message_at = NOW() - INTERVAL '3 minutes', updated_at = NOW() - INTERVAL '3 minutes'
		WHERE id = $1
	`, primaryThreadID); err != nil {
		return err
	}

	if err := seedThread(ctx, tx, requestThreadID, viewerID, requesterID, requesterID, "requests"); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE message_thread_members
		SET inbox_category = 'primary'
		WHERE thread_id = $1 AND user_id = $2
	`, requestThreadID, requesterID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO thread_messages (thread_id, sender_user_id, client_id, kind, body, created_at)
		VALUES ($1, $2, 'runtime-smoke-request-other', 'text', 'Seeded message request for mobile smoke.', NOW() - INTERVAL '2 minutes')
	`, requestThreadID, requesterID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE message_threads
		SET last_message_at = NOW() - INTERVAL '2 minutes', updated_at = NOW() - INTERVAL '2 minutes'
		WHERE id = $1
	`, requestThreadID); err != nil {
		return err
	}
	return nil
}

func seedThread(ctx context.Context, tx pgx.Tx, threadID, viewerID, otherID, createdByID, viewerCategory string) error {
	low, high := viewerID, otherID
	if low > high {
		low, high = high, low
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO message_threads (id, created_by_user_id, direct_user_low, direct_user_high)
		VALUES ($1, $2, $3, $4)
	`, threadID, createdByID, low, high); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO message_thread_members (thread_id, user_id, inbox_category)
		VALUES
			($1, $2, $4::message_inbox_category),
			($1, $3, 'primary'::message_inbox_category)
	`, threadID, viewerID, otherID, viewerCategory); err != nil {
		return err
	}
	return nil
}

func seedGroups(ctx context.Context, tx pgx.Tx, viewerID string) error {
	ownerID := "20000000-0000-4000-8000-000000000005"
	buddyID := "20000000-0000-4000-8000-000000000002"
	joinableID := "60000000-0000-4000-8000-000000000001"
	memberID := "60000000-0000-4000-8000-000000000002"
	if err := seedGroup(ctx, tx, joinableID, ownerID, "Runtime Smoke Joinable Group", "runtime-smoke-joinable-group", "open"); err != nil {
		return err
	}
	if err := seedGroup(ctx, tx, memberID, ownerID, "Runtime Smoke Member Group", "runtime-smoke-member-group", "open"); err != nil {
		return err
	}
	memberships := []struct {
		groupID, userID, role string
	}{
		{joinableID, ownerID, "owner"},
		{joinableID, buddyID, "member"},
		{memberID, ownerID, "owner"},
		{memberID, viewerID, "member"},
		{memberID, buddyID, "member"},
	}
	for _, membership := range memberships {
		if _, err := tx.Exec(ctx, `
			INSERT INTO group_memberships (group_id, user_id, role, status, joined_at)
			VALUES ($1, $2, $3, 'active', NOW())
		`, membership.groupID, membership.userID, membership.role); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO group_posts (group_id, author_user_id, title, content, status)
		VALUES ($1, $2, 'Runtime group post', 'Seeded group post for mobile runtime smoke.', 'active')
	`, memberID, ownerID); err != nil {
		return err
	}
	return nil
}

func seedGroup(ctx context.Context, tx pgx.Tx, groupID, ownerID, name, slug, joinPolicy string) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO groups (
			id,
			name,
			slug,
			bio,
			description,
			visibility,
			status,
			join_policy,
			location,
			location_name,
			formatted_address,
			created_by
		)
		VALUES (
			$1,
			$3,
			$4,
			'Local-only group fixture for mobile smoke.',
			'Local-only group fixture for mobile smoke.',
			'public',
			'active',
			$5,
			'Moalboal, Cebu',
			'Moalboal',
			'Moalboal, Cebu, Philippines',
			$2
		)
	`, groupID, ownerID, name, slug, joinPolicy)
	return err
}

func sortedKeys(values map[string]int64) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func die(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
