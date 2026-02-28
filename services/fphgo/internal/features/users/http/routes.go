package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Post("/", h.CreateUser)

	r.Group(func(protected chi.Router) {
		protected.Use(middleware.RequireMember)
		protected.Get("/me", h.GetMe)
		protected.With(middleware.RequirePermission(authz.PermissionUsersRead)).Get("/{id}", h.GetUser)
		protected.With(middleware.RequirePermission(authz.PermissionProfilesWrite)).Post("/{id}/save", h.SaveUser)
		protected.With(middleware.RequirePermission(authz.PermissionProfilesWrite)).Delete("/{id}/save", h.UnsaveUser)
	})

	return r
}
