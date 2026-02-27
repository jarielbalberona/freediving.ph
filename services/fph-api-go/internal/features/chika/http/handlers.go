package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	chikaservice "fph-api-go/internal/features/chika/service"
	usersservice "fph-api-go/internal/features/users/service"
	"fph-api-go/internal/middleware"
	apperrors "fph-api-go/internal/shared/errors"
	"fph-api-go/internal/shared/httpx"
)

type Handlers struct {
	service      *chikaservice.Service
	userResolver *usersservice.Service
}

func New(service *chikaservice.Service, userResolver *usersservice.Service) *Handlers {
	return &Handlers{service: service, userResolver: userResolver}
}

func (h *Handlers) CreatePost(w http.ResponseWriter, r *http.Request) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	threadID := chi.URLParam(r, "threadId")

	var req CreatePostRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	post, err := h.service.CreatePost(r.Context(), chikaservice.CreatePostInput{
		ThreadID: threadID,
		UserID:   actorID,
		Content:  req.Content,
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusCreated, map[string]any{
		"id":        post.ID,
		"threadId":  post.ThreadID,
		"pseudonym": post.Pseudonym,
		"content":   post.Content,
	})
}

func (h *Handlers) requireLocalActorID(r *http.Request) (string, error) {
	clerkUserID, ok := middleware.CurrentAuth(r.Context())
	if !ok || clerkUserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	user, err := h.userResolver.EnsureLocalUserForClerk(r.Context(), clerkUserID)
	if err != nil {
		return "", err
	}
	return user.ID, nil
}
