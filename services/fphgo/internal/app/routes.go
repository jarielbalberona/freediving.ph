package app

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"fphgo/internal/config"
	authhttp "fphgo/internal/features/auth/http"
	blockshttp "fphgo/internal/features/blocks/http"
	buddieshttp "fphgo/internal/features/buddies/http"
	buddyfinderhttp "fphgo/internal/features/buddyfinder/http"
	chikahttp "fphgo/internal/features/chika/http"
	eventshttp "fphgo/internal/features/events/http"
	explorehttp "fphgo/internal/features/explore/http"
	feedhttp "fphgo/internal/features/feed/http"
	groupshttp "fphgo/internal/features/groups/http"
	locationshttp "fphgo/internal/features/locations/http"
	mediahttp "fphgo/internal/features/media/http"
	messaginghttp "fphgo/internal/features/messaging/http"
	moderationhttp "fphgo/internal/features/moderation_actions/http"
	notificationshttp "fphgo/internal/features/notifications/http"
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
		if deps.WSHandler != nil {
			r.Get("/ws", deps.WSHandler.ServeHTTP)
		}
		if deps.UsersHandler != nil {
			r.Get("/profiles/{username}", deps.UsersHandler.GetProfileByUsername)
		}
		if exploreRouter := resolveExploreRouter(deps); exploreRouter != nil {
			r.Mount("/v1/explore", exploreRouter)
		}
		if feedRouter := resolveFeedRouter(deps); feedRouter != nil {
			r.Mount("/v1/feed", feedRouter)
		}
		if buddyFinderRouter := resolveBuddyFinderRouter(deps); buddyFinderRouter != nil {
			r.Mount("/v1/buddy-finder", buddyFinderRouter)
		}
		if chikaRouter := resolveChikaRouter(deps); chikaRouter != nil {
			r.Mount("/v1/chika", chikaRouter)
		}
		if groupsRouter := resolveGroupsRouter(deps); groupsRouter != nil {
			r.Mount("/v1/groups", groupsRouter)
		}
		if eventsRouter := resolveEventsRouter(deps); eventsRouter != nil {
			r.Mount("/v1/events", eventsRouter)
		}
		if locationsRouter := resolveLocationsRouter(deps); locationsRouter != nil {
			r.Mount("/v1/locations", locationsRouter)
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
			member.Group(func(buddies chi.Router) {
				if buddiesRouter := resolveBuddiesRouter(deps); buddiesRouter != nil {
					buddies.Mount("/v1/buddies", buddiesRouter)
				}
			})
			member.Group(func(reports chi.Router) {
				if reportsRouter := resolveReportsRouter(deps); reportsRouter != nil {
					reports.Mount("/v1/reports", reportsRouter)
				}
			})
			member.Group(func(moderation chi.Router) {
				if moderationRouter := resolveModerationRouter(deps); moderationRouter != nil {
					moderation.Mount("/v1/moderation", moderationRouter)
				}
			})
			member.Group(func(media chi.Router) {
				if mediaRouter := resolveMediaRouter(deps); mediaRouter != nil {
					media.Mount("/v1/media", mediaRouter)
				}
			})
			member.Group(func(notifications chi.Router) {
				if notificationsRouter := resolveNotificationsRouter(deps); notificationsRouter != nil {
					notifications.Mount("/v1/notifications", notificationsRouter)
				}
			})
			if authRouter := resolveAuthRouter(deps); authRouter != nil {
				member.Mount("/v1/auth", authRouter)
			}
			if deps.AuthHandler != nil {
				member.Get("/v1/me", deps.AuthHandler.GetSession)
			}
			member.Group(func(messages chi.Router) {
				messages.Use(middleware.RequirePermission(authz.PermissionMessagingRead))
				if messagingRouter := resolveMessagingRouter(deps); messagingRouter != nil {
					messages.Mount("/v1/messages", messagingRouter)
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

func resolveBuddyFinderRouter(deps *Dependencies) chi.Router {
	if deps.BuddyFinderRoutes != nil {
		return deps.BuddyFinderRoutes
	}
	if deps.BuddyFinderHandler == nil {
		return nil
	}
	return buddyfinderhttp.Routes(deps.BuddyFinderHandler)
}

func resolveFeedRouter(deps *Dependencies) chi.Router {
	if deps.FeedRoutes != nil {
		return deps.FeedRoutes
	}
	if deps.FeedHandler == nil {
		return nil
	}
	return feedhttp.Routes(deps.FeedHandler)
}

func resolveGroupsRouter(deps *Dependencies) chi.Router {
	if deps.GroupsRoutes != nil {
		return deps.GroupsRoutes
	}
	if deps.GroupsHandler == nil {
		return nil
	}
	return groupshttp.Routes(deps.GroupsHandler)
}

func resolveEventsRouter(deps *Dependencies) chi.Router {
	if deps.EventsRoutes != nil {
		return deps.EventsRoutes
	}
	if deps.EventsHandler == nil {
		return nil
	}
	return eventshttp.Routes(deps.EventsHandler)
}

func resolveLocationsRouter(deps *Dependencies) chi.Router {
	if deps.LocationsRoutes != nil {
		return deps.LocationsRoutes
	}
	if deps.LocationsHandler == nil {
		return nil
	}
	return locationshttp.Routes(deps.LocationsHandler)
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

func resolveBuddiesRouter(deps *Dependencies) chi.Router {
	if deps.BuddiesRoutes != nil {
		return deps.BuddiesRoutes
	}
	if deps.BuddiesHandler == nil {
		return nil
	}
	return buddieshttp.Routes(deps.BuddiesHandler)
}

func resolveMediaRouter(deps *Dependencies) chi.Router {
	if deps.MediaRoutes != nil {
		return deps.MediaRoutes
	}
	if deps.MediaHandler == nil {
		return nil
	}
	return mediahttp.Routes(deps.MediaHandler)
}

func resolveNotificationsRouter(deps *Dependencies) chi.Router {
	if deps.NotificationsRoutes != nil {
		return deps.NotificationsRoutes
	}
	if deps.NotificationsHandler == nil {
		return nil
	}
	return notificationshttp.Routes(deps.NotificationsHandler)
}

func resolveModerationRouter(deps *Dependencies) chi.Router {
	if deps.ModerationRoutes != nil {
		return deps.ModerationRoutes
	}
	if deps.ModerationHandler == nil {
		return nil
	}
	return moderationhttp.Routes(deps.ModerationHandler)
}
