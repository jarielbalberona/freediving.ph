package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Group(func(read chi.Router) {
		read.Use(middleware.RequirePermission(authz.PermissionBuddiesRead))
		read.Get("/", h.ListBuddies)
		read.Get("/requests/incoming", h.ListIncomingRequests)
		read.Get("/requests/outgoing", h.ListOutgoingRequests)
		read.Get("/preview/{userId}", h.BuddyPreview)
	})

	r.Group(func(write chi.Router) {
		write.Use(middleware.RequirePermission(authz.PermissionBuddiesWrite))
		write.Post("/requests", h.CreateRequest)
		write.Post("/requests/{requestId}/accept", h.AcceptRequest)
		write.Post("/requests/{requestId}/decline", h.DeclineRequest)
		write.Delete("/requests/{requestId}", h.CancelRequest)
		write.Delete("/{buddyUserId}", h.RemoveBuddy)
	})

	return r
}
