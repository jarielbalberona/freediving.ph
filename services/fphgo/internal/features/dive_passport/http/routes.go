package http

import "github.com/go-chi/chi/v5"

func PublicRoutes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Get("/{username}/passport", h.GetProfilePassport)
	return r
}

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Get("/me/passport/settings", h.GetMySettings)
	r.Put("/me/passport/settings", h.UpdateMySettings)
	return r
}
