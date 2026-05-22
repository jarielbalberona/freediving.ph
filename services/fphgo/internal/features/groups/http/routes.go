package http

import (
	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
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
		write.Post("/{groupId}/invites", h.InviteMember)
		write.Post("/{groupId}/invites/accept", h.AcceptInvite)
		write.Post("/{groupId}/invites/reject", h.RejectInvite)
		write.Post("/{groupId}/posts", h.CreateGroupPost)
		write.Post("/{groupId}/archive", h.ArchiveGroup)
		write.Patch("/{groupId}", h.UpdateGroup)
	})

	return r
}
