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

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}
	if cfg.ClerkSecretKey != "" {
		clerk.SetKey(cfg.ClerkSecretKey)
	}

	logger := platformlogger.New(cfg.Env)
	ctx := context.Background()

	pool, err := platformdb.NewPool(ctx, cfg.DBDSN)
	if err != nil {
		logger.Error("failed to init db", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	deps := app.BuildDependencies(logger, pool)
	go deps.Hub.Run(ctx)

	router := app.NewRouter(cfg, deps, logger, mid.Recover(logger))
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
	logger.Info("server stopped")
}
