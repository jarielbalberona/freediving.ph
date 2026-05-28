package http

import (
	"context"
	"net/http"
	"strconv"
	"time"

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
	GetProfileViewByUsername(ctx context.Context, username, viewerUserID string) (profilesservice.ProfileView, error)
	ListProfileBucketListByUsername(ctx context.Context, username string, limit int32) ([]profilesservice.ProfileBucketListItem, error)
	GetProfileDivingByUsername(ctx context.Context, username, viewerUserID string) (profilesservice.ProfileDiving, error)
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

func (h *Handlers) GetProfileViewByUsername(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	viewerID := actorIDIfPresent(r)
	profile, err := h.service.GetProfileViewByUsername(r.Context(), username, viewerID)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusOK, ProfileViewResponse{
		Profile: ProfileView{
			ID:           profile.UserID,
			Username:     profile.Username,
			DisplayName:  profile.DisplayName,
			Bio:          profile.Bio,
			AvatarURL:    profile.AvatarURL,
			LocationText: profile.Location,
			CreatedAt:    profile.CreatedAt.Format(time.RFC3339),
			Counts: ProfileViewCounts{
				MediaPosts: profile.Counts.MediaPosts,
				Followers:  profile.Counts.Followers,
				Following:  profile.Counts.Following,
			},
			ViewerRelationship: ProfileViewerRelationship{
				IsSelf:           profile.Viewer.IsSelf,
				IsFollowing:      profile.Viewer.IsFollowing,
				IsBlocked:        profile.Viewer.IsBlocked,
				HasBlockedViewer: profile.Viewer.HasBlockedViewer,
				CanMessage:       profile.Viewer.CanMessage,
				CanFollow:        profile.Viewer.CanFollow,
				CanEdit:          profile.Viewer.CanEdit,
			},
		},
	})
}

func (h *Handlers) ListProfileBucketListByUsername(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	limit := int32(24)
	if rawLimit := r.URL.Query().Get("limit"); rawLimit != "" {
		if parsed, parseErr := strconv.ParseInt(rawLimit, 10, 32); parseErr == nil {
			limit = int32(parsed)
		}
	}
	items, err := h.service.ListProfileBucketListByUsername(r.Context(), username, limit)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	bucket := make([]ProfileBucketListItem, 0, len(items))
	for _, item := range items {
		bucket = append(bucket, ProfileBucketListItem{
			SiteID:   item.SiteID,
			SiteSlug: item.SiteSlug,
			SiteName: item.SiteName,
			SiteArea: item.SiteArea,
			PinnedAt: item.PinnedAt,
			HasDived: item.HasDived,
		})
	}
	httpx.JSON(w, http.StatusOK, ProfileBucketListResponse{Items: bucket})
}

func (h *Handlers) GetProfileDivingByUsername(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	viewerID := ""
	if identity, ok := middleware.CurrentIdentity(r.Context()); ok {
		viewerID = identity.UserID
	}

	result, err := h.service.GetProfileDivingByUsername(r.Context(), username, viewerID)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	presences := make([]ProfileDivePresence, 0, len(result.Presences))
	for _, item := range result.Presences {
		presences = append(presences, ProfileDivePresence{
			ID:               item.ID,
			DiveSiteID:       item.DiveSiteID,
			DiveSiteSlug:     item.DiveSiteSlug,
			DiveSiteName:     item.DiveSiteName,
			DiveSiteArea:     item.DiveSiteArea,
			PresenceType:     item.PresenceType,
			StartAt:          formatOptionalTime(item.StartAt),
			EndAt:            formatOptionalTime(item.EndAt),
			Visibility:       item.Visibility,
			ContactEnabled:   item.ContactEnabled,
			ViewerCanContact: item.ViewerCanContact,
			Note:             item.Note,
			CreatedAt:        item.CreatedAt.UTC().Format(time.RFC3339),
		})
	}

	affinities := make([]ProfileDiveSiteAffinity, 0, len(result.Affinities))
	for _, item := range result.Affinities {
		affinities = append(affinities, ProfileDiveSiteAffinity{
			ID:               item.ID,
			DiveSiteID:       item.DiveSiteID,
			DiveSiteSlug:     item.DiveSiteSlug,
			DiveSiteName:     item.DiveSiteName,
			DiveSiteArea:     item.DiveSiteArea,
			Relationship:     item.Relationship,
			Visibility:       item.Visibility,
			ContactEnabled:   item.ContactEnabled,
			ViewerCanContact: item.ViewerCanContact,
			Note:             item.Note,
			CreatedAt:        item.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt:        item.UpdatedAt.UTC().Format(time.RFC3339),
		})
	}

	httpx.JSON(w, http.StatusOK, ProfileDivingResponse{
		Presences:  presences,
		Affinities: affinities,
	})
}

func requireActorID(r *http.Request) (string, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return identity.UserID, nil
}

func formatOptionalTime(value *time.Time) string {
	if value == nil {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}

func actorIDIfPresent(r *http.Request) string {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok {
		return ""
	}
	return identity.UserID
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
