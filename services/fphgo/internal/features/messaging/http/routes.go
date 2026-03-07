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
		read.Get("/threads", h.ListThreads)
		read.Get("/threads/{threadId}", h.GetThread)
		read.Get("/threads/{threadId}/messages", h.ListThreadMessages)
	})

	r.Group(func(write chi.Router) {
		write.Use(middleware.RequirePermission(authz.PermissionMessagingWrite))
		write.Post("/threads/direct", h.OpenDirectThread)
		write.Post("/threads/{threadId}/messages", h.SendThreadMessage)
		write.Post("/threads/{threadId}/read", h.MarkThreadRead)
		write.Post("/threads/{threadId}/category", h.UpdateThreadCategory)
	})

	return r
}
