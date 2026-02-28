package app

import (
	"context"
	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"fphgo/internal/config"
	authhttp "fphgo/internal/features/auth/http"
	blockshttp "fphgo/internal/features/blocks/http"
	blocksrepo "fphgo/internal/features/blocks/repo"
	blocksservice "fphgo/internal/features/blocks/service"
	buddieshttp "fphgo/internal/features/buddies/http"
	buddiesrepo "fphgo/internal/features/buddies/repo"
	buddiesservice "fphgo/internal/features/buddies/service"
	buddyfinderhttp "fphgo/internal/features/buddyfinder/http"
	buddyfinderrepo "fphgo/internal/features/buddyfinder/repo"
	buddyfinderservice "fphgo/internal/features/buddyfinder/service"
	chikahttp "fphgo/internal/features/chika/http"
	chikarepo "fphgo/internal/features/chika/repo"
	chikaservice "fphgo/internal/features/chika/service"
	explorehttp "fphgo/internal/features/explore/http"
	explorerepo "fphgo/internal/features/explore/repo"
	exploreservice "fphgo/internal/features/explore/service"
	identityrepo "fphgo/internal/features/identity/repo"
	identityservice "fphgo/internal/features/identity/service"
	mediahttp "fphgo/internal/features/media/http"
	mediarepo "fphgo/internal/features/media/repo"
	mediaservice "fphgo/internal/features/media/service"
	messaginghttp "fphgo/internal/features/messaging/http"
	messagingrepo "fphgo/internal/features/messaging/repo"
	messagingservice "fphgo/internal/features/messaging/service"
	moderationhttp "fphgo/internal/features/moderation_actions/http"
	moderationrepo "fphgo/internal/features/moderation_actions/repo"
	moderationservice "fphgo/internal/features/moderation_actions/service"
	profileshttp "fphgo/internal/features/profiles/http"
	profilesrepo "fphgo/internal/features/profiles/repo"
	profilesservice "fphgo/internal/features/profiles/service"
	reportshttp "fphgo/internal/features/reports/http"
	reportsrepo "fphgo/internal/features/reports/repo"
	reportsservice "fphgo/internal/features/reports/service"
	usershttp "fphgo/internal/features/users/http"
	usersrepo "fphgo/internal/features/users/repo"
	usersservice "fphgo/internal/features/users/service"
	"fphgo/internal/realtime/ws"
	sharedmapsgeocode "fphgo/internal/shared/maps/geocode"
	sharedratelimit "fphgo/internal/shared/ratelimit"
	sharedr2 "fphgo/internal/shared/storage/r2"
	"fphgo/internal/shared/validatex"
)

type App struct {
	Router any
	Server any
}

type Dependencies struct {
	AuthHandler        *authhttp.Handlers
	UsersHandler       *usershttp.Handlers
	MessagingHandler   *messaginghttp.Handlers
	ChikaHandler       *chikahttp.Handlers
	ExploreHandler     *explorehttp.Handlers
	BuddyFinderHandler *buddyfinderhttp.Handlers
	ProfilesHandler    *profileshttp.Handlers
	BlocksHandler      *blockshttp.Handlers
	BuddiesHandler     *buddieshttp.Handlers
	ReportsHandler     *reportshttp.Handlers
	ModerationHandler  *moderationhttp.Handlers
	MediaHandler       *mediahttp.Handlers
	AuthRoutes         chi.Router
	UsersRoutes        chi.Router
	MessagingRoutes    chi.Router
	ChikaRoutes        chi.Router
	ExploreRoutes      chi.Router
	BuddyFinderRoutes  chi.Router
	ProfilesRoutes     chi.Router
	BlocksRoutes       chi.Router
	BuddiesRoutes      chi.Router
	ReportsRoutes      chi.Router
	ModerationRoutes   chi.Router
	MediaRoutes        chi.Router
	IdentityService    *identityservice.Service
	WSHandler          *ws.Handler
	Hub                *ws.Hub
	ReadyCheck         func(context.Context) error
}

type buddyFinderSiteLookup struct {
	explore *explorerepo.Repo
}

func (l buddyFinderSiteLookup) GetSiteForWrite(ctx context.Context, siteID string) (buddyfinderservice.SiteRecord, error) {
	site, err := l.explore.GetSiteForWrite(ctx, siteID)
	if err != nil {
		return buddyfinderservice.SiteRecord{}, err
	}
	return buddyfinderservice.SiteRecord{
		ID:              site.ID,
		Area:            site.Area,
		ModerationState: site.ModerationState,
	}, nil
}

