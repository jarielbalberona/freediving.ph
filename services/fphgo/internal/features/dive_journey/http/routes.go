package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func PublicRoutes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Get("/{username}/journey", h.ListProfileJourney)
	return r
}

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Use(middleware.RequirePermission(authz.PermissionProfilesWrite))
	r.Post("/me/journey", h.CreateManualEntry)
	r.Patch("/me/journey/{entryID}", h.UpdateManualEntry)
	r.Delete("/me/journey/{entryID}", h.DeleteManualEntry)
	return r
}
