package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Group(func(read chi.Router) {
		read.Use(middleware.RequirePermission(authz.PermissionProfilesRead))
		read.Get("/me/profile", h.GetMeProfile)
		read.Get("/me/saved", h.GetSavedHub)
		read.Get("/profiles/{userID}", h.GetProfileByUserID)
		read.Get("/profiles/by-username/{username}", h.GetPublicProfileByUsername)
		read.Get("/profiles/by-username/{username}/posts", h.ListPublicProfilePostsByUsername)
		read.Get("/profiles/by-username/{username}/bucketlist", h.ListProfileBucketListByUsername)
		read.Get("/users/search", h.SearchUsers)
	})

	r.Group(func(write chi.Router) {
		write.Use(middleware.RequirePermission(authz.PermissionProfilesWrite))
		write.Patch("/me/profile", h.PatchMyProfile)
	})

	return r
}