func BuildDependencies(cfg config.Config, logger *slog.Logger, pool *pgxpool.Pool) *Dependencies {
	hub := ws.NewHub(logger)
	v := validatex.New()
	limiter := sharedratelimit.New(pool)

	userRepo := usersrepo.New(pool)
	userService := usersservice.New(userRepo)
	usersHandler := usershttp.New(userService, v)
	authHandler := authhttp.New()

	messagingRepo := messagingrepo.New(pool)
	blocksRepo := blocksrepo.New(pool)
	blocksService := blocksservice.New(blocksRepo, blocksservice.WithLimiter(limiter))
	buddiesRepo := buddiesrepo.New(pool)
	buddiesService := buddiesservice.New(buddiesRepo, buddiesservice.WithLimiter(limiter))
	messagingService := messagingservice.New(messagingRepo, hub, blocksService, messagingservice.WithLimiter(limiter))
	messagingHandler := messaginghttp.New(messagingService, userService, v)

	chikaRepo := chikarepo.New(pool)
	chikaService := chikaservice.New(chikaRepo, blocksService, chikaservice.WithLimiter(limiter))
	chikaHandler := chikahttp.New(chikaService, v)

	profilesRepo := profilesrepo.New(pool)
	profilesService := profilesservice.New(profilesRepo, profilesservice.WithLimiter(limiter))
	profilesHandler := profileshttp.New(profilesService, v)
	blocksHandler := blockshttp.New(blocksService, v)
	buddiesHandler := buddieshttp.New(buddiesService, v)
	reportsRepo := reportsrepo.New(pool)
	reportsService := reportsservice.New(reportsRepo, reportsservice.WithLimiter(limiter))
	reportsHandler := reportshttp.New(reportsService, v)
	moderationRepo := moderationrepo.New(pool)
	moderationService := moderationservice.New(moderationRepo, moderationservice.WithLimiter(limiter))
	moderationHandler := moderationhttp.New(moderationService, v)
	mediaRepo := mediarepo.New(pool)
	var mediaUploader *sharedr2.Client
	mediaUploader, err := sharedr2.New(context.Background(), sharedr2.Config{
		AccountID:       cfg.R2AccountID,
		AccessKeyID:     cfg.R2AccessKeyID,
		SecretAccessKey: cfg.R2SecretAccessKey,
		BucketName:      cfg.R2BucketName,
		Region:          cfg.R2Region,
	})
	if err != nil {
		logger.Warn("media r2 storage disabled", "error", err)
	}
	mediaService := mediaservice.New(
		mediaRepo,
		mediaUploader,
		cfg.R2BucketName,
		cfg.MediaCDNBaseURL,
		cfg.MediaSigningSecretV1,
		cfg.MediaSigningKeyVersion,
	)
	mediaHandler := mediahttp.New(mediaService, v)

	exploreRepo := explorerepo.New(pool)
	var siteGeocoder *sharedmapsgeocode.Client
	siteGeocoder, err = sharedmapsgeocode.New(cfg.GoogleMapsAPIKey)
	if err != nil {
		logger.Warn("explore site geocoder disabled", "error", err)
	}
	buddyFinderRepo := buddyfinderrepo.New(pool)
	buddyFinderService := buddyfinderservice.New(
		buddyFinderRepo,
		buddyfinderservice.WithLimiter(limiter),
		buddyfinderservice.WithBlocks(blocksService),
		buddyfinderservice.WithSiteLookup(buddyFinderSiteLookup{explore: exploreRepo}),
	)
	buddyFinderHandler := buddyfinderhttp.New(buddyFinderService, v)
	exploreService := exploreservice.New(
		exploreRepo,
		exploreservice.WithLimiter(limiter),
		exploreservice.WithBuddyMatcher(buddyFinderService),
		exploreservice.WithReverseGeocoder(siteGeocoder),
	)
	exploreHandler := explorehttp.New(exploreService, v)

	identityRepo := identityrepo.New(pool)
	identityService := identityservice.New(identityRepo)

	wsHandler := ws.NewHandler(logger, hub, userService)

	return &Dependencies{
		AuthHandler:        authHandler,
		UsersHandler:       usersHandler,
		MessagingHandler:   messagingHandler,
		ChikaHandler:       chikaHandler,
		ExploreHandler:     exploreHandler,
		BuddyFinderHandler: buddyFinderHandler,
		ProfilesHandler:    profilesHandler,
		BlocksHandler:      blocksHandler,
		BuddiesHandler:     buddiesHandler,
		ReportsHandler:     reportsHandler,
		ModerationHandler:  moderationHandler,
		MediaHandler:       mediaHandler,
		IdentityService:    identityService,
		WSHandler:          wsHandler,
		Hub:                hub,
		ReadyCheck:         pool.Ping,
	}
}
