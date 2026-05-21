package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
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

func AdminOutboxRoutes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Group(func(read chi.Router) {
		read.Use(middleware.RequirePermission(authz.PermissionNotificationsRead))
		read.Use(requireAdminOrSuperAdmin)
		read.Get("/", h.ListOutbox)
	})

	r.Group(func(write chi.Router) {
		write.Use(middleware.RequirePermission(authz.PermissionNotificationsWrite))
		write.Use(requireAdminOrSuperAdmin)
		write.Post("/{outboxId}/retry", h.RetryOutbox)
	})

	return r
}

func requireAdminOrSuperAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		identity, ok := middleware.CurrentIdentity(r.Context())
		if !ok || (identity.GlobalRole != "admin" && identity.GlobalRole != "super_admin") {
			httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusForbidden, "forbidden", "admin access required", nil))
			return
		}
		next.ServeHTTP(w, r)
	})
}
