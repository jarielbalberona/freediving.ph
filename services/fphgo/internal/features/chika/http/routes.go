package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Get("/threads", h.ListThreads)
	r.Get("/threads/{threadId}", h.GetThread)
	r.Get("/threads/{threadId}/posts", h.ListPosts)
	r.Get("/threads/{threadId}/comments", h.ListComments)
	r.Get("/threads/{threadId}/media", h.ListThreadMedia)

	r.Group(func(write chi.Router) {
		write.Use(middleware.RequirePermission(authz.PermissionChikaWrite))
		write.Post("/threads", h.CreateThread)
		write.Patch("/threads/{threadId}", h.UpdateThread)
		write.Delete("/threads/{threadId}", h.DeleteThread)
		write.Post("/threads/{threadId}/posts", h.CreatePost)
		write.Post("/threads/{threadId}/comments", h.CreateComment)
		write.Patch("/comments/{commentId}", h.UpdateComment)
		write.Delete("/comments/{commentId}", h.DeleteComment)
		write.Post("/threads/{threadId}/reactions", h.SetThreadReaction)
		write.Delete("/threads/{threadId}/reactions", h.RemoveThreadReaction)
		write.Post("/media", h.CreateMediaAsset)
	})
	return r
}
