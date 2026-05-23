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
	r.Get("/{eventId}/pass", h.GetMyEventPass)
	r.Get("/{slug}/pass/{token}", h.VerifyEventPass)
	r.Get("/{eventId}/payment-methods", h.ListPaymentMethods)
	r.Get("/{eventId}/join-form-fields", h.ListJoinFormFields)
	r.Get("/{eventId}/competitions", h.ListCompetitions)
	r.Get("/{eventId}/program", h.ListProgramItems)
	r.Get("/{eventId}/prizes", h.ListPrizes)
	r.Get("/{eventId}/sponsors", h.ListSponsors)
	r.Get("/{eventId}/posts", h.ListPosts)

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
		write.Patch("/{eventId}/participants/{participantId}/role", h.UpdateParticipantRole)
		write.Patch("/{eventId}/participants/{participantId}/status", h.UpdateParticipantStatus)
		write.Post("/{eventId}/participants/{participantId}/regenerate-pass", h.RegenerateParticipantPass)
		write.Patch("/{eventId}/modules", h.UpdateEventModules)
		write.Put("/{eventId}/join-form-fields", h.UpdateJoinFormFields)
		write.Post("/{eventId}/duplicate", h.DuplicateEvent)
		write.Post("/{slug}/pass/{token}/check-in", h.CheckInEventPass)
		write.Post("/{eventId}/payment-methods", h.CreatePaymentMethod)
		write.Patch("/{eventId}/payment-methods/{paymentMethodId}", h.UpdatePaymentMethod)
		write.Post("/{eventId}/payments", h.SubmitPayment)
		write.Get("/{eventId}/payments/{paymentId}/proof-url", h.GetPaymentProofURL)
		write.Patch("/{eventId}/payments/{paymentId}/verify", h.VerifyPayment)
		write.Patch("/{eventId}/payments/{paymentId}/reject", h.RejectPayment)
		write.Post("/{eventId}/competitions", h.CreateCompetition)
		write.Patch("/{eventId}/competitions/{competitionId}", h.UpdateCompetition)
		write.Delete("/{eventId}/competitions/{competitionId}", h.DeleteCompetition)
		write.Post("/{eventId}/program", h.CreateProgramItem)
		write.Patch("/{eventId}/program/{programItemId}", h.UpdateProgramItem)
		write.Delete("/{eventId}/program/{programItemId}", h.DeleteProgramItem)
		write.Post("/{eventId}/prizes", h.CreatePrize)
		write.Patch("/{eventId}/prizes/{prizeId}", h.UpdatePrize)
		write.Delete("/{eventId}/prizes/{prizeId}", h.DeletePrize)
		write.Post("/{eventId}/sponsors", h.CreateSponsor)
		write.Patch("/{eventId}/sponsors/{sponsorId}", h.UpdateSponsor)
		write.Delete("/{eventId}/sponsors/{sponsorId}", h.DeleteSponsor)
		write.Post("/{eventId}/posts", h.CreatePost)
		write.Patch("/{eventId}/posts/{postId}", h.UpdatePost)
		write.Delete("/{eventId}/posts/{postId}", h.DeletePost)
		write.Post("/{eventId}/updates/{postId}/reactions/fish", h.AddPostFishReaction)
		write.Delete("/{eventId}/updates/{postId}/reactions/fish", h.DeletePostFishReaction)
		write.Patch("/{eventId}/post-settings", h.UpdatePostSettings)
	})

	return r
}
