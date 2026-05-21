package repo_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	notificationsrepo "fphgo/internal/features/notifications/repo"
)

func testNotificationsPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("TEST_DB_DSN")
	if dsn == "" {
		t.Skip("TEST_DB_DSN is not set")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func TestOutboxEnqueueIdempotencyPreventsDuplicateRows(t *testing.T) {
	pool := testNotificationsPool(t)
	repo := notificationsrepo.New(pool)
	ctx := context.Background()

	siteID := uuid.NewString()
	key := "test:notification-outbox:" + siteID
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM notification_outbox WHERE idempotency_key = $1`, key)
	})

	first, err := repo.EnqueueOutbox(ctx, notificationsrepo.OutboxEnqueueInput{
		EventType:     notificationsrepo.OutboxEventNewDiveSitePublished,
		AggregateType: "dive_site",
		AggregateID:   siteID,
		Payload: map[string]any{
			"siteId": siteID,
			"slug":   "test-site",
			"name":   "Test Site",
			"area":   "Batangas",
		},
		IdempotencyKey: key,
	})
	if err != nil {
		t.Fatalf("first enqueue: %v", err)
	}
	second, err := repo.EnqueueOutbox(ctx, notificationsrepo.OutboxEnqueueInput{
		EventType:     notificationsrepo.OutboxEventNewDiveSitePublished,
		AggregateType: "dive_site",
		AggregateID:   siteID,
		Payload: map[string]any{
			"siteId": siteID,
			"slug":   "test-site",
			"name":   "Test Site",
			"area":   "Batangas",
		},
		IdempotencyKey: key,
	})
	if err != nil {
		t.Fatalf("second enqueue: %v", err)
	}
	if first.ID != second.ID {
		t.Fatalf("expected duplicate enqueue to return existing row, got %s then %s", first.ID, second.ID)
	}

	var count int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*)::int
		FROM notification_outbox
		WHERE idempotency_key = $1
	`, key).Scan(&count); err != nil {
		t.Fatalf("count outbox rows: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one outbox row for idempotency key, got %d", count)
	}
}

