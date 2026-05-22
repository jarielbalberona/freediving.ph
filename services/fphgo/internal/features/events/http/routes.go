package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Get("/", h.ListEvents)
	r.Get("/{slug}", h.GetEvent)
	r.Get("/{eventId}/participants", h.ListParticipants)
	r.Get("/{eventId}/attendees", h.ListParticipants)
	r.Get("/{eventId}/payment-methods", h.ListPaymentMethods)

	r.Group(func(write chi.Router) {
		write.Use(middleware.RequireMember)
		write.Post("/", h.CreateEvent)
		write.Patch("/{eventId}", h.UpdateEvent)
		write.Post("/{eventId}/join", h.JoinEvent)
		write.Post("/{eventId}/leave", h.LeaveEvent)
		write.Put("/{eventId}/interest", h.MarkEventInterested)
		write.Delete("/{eventId}/interest", h.MarkEventUninterested)
		write.Patch("/{eventId}/participants/{participantId}/approve", h.ApproveParticipant)
		write.Patch("/{eventId}/participants/{participantId}/reject", h.RejectParticipant)
		write.Post("/{eventId}/payment-methods", h.CreatePaymentMethod)
		write.Patch("/{eventId}/payment-methods/{paymentMethodId}", h.UpdatePaymentMethod)
		write.Post("/{eventId}/payments", h.SubmitPayment)
		write.Get("/{eventId}/payments/{paymentId}/proof-url", h.GetPaymentProofURL)
		write.Patch("/{eventId}/payments/{paymentId}/verify", h.VerifyPayment)
		write.Patch("/{eventId}/payments/{paymentId}/reject", h.RejectPayment)
	})

	return r
}
