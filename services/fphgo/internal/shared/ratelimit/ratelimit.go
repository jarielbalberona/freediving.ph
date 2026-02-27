package ratelimit

import (
	"context"
	"fmt"
	"hash/fnv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Limiter struct {
	pool *pgxpool.Pool
	now  func() time.Time
}

type Result struct {
	Allowed    bool
	RetryAfter time.Duration
}

func New(pool *pgxpool.Pool) *Limiter {
	return &Limiter{pool: pool, now: func() time.Time { return time.Now().UTC() }}
}

func (l *Limiter) Allow(ctx context.Context, scope, key string, maxEvents int, window time.Duration) (Result, error) {
	if l == nil || l.pool == nil {
		return Result{Allowed: true}, nil
	}
	if maxEvents <= 0 || window <= 0 {
		return Result{Allowed: true}, nil
	}

	tx, err := l.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Result{}, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock($1)`, advisoryKey(scope+"|"+key)); err != nil {
		return Result{}, fmt.Errorf("advisory lock: %w", err)
	}

	now := l.now()
	windowStart := now.Add(-window)

	var count int
	var oldest *time.Time
	if err := tx.QueryRow(ctx, `
		SELECT COUNT(*), MIN(created_at)
		FROM rate_limit_events
		WHERE scope = $1
		  AND key_hash = $2
		  AND created_at >= $3
	`, scope, key, windowStart).Scan(&count, &oldest); err != nil {
		return Result{}, fmt.Errorf("window count: %w", err)
	}

	if count >= maxEvents {
		retryAfter := window
		if oldest != nil {
			retryAt := oldest.UTC().Add(window)
			retryAfter = retryAt.Sub(now)
			if retryAfter < 0 {
				retryAfter = 0
			}
		}
		if err := tx.Commit(ctx); err != nil {
			return Result{}, fmt.Errorf("commit limited tx: %w", err)
		}
		return Result{Allowed: false, RetryAfter: retryAfter}, nil
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO rate_limit_events (scope, key_hash, window_seconds)
		VALUES ($1, $2, $3)
	`, scope, key, int(window.Seconds())); err != nil {
		return Result{}, fmt.Errorf("insert event: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return Result{}, fmt.Errorf("commit tx: %w", err)
	}
	return Result{Allowed: true}, nil
}

func advisoryKey(input string) int64 {
	h := fnv.New64a()
	_, _ = h.Write([]byte(input))
	return int64(h.Sum64())
}