func TestOutboxClaimRetryStaleRecoveryAndProcessedState(t *testing.T) {
	pool := testNotificationsPool(t)
	repo := notificationsrepo.New(pool)
	ctx := context.Background()

	siteID := uuid.NewString()
	key := "test:notification-outbox-claim:" + siteID
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM notification_outbox WHERE idempotency_key = $1`, key)
	})

	enqueued, err := repo.EnqueueOutbox(ctx, notificationsrepo.OutboxEnqueueInput{
		EventType:     notificationsrepo.OutboxEventNewDiveSitePublished,
		AggregateType: "dive_site",
		AggregateID:   siteID,
		Payload: map[string]any{
			"siteId": siteID,
			"slug":   "test-site",
			"name":   "Test Site",
			"area":   "Batangas",
		},
		IdempotencyKey: key,
	})
	if err != nil {
		t.Fatalf("enqueue: %v", err)
	}

	claimed, err := repo.ClaimPendingOutbox(ctx, time.Now().UTC().Add(time.Minute), 100)
	if err != nil {
		t.Fatalf("claim pending outbox: %v", err)
	}
	claimedEvent, ok := findOutboxEvent(claimed, enqueued.ID)
	if !ok || claimedEvent.Status != "processing" || claimedEvent.Attempts != 1 {
		t.Fatalf("unexpected claimed event: %+v", claimed)
	}

	nextRetryAt := time.Now().UTC().Add(time.Minute)
	if err := repo.MarkOutboxRetry(ctx, enqueued.ID, nextRetryAt, "temporary failure"); err != nil {
		t.Fatalf("mark retry: %v", err)
	}
	var status string
	var attempts int
	var lastError string
	if err := pool.QueryRow(ctx, `
		SELECT status, attempts, last_error
		FROM notification_outbox
		WHERE id = $1
	`, enqueued.ID).Scan(&status, &attempts, &lastError); err != nil {
		t.Fatalf("load retry state: %v", err)
	}
	if status != "pending" || attempts != 1 || lastError != "temporary failure" {
		t.Fatalf("unexpected retry state status=%s attempts=%d lastError=%q", status, attempts, lastError)
	}

	if _, err := pool.Exec(ctx, `
		UPDATE notification_outbox
		SET status = 'processing',
		    updated_at = NOW() - INTERVAL '16 minutes',
		    next_retry_at = NOW() - INTERVAL '1 minute'
		WHERE id = $1
	`, enqueued.ID); err != nil {
		t.Fatalf("make stale processing row: %v", err)
	}
	claimed, err = repo.ClaimPendingOutbox(ctx, time.Now().UTC(), 100)
	if err != nil {
		t.Fatalf("claim stale processing outbox: %v", err)
	}
	claimedEvent, ok = findOutboxEvent(claimed, enqueued.ID)
	if !ok || claimedEvent.Attempts != 2 {
		t.Fatalf("expected stale processing row to be reclaimed with incremented attempts, got %+v", claimed)
	}

	if err := repo.MarkOutboxProcessed(ctx, enqueued.ID); err != nil {
		t.Fatalf("mark processed: %v", err)
	}
	var processedAt *time.Time
	if err := pool.QueryRow(ctx, `
		SELECT status, processed_at
		FROM notification_outbox
		WHERE id = $1
	`, enqueued.ID).Scan(&status, &processedAt); err != nil {
		t.Fatalf("load processed state: %v", err)
	}
	if status != "processed" || processedAt == nil {
		t.Fatalf("expected processed row with processed_at, got status=%s processedAt=%v", status, processedAt)
	}
}

func TestOutboxAdminListAndRetryFailedRow(t *testing.T) {
	pool := testNotificationsPool(t)
	repo := notificationsrepo.New(pool)
	ctx := context.Background()

	siteID := uuid.NewString()
	key := "test:notification-outbox-admin:" + siteID
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM notification_outbox WHERE idempotency_key = $1`, key)
	})

	enqueued, err := repo.EnqueueOutbox(ctx, notificationsrepo.OutboxEnqueueInput{
		EventType:     notificationsrepo.OutboxEventNewDiveSitePublished,
		AggregateType: "dive_site",
		AggregateID:   siteID,
		Payload: map[string]any{
			"siteId": siteID,
			"slug":   "test-site",
			"name":   "Test Site",
			"area":   "Batangas",
		},
		IdempotencyKey: key,
	})
	if err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		UPDATE notification_outbox
		SET status = 'failed',
		    attempts = 8,
		    last_error = 'dead letter',
		    next_retry_at = NOW() + INTERVAL '1 hour'
		WHERE id = $1
	`, enqueued.ID); err != nil {
		t.Fatalf("mark failed fixture: %v", err)
	}

	status := "failed"
	items, err := repo.ListOutbox(ctx, notificationsrepo.OutboxListInput{Status: &status, Limit: 10})
	if err != nil {
		t.Fatalf("list outbox: %v", err)
	}
	item, ok := findOutboxEvent(items, enqueued.ID)
	if !ok || item.Status != "failed" || item.Attempts != 8 || item.LastError == nil {
		t.Fatalf("expected failed outbox row in admin list, got %+v", items)
	}

	retried, err := repo.RetryOutbox(ctx, enqueued.ID, time.Now().UTC())
	if err != nil {
		t.Fatalf("retry outbox: %v", err)
	}
	if retried.Status != "pending" || retried.Attempts != 8 || retried.LastError != nil {
		t.Fatalf("expected failed row reset to due pending without resetting attempts, got %+v", retried)
	}
	if retried.NextRetryAt.After(time.Now().UTC().Add(5 * time.Second)) {
		t.Fatalf("expected retry to be due immediately, got %s", retried.NextRetryAt)
	}
}

func findOutboxEvent(events []notificationsrepo.NotificationOutbox, id string) (notificationsrepo.NotificationOutbox, bool) {
	for _, event := range events {
		if event.ID == id {
			return event, true
		}
	}
	return notificationsrepo.NotificationOutbox{}, false
}
