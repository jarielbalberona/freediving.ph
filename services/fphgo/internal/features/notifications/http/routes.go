package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Group(func(read chi.Router) {
		read.Use(middleware.RequirePermission(authz.PermissionNotificationsRead))
		read.Get("/", h.ListNotifications)
		read.Get("/stats", h.GetStats)
		read.Get("/unread-count", h.GetUnreadCount)
		read.Get("/settings", h.GetSettings)
		read.Get("/{notificationId}", h.GetNotification)
	})

	r.Group(func(write chi.Router) {
		write.Use(middleware.RequirePermission(authz.PermissionNotificationsWrite))
		write.Post("/", h.CreateNotification)
		write.Post("/read-all", h.MarkAllAsRead)
		write.Post("/{notificationId}/read", h.MarkAsRead)
		write.Put("/settings", h.UpdateSettings)
		write.Delete("/{notificationId}", h.DeleteNotification)
	})

	return r
}
