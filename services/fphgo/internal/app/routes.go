package app

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"fphgo/internal/config"
	authhttp "fphgo/internal/features/auth/http"
	blockshttp "fphgo/internal/features/blocks/http"
	chikahttp "fphgo/internal/features/chika/http"
	explorehttp "fphgo/internal/features/explore/http"
	messaginghttp "fphgo/internal/features/messaging/http"
	profileshttp "fphgo/internal/features/profiles/http"
	reportshttp "fphgo/internal/features/reports/http"
	usershttp "fphgo/internal/features/users/http"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
)

type RouterOption func(*routerOptions)

type routerOptions struct {
	authMiddleware        func(http.Handler) http.Handler
	tokenClaimsMiddleware func(http.Handler) http.Handler
	identityMiddleware    func(http.Handler) http.Handler
}

func WithAuthMiddleware(mw func(http.Handler) http.Handler) RouterOption {
	return func(opts *routerOptions) {
		opts.authMiddleware = mw
	}
}

func NewRouter(cfg config.Config, deps *Dependencies, logger *slog.Logger, recoverMW func(http.Handler) http.Handler, opts ...RouterOption) chi.Router {
	return NewRouterWithBuildInfo(cfg, deps, logger, recoverMW, BuildInfo{}, opts...)
}

func NewRouterWithBuildInfo(cfg config.Config, deps *Dependencies, logger *slog.Logger, recoverMW func(http.Handler) http.Handler, build BuildInfo, opts ...RouterOption) chi.Router {
	if cfg.RateLimitPerMin <= 0 {
		cfg.RateLimitPerMin = 300
	}
	if build.Version == "" {
		build.Version = "dev"
	}
	if build.Commit == "" {
		build.Commit = "unknown"
	}
	if build.BuildTime == "" {
		build.BuildTime = "unknown"
	}
	if deps == nil {
		deps = &Dependencies{}
	}

	routerOpts := routerOptions{
		authMiddleware:        middleware.AttachClerkAuth(cfg),
		tokenClaimsMiddleware: middleware.EnforceTokenClaims(cfg),
		identityMiddleware:    middleware.AttachIdentityContext(deps.IdentityService),
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&routerOpts)
		}
	}

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RequestLogger(logger))
	r.Use(recoverMW)
	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.CORS(cfg.CORSOrigins, logger))
	r.Use(middleware.RateLimit(cfg.RateLimitPerMin, time.Minute))

	// Health checks: no auth so load balancers and Docker can hit them
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{
			"status":     "ok",
			"version":    build.Version,
			"commit":     build.Commit,
			"build_time": build.BuildTime,
		})
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
		r.Use(routerOpts.authMiddleware)
		r.Use(routerOpts.tokenClaimsMiddleware)
		r.Use(routerOpts.identityMiddleware)
		if deps.UsersHandler != nil {
			r.Get("/profiles/{username}", deps.UsersHandler.GetProfileByUsername)
		}
		if exploreRouter := resolveExploreRouter(deps); exploreRouter != nil {
			r.Mount("/v1/explore", exploreRouter)
		}
		r.Group(func(member chi.Router) {
			member.Use(middleware.RequireMember)
			member.Group(func(profiles chi.Router) {
				if profilesRouter := resolveProfilesRouter(deps); profilesRouter != nil {
					profiles.Mount("/v1", profilesRouter)
				}
			})
			member.Group(func(blocks chi.Router) {
				if blocksRouter := resolveBlocksRouter(deps); blocksRouter != nil {
					blocks.Mount("/v1/blocks", blocksRouter)
				}
			})
			member.Group(func(reports chi.Router) {
				if reportsRouter := resolveReportsRouter(deps); reportsRouter != nil {
					reports.Mount("/v1/reports", reportsRouter)
				}
			})
			if authRouter := resolveAuthRouter(deps); authRouter != nil {
				member.Mount("/v1/auth", authRouter)
			}
			member.Group(func(messages chi.Router) {
				messages.Use(middleware.RequirePermission(authz.PermissionMessagingRead))
				if messagingRouter := resolveMessagingRouter(deps); messagingRouter != nil {
					messages.Mount("/v1/messages", messagingRouter)
				}
			})
			member.Group(func(chika chi.Router) {
				chika.Use(middleware.RequirePermission(authz.PermissionChikaRead))
				if chikaRouter := resolveChikaRouter(deps); chikaRouter != nil {
					chika.Mount("/v1/chika", chikaRouter)
				}
			})
			member.Group(func(ws chi.Router) {
				ws.Use(middleware.RequirePermission(authz.PermissionMessagingRead))
				if deps.WSHandler != nil {
					ws.Get("/ws", deps.WSHandler.ServeHTTP)
				}
			})
		})
		if usersRouter := resolveUsersRouter(deps); usersRouter != nil {
			r.Mount("/v1/users", usersRouter)
		}
	})

	return r
}

func resolveAuthRouter(deps *Dependencies) chi.Router {
	if deps.AuthRoutes != nil {
		return deps.AuthRoutes
	}
	if deps.AuthHandler == nil {
		return nil
	}
	return authhttp.Routes(deps.AuthHandler)
}

func resolveUsersRouter(deps *Dependencies) chi.Router {
	if deps.UsersRoutes != nil {
		return deps.UsersRoutes
	}
	if deps.UsersHandler == nil {
		return nil
	}
	return usershttp.Routes(deps.UsersHandler)
}

func resolveMessagingRouter(deps *Dependencies) chi.Router {
	if deps.MessagingRoutes != nil {
		return deps.MessagingRoutes
	}
	if deps.MessagingHandler == nil {
		return nil
	}
	return messaginghttp.Routes(deps.MessagingHandler)
}

func resolveChikaRouter(deps *Dependencies) chi.Router {
	if deps.ChikaRoutes != nil {
		return deps.ChikaRoutes
	}
	if deps.ChikaHandler == nil {
		return nil
	}
	return chikahttp.Routes(deps.ChikaHandler)
}

func resolveExploreRouter(deps *Dependencies) chi.Router {
	if deps.ExploreRoutes != nil {
		return deps.ExploreRoutes
	}
	if deps.ExploreHandler == nil {
		return nil
	}
	return explorehttp.Routes(deps.ExploreHandler)
}

func resolveProfilesRouter(deps *Dependencies) chi.Router {
	if deps.ProfilesRoutes != nil {
		return deps.ProfilesRoutes
	}
	if deps.ProfilesHandler == nil {
		return nil
	}
	return profileshttp.Routes(deps.ProfilesHandler)
}

func resolveBlocksRouter(deps *Dependencies) chi.Router {
	if deps.BlocksRoutes != nil {
		return deps.BlocksRoutes
	}
	if deps.BlocksHandler == nil {
		return nil
	}
	return blockshttp.Routes(deps.BlocksHandler)
}

func resolveReportsRouter(deps *Dependencies) chi.Router {
	if deps.ReportsRoutes != nil {
		return deps.ReportsRoutes
	}
	if deps.ReportsHandler == nil {
		return nil
	}
	return reportshttp.Routes(deps.ReportsHandler)
}
