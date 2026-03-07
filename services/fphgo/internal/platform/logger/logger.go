package logger

import (
	"log/slog"
	"os"
	"strings"
)

func New(env, explicitLevel string) *slog.Logger {
	level := parseLevel(explicitLevel)
	if level == nil {
		defaultLevel := slog.LevelInfo
		if strings.EqualFold(env, "development") {
			defaultLevel = slog.LevelDebug
		}
		level = &defaultLevel
	}

	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level})
	return slog.New(handler)
}

func parseLevel(raw string) *slog.Level {
	switch strings.TrimSpace(strings.ToLower(raw)) {
	case "debug":
		level := slog.LevelDebug
		return &level
	case "info":
		level := slog.LevelInfo
		return &level
	case "warn":
		level := slog.LevelWarn
		return &level
	case "error":
		level := slog.LevelError
		return &level
	default:
		return nil
	}
}
