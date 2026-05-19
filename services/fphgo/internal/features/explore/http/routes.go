package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Get("/sites", h.ListSites)
	r.Get("/presences", h.ListGlobalDivePresences)
	r.Get("/updates", h.ListLatestUpdates)
	r.Get("/sites/{slug}", h.GetSiteBySlug)
	r.Get("/sites/{slug}/related", h.GetRelatedBySlug)
	r.Get("/sites/{slug}/community-posts", h.ListCommunityPostsBySlug)
	r.Get("/sites/{slug}/presence", h.ListDivePresencesBySlug)
	r.Get("/sites/{slug}/affinities", h.ListDiveAffinitiesBySlug)
	r.Get("/sites/{slug}/reviews", h.ListDiveReviewsBySlug)
	r.Get("/sites/{slug}/buddy-preview", h.GetBuddyPreviewBySlug)

	r.Group(func(member chi.Router) {
		member.Use(middleware.RequireMember)
		member.Group(func(read chi.Router) {
			read.Use(middleware.RequirePermission(authz.PermissionBuddiesRead))
			read.Get("/sites/{slug}/buddy-intents", h.GetBuddyIntentsBySlug)
		})
		member.Group(func(submissions chi.Router) {
			submissions.Use(middleware.RequirePermission(authz.PermissionExploreSubmit))
			submissions.Get("/me/dive-presences", h.ListMyDivePresences)
			submissions.Get("/me/dive-site-affinities", h.ListMyDiveSiteAffinities)
			submissions.Post("/sites/submit", h.CreateSiteSubmission)
			submissions.Post("/sites/{slug}/presence", h.CreateDivePresence)
			submissions.Patch("/sites/{slug}/presence/{presenceId}", h.UpdateDivePresence)
			submissions.Delete("/sites/{slug}/presence/{presenceId}", h.CancelDivePresence)
			submissions.Post("/sites/{slug}/affinities", h.CreateDiveSiteAffinity)
			submissions.Patch("/sites/{slug}/affinities/{affinityId}", h.UpdateDiveSiteAffinity)
			submissions.Delete("/sites/{slug}/affinities/{affinityId}", h.DeleteDiveSiteAffinity)
			submissions.Post("/sites/{slug}/reviews", h.CreateDiveSiteReview)
			submissions.Get("/sites/submissions", h.ListMySiteSubmissions)
			submissions.Get("/sites/submissions/{id}", h.GetMySiteSubmissionByID)
			submissions.Post("/sites/{siteId}/updates", h.CreateUpdate)
			submissions.Post("/sites/{siteId}/save", h.SaveSite)
			submissions.Delete("/sites/{siteId}/save", h.UnsaveSite)
		})
		member.Group(func(likes chi.Router) {
			likes.Use(middleware.RequirePermission(authz.PermissionExploreRead))
			likes.Post("/sites/{siteId}/likes", h.LikeSite)
			likes.Delete("/sites/{siteId}/likes", h.UnlikeSite)
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
