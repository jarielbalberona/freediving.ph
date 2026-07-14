package app

import (
	"context"
	"log/slog"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"fphgo/internal/config"
	adminhttp "fphgo/internal/features/admin/http"
	adminrepo "fphgo/internal/features/admin/repo"
	adminservice "fphgo/internal/features/admin/service"
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
	journeyhttp "fphgo/internal/features/dive_journey/http"
	journeyrepo "fphgo/internal/features/dive_journey/repo"
	journeyservice "fphgo/internal/features/dive_journey/service"
	divemaprepo "fphgo/internal/features/dive_map/repo"
	memorieshttp "fphgo/internal/features/dive_memories/http"
	memoriesrepo "fphgo/internal/features/dive_memories/repo"
	memoriesservice "fphgo/internal/features/dive_memories/service"
	passporthttp "fphgo/internal/features/dive_passport/http"
	passportrepo "fphgo/internal/features/dive_passport/repo"
	passportservice "fphgo/internal/features/dive_passport/service"
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
	homehttp "fphgo/internal/features/home/http"
	homerepo "fphgo/internal/features/home/repo"
	homeservice "fphgo/internal/features/home/service"
	identityrepo "fphgo/internal/features/identity/repo"
	identityservice "fphgo/internal/features/identity/service"
	instructorshttp "fphgo/internal/features/instructors/http"
	instructorsrepo "fphgo/internal/features/instructors/repo"
	instructorsservice "fphgo/internal/features/instructors/service"
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
	schoolshttp "fphgo/internal/features/schools/http"
	schoolsrepo "fphgo/internal/features/schools/repo"
	schoolsservice "fphgo/internal/features/schools/service"
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
	AdminHandler             *adminhttp.Handlers
	AuthHandler              *authhttp.Handlers
	UsersHandler             *usershttp.Handlers
	MessagingHandler         *messaginghttp.Handlers
	ChikaHandler             *chikahttp.Handlers
	PassportHandler          *passporthttp.Handlers
	JourneyHandler           *journeyhttp.Handlers
	MemoriesHandler          *memorieshttp.Handlers
	ExploreHandler           *explorehttp.Handlers
	FeedHandler              *feedhttp.Handlers
	BuddyFinderHandler       *buddyfinderhttp.Handlers
	ProfilesHandler          *profileshttp.Handlers
	BlocksHandler            *blockshttp.Handlers
	BuddiesHandler           *buddieshttp.Handlers
	ReportsHandler           *reportshttp.Handlers
	ModerationHandler        *moderationhttp.Handlers
	MediaHandler             *mediahttp.Handlers
	MediaService             *mediaservice.Service
	NotificationsHandler     *notificationshttp.Handlers
	NotificationsService     *notificationsservice.Service
	GroupsHandler            *groupshttp.Handlers
	EventsHandler            *eventshttp.Handlers
	SchoolsHandler           *schoolshttp.Handlers
	InstructorsHandler       *instructorshttp.Handlers
	LocationsHandler         *locationshttp.Handlers
	HomeHandler              *homehttp.Handlers
	AdminRoutes              chi.Router
	AuthRoutes               chi.Router
	UsersRoutes              chi.Router
	MessagingRoutes          chi.Router
	ChikaRoutes              chi.Router
	PassportPublicRoutes     chi.Router
	PassportRoutes           chi.Router
	JourneyRoutes            chi.Router
	JourneyPublicRoutes      chi.Router
	MemoriesRoutes           chi.Router
	MemoriesPublicRoutes     chi.Router
	ExploreRoutes            chi.Router
	FeedRoutes               chi.Router
	BuddyFinderRoutes        chi.Router
	ProfilesRoutes           chi.Router
	BlocksRoutes             chi.Router
	BuddiesRoutes            chi.Router
	ReportsRoutes            chi.Router
	ModerationRoutes         chi.Router
	MediaRoutes              chi.Router
	NotificationsRoutes      chi.Router
	NotificationsAdminRoutes chi.Router
	GroupsRoutes             chi.Router
	EventsRoutes             chi.Router
	SchoolsRoutes            chi.Router
	InstructorsRoutes        chi.Router
	InstructorsAdminRoutes   chi.Router
	LocationsRoutes          chi.Router
	HomeRoutes               chi.Router
	IdentityService          *identityservice.Service
	WSHandler                *ws.Handler
	Hub                      *ws.Hub
	ReadyCheck               func(context.Context) error
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

type mediaSiteLookup struct {
	explore *explorerepo.Repo
}

func (l mediaSiteLookup) GetSiteForWrite(ctx context.Context, siteID string) (mediaservice.SiteRecord, error) {
	site, err := l.explore.GetSiteForWrite(ctx, siteID)
	if err != nil {
		return mediaservice.SiteRecord{}, err
	}
	return mediaservice.SiteRecord{
		ID:              site.ID,
		Slug:            site.Slug,
		Name:            site.Name,
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

	feedRepo := feedrepo.New(pool)
	feedService := feedservice.New(
		feedRepo,
		feedservice.WithMediaDisplayURLs(
			cfg.MediaCDNBaseURL,
			cfg.MediaSigningSecretV1,
			cfg.MediaSigningKeyVersion,
		),
	)
	feedHandler := feedhttp.New(feedService, v)
	journeyRepo := journeyrepo.New(pool)
	journeyService := journeyservice.New(journeyRepo)
	journeyHandler := journeyhttp.New(journeyService, v)
	memoriesRepo := memoriesrepo.New(pool)
	memoriesService := memoriesservice.New(memoriesRepo, memoriesservice.WithJourneyWriter(journeyService))
	memoriesHandler := memorieshttp.New(memoriesService, v)

	notificationsRepo := notificationsrepo.New(pool)
	notificationOptions := []notificationsservice.Option{notificationsservice.WithBroadcaster(hub)}
	if cfg.PushDeliveryEnabled {
		notificationOptions = append(notificationOptions, notificationsservice.WithPushSender(
			notificationsservice.NewExpoPushSender(cfg.ExpoPushAccessToken, nil),
		))
		logger.Info("push delivery enabled", "provider", "expo")
	}
	notificationsService := notificationsservice.New(notificationsRepo, notificationOptions...)
	notificationsHandler := notificationshttp.New(notificationsService, v)

	chikaRepo := chikarepo.New(pool)
	chikaService := chikaservice.New(
		chikaRepo,
		blocksService,
		chikaservice.WithLimiter(limiter),
		chikaservice.WithPseudonymSecret(cfg.ChikaPseudonymSecret),
		chikaservice.WithRealtimeBroadcaster(hub),
		chikaservice.WithActivityPublisher(feedService),
		chikaservice.WithNotifications(notificationsService),
	)
	chikaHandler := chikahttp.New(chikaService, v)

	profilesRepo := profilesrepo.New(pool)
	profilesService := profilesservice.New(
		profilesRepo,
		profilesservice.WithLimiter(limiter),
		profilesservice.WithMediaBaseURL(cfg.MediaCDNBaseURL),
	)
	profilesHandler := profileshttp.New(profilesService, v)
	passportRepo := passportrepo.New(pool)
	passportService := passportservice.New(
		profilesService,
		journeyService,
		passportservice.WithMemoryReader(memoriesService),
		passportservice.WithSettingsRepository(passportRepo),
	)
	passportHandler := passporthttp.New(passportService, v)
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
	exploreRepo := explorerepo.New(pool)
	diveMapRepo := divemaprepo.New(pool)
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
		if strings.EqualFold(cfg.Env, "production") {
			logger.Error("media r2 storage init failed", "error", err)
			panic(err)
		}
		logger.Warn("media r2 storage disabled", "error", err)
	}
	mediaService := mediaservice.New(
		mediaRepo,
		mediaUploader,
		cfg.R2BucketName,
		cfg.MediaCDNBaseURL,
		cfg.MediaSigningSecretV1,
		cfg.MediaSigningKeyVersion,
		mediaservice.WithSiteLookup(mediaSiteLookup{explore: exploreRepo}),
		mediaservice.WithDiveMapDeriver(diveMapRepo),
		mediaservice.WithActivityPublisher(feedService),
		mediaservice.WithMomentsEnabled(cfg.MomentsEnabled),
		mediaservice.WithStreamClient(
			mediaservice.NewCloudflareStreamClient(cfg.CloudflareAccountID, cfg.CloudflareStreamAPIToken),
			cfg.CloudflareStreamRequireSignedURLs,
		),
	)
	mediaHandler := mediahttp.New(mediaService, v, cfg.CloudflareStreamWebhookSecret)
	groupsRepo := groupsrepo.New(pool)
	groupsService := groupsservice.New(groupsRepo, groupsservice.WithNotifications(notificationsService))
	groupsHandler := groupshttp.New(groupsService, v)
	eventsRepo := eventsrepo.New(pool)
	eventsService := eventsservice.New(
		eventsRepo,
		eventsservice.WithActivityPublisher(feedService),
		eventsservice.WithNotifications(notificationsService),
		eventsservice.WithPaymentProofSigning(
			cfg.MediaCDNBaseURL,
			cfg.MediaSigningSecretV1,
			cfg.MediaSigningKeyVersion,
		),
	)
	eventsHandler := eventshttp.New(eventsService, v)
	schoolsRepo := schoolsrepo.New(pool)
	schoolsService := schoolsservice.New(
		schoolsRepo,
		schoolsservice.WithNotifications(notificationsService),
		schoolsservice.WithPaymentProofSigning(
			cfg.MediaCDNBaseURL,
			cfg.MediaSigningSecretV1,
			cfg.MediaSigningKeyVersion,
		),
	)
	schoolsHandler := schoolshttp.New(schoolsService, v)
	instructorsRepo := instructorsrepo.New(pool)
	instructorsService := instructorsservice.New(
		instructorsRepo,
		instructorsservice.WithProofSigning(
			cfg.MediaCDNBaseURL,
			cfg.MediaSigningSecretV1,
			cfg.MediaSigningKeyVersion,
		),
		instructorsservice.WithNotifications(notificationsService),
	)
	instructorsHandler := instructorshttp.New(instructorsService, v)
	locationsRepo := locationsrepo.New(pool)
	locationsService := locationsservice.New(locationsRepo)
	locationsHandler := locationshttp.New(locationsService)
	homeRepo := homerepo.New(pool)
	homeService := homeservice.New(homeRepo, homeservice.WithForecastProvider(homeservice.NewOpenMeteoProvider()))
	homeHandler := homehttp.New(homeService)
	adminRepo := adminrepo.New(pool)
	adminService := adminservice.New(adminRepo)
	adminHandler := adminhttp.New(adminService, v)
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
		buddyfinderservice.WithActivityPublisher(feedService),
	)
	buddyFinderHandler := buddyfinderhttp.New(buddyFinderService, v)
	exploreService := exploreservice.New(
		exploreRepo,
		exploreservice.WithLimiter(limiter),
		exploreservice.WithBuddyMatcher(buddyFinderService),
		exploreservice.WithReverseGeocoder(siteGeocoder),
		exploreservice.WithActivityPublisher(feedService),
		exploreservice.WithActivityFeed(feedService),
		exploreservice.WithNotifications(notificationsService),
		exploreservice.WithMediaDisplayURLs(
			cfg.MediaCDNBaseURL,
			cfg.MediaSigningSecretV1,
			cfg.MediaSigningKeyVersion,
		),
	)
	exploreHandler := explorehttp.New(exploreService, v)

	identityRepo := identityrepo.New(pool)
	identityService := identityservice.New(identityRepo)

	wsHandler := ws.NewHandler(logger, hub, userService, cfg.CORSOrigins)

	return &Dependencies{
		AdminHandler:         adminHandler,
		AuthHandler:          authHandler,
		UsersHandler:         usersHandler,
		MessagingHandler:     messagingHandler,
		ChikaHandler:         chikaHandler,
		PassportHandler:      passportHandler,
		JourneyHandler:       journeyHandler,
		MemoriesHandler:      memoriesHandler,
		ExploreHandler:       exploreHandler,
		FeedHandler:          feedHandler,
		BuddyFinderHandler:   buddyFinderHandler,
		ProfilesHandler:      profilesHandler,
		BlocksHandler:        blocksHandler,
		BuddiesHandler:       buddiesHandler,
		ReportsHandler:       reportsHandler,
		ModerationHandler:    moderationHandler,
		MediaHandler:         mediaHandler,
		MediaService:         mediaService,
		NotificationsHandler: notificationsHandler,
		NotificationsService: notificationsService,
		GroupsHandler:        groupsHandler,
		EventsHandler:        eventsHandler,
		SchoolsHandler:       schoolsHandler,
		InstructorsHandler:   instructorsHandler,
		LocationsHandler:     locationsHandler,
		HomeHandler:          homeHandler,
		IdentityService:      identityService,
		WSHandler:            wsHandler,
		Hub:                  hub,
		ReadyCheck:           pool.Ping,
	}
}
