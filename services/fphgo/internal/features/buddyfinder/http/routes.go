package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Get("/preview", h.Preview)
	r.Get("/intents/{id}/share-preview", h.SharePreview)

	r.Group(func(member chi.Router) {
		member.Use(middleware.RequireMember)
		member.Group(func(read chi.Router) {
			read.Use(middleware.RequirePermission(authz.PermissionBuddiesRead))
			read.Get("/intents", h.ListIntents)
			read.Get("/intents/mine", h.ListOwnIntents)
		})
		member.Group(func(write chi.Router) {
			write.Use(middleware.RequirePermission(authz.PermissionBuddiesWrite))
			write.Post("/intents", h.CreateIntent)
			write.Delete("/intents/{id}", h.DeleteIntent)
			write.Post("/intents/{id}/message", h.MessageEntry)
		})
	})

	return r
}
