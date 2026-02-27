package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Get("/inbox", h.Inbox)
	r.Get("/requests", h.Requests)
	r.Group(func(write chi.Router) {
		write.Use(middleware.RequirePermission(authz.PermissionMessagingWrite))
		write.Post("/send", h.Send)
		write.Post("/{conversationId}/accept", h.Accept)
		write.Post("/{conversationId}/reject", h.Reject)
	})
	return r
}
