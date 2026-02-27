package http

import (
	"github.com/go-chi/chi/v5"

	"fph-api-go/internal/middleware"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Post("/", h.CreateUser)

	r.Group(func(protected chi.Router) {
		protected.Use(middleware.RequireMember)
		protected.Get("/me", h.GetMe)
		protected.Get("/{id}", h.GetUser)
	})

	return r
}
