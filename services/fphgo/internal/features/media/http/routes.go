package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Get("/posts/{postId}", h.GetPost)
	r.Get("/posts/{postId}/comments", h.ListPostComments)

	r.Group(func(write chi.Router) {
		write.Use(middleware.RequireMember)
		write.Use(middleware.RequirePermission(authz.PermissionMediaWrite))
		write.Post("/upload", h.Upload)
		write.Post("/upload-multiple", h.UploadMultiple)
		write.Post("/moments/upload-intents", h.CreateMomentUploadIntent)
		write.Post("/moments/{postId}/complete", h.CompleteMomentUpload)
		write.Post("/moments/{postId}/sync", h.SyncMomentStatus)
		write.Post("/posts", h.CreatePost)
		write.Post("/posts/{postId}/likes", h.LikePost)
		write.Delete("/posts/{postId}/likes", h.UnlikePost)
		write.Post("/posts/{postId}/saves", h.SavePost)
		write.Delete("/posts/{postId}/saves", h.UnsavePost)
		write.Post("/posts/{postId}/comments", h.CreatePostComment)
		write.Delete("/posts/{postId}/comments/{commentId}", h.DeletePostComment)
		write.Post("/posts/{postId}/comments/{commentId}/likes", h.LikePostComment)
		write.Delete("/posts/{postId}/comments/{commentId}/likes", h.UnlikePostComment)
	})

	r.Group(func(read chi.Router) {
		read.Use(middleware.RequireMember)
		read.Use(middleware.RequirePermission(authz.PermissionMediaRead))
		read.Get("/mine", h.ListMine)
		read.Post("/urls", h.MintURLs)
	})
	r.Get("/by-username/{username}", h.ListProfileMedia)
	r.Get("/by-username/{username}/moments", h.ListProfileMoments)
	r.Get("/by-username/{username}/dive-spot-highlights", h.ListDiveSpotHighlights)
	r.Get("/by-username/{username}/dive-spot-highlights/{diveSpotId}/media", h.ListDiveSpotHighlightMedia)
	r.Get("/dive-sites/{siteId}/moments", h.ListDiveSiteMoments)

	return r
}
