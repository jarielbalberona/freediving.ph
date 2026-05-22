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

func TestGroupsPrivateInviteOnlyConstraintIsInSchemaAndMigration(t *testing.T) {
	schemaRaw, err := os.ReadFile("schema/000_schema.sql")
	if err != nil {
		t.Fatalf("read schema file: %v", err)
	}
	migrationRaw, err := os.ReadFile("migrations/0051_groups_private_invite_only_constraint.sql")
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	schema := normalizeSQLForContract(string(schemaRaw))
	migration := normalizeSQLForContract(string(migrationRaw))

	for _, sql := range []struct {
		name string
		body string
	}{
		{name: "schema", body: schema},
		{name: "migration", body: migration},
	} {
		if !strings.Contains(sql.body, "groups_private_invite_only_check") {
			t.Fatalf("%s is missing groups_private_invite_only_check", sql.name)
		}
		if !strings.Contains(sql.body, "check (visibility <> 'private' or join_policy = 'invite_only')") {
			t.Fatalf("%s is missing private groups invite-only check", sql.name)
		}
	}

	if !strings.Contains(migration, "set join_policy = 'invite_only'") ||
		!strings.Contains(migration, "where visibility = 'private' and join_policy = 'open'") {
		t.Fatal("migration is missing private/open backfill to invite_only")
	}
}

func TestGroupsPrivateOpenMigrationBackfillsAndConstrains(t *testing.T) {
	baseDSN := os.Getenv("TEST_DB_DSN")
	if baseDSN == "" {
		t.Skip("TEST_DB_DSN is not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
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

	testDBName := fmt.Sprintf("fph_groups_constraint_test_%d", time.Now().UnixNano())
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
	if err := runGoose(t, testDSN, "up-to", "50"); err != nil {
		t.Fatalf("goose up-to 50 failed: %v", err)
	}

	pool, err := pgxpool.New(ctx, testDSN)
	if err != nil {
		t.Fatalf("connect temp db: %v", err)
	}
	defer pool.Close()

	var groupID string
	if err := pool.QueryRow(ctx, `
		INSERT INTO groups (name, slug, visibility, join_policy)
		VALUES ('Legacy Private Open', 'legacy-private-open', 'private', 'open')
		RETURNING id::text
	`).Scan(&groupID); err != nil {
		t.Fatalf("insert private/open group before 0051: %v", err)
	}

	if err := runGoose(t, testDSN, "up-to", "51"); err != nil {
		t.Fatalf("goose up-to 51 failed: %v", err)
	}

	var joinPolicy string
	if err := pool.QueryRow(ctx, `SELECT join_policy FROM groups WHERE id = $1`, groupID).Scan(&joinPolicy); err != nil {
		t.Fatalf("fetch backfilled group: %v", err)
	}
	if joinPolicy != "invite_only" {
		t.Fatalf("join_policy after 0051 = %q, want invite_only", joinPolicy)
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO groups (name, slug, visibility, join_policy)
		VALUES ('Blocked Private Open', 'blocked-private-open', 'private', 'open')
	`); err == nil {
		t.Fatal("expected DB constraint to reject private/open group")
	}
}

func normalizeSQLForContract(value string) string {
	return strings.Join(strings.Fields(strings.ToLower(value)), " ")
}
