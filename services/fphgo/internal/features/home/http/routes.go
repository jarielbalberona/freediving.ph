package http

import "github.com/go-chi/chi/v5"

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Get("/nearby-conditions", h.NearbyConditions)
	return r
}
