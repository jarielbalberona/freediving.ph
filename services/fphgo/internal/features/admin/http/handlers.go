package http

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	adminrepo "fphgo/internal/features/admin/repo"
	adminservice "fphgo/internal/features/admin/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/httpx"
)

type adminService interface {
	ListProfiles(ctx context.Context, input adminservice.ListInput) (adminservice.ProfileListResult, error)
	ListDiveSites(ctx context.Context, input adminservice.ListInput) (adminservice.DiveSiteListResult, error)
	ListGroups(ctx context.Context, input adminservice.ListInput) (adminservice.GroupListResult, error)
	UpdateGroup(ctx context.Context, groupID string, input adminservice.UpdateGroupInput) (adminrepo.Group, error)
	ArchiveGroup(ctx context.Context, groupID string) (adminrepo.Group, error)
}

type Handlers struct {
	service   adminService
	validator httpx.Validator
}

func New(service adminService, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) ListProfiles(w http.ResponseWriter, r *http.Request) {
	result, err := h.service.ListProfiles(r.Context(), parseListInput(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	items := make([]AdminProfile, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, mapProfile(item))
	}
	httpx.JSON(w, http.StatusOK, ProfileListResponse{
		Items:      items,
		Pagination: paginate(result.Page, result.Limit, result.Total),
	})
}

func (h *Handlers) ListDiveSites(w http.ResponseWriter, r *http.Request) {
	result, err := h.service.ListDiveSites(r.Context(), parseListInput(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	items := make([]AdminDiveSite, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, mapDiveSite(item))
	}
	httpx.JSON(w, http.StatusOK, DiveSiteListResponse{
		Items:      items,
		Pagination: paginate(result.Page, result.Limit, result.Total),
	})
}

func (h *Handlers) ListGroups(w http.ResponseWriter, r *http.Request) {
	result, err := h.service.ListGroups(r.Context(), parseListInput(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	items := make([]AdminGroup, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, mapGroup(item))
	}
	httpx.JSON(w, http.StatusOK, GroupListResponse{
		Items:      items,
		Pagination: paginate(result.Page, result.Limit, result.Total),
	})
}

func (h *Handlers) UpdateGroup(w http.ResponseWriter, r *http.Request) {
	groupID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "groupId"), "groupId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[UpdateGroupRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	group, err := h.service.UpdateGroup(r.Context(), groupID, adminservice.UpdateGroupInput{
		Name:       req.Name,
		Visibility: req.Visibility,
		JoinPolicy: req.JoinPolicy,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, GroupResponse{Group: mapGroup(group)})
}

func (h *Handlers) ArchiveGroup(w http.ResponseWriter, r *http.Request) {
	groupID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "groupId"), "groupId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	group, err := h.service.ArchiveGroup(r.Context(), groupID)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, GroupResponse{Group: mapGroup(group)})
}

func parseListInput(r *http.Request) adminservice.ListInput {
	return adminservice.ListInput{
		Page:  parseIntQuery(r, "page", 1),
		Limit: parseIntQuery(r, "limit", adminservice.DefaultLimit),
	}
}

func handleError(w http.ResponseWriter, r *http.Request, err error) {
	var validationErr adminservice.ValidationFailure
	if errors.As(err, &validationErr) {
		httpx.WriteValidationError(w, validationErr.Issues)
		return
	}
	httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
}

func parseIntQuery(r *http.Request, key string, fallback int) int {
	value := strings.TrimSpace(r.URL.Query().Get(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 {
		return fallback
	}
	return parsed
}

func paginate(page, limit, total int) Pagination {
	totalPages := 0
	if total > 0 {
		totalPages = (total + limit - 1) / limit
	}
	return Pagination{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}
}

func mapProfile(item adminrepo.Profile) AdminProfile {
	return AdminProfile{
		UserID:        item.UserID,
		Username:      item.Username,
		DisplayName:   item.DisplayName,
		GlobalRole:    item.GlobalRole,
		AccountStatus: item.AccountStatus,
		EmailVerified: item.EmailVerified,
		PhoneVerified: item.PhoneVerified,
		AvatarURL:     item.AvatarURL,
		HomeArea:      item.HomeArea,
		CertLevel:     item.CertLevel,
		BuddyCount:    item.BuddyCount,
		ReportCount:   item.ReportCount,
		CreatedAt:     formatTime(item.CreatedAt),
		UpdatedAt:     formatTime(item.UpdatedAt),
	}
}

func mapDiveSite(item adminrepo.DiveSite) AdminDiveSite {
	return AdminDiveSite{
		ID:                 item.ID,
		Slug:               item.Slug,
		Name:               item.Name,
		Area:               item.Area,
		ModerationState:    item.ModerationState,
		VerificationStatus: item.VerificationStatus,
		EntryDifficulty:    item.EntryDifficulty,
		UpdateCount:        item.UpdateCount,
		LikeCount:          item.LikeCount,
		CreatedAt:          formatTime(item.CreatedAt),
		UpdatedAt:          formatTime(item.UpdatedAt),
		LastUpdatedAt:      formatTime(item.LastUpdatedAt),
	}
}

func mapGroup(item adminrepo.Group) AdminGroup {
	return AdminGroup{
		ID:          item.ID,
		Name:        item.Name,
		Slug:        item.Slug,
		Visibility:  item.Visibility,
		Status:      item.Status,
		JoinPolicy:  item.JoinPolicy,
		MemberCount: item.MemberCount,
		EventCount:  item.EventCount,
		PostCount:   item.PostCount,
		CreatedBy:   item.CreatedBy,
		CreatedAt:   formatTime(item.CreatedAt),
		UpdatedAt:   formatTime(item.UpdatedAt),
	}
}

func formatTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}
