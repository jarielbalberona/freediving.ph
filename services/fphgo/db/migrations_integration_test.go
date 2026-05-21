package db_test

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const gooseVersion = "v3.24.1"

func TestMigrationsUpSanity(t *testing.T) {
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

	testDBName := fmt.Sprintf("fph_api_go_test_%d", time.Now().UnixNano())
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

	if err := runGoose(t, testDSN, "up"); err != nil {
		t.Fatalf("goose up failed: %v", err)
	}
	if err := assertTableExists(ctx, testDSN, "users"); err != nil {
		t.Fatalf("expected users table after up migration: %v", err)
	}
	if err := assertTableExists(ctx, testDSN, "notifications"); err != nil {
		t.Fatalf("expected notifications table after up migration: %v", err)
	}
	if err := assertTableExists(ctx, testDSN, "notification_outbox"); err != nil {
		t.Fatalf("expected notification_outbox table after up migration: %v", err)
	}
}

func dsnWithDatabase(dsn, database string) (string, error) {
	parsed, err := url.Parse(dsn)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", fmt.Errorf("TEST_DB_DSN must be a URL-style Postgres DSN")
	}
	parsed.Path = "/" + database
	return parsed.String(), nil
}

func runGoose(t *testing.T, dsn string, args ...string) error {
	t.Helper()
	cmdArgs := append([]string{"run", "github.com/pressly/goose/v3/cmd/goose@" + gooseVersion, "-dir", "db/migrations", "postgres", dsn}, args...)
	cmd := exec.Command("go", cmdArgs...)
	cmd.Dir = ".."
	output, err := cmd.CombinedOutput()
	if err != nil {
		if strings.Contains(string(output), "dial tcp") || strings.Contains(string(output), "no such host") {
			t.Skipf("skipping migration sanity test because goose could not be downloaded: %s", strings.TrimSpace(string(output)))
		}
		return fmt.Errorf("%w: %s", err, strings.TrimSpace(string(output)))
	}
	return nil
}

func assertTableExists(ctx context.Context, dsn, tableName string) error {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return err
	}
	defer pool.Close()

	var exists bool
	if err := pool.QueryRow(ctx, `SELECT to_regclass('public.' || $1) IS NOT NULL`, tableName).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("table %s does not exist", tableName)
	}
	return nil
}

func assertTableMissing(ctx context.Context, dsn, tableName string) error {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return err
	}
	defer pool.Close()

	var exists bool
	if err := pool.QueryRow(ctx, `SELECT to_regclass('public.' || $1) IS NOT NULL`, tableName).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("table %s still exists", tableName)
	}
	return nil
}
