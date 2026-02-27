package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"

	apperrors "fph-api-go/internal/shared/errors"
	"fph-api-go/internal/shared/httpx"
)

type bucket struct {
	count     int
	windowEnd time.Time
}

func RateLimit(limit int, window time.Duration) func(http.Handler) http.Handler {
	if limit <= 0 {
		limit = 60
	}
	if window <= 0 {
		window = time.Minute
	}

	var mu sync.Mutex
	buckets := map[string]bucket{}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip, _, err := net.SplitHostPort(r.RemoteAddr)
			if err != nil {
				ip = r.RemoteAddr
			}

			now := time.Now()
			mu.Lock()
			b := buckets[ip]
			if now.After(b.windowEnd) {
				b = bucket{count: 0, windowEnd: now.Add(window)}
			}
			b.count++
			buckets[ip] = b
			blocked := b.count > limit
			mu.Unlock()

			if blocked {
				httpx.Error(w, RequestIDFromContext(r.Context()), apperrors.New(http.StatusTooManyRequests, "rate_limited", "Too many requests", nil))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
