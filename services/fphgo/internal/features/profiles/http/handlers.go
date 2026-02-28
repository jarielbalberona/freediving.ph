package http

import (
	"context"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	profilesservice "fphgo/internal/features/profiles/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
)

type Handlers struct {
	service   profileService
	validator httpx.Validator
}

type profileService interface {
	GetProfileByUserID(ctx context.Context, userID string) (profilesservice.Profile, error)
	UpdateMyProfile(ctx context.Context, input profilesservice.UpdateMyProfileInput) (profilesservice.Profile, error)
	SearchUsers(ctx context.Context, actorID, query string, limit int32) ([]profilesservice.Profile, error)
	GetSavedHub(ctx context.Context, actorID string) (profilesservice.SavedHub, error)
}

func New(service profileService, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) GetMeProfile(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	profile, err := h.service.GetProfileByUserID(r.Context(), actor)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusOK, ProfileResponse{Profile: profileToDTO(profile)})
}

func (h *Handlers) PatchMyProfile(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	req, issues, ok := httpx.DecodeAndValidate[UpdateMyProfileRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	input := profilesservice.UpdateMyProfileInput{
		ActorID:     actor,
		DisplayName: req.DisplayName,
		Bio:         req.Bio,
		AvatarURL:   req.AvatarURL,
		Location:    req.Location,
		HomeArea:    req.HomeArea,
		Interests:   req.Interests,
		CertLevel:   req.CertLevel,
	}
	if req.Socials != nil {
		socials := map[string]string{}
		if req.Socials.Website != nil {
			socials["website"] = *req.Socials.Website
		}
		if req.Socials.Instagram != nil {
			socials["instagram"] = *req.Socials.Instagram
		}
		if req.Socials.X != nil {
			socials["x"] = *req.Socials.X
		}
		if req.Socials.Facebook != nil {
			socials["facebook"] = *req.Socials.Facebook
		}
		if req.Socials.Tiktok != nil {
			socials["tiktok"] = *req.Socials.Tiktok
		}
		if req.Socials.YouTube != nil {
			socials["youtube"] = *req.Socials.YouTube
		}
		input.Socials = &socials
	}

	profile, err := h.service.UpdateMyProfile(r.Context(), input)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusOK, ProfileResponse{Profile: profileToDTO(profile)})
}

func (h *Handlers) GetSavedHub(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	hub, err := h.service.GetSavedHub(r.Context(), actor)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	sites := make([]SavedSite, 0, len(hub.Sites))
	for _, item := range hub.Sites {
		sites = append(sites, SavedSite{
			ID:                   item.ID,
			Slug:                 item.Slug,
			Name:                 item.Name,
			Area:                 item.Area,
			Difficulty:           item.Difficulty,
			LastUpdatedAt:        item.LastUpdatedAt,
			LastConditionSummary: item.LastConditionSummary,
			SavedAt:              item.SavedAt,
		})
	}
	users := make([]SavedUser, 0, len(hub.Users))
	for _, item := range hub.Users {
		users = append(users, SavedUser{
			UserID:        item.UserID,
			Username:      item.Username,
			DisplayName:   item.DisplayName,
			EmailVerified: item.EmailVerified,
			PhoneVerified: item.PhoneVerified,
			AvatarURL:     item.AvatarURL,
			HomeArea:      item.HomeArea,
			CertLevel:     item.CertLevel,
			BuddyCount:    item.BuddyCount,
			ReportCount:   item.ReportCount,
			SavedAt:       item.SavedAt,
		})
	}
	httpx.JSON(w, http.StatusOK, SavedHubResponse{Sites: sites, Users: users})
}

func (h *Handlers) GetProfileByUserID(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userID")
	profile, err := h.service.GetProfileByUserID(r.Context(), userID)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusOK, ProfileResponse{Profile: profileToDTO(profile)})
}

func (h *Handlers) SearchUsers(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	query := r.URL.Query().Get("q")
	limit := int32(10)
	if rawLimit := r.URL.Query().Get("limit"); rawLimit != "" {
		if parsed, parseErr := strconv.ParseInt(rawLimit, 10, 32); parseErr == nil {
			limit = int32(parsed)
		}
	}

	items, err := h.service.SearchUsers(r.Context(), actor, query, limit)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	resp := make([]Profile, 0, len(items))
	for _, item := range items {
		resp = append(resp, profileToDTO(item))
	}

	httpx.JSON(w, http.StatusOK, SearchUsersResponse{Items: resp})
}

func requireActorID(r *http.Request) (string, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return identity.UserID, nil
}

func profileToDTO(input profilesservice.Profile) Profile {
	return Profile{
		UserID:        input.UserID,
		Username:      input.Username,
		DisplayName:   input.DisplayName,
		EmailVerified: input.EmailVerified,
		PhoneVerified: input.PhoneVerified,
		BuddyCount:    input.BuddyCount,
		ReportCount:   input.ReportCount,
		Bio:           input.Bio,
		AvatarURL:     input.AvatarURL,
		Location:      input.Location,
		HomeArea:      input.HomeArea,
		Interests:     input.Interests,
		CertLevel:     input.CertLevel,
		Socials:       input.Socials,
	}
}
