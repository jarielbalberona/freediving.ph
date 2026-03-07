package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Get("/home", h.Home)
	r.Group(func(member chi.Router) {
		member.Use(middleware.RequireMember)
		member.Post("/impressions", h.Impressions)
		member.Post("/actions", h.Actions)
	})
	return r
}
