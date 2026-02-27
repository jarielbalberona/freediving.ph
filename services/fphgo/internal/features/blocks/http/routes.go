package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Group(func(read chi.Router) {
		read.Use(middleware.RequirePermission(authz.PermissionBlocksRead))
		read.Get("/", h.ListBlocks)
	})

	r.Group(func(write chi.Router) {
		write.Use(middleware.RequirePermission(authz.PermissionBlocksWrite))
		write.Post("/", h.CreateBlock)
		write.Delete("/{blockedUserId}", h.DeleteBlock)
	})

	return r
}
