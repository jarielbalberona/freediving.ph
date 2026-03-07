package http

import "github.com/go-chi/chi/v5"

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Get("/regions", h.ListRegions)
	r.Get("/provinces", h.ListProvinces)
	r.Get("/cities-municipalities", h.ListCitiesMunicipalities)
	r.Get("/barangays", h.ListBarangays)
	return r
}
