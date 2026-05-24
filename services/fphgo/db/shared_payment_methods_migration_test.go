package db_test

import (
	"context"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestSharedPaymentMethodsMigrationBackfillsAndRemapsExistingData(t *testing.T) {
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

	testDBName := fmt.Sprintf("fph_payment_methods_0075_test_%d", time.Now().UnixNano())
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
	if err := runGoose(t, testDSN, "up-to", "74"); err != nil {
		t.Fatalf("goose up-to 74 failed: %v", err)
	}

	pool, err := pgxpool.New(ctx, testDSN)
	if err != nil {
		t.Fatalf("connect temp db: %v", err)
	}
	defer pool.Close()

	seed := seedLegacyPaymentMethods0075(ctx, t, pool)

	if err := runGoose(t, testDSN, "up-to", "75"); err != nil {
		t.Fatalf("goose up-to 75 failed: %v", err)
	}

	assertSharedPaymentMethods0075(ctx, t, pool, seed)
}

type legacyPaymentMethods0075Seed struct {
	SchoolID              string
	DuplicateQRMethodID   string
	BookingWithMappedPMID string
	BookingWithStalePMID  string
	EventID               string
}

func seedLegacyPaymentMethods0075(ctx context.Context, t *testing.T, pool *pgxpool.Pool) legacyPaymentMethods0075Seed {
	t.Helper()

	const (
		ownerID       = "10000000-0000-0000-0000-000000000001"
		studentID     = "10000000-0000-0000-0000-000000000002"
		schoolID      = "20000000-0000-0000-0000-000000000001"
		courseOneID   = "30000000-0000-0000-0000-000000000001"
		courseTwoID   = "30000000-0000-0000-0000-000000000002"
		qrMediaID     = "40000000-0000-0000-0000-000000000001"
		eventID       = "50000000-0000-0000-0000-000000000001"
		qrMethodOneID = "60000000-0000-0000-0000-000000000001"
		qrMethodTwoID = "60000000-0000-0000-0000-000000000002"
		bankMethodID  = "60000000-0000-0000-0000-000000000003"
		incompleteID  = "60000000-0000-0000-0000-000000000004"
		staleMethodID = "60000000-0000-0000-0000-000000000005"
		bookingOneID  = "70000000-0000-0000-0000-000000000001"
		bookingTwoID  = "70000000-0000-0000-0000-000000000002"
	)

	mustExec := func(label, query string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, query, args...); err != nil {
			t.Fatalf("%s: %v", label, err)
		}
	}

	mustExec("insert users", `
		INSERT INTO users (id, username, display_name)
		VALUES
			($1, 'payment-owner', 'Payment Owner'),
			($2, 'payment-student', 'Payment Student')
	`, ownerID, studentID)

	mustExec("insert qr media object", `
		INSERT INTO media_objects (
			id, owner_app_user_id, context_type, object_key, mime_type,
			size_bytes, width, height, state
		)
		VALUES (
			$1, $2, 'profile_feed', 'legacy/payment-qr.png', 'image/png',
			2048, 512, 512, 'active'
		)
	`, qrMediaID, ownerID)

	mustExec("insert school", `
		INSERT INTO schools (id, slug, name, owner_user_id, status)
		VALUES ($1, 'legacy-payment-school', 'Legacy Payment School', $2, 'published')
	`, schoolID, ownerID)

	mustExec("insert courses", `
		INSERT INTO courses (id, school_id, slug, title, course_type, status, payment_required)
		VALUES
			($1, $3, 'pool-one', 'Pool One', 'pool_training', 'published', TRUE),
			($2, $3, 'pool-two', 'Pool Two', 'pool_training', 'published', TRUE)
	`, courseOneID, courseTwoID, schoolID)

	mustExec("insert legacy course payment methods", `
		INSERT INTO course_payment_methods (
			id, course_id, type, name, instructions, qr_media_id,
			bank_name, account_name, account_number, is_active, deleted_at, created_at
		)
		VALUES
			($1, $6, 'MANUAL_QR', 'Manual QR', 'Attach receipt after transfer.', $8, NULL, NULL, '09170000000', TRUE, NULL, NOW() - INTERVAL '5 minutes'),
			($2, $7, 'MANUAL_QR', 'Manual QR', 'Attach receipt after transfer.', $8, NULL, NULL, '09170000000', TRUE, NULL, NOW() - INTERVAL '4 minutes'),
			($3, $6, 'MANUAL_BANK_TRANSFER', 'BPI Bank Transfer', 'Attach receipt after transfer.', NULL, 'BPI', 'Legacy School', '1234567890', TRUE, NULL, NOW() - INTERVAL '3 minutes'),
			($4, $7, 'MANUAL_BANK_TRANSFER', 'Incomplete inactive', NULL, NULL, NULL, NULL, NULL, FALSE, NULL, NOW() - INTERVAL '2 minutes'),
			($5, $7, 'MANUAL_QR', 'Deleted stale QR', NULL, $8, NULL, NULL, NULL, TRUE, NOW() - INTERVAL '1 minute', NOW() - INTERVAL '1 minute')
	`, qrMethodOneID, qrMethodTwoID, bankMethodID, incompleteID, staleMethodID, courseOneID, courseTwoID, qrMediaID)

	mustExec("insert legacy booking requests", `
		INSERT INTO course_booking_requests (
			id, course_id, school_id, student_user_id, preferred_date, status
		)
		VALUES
			($1, $3, $4, $5, CURRENT_DATE + INTERVAL '7 days', 'approved'),
			($2, $3, $4, $5, CURRENT_DATE + INTERVAL '8 days', 'approved')
	`, bookingOneID, bookingTwoID, courseTwoID, schoolID, studentID)

	mustExec("insert legacy booking payments", `
		INSERT INTO course_booking_payments (
			booking_id, course_id, school_id, student_user_id,
			payment_method_id, amount, currency, status
		)
		VALUES
			($1, $3, $4, $5, $6, 1500, 'PHP', 'submitted'),
			($2, $3, $4, $5, $7, 1500, 'PHP', 'submitted')
	`, bookingOneID, bookingTwoID, courseTwoID, schoolID, studentID, qrMethodTwoID, staleMethodID)

	mustExec("insert legacy event", `
		INSERT INTO events (
			id, slug, title, short_description, description_markdown, status,
			visibility, event_type, difficulty, organizer_user_id, payment_mode,
			is_paid, price_amount, currency
		)
		VALUES (
			$1, 'legacy-payment-event', 'Legacy Payment Event', 'Payment event',
			'Payment event details', 'published', 'public', 'fun_dive',
			'beginner', $2, 'required', TRUE, 1000, 'PHP'
		)
	`, eventID, ownerID)

	mustExec("insert legacy event payment method", `
		INSERT INTO event_payment_methods (
			event_id, type, name, instructions, qr_image_url,
			account_name, account_number, bank_name, is_active
		)
		VALUES (
			$1, 'MANUAL_QR', 'Legacy Event QR', 'Attach receipt after transfer.',
			'https://cdn.example.test/legacy-event-qr.png', NULL, '09171111111',
			NULL, TRUE
		)
	`, eventID)

	return legacyPaymentMethods0075Seed{
		SchoolID:              schoolID,
		DuplicateQRMethodID:   qrMethodTwoID,
		BookingWithMappedPMID: bookingOneID,
		BookingWithStalePMID:  bookingTwoID,
		EventID:               eventID,
	}
}

