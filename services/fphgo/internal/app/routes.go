package app

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"fphgo/internal/config"
	authhttp "fphgo/internal/features/auth/http"
	chikahttp "fphgo/internal/features/chika/http"
	explorehttp "fphgo/internal/features/explore/http"
	messaginghttp "fphgo/internal/features/messaging/http"
	usershttp "fphgo/internal/features/users/http"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
)

func NewRouter(cfg config.Config, deps *Dependencies, logger *slog.Logger, recoverMW func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RequestLogger(logger))
	r.Use(recoverMW)
	r.Use(middleware.CORS(cfg.CORSOrigins, logger))
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
		r.Use(middleware.EnforceTokenClaims(cfg))
		r.Use(middleware.AttachIdentityContext(deps.IdentityService))
		r.Get("/profiles/{username}", deps.UsersHandler.GetProfileByUsername)
		r.Mount("/v1/users", usershttp.Routes(deps.UsersHandler))
		r.Mount("/v1/explore", explorehttp.Routes(deps.ExploreHandler))
		r.Group(func(member chi.Router) {
			member.Use(middleware.RequireMember)
			member.Mount("/v1/auth", authhttp.Routes(deps.AuthHandler))
			member.Group(func(content chi.Router) {
				content.Use(middleware.RequirePermission(authz.PermissionContentRead))
				content.Mount("/v1/messages", messaginghttp.Routes(deps.MessagingHandler))
				content.Mount("/v1/chika", chikahttp.Routes(deps.ChikaHandler))
				content.Get("/ws", deps.WSHandler.ServeHTTP)
			})
		})
	})

	return r
}
