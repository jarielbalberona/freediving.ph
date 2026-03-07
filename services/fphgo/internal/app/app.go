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
	eventshttp "fphgo/internal/features/events/http"
	eventsrepo "fphgo/internal/features/events/repo"
	eventsservice "fphgo/internal/features/events/service"
	explorehttp "fphgo/internal/features/explore/http"
	explorerepo "fphgo/internal/features/explore/repo"
	exploreservice "fphgo/internal/features/explore/service"
	feedhttp "fphgo/internal/features/feed/http"
	feedrepo "fphgo/internal/features/feed/repo"
	feedservice "fphgo/internal/features/feed/service"
	groupshttp "fphgo/internal/features/groups/http"
	groupsrepo "fphgo/internal/features/groups/repo"
	groupsservice "fphgo/internal/features/groups/service"
	identityrepo "fphgo/internal/features/identity/repo"
	identityservice "fphgo/internal/features/identity/service"
	locationshttp "fphgo/internal/features/locations/http"
	locationsrepo "fphgo/internal/features/locations/repo"
	locationsservice "fphgo/internal/features/locations/service"
	mediahttp "fphgo/internal/features/media/http"
	mediarepo "fphgo/internal/features/media/repo"
	mediaservice "fphgo/internal/features/media/service"
	messaginghttp "fphgo/internal/features/messaging/http"
	messagingrepo "fphgo/internal/features/messaging/repo"
	messagingservice "fphgo/internal/features/messaging/service"
	moderationhttp "fphgo/internal/features/moderation_actions/http"
	moderationrepo "fphgo/internal/features/moderation_actions/repo"
	moderationservice "fphgo/internal/features/moderation_actions/service"
	notificationshttp "fphgo/internal/features/notifications/http"
	notificationsrepo "fphgo/internal/features/notifications/repo"
	notificationsservice "fphgo/internal/features/notifications/service"
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
	AuthHandler          *authhttp.Handlers
	UsersHandler         *usershttp.Handlers
	MessagingHandler     *messaginghttp.Handlers
	ChikaHandler         *chikahttp.Handlers
	ExploreHandler       *explorehttp.Handlers
	FeedHandler          *feedhttp.Handlers
	BuddyFinderHandler   *buddyfinderhttp.Handlers
	ProfilesHandler      *profileshttp.Handlers
	BlocksHandler        *blockshttp.Handlers
	BuddiesHandler       *buddieshttp.Handlers
	ReportsHandler       *reportshttp.Handlers
	ModerationHandler    *moderationhttp.Handlers
	MediaHandler         *mediahttp.Handlers
	NotificationsHandler *notificationshttp.Handlers
	GroupsHandler        *groupshttp.Handlers
	EventsHandler        *eventshttp.Handlers
	LocationsHandler     *locationshttp.Handlers
	AuthRoutes           chi.Router
	UsersRoutes          chi.Router
	MessagingRoutes      chi.Router
	ChikaRoutes          chi.Router
	ExploreRoutes        chi.Router
	FeedRoutes           chi.Router
	BuddyFinderRoutes    chi.Router
	ProfilesRoutes       chi.Router
	BlocksRoutes         chi.Router
	BuddiesRoutes        chi.Router
	ReportsRoutes        chi.Router
	ModerationRoutes     chi.Router
	MediaRoutes          chi.Router
	NotificationsRoutes  chi.Router
	GroupsRoutes         chi.Router
	EventsRoutes         chi.Router
	LocationsRoutes      chi.Router
	IdentityService      *identityservice.Service
	WSHandler            *ws.Handler
	Hub                  *ws.Hub
	ReadyCheck           func(context.Context) error
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
	var hubOpts []ws.HubOption
	if cfg.WSFanoutChannel != "" {
		bus, err := ws.NewPostgresFanoutBus(logger, pool, cfg.DBDSN, cfg.WSFanoutChannel)
		if err != nil {
			logger.Error("ws fanout disabled", "error", err)
		} else {
			hubOpts = append(hubOpts, ws.WithFanoutBus(bus))
			logger.Info("ws fanout enabled", "channel", cfg.WSFanoutChannel)
		}
	}
	hub := ws.NewHub(logger, hubOpts...)
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
	chikaService := chikaservice.New(
		chikaRepo,
		blocksService,
		chikaservice.WithLimiter(limiter),
		chikaservice.WithPseudonymSecret(cfg.ChikaPseudonymSecret),
		chikaservice.WithRealtimeBroadcaster(hub),
	)
	chikaHandler := chikahttp.New(chikaService, v)
	feedRepo := feedrepo.New(pool)
	feedService := feedservice.New(feedRepo)
	feedHandler := feedhttp.New(feedService, v)

	profilesRepo := profilesrepo.New(pool)
	profilesService := profilesservice.New(
		profilesRepo,
		profilesservice.WithLimiter(limiter),
		profilesservice.WithMediaBaseURL(cfg.MediaCDNBaseURL),
	)
	profilesHandler := profileshttp.New(profilesService, v)
	blocksHandler := blockshttp.New(blocksService, v)
	buddiesHandler := buddieshttp.New(buddiesService, v)
	reportsRepo := reportsrepo.New(pool)
	reportsService := reportsservice.New(reportsRepo, reportsservice.WithLimiter(limiter))
	reportsHandler := reportshttp.New(reportsService, v)
	moderationRepo := moderationrepo.New(pool)
	moderationService := moderationservice.New(
		moderationRepo,
		moderationservice.WithLimiter(limiter),
		moderationservice.WithRealtimeBroadcaster(hub),
	)
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
	notificationsRepo := notificationsrepo.New(pool)
	notificationsService := notificationsservice.New(notificationsRepo)
	notificationsHandler := notificationshttp.New(notificationsService, v)
	groupsRepo := groupsrepo.New(pool)
	groupsService := groupsservice.New(groupsRepo)
	groupsHandler := groupshttp.New(groupsService, v)
	eventsRepo := eventsrepo.New(pool)
	eventsService := eventsservice.New(eventsRepo)
	eventsHandler := eventshttp.New(eventsService, v)
	locationsRepo := locationsrepo.New(pool)
	locationsService := locationsservice.New(locationsRepo)
	locationsHandler := locationshttp.New(locationsService)

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

	wsHandler := ws.NewHandler(logger, hub, userService, cfg.CORSOrigins)

	return &Dependencies{
		AuthHandler:          authHandler,
		UsersHandler:         usersHandler,
		MessagingHandler:     messagingHandler,
		ChikaHandler:         chikaHandler,
		ExploreHandler:       exploreHandler,
		FeedHandler:          feedHandler,
		BuddyFinderHandler:   buddyFinderHandler,
		ProfilesHandler:      profilesHandler,
		BlocksHandler:        blocksHandler,
		BuddiesHandler:       buddiesHandler,
		ReportsHandler:       reportsHandler,
		ModerationHandler:    moderationHandler,
		MediaHandler:         mediaHandler,
		NotificationsHandler: notificationsHandler,
		GroupsHandler:        groupsHandler,
		EventsHandler:        eventsHandler,
		LocationsHandler:     locationsHandler,
		IdentityService:      identityService,
		WSHandler:            wsHandler,
		Hub:                  hub,
		ReadyCheck:           pool.Ping,
	}
}
