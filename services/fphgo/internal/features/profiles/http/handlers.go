package http

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	profilesservice "fphgo/internal/features/profiles/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
)

type Handlers struct {
	service   *profilesservice.Service
	validator httpx.Validator
}

func New(service *profilesservice.Service, validator httpx.Validator) *Handlers {
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
		UserID:      input.UserID,
		Username:    input.Username,
		DisplayName: input.DisplayName,
		Bio:         input.Bio,
		AvatarURL:   input.AvatarURL,
		Location:    input.Location,
		Socials:     input.Socials,
	}
}
