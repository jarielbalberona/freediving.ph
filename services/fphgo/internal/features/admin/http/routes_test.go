package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	adminrepo "fphgo/internal/features/admin/repo"
	adminservice "fphgo/internal/features/admin/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

type stubAdminService struct{}

func (stubAdminService) ListProfiles(context.Context, adminservice.ListInput) (adminservice.ProfileListResult, error) {
	return adminservice.ProfileListResult{Page: 1, Limit: 10}, nil
}

func (stubAdminService) ListDiveSites(context.Context, adminservice.ListInput) (adminservice.DiveSiteListResult, error) {
	return adminservice.DiveSiteListResult{Page: 1, Limit: 10}, nil
}

func (stubAdminService) ListGroups(context.Context, adminservice.ListInput) (adminservice.GroupListResult, error) {
	return adminservice.GroupListResult{Page: 1, Limit: 10}, nil
}

func (stubAdminService) UpdateGroup(context.Context, string, adminservice.UpdateGroupInput) (adminrepo.Group, error) {
	return adminrepo.Group{}, nil
}

func (stubAdminService) ArchiveGroup(context.Context, string) (adminrepo.Group, error) {
	return adminrepo.Group{}, nil
}

func TestRoutesRequireSuperAdmin(t *testing.T) {
	router := Routes(New(stubAdminService{}))

	tests := []struct {
		name       string
		role       string
		wantStatus int
	}{
		{name: "member rejected", role: "member", wantStatus: http.StatusForbidden},
		{name: "admin rejected", role: "admin", wantStatus: http.StatusForbidden},
		{name: "super admin allowed", role: "super_admin", wantStatus: http.StatusOK},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/profiles", nil)
			req = req.WithContext(middleware.WithIdentity(req.Context(), authz.Identity{
				UserID:        "550e8400-e29b-41d4-a716-446655440000",
				GlobalRole:    tc.role,
				AccountStatus: "active",
				Permissions:   authz.RolePermissions(tc.role),
			}))
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != tc.wantStatus {
				t.Fatalf("expected status %d, got %d", tc.wantStatus, rec.Code)
			}
		})
	}
}
