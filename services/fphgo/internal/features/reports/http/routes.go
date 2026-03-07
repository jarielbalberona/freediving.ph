package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Group(func(write chi.Router) {
		write.Use(middleware.RequirePermission(authz.PermissionReportsWrite))
		write.Post("/", h.CreateReport)
	})

	r.Group(func(read chi.Router) {
		read.Use(middleware.RequirePermission(authz.PermissionReportsRead))
		read.Get("/", h.ListReports)
		read.Get("/{reportId}", h.GetReport)
	})

	r.Group(func(moderate chi.Router) {
		moderate.Use(middleware.RequirePermission(authz.PermissionReportsModerate))
		moderate.Patch("/{reportId}/status", h.UpdateStatus)
	})

	return r
}
