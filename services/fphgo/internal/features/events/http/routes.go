package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Get("/", h.ListEvents)
	r.Get("/{eventId}", h.GetEvent)
	r.Get("/{eventId}/attendees", h.ListAttendees)

	r.Group(func(write chi.Router) {
		write.Use(middleware.RequireMember)
		write.Post("/", h.CreateEvent)
		write.Post("/{eventId}/join", h.JoinEvent)
		write.Post("/{eventId}/leave", h.LeaveEvent)
	})

	r.Group(func(manage chi.Router) {
		manage.Use(middleware.RequireMember)
		manage.Use(middleware.RequirePermission(authz.PermissionEventsManage))
		manage.Patch("/{eventId}", h.UpdateEvent)
	})

	return r
}
