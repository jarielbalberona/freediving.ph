package app

import (
	"context"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"

	authhttp "fphgo/internal/features/auth/http"
	chikahttp "fphgo/internal/features/chika/http"
	chikarepo "fphgo/internal/features/chika/repo"
	chikaservice "fphgo/internal/features/chika/service"
	explorehttp "fphgo/internal/features/explore/http"
	explorerepo "fphgo/internal/features/explore/repo"
	exploreservice "fphgo/internal/features/explore/service"
	identityrepo "fphgo/internal/features/identity/repo"
	identityservice "fphgo/internal/features/identity/service"
	messaginghttp "fphgo/internal/features/messaging/http"
	messagingrepo "fphgo/internal/features/messaging/repo"
	messagingservice "fphgo/internal/features/messaging/service"
	usershttp "fphgo/internal/features/users/http"
	usersrepo "fphgo/internal/features/users/repo"
	usersservice "fphgo/internal/features/users/service"
	"fphgo/internal/realtime/ws"
	"fphgo/internal/shared/validatex"
)

type App struct {
	Router any
	Server any
}

type Dependencies struct {
	AuthHandler      *authhttp.Handlers
	UsersHandler     *usershttp.Handlers
	MessagingHandler *messaginghttp.Handlers
	ChikaHandler     *chikahttp.Handlers
	ExploreHandler   *explorehttp.Handlers
	IdentityService  *identityservice.Service
	WSHandler        *ws.Handler
	Hub              *ws.Hub
	ReadyCheck       func(context.Context) error
}

func BuildDependencies(logger *slog.Logger, pool *pgxpool.Pool) *Dependencies {
	hub := ws.NewHub(logger)
	v := validatex.New()

	userRepo := usersrepo.New(pool)
	userService := usersservice.New(userRepo)
	usersHandler := usershttp.New(userService, v)
	authHandler := authhttp.New()

	messagingRepo := messagingrepo.New(pool)
	messagingService := messagingservice.New(messagingRepo, hub)
	messagingHandler := messaginghttp.New(messagingService, userService, v)

	chikaRepo := chikarepo.New(pool)
	chikaService := chikaservice.New(chikaRepo)
	chikaHandler := chikahttp.New(chikaService, v)

	exploreRepo := explorerepo.New(pool)
	exploreService := exploreservice.New(exploreRepo)
	exploreHandler := explorehttp.New(exploreService)

	identityRepo := identityrepo.New(pool)
	identityService := identityservice.New(identityRepo)

	wsHandler := ws.NewHandler(logger, hub, userService)

	return &Dependencies{
		AuthHandler:      authHandler,
		UsersHandler:     usersHandler,
		MessagingHandler: messagingHandler,
		ChikaHandler:     chikaHandler,
		ExploreHandler:   exploreHandler,
		IdentityService:  identityService,
		WSHandler:        wsHandler,
		Hub:              hub,
		ReadyCheck:       pool.Ping,
	}
}