func assertSharedPaymentMethods0075(ctx context.Context, t *testing.T, pool *pgxpool.Pool, seed legacyPaymentMethods0075Seed) {
	t.Helper()

	assertTableExistsInPool(ctx, t, pool, "school_payment_methods")

	var qrCount int
	var qrSchoolMethodID string
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*), MIN(id::text)
		FROM school_payment_methods
		WHERE school_id = $1
			AND type = 'manual_qr'
			AND name = 'Manual QR'
			AND qr_media_id IS NOT NULL
			AND account_number = '09170000000'
	`, seed.SchoolID).Scan(&qrCount, &qrSchoolMethodID); err != nil {
		t.Fatalf("query backfilled duplicate QR method: %v", err)
	}
	if qrCount != 1 {
		t.Fatalf("duplicate course QR methods backfilled to %d school rows, want 1", qrCount)
	}

	var mappedPaymentMethodID string
	if err := pool.QueryRow(ctx, `
		SELECT payment_method_id::text
		FROM course_booking_payments
		WHERE booking_id = $1
	`, seed.BookingWithMappedPMID).Scan(&mappedPaymentMethodID); err != nil {
		t.Fatalf("query remapped booking payment method: %v", err)
	}
	if mappedPaymentMethodID != qrSchoolMethodID {
		t.Fatalf("booking payment_method_id = %q, want school method %q", mappedPaymentMethodID, qrSchoolMethodID)
	}

	var stalePaymentMethodID *string
	if err := pool.QueryRow(ctx, `
		SELECT payment_method_id::text
		FROM course_booking_payments
		WHERE booking_id = $1
	`, seed.BookingWithStalePMID).Scan(&stalePaymentMethodID); err != nil {
		t.Fatalf("query stale booking payment method: %v", err)
	}
	if stalePaymentMethodID != nil {
		t.Fatalf("stale booking payment method was not nulled, got %q", *stalePaymentMethodID)
	}

	var bankName, accountName, accountNumber string
	if err := pool.QueryRow(ctx, `
		SELECT bank_name, account_name, account_number
		FROM school_payment_methods
		WHERE school_id = $1 AND type = 'bank_transfer' AND is_active = TRUE
	`, seed.SchoolID).Scan(&bankName, &accountName, &accountNumber); err != nil {
		t.Fatalf("query backfilled bank transfer: %v", err)
	}
	if bankName != "BPI" || accountName != "Legacy School" || accountNumber != "1234567890" {
		t.Fatalf("bank details not preserved: %q %q %q", bankName, accountName, accountNumber)
	}

	var incompleteActive bool
	if err := pool.QueryRow(ctx, `
		SELECT is_active
		FROM school_payment_methods
		WHERE school_id = $1 AND name = 'Incomplete inactive'
	`, seed.SchoolID).Scan(&incompleteActive); err != nil {
		t.Fatalf("query inactive incomplete school method: %v", err)
	}
	if incompleteActive {
		t.Fatal("inactive incomplete course method became active")
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO school_payment_methods (school_id, type, name, is_active)
		VALUES ($1, 'manual_qr', 'Broken active QR', TRUE)
	`, seed.SchoolID); !isCheckViolation(err) {
		t.Fatalf("expected active school manual QR without qr_media_id to fail check constraint, got %v", err)
	}

	var eventMethodCount int
	var eventType string
	var eventQRMediaID *string
	var eventQRImageURL string
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*), MIN(type), MIN(qr_media_id::text), MIN(qr_image_url)
		FROM event_payment_methods
		WHERE event_id = $1
	`, seed.EventID).Scan(&eventMethodCount, &eventType, &eventQRMediaID, &eventQRImageURL); err != nil {
		t.Fatalf("query event payment methods after 0075: %v", err)
	}
	if eventMethodCount != 1 || eventType != "manual_qr" || eventQRMediaID != nil || eventQRImageURL == "" {
		t.Fatalf("event method was not preserved as legacy event-scoped method: count=%d type=%q qrMedia=%v qrURL=%q", eventMethodCount, eventType, eventQRMediaID, eventQRImageURL)
	}

	var eventMethodsInSchoolCount int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM school_payment_methods
		WHERE name = 'Legacy Event QR'
	`).Scan(&eventMethodsInSchoolCount); err != nil {
		t.Fatalf("query event leakage into school methods: %v", err)
	}
	if eventMethodsInSchoolCount != 0 {
		t.Fatalf("event payment method leaked into school scope: %d rows", eventMethodsInSchoolCount)
	}

	var legacyCourseMethodCount int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM course_payment_methods
		WHERE id IN (
			$1::uuid,
			'60000000-0000-0000-0000-000000000001'::uuid,
			'60000000-0000-0000-0000-000000000003'::uuid,
			'60000000-0000-0000-0000-000000000004'::uuid,
			'60000000-0000-0000-0000-000000000005'::uuid
		)
	`, seed.DuplicateQRMethodID).Scan(&legacyCourseMethodCount); err != nil {
		t.Fatalf("query preserved legacy course payment methods: %v", err)
	}
	if legacyCourseMethodCount != 5 {
		t.Fatalf("legacy course payment methods were destructively changed, count=%d", legacyCourseMethodCount)
	}

	var fkTable string
	var fkValidated bool
	if err := pool.QueryRow(ctx, `
		SELECT confrelid::regclass::text, convalidated
		FROM pg_constraint
		WHERE conname = 'course_booking_payments_payment_method_id_fkey'
	`).Scan(&fkTable, &fkValidated); err != nil {
		t.Fatalf("query booking payment method FK: %v", err)
	}
	if fkTable != "school_payment_methods" || !fkValidated {
		t.Fatalf("booking payment FK = (%q, %t), want school_payment_methods validated", fkTable, fkValidated)
	}
}

func assertTableExistsInPool(ctx context.Context, t *testing.T, pool *pgxpool.Pool, tableName string) {
	t.Helper()
	var exists bool
	if err := pool.QueryRow(ctx, `SELECT to_regclass('public.' || $1) IS NOT NULL`, tableName).Scan(&exists); err != nil {
		t.Fatalf("check table %s exists: %v", tableName, err)
	}
	if !exists {
		t.Fatalf("table %s does not exist", tableName)
	}
}

func isCheckViolation(err error) bool {
	if err == nil {
		return false
	}
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23514"
}
