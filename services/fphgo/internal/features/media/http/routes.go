package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Group(func(write chi.Router) {
		write.Use(middleware.RequirePermission(authz.PermissionMediaWrite))
		write.Post("/upload", h.Upload)
		write.Post("/upload-multiple", h.UploadMultiple)
		write.Post("/posts", h.CreatePost)
	})

	r.Group(func(read chi.Router) {
		read.Use(middleware.RequirePermission(authz.PermissionMediaRead))
		read.Get("/mine", h.ListMine)
		read.Get("/by-username/{username}", h.ListProfileMedia)
		read.Post("/urls", h.MintURLs)
	})

	return r
}
