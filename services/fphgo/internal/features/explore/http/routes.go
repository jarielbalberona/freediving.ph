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
		member.Group(func(submissions chi.Router) {
			submissions.Use(middleware.RequirePermission(authz.PermissionExploreSubmit))
			submissions.Post("/sites/submit", h.CreateSiteSubmission)
			submissions.Get("/sites/submissions", h.ListMySiteSubmissions)
			submissions.Get("/sites/submissions/{id}", h.GetMySiteSubmissionByID)
			submissions.Post("/sites/{siteId}/updates", h.CreateUpdate)
			submissions.Post("/sites/{siteId}/save", h.SaveSite)
			submissions.Delete("/sites/{siteId}/save", h.UnsaveSite)
		})
		member.Group(func(moderation chi.Router) {
			moderation.Use(middleware.RequirePermission(authz.PermissionExploreModerate))
			moderation.Get("/moderation/sites/pending", h.ListPendingSites)
			moderation.Get("/moderation/sites/{id}", h.GetSiteByIDForModeration)
			moderation.Post("/moderation/sites/{id}/approve", h.ApproveSite)
			moderation.Post("/moderation/sites/{id}/reject", h.RejectSite)
		})
	})

	return r
}
