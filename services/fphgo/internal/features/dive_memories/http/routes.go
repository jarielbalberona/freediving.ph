package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func PublicRoutes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Get("/{username}/dive-memories", h.ListProfileMemories)
	return r
}

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Use(middleware.RequirePermission(authz.PermissionProfilesWrite))
	r.Get("/me/dive-memories", h.ListOwnMemories)
	r.Post("/me/dive-memories", h.CreateMemory)
	r.Patch("/me/dive-memories/{memoryID}", h.UpdateMemory)
	r.Delete("/me/dive-memories/{memoryID}", h.DeleteMemory)
	r.Post("/me/dive-memories/{memoryID}/tags", h.AddMemoryTags)
	r.Delete("/me/dive-memories/{memoryID}/tags/{taggedUserID}", h.RemoveMemoryTag)
	r.Get("/me/dive-memory-tags", h.ListMyTags)
	r.Patch("/me/dive-memory-tags/{memoryID}", h.UpdateMyTag)
	return r
}
