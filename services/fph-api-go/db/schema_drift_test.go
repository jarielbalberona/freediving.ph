package db_test

import (
	"os"
	"strings"
	"testing"
)

func TestSchemaMatchesInitialMigration(t *testing.T) {
	schemaRaw, err := os.ReadFile("schema/000_schema.sql")
	if err != nil {
		t.Fatalf("read schema file: %v", err)
	}

	migrationRaw, err := os.ReadFile("migrations/0001_init.sql")
	if err != nil {
		t.Fatalf("read migration file: %v", err)
	}

	upSQL := extractGooseUpSQL(string(migrationRaw))
	if upSQL == "" {
		t.Fatalf("could not extract goose up SQL from migrations/0001_init.sql")
	}

	if normalizeSQL(string(schemaRaw)) != normalizeSQL(upSQL) {
		t.Fatalf("schema/000_schema.sql and migrations/0001_init.sql (up) have drifted")
	}
}

func extractGooseUpSQL(migration string) string {
	upIdx := strings.Index(migration, "-- +goose Up")
	if upIdx == -1 {
		return ""
	}

	segment := migration[upIdx:]
	beginIdx := strings.Index(segment, "-- +goose StatementBegin")
	if beginIdx == -1 {
		return ""
	}

	segment = segment[beginIdx+len("-- +goose StatementBegin"):]
	endIdx := strings.Index(segment, "-- +goose StatementEnd")
	if endIdx == -1 {
		return ""
	}

	return strings.TrimSpace(segment[:endIdx])
}

func normalizeSQL(sql string) string {
	lines := strings.Split(sql, "\n")
	normalized := make([]string, 0, len(lines))

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "--") {
			continue
		}
		normalized = append(normalized, strings.Join(strings.Fields(trimmed), " "))
	}

	return strings.Join(normalized, "\n")
}
