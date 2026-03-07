package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"

	"fphgo/internal/app"
	"fphgo/internal/config"
	mid "fphgo/internal/middleware"
	platformdb "fphgo/internal/platform/db"
	platformlogger "fphgo/internal/platform/logger"
)

var (
	Version   = "dev"
	Commit    = "unknown"
	BuildTime = "unknown"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}
	if cfg.ClerkSecretKey != "" {
		clerk.SetKey(cfg.ClerkSecretKey)
	}

	logger := platformlogger.New(cfg.Env, cfg.LogLevel)
	logger.Debug("debug logging enabled", "env", cfg.Env, "configured_log_level", cfg.LogLevel)
	logger.Debug("cfg", "GoogleMapsAPIKey", cfg.GoogleMapsAPIKey)
	ctx := context.Background()

	pool, err := platformdb.NewPool(ctx, cfg.DBDSN, cfg.DBMaxConns, cfg.DBMinConns, cfg.DBConnMaxLife)
	if err != nil {
		logger.Error("failed to init db", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	deps := app.BuildDependencies(cfg, logger, pool)
	hubCtx, cancelHub := context.WithCancel(ctx)
	defer cancelHub()
	go deps.Hub.Run(hubCtx)

	router := app.NewRouterWithBuildInfo(cfg, deps, logger, mid.Recover(logger), app.BuildInfo{
		Version:   Version,
		Commit:    Commit,
		BuildTime: BuildTime,
	})
	server := app.NewServer(cfg, router)

	errCh := make(chan error, 1)
	go func() {
		logger.Info("server starting", "addr", server.Addr)
		errCh <- server.ListenAndServe()
	}()

	sigCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	select {
	case sig := <-sigCtx.Done():
		_ = sig
		logger.Info("shutdown signal received")
	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server exited", slog.Any("error", err))
			os.Exit(1)
		}
		return
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("server shutdown failed", "error", err)
		os.Exit(1)
	}
	cancelHub()
	logger.Info("server stopped")
}
