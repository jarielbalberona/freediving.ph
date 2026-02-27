package ws

import (
	"log/slog"
	"net/http"

	usersservice "fph-api-go/internal/features/users/service"
	"fph-api-go/internal/middleware"
	apperrors "fph-api-go/internal/shared/errors"
	"fph-api-go/internal/shared/httpx"
	"nhooyr.io/websocket"
)

type Handler struct {
	logger       *slog.Logger
	hub          *Hub
	userResolver *usersservice.Service
}

func NewHandler(logger *slog.Logger, hub *Hub, userResolver *usersservice.Service) *Handler {
	return &Handler{logger: logger, hub: hub, userResolver: userResolver}
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

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		InsecureSkipVerify: true,
	})
	if err != nil {
		h.logger.Error("ws accept failed", "error", err)
		return
	}

	client := NewClient(h.logger, h.hub, conn, clerkUserID, user.ID)
	client.Run(r.Context())
}
