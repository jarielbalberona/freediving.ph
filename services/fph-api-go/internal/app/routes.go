package app

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"fph-api-go/internal/config"
	chikahttp "fph-api-go/internal/features/chika/http"
	explorehttp "fph-api-go/internal/features/explore/http"
	messaginghttp "fph-api-go/internal/features/messaging/http"
	usershttp "fph-api-go/internal/features/users/http"
	"fph-api-go/internal/middleware"
	apperrors "fph-api-go/internal/shared/errors"
	"fph-api-go/internal/shared/httpx"
)

func NewRouter(cfg config.Config, deps *Dependencies, logger *slog.Logger, recoverMW func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RequestLogger(logger))
	r.Use(recoverMW)
	r.Use(middleware.CORS(cfg.CORSOrigins))
	r.Use(middleware.RateLimit(300, time.Minute))

	// Health checks: no auth so load balancers and Docker can hit them
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	r.Get("/readyz", func(w http.ResponseWriter, r *http.Request) {
		if deps == nil || deps.ReadyCheck == nil {
			httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusServiceUnavailable, "not_ready", "readiness check is not configured", nil))
			return
		}
		if err := deps.ReadyCheck(r.Context()); err != nil {
			httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusServiceUnavailable, "not_ready", "database unavailable", err))
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ready"})
	})

	// API routes: attach Clerk auth (optional; protected routes use RequireMember)
	r.Group(func(r chi.Router) {
		r.Use(middleware.AttachClerkAuth(cfg))
		r.Mount("/v1/users", usershttp.Routes(deps.UsersHandler))
		r.Mount("/v1/explore", explorehttp.Routes(deps.ExploreHandler))
		r.Group(func(member chi.Router) {
			member.Use(middleware.RequireMember)
			member.Mount("/v1/messages", messaginghttp.Routes(deps.MessagingHandler))
			member.Mount("/v1/chika", chikahttp.Routes(deps.ChikaHandler))
			member.Get("/ws", deps.WSHandler.ServeHTTP)
		})
	})

	return r
}
