package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

type RouteOption func(*routeOptions)

type routeOptions struct {
	searchUsers http.HandlerFunc
}

func WithSearchUsersHandler(handler http.HandlerFunc) RouteOption {
	return func(opts *routeOptions) {
		opts.searchUsers = handler
	}
}

func Routes(h *Handlers, opts ...RouteOption) chi.Router {
	routeOpts := routeOptions{}
	for _, opt := range opts {
		if opt != nil {
			opt(&routeOpts)
		}
	}

	r := chi.NewRouter()
	r.Post("/", h.CreateUser)

	r.Group(func(protected chi.Router) {
		protected.Use(middleware.RequireMember)
		protected.Get("/me", h.GetMe)
		if routeOpts.searchUsers != nil {
			protected.With(middleware.RequirePermission(authz.PermissionProfilesRead)).Get("/search", routeOpts.searchUsers)
		}
		protected.With(middleware.RequirePermission(authz.PermissionProfilesRead)).Get("/{username}", h.GetUserByUsername)
		protected.With(middleware.RequirePermission(authz.PermissionUsersRead)).Get("/id/{id}", h.GetUser)
		protected.With(middleware.RequirePermission(authz.PermissionProfilesWrite)).Post("/id/{id}/save", h.SaveUser)
		protected.With(middleware.RequirePermission(authz.PermissionProfilesWrite)).Delete("/id/{id}/save", h.UnsaveUser)
	})

	return r
}
