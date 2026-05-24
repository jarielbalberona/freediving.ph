package db_test

import (
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"testing"
)

func TestSchemaMatchesMigrations(t *testing.T) {
	schemaRaw, err := os.ReadFile("schema/000_schema.sql")
	if err != nil {
		t.Fatalf("read schema file: %v", err)
	}

	entries, err := os.ReadDir("migrations")
	if err != nil {
		t.Fatalf("read migrations dir: %v", err)
	}

	var migrationNames []string
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		migrationNames = append(migrationNames, entry.Name())
	}
	slices.Sort(migrationNames)

	combinedUpSQL := make([]string, 0, len(migrationNames))
	for _, name := range migrationNames {
		migrationPath := filepath.Join("migrations", name)
		migrationRaw, readErr := os.ReadFile(migrationPath)
		if readErr != nil {
			t.Fatalf("read migration file %s: %v", migrationPath, readErr)
		}

		upSQL := extractGooseUpSQL(string(migrationRaw))
		if upSQL == "" {
			t.Fatalf("could not extract goose up SQL from %s", migrationPath)
		}
		combinedUpSQL = append(combinedUpSQL, upSQL)
	}

	schemaTables := extractCreateTableNames(string(schemaRaw))
	migrationTables := extractCreateTableNames(strings.Join(combinedUpSQL, "\n"))
	if len(schemaTables) == 0 || len(migrationTables) == 0 {
		t.Fatalf("unable to extract table names from schema or migrations")
	}
	if strings.Join(schemaTables, ",") != strings.Join(migrationTables, ",") {
		t.Fatalf("schema and migrations define different table sets: schema=%v migrations=%v", schemaTables, migrationTables)
	}

	requiredUsersColumns := []string{"global_role", "account_status"}
	for _, column := range requiredUsersColumns {
		if !strings.Contains(string(schemaRaw), column) {
			t.Fatalf("schema is missing users.%s", column)
		}
		if !strings.Contains(strings.Join(combinedUpSQL, "\n"), column) {
			t.Fatalf("migrations are missing users.%s", column)
		}
	}
}

func TestSharedPaymentMethodsMigrationKeepsBookingRemapAfterFKDrop(t *testing.T) {
	raw, err := os.ReadFile("migrations/0075_shared_payment_methods.sql")
	if err != nil {
		t.Fatalf("read payment migration: %v", err)
	}
	upSQL := extractGooseUpSQL(string(raw))
	dropIdx := strings.Index(upSQL, "DROP CONSTRAINT IF EXISTS course_booking_payments_payment_method_id_fkey")
	updateIdx := strings.Index(upSQL, "UPDATE course_booking_payments bp")
	addIdx := strings.Index(upSQL, "REFERENCES school_payment_methods(id)")
	if dropIdx == -1 || updateIdx == -1 || addIdx == -1 {
		t.Fatalf("payment migration is missing FK drop, booking remap, or school FK add")
	}
	if !(dropIdx < updateIdx && updateIdx < addIdx) {
		t.Fatalf("payment migration must drop old FK before remapping booking payments and add school FK after remap")
	}
	if !strings.Contains(upSQL, "event_payment_methods_active_details_check") {
		t.Fatalf("payment migration must guard active event payment methods")
	}
	if !strings.Contains(upSQL, "NOT is_active") || !strings.Contains(upSQL, "type = 'manual_qr' AND qr_media_id IS NOT NULL") {
		t.Fatalf("payment migration must guard active school payment methods")
	}
	typeDropIdx := strings.Index(upSQL, "DROP CONSTRAINT IF EXISTS event_payment_methods_type_check")
	typeUpdateIdx := strings.Index(upSQL, "UPDATE event_payment_methods")
	typeAddIdx := strings.Index(upSQL, "ADD CONSTRAINT event_payment_methods_type_check CHECK (type IN ('manual_qr', 'bank_transfer'))")
	if typeDropIdx == -1 || typeUpdateIdx == -1 || typeAddIdx == -1 {
		t.Fatalf("payment migration is missing event payment type constraint drop, normalization, or add")
	}
	if !(typeDropIdx < typeUpdateIdx && typeUpdateIdx < typeAddIdx) {
		t.Fatalf("payment migration must drop old event payment type check before normalizing legacy enum values")
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
		downIdx := strings.Index(segment, "-- +goose Down")
		if downIdx == -1 {
			return strings.TrimSpace(segment)
		}
		upBody := strings.TrimSpace(segment[len("-- +goose Up"):downIdx])
		return upBody
	}

	segment = segment[beginIdx+len("-- +goose StatementBegin"):]
	endIdx := strings.Index(segment, "-- +goose StatementEnd")
	if endIdx == -1 {
		return ""
	}

	return strings.TrimSpace(segment[:endIdx])
}

func extractCreateTableNames(sql string) []string {
	pattern := regexp.MustCompile(`(?i)CREATE TABLE IF NOT EXISTS ([a-zA-Z_][a-zA-Z0-9_]*)`)
	matches := pattern.FindAllStringSubmatch(sql, -1)
	if len(matches) == 0 {
		return nil
	}

	namesSet := map[string]struct{}{}
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		namesSet[strings.ToLower(match[1])] = struct{}{}
	}

	names := make([]string, 0, len(namesSet))
	for name := range namesSet {
		names = append(names, name)
	}
	slices.Sort(names)
	return names
}
