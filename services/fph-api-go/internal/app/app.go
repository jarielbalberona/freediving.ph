package app

import (
	"context"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"

	chikahttp "fph-api-go/internal/features/chika/http"
	chikarepo "fph-api-go/internal/features/chika/repo"
	chikaservice "fph-api-go/internal/features/chika/service"
	explorehttp "fph-api-go/internal/features/explore/http"
	explorerepo "fph-api-go/internal/features/explore/repo"
	exploreservice "fph-api-go/internal/features/explore/service"
	messaginghttp "fph-api-go/internal/features/messaging/http"
	messagingrepo "fph-api-go/internal/features/messaging/repo"
	messagingservice "fph-api-go/internal/features/messaging/service"
	usershttp "fph-api-go/internal/features/users/http"
	usersrepo "fph-api-go/internal/features/users/repo"
	usersservice "fph-api-go/internal/features/users/service"
	"fph-api-go/internal/realtime/ws"
)

type App struct {
	Router any
	Server any
}

type Dependencies struct {
	UsersHandler     *usershttp.Handlers
	MessagingHandler *messaginghttp.Handlers
	ChikaHandler     *chikahttp.Handlers
	ExploreHandler   *explorehttp.Handlers
	WSHandler        *ws.Handler
	Hub              *ws.Hub
	ReadyCheck       func(context.Context) error
}

func BuildDependencies(logger *slog.Logger, pool *pgxpool.Pool) *Dependencies {
	hub := ws.NewHub(logger)

	userRepo := usersrepo.New(pool)
	userService := usersservice.New(userRepo)
	usersHandler := usershttp.New(userService)

	messagingRepo := messagingrepo.New(pool)
	messagingService := messagingservice.New(messagingRepo, hub)
	messagingHandler := messaginghttp.New(messagingService, userService)

	chikaRepo := chikarepo.New(pool)
	chikaService := chikaservice.New(chikaRepo)
	chikaHandler := chikahttp.New(chikaService, userService)

	exploreRepo := explorerepo.New(pool)
	exploreService := exploreservice.New(exploreRepo)
	exploreHandler := explorehttp.New(exploreService)

	wsHandler := ws.NewHandler(logger, hub, userService)

	return &Dependencies{
		UsersHandler:     usersHandler,
		MessagingHandler: messagingHandler,
		ChikaHandler:     chikaHandler,
		ExploreHandler:   exploreHandler,
		WSHandler:        wsHandler,
		Hub:              hub,
		ReadyCheck:       pool.Ping,
	}
}
