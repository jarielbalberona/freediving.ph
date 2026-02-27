package http

import (
	"github.com/go-chi/chi/v5"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Post("/threads/{threadId}/posts", h.CreatePost)
	return r
}
