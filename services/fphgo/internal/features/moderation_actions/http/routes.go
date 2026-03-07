package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Group(func(write chi.Router) {
		write.Use(middleware.RequirePermission(authz.PermissionModerationWrite))
		write.Post("/users/{appUserId}/suspend", h.SuspendUser)
		write.Post("/users/{appUserId}/unsuspend", h.UnsuspendUser)
		write.Post("/users/{appUserId}/read-only", h.SetUserReadOnly)
		write.Post("/users/{appUserId}/read-only/clear", h.ClearUserReadOnly)
		write.Post("/chika/threads/{threadId}/hide", h.HideThread)
		write.Post("/chika/threads/{threadId}/unhide", h.UnhideThread)
		write.Post("/chika/comments/{commentId}/hide", h.HideComment)
		write.Post("/chika/comments/{commentId}/unhide", h.UnhideComment)
	})

	return r
}
