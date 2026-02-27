package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Group(func(read chi.Router) {
		read.Use(middleware.RequirePermission(authz.PermissionMessagingRead))
		read.Get("/inbox", h.Inbox)
		read.Get("/conversations/{conversationId}", h.ConversationMessages)
	})

	r.Group(func(write chi.Router) {
		write.Use(middleware.RequirePermission(authz.PermissionMessagingWrite))
		write.Post("/requests", h.CreateRequest)
		write.Post("/requests/{requestId}/accept", h.AcceptRequest)
		write.Post("/requests/{requestId}/decline", h.DeclineRequest)
		write.Post("/conversations/{conversationId}", h.SendConversationMessage)
		write.Post("/read", h.MarkRead)
	})

	return r
}
