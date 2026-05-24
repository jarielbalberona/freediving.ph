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
	r.Group(func(member chi.Router) {
		member.Use(middleware.RequireMember)
		member.Get("/me", h.GetMe)
		member.Post("/me", h.SaveMe)
		member.Patch("/me", h.SaveMe)
		member.Post("/me/submit", h.SubmitMe)
		member.Post("/me/certifications", h.CreateCertification)
		member.Get("/me/certifications/{certificationId}/proof-url", h.GetMyCertificationProofURL)
		member.Patch("/me/certifications/{certificationId}", h.UpdateCertification)
		member.Delete("/me/certifications/{certificationId}", h.DeleteCertification)
	})
	r.Get("/{username}", h.GetPublicInstructor)
	return r
}

func AdminRoutes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Group(func(admin chi.Router) {
		admin.Use(middleware.RequireMember)
		admin.Use(requireSuperAdmin)
		admin.Get("/", h.ListAdminInstructors)
		admin.Get("/{instructorId}", h.GetAdminInstructor)
		admin.Get("/{instructorId}/certifications/{certificationId}/proof-url", h.GetAdminCertificationProofURL)
		admin.Post("/{instructorId}/verify", h.VerifyInstructor)
		admin.Post("/{instructorId}/reject", h.RejectInstructor)
		admin.Post("/{instructorId}/suspend", h.SuspendInstructor)
	})
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
