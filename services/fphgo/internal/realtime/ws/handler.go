package ws

import (
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	usersservice "fphgo/internal/features/users/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"nhooyr.io/websocket"
)

type Handler struct {
	logger       *slog.Logger
	hub          *Hub
	userResolver *usersservice.Service
	origins      []string
}

func NewHandler(logger *slog.Logger, hub *Hub, userResolver *usersservice.Service, origins []string) *Handler {
	return &Handler{logger: logger, hub: hub, userResolver: userResolver, origins: origins}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	clerkUserID, ok := middleware.CurrentAuth(r.Context())
	if !ok || clerkUserID == "" {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil))
		return
	}
	user, err := h.userResolver.EnsureLocalUserForClerk(r.Context(), clerkUserID)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	acceptOptions := &websocket.AcceptOptions{}
	originPatterns := resolveOriginPatterns(h.origins)
	if len(originPatterns) > 0 {
		acceptOptions.OriginPatterns = originPatterns
	} else {
		// Development fallback when CORS_ORIGINS is set to "*".
		acceptOptions.InsecureSkipVerify = true
	}
	conn, err := websocket.Accept(w, r, acceptOptions)
	if err != nil {
		h.logger.Error("ws accept failed", "error", err)
		return
	}

	client := NewClient(h.logger, h.hub, conn, clerkUserID, user.ID)
	client.Run(r.Context())
}

func resolveOriginPatterns(origins []string) []string {
	patterns := make([]string, 0, len(origins))
	for _, raw := range origins {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" || trimmed == "*" {
			continue
		}
		parsed, err := url.Parse(trimmed)
		if err != nil {
			continue
		}
		host := strings.TrimSpace(parsed.Host)
		if host != "" {
			patterns = append(patterns, host)
		}
	}
	return patterns
}
