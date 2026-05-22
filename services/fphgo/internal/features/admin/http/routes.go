package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
)

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Use(requireSuperAdmin)
	r.Get("/profiles", h.ListProfiles)
	r.Get("/dive-sites", h.ListDiveSites)
	r.Get("/groups", h.ListGroups)
	r.Patch("/groups/{groupId}", h.UpdateGroup)
	r.Post("/groups/{groupId}/archive", h.ArchiveGroup)
	return r
}

func requireSuperAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		identity, ok := middleware.CurrentIdentity(r.Context())
		if !ok || identity.GlobalRole != "super_admin" {
			httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusForbidden, "forbidden", "super admin access required", nil))
			return
		}
		next.ServeHTTP(w, r)
	})
}
