package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()

	r.Get("/", h.ListGroups)
	r.Get("/{groupId}", h.GetGroup)
	r.Get("/{groupId}/members", h.ListGroupMembers)
	r.Get("/{groupId}/posts", h.ListGroupPosts)

	r.Group(func(write chi.Router) {
		write.Use(middleware.RequireMember)
		write.Post("/", h.CreateGroup)
		write.Post("/{groupId}/join", h.JoinGroup)
		write.Post("/{groupId}/leave", h.LeaveGroup)
		write.Post("/{groupId}/posts", h.CreateGroupPost)
	})

	r.Group(func(manage chi.Router) {
		manage.Use(middleware.RequireMember)
		manage.Use(middleware.RequirePermission(authz.PermissionGroupsManage))
		manage.Patch("/{groupId}", h.UpdateGroup)
	})

	return r
}
