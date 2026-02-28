package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Get("/sites", h.ListSites)
	r.Get("/updates", h.ListLatestUpdates)
	r.Get("/sites/{slug}", h.GetSiteBySlug)
	r.Get("/sites/{slug}/buddy-preview", h.GetBuddyPreviewBySlug)

	r.Group(func(member chi.Router) {
		member.Use(middleware.RequireMember)
		member.Group(func(read chi.Router) {
			read.Use(middleware.RequirePermission(authz.PermissionBuddiesRead))
			read.Get("/sites/{slug}/buddy-intents", h.GetBuddyIntentsBySlug)
		})
		member.Group(func(write chi.Router) {
			write.Use(middleware.RequirePermission(authz.PermissionExploreSubmit))
			write.Post("/sites/{siteId}/updates", h.CreateUpdate)
			write.Post("/sites/{siteId}/save", h.SaveSite)
			write.Delete("/sites/{siteId}/save", h.UnsaveSite)
		})
	})

	return r
}
