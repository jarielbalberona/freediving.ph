package middleware

import (
	"log/slog"
	"net/http"

	"fphgo/internal/shared/httpx"
)

func Recover(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					logger.Error("panic recovered", "panic", rec, "request_id", RequestIDFromContext(r.Context()))
					httpx.Error(w, RequestIDFromContext(r.Context()), nil)
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}
