package db

import (
	"context"
	"os"
	"testing"
	"time"
)

func TestNewPoolWithDatabase(t *testing.T) {
	dsn := os.Getenv("TEST_DB_DSN")
	if dsn == "" {
		t.Skip("TEST_DB_DSN is not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := NewPool(ctx, dsn, 20, 2, 30*time.Minute)
	if err != nil {
		t.Fatalf("expected pool to initialize, got error: %v", err)
	}
	defer pool.Close()
}
