package http

import "github.com/go-chi/chi/v5"

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Get("/dive-sites", h.ListDiveSites)
	return r
}
