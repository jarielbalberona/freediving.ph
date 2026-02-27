package http

import (
	"github.com/go-chi/chi/v5"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Post("/send", h.Send)
	r.Post("/{conversationId}/accept", h.Accept)
	r.Post("/{conversationId}/reject", h.Reject)
	r.Get("/inbox", h.Inbox)
	r.Get("/requests", h.Requests)
	return r
}
