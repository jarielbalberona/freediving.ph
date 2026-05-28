package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Group(func(read chi.Router) {
		read.Use(middleware.RequirePermission(authz.PermissionProfilesRead))
		read.Get("/me/profile", h.GetMeProfile)
		read.Get("/me/saved", h.GetSavedHub)
	})

	r.Group(func(write chi.Router) {
		write.Use(middleware.RequirePermission(authz.PermissionProfilesWrite))
		write.Patch("/me/profile", h.PatchMyProfile)
	})

	return r
}

func PublicRoutes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Get("/{username}", h.GetProfileViewByUsername)
	r.Get("/{username}/diving", h.GetProfileDivingByUsername)

	return r
}
