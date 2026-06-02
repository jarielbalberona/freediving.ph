package http

import (
	"context"
	"net/http"
	"strconv"
	"strings"
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
	GetProfileDiveMapByUsername(ctx context.Context, username, viewerUserID string) (profilesservice.ProfileDiveMap, error)
	GetProfileDiveMapSiteByUsername(ctx context.Context, username, diveSiteID, viewerUserID string) (profilesservice.ProfileDiveMapSiteDetail, error)
	GetProfileDiveMemoriesPageByUsername(ctx context.Context, username, diveSiteSlug, viewerUserID string) (profilesservice.ProfileDiveMemoriesPage, error)
	GetMyBadges(ctx context.Context, actorID string) (profilesservice.ProfileBadges, error)
	GetProfileBadgesByUsername(ctx context.Context, username string) (profilesservice.ProfileBadges, error)
	CreateUserBadge(ctx context.Context, input profilesservice.UpsertUserBadgeInput) (profilesservice.UserBadge, error)
	UpdateUserBadge(ctx context.Context, input profilesservice.UpsertUserBadgeInput) (profilesservice.UserBadge, error)
	DeleteUserBadge(ctx context.Context, actorID, badgeID string) error
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

func (h *Handlers) GetMyBadges(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	result, err := h.service.GetMyBadges(r.Context(), actor)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, profileBadgesToDTO(result, true))
}

func (h *Handlers) CreateUserBadge(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[UpsertUserBadgeRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	badge, err := h.service.CreateUserBadge(r.Context(), badgeRequestToService(actor, "", req))
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusCreated, UserBadgeResponse{Badge: userBadgeToDTO(badge)})
}

func (h *Handlers) UpdateUserBadge(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	badgeID := chi.URLParam(r, "badgeID")
	req, issues, ok := httpx.DecodeAndValidate[UpsertUserBadgeRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	badge, err := h.service.UpdateUserBadge(r.Context(), badgeRequestToService(actor, badgeID, req))
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, UserBadgeResponse{Badge: userBadgeToDTO(badge)})
}

func (h *Handlers) DeleteUserBadge(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	if err := h.service.DeleteUserBadge(r.Context(), actor, chi.URLParam(r, "badgeID")); err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
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

func (h *Handlers) GetProfileDiveMemoriesPageByUsername(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	viewerID := actorIDIfPresent(r)

	result, err := h.service.GetProfileDiveMemoriesPageByUsername(
		r.Context(),
		username,
		chi.URLParam(r, "diveSiteSlug"),
		viewerID,
	)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	proofItems := make([]DiveMemoriesPageProofItem, 0, len(result.ProofItems))
	for _, item := range result.ProofItems {
		proofItems = append(proofItems, DiveMemoriesPageProofItem{
			ID:            item.ID,
			Kind:          item.Kind,
			PostID:        item.PostID,
			MediaItemID:   item.MediaItemID,
			MediaObjectID: item.MediaObjectID,
			Media: DiveMemoriesPageMediaAsset{
				ID:       item.Media.ID,
				URL:      item.Media.URL,
				MimeType: item.Media.MimeType,
				Width:    item.Media.Width,
				Height:   item.Media.Height,
				Type:     item.Media.Type,
			},
			Caption:    item.Caption,
			CreatedAt:  item.CreatedAt.UTC().Format(time.RFC3339),
			ProofLabel: item.ProofLabel,
		})
	}

	memoryItems := make([]DiveMemoriesPageMemoryItem, 0, len(result.MemoryItems))
	for _, item := range result.MemoryItems {
		attachments := make([]DiveMemoriesPageMemoryAttachment, 0, len(item.Attachments))
		for _, attachment := range item.Attachments {
			attachments = append(attachments, DiveMemoriesPageMemoryAttachment{
				ID:            attachment.ID,
				MediaObjectID: attachment.MediaObjectID,
				Media: DiveMemoriesPageMediaAsset{
					ID:       attachment.Media.ID,
					URL:      attachment.Media.URL,
					MimeType: attachment.Media.MimeType,
					Width:    attachment.Media.Width,
					Height:   attachment.Media.Height,
					Type:     attachment.Media.Type,
				},
				CreatedAt: attachment.CreatedAt.UTC().Format(time.RFC3339),
			})
		}
		memoryItems = append(memoryItems, DiveMemoriesPageMemoryItem{
			ID:   item.ID,
			Kind: item.Kind,
			Author: DiveMemoriesPageMemoryAuthor{
				UserID:      item.Author.UserID,
				Username:    item.Author.Username,
				DisplayName: item.Author.DisplayName,
				AvatarURL:   item.Author.AvatarURL,
			},
			Title:           item.Title,
			Body:            item.Body,
			Visibility:      item.Visibility,
			OccurredAt:      item.OccurredAt.UTC().Format(time.RFC3339),
			CreatedAt:       item.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt:       item.UpdatedAt.UTC().Format(time.RFC3339),
			Attachments:     attachments,
			ViewerCanEdit:   item.ViewerCanEdit,
			ViewerCanDelete: item.ViewerCanDelete,
		})
	}

	httpx.JSON(w, http.StatusOK, ProfileDiveMemoriesPageResponse{
		Profile: DiveMemoriesPageProfile{
			ID:            result.Profile.ID,
			Username:      result.Profile.Username,
			DisplayName:   result.Profile.DisplayName,
			AvatarURL:     result.Profile.AvatarURL,
			ViewerIsOwner: result.Profile.ViewerIsOwner,
		},
		Site: DiveMemoriesPageSite{
			DiveSiteID: result.Site.DiveSiteID,
			Slug:       result.Site.Slug,
			Name:       result.Site.Name,
			Area:       result.Site.Area,
			Latitude:   result.Site.Latitude,
			Longitude:  result.Site.Longitude,
		},
		Entry: DiveMemoriesPageEntry{
			FirstProofAt:            result.Entry.FirstProofAt.UTC().Format(time.RFC3339),
			LastProofAt:             result.Entry.LastProofAt.UTC().Format(time.RFC3339),
			LastUpdatedAt:           result.Entry.LastUpdatedAt.UTC().Format(time.RFC3339),
			ProofCount:              result.Entry.ProofCount,
			MemoryCount:             result.Entry.MemoryCount,
			MediaCount:              result.Entry.MediaCount,
			TextCount:               result.Entry.TextCount,
			ViewerCanCreateMemory:   result.Entry.ViewerCanCreateMemory,
			ViewerCanManageMemories: result.Entry.ViewerCanManageMemories,
		},
		ProofItems:  proofItems,
		MemoryItems: memoryItems,
		Limits: DiveMemoriesPageLimits{
			ProofItems:  result.Limits.ProofItems,
			MemoryItems: result.Limits.MemoryItems,
		},
	})
}

func (h *Handlers) GetProfileDiveMapByUsername(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	viewerID := actorIDIfPresent(r)
	result, err := h.service.GetProfileDiveMapByUsername(r.Context(), username, viewerID)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	markers := make([]ProfileDiveMapMarker, 0, len(result.Markers))
	for _, marker := range result.Markers {
		markers = append(markers, profileDiveMapMarkerToDTO(marker))
	}
	httpx.JSON(w, http.StatusOK, ProfileDiveMapResponse{
		VisitedSiteCount: result.VisitedSiteCount,
		Markers:          markers,
	})
}

func (h *Handlers) GetProfileDiveMapSiteByUsername(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	siteID := chi.URLParam(r, "siteID")
	viewerID := actorIDIfPresent(r)
	result, err := h.service.GetProfileDiveMapSiteByUsername(r.Context(), username, siteID, viewerID)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	media := make([]ProfileDiveMapProofMedia, 0, len(result.Media))
	for _, item := range result.Media {
		media = append(media, ProfileDiveMapProofMedia{
			PostID:        item.PostID,
			MediaItemID:   item.MediaItemID,
			MediaObjectID: item.MediaObjectID,
			Type:          item.Type,
			URL:           item.URL,
			MimeType:      item.MimeType,
			Width:         item.Width,
			Height:        item.Height,
			Caption:       item.Caption,
			CreatedAt:     item.CreatedAt.UTC().Format(time.RFC3339),
		})
	}
	memories := make([]ProfileDiveMapMemory, 0, len(result.Memories))
	for _, item := range result.Memories {
		memories = append(memories, ProfileDiveMapMemory{
			ID:           item.ID,
			AuthorUserID: item.AuthorUserID,
			DiveSiteID:   item.DiveSiteID,
			Title:        item.Title,
			Body:         item.Body,
			MediaIDs:     append([]string(nil), item.MediaIDs...),
			Visibility:   item.Visibility,
			OccurredAt:   item.OccurredAt.UTC().Format(time.RFC3339),
			CreatedAt:    item.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt:    item.UpdatedAt.UTC().Format(time.RFC3339),
		})
	}
	httpx.JSON(w, http.StatusOK, ProfileDiveMapSiteResponse{
		Marker:   profileDiveMapMarkerToDTO(result.Marker),
		Media:    media,
		Memories: memories,
	})
}

func profileDiveMapMarkerToDTO(marker profilesservice.ProfileDiveMapMarker) ProfileDiveMapMarker {
	return ProfileDiveMapMarker{
		DiveSiteID:       marker.DiveSiteID,
		DiveSiteSlug:     marker.DiveSiteSlug,
		DiveSiteName:     marker.DiveSiteName,
		DiveSiteArea:     marker.DiveSiteArea,
		Latitude:         marker.Latitude,
		Longitude:        marker.Longitude,
		FirstPostID:      marker.FirstPostID,
		FirstVisitedAt:   marker.FirstVisitedAt.UTC().Format(time.RFC3339),
		LastPostID:       marker.LastPostID,
		LastVisitedAt:    marker.LastVisitedAt.UTC().Format(time.RFC3339),
		MediaPostCount:   marker.MediaPostCount,
		Visibility:       marker.Visibility,
		UnlockedAt:       marker.UnlockedAt.UTC().Format(time.RFC3339),
		LastProofAddedAt: marker.LastProofAddedAt.UTC().Format(time.RFC3339),
	}
}

func (h *Handlers) GetProfileBadgesByUsername(w http.ResponseWriter, r *http.Request) {
	result, err := h.service.GetProfileBadgesByUsername(r.Context(), chi.URLParam(r, "username"))
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, profileBadgesToDTO(result, false))
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

func formatOptionalDate(value *time.Time) string {
	if value == nil {
		return ""
	}
	return value.UTC().Format("2006-01-02")
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

func badgeRequestToService(actorID, badgeID string, req UpsertUserBadgeRequest) profilesservice.UpsertUserBadgeInput {
	var earnedDate *time.Time
	if req.EarnedDate != nil && strings.TrimSpace(*req.EarnedDate) != "" {
		parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*req.EarnedDate))
		if err == nil {
			date := parsed.UTC()
			earnedDate = &date
		}
	}
	return profilesservice.UpsertUserBadgeInput{
		ActorID:         actorID,
		BadgeID:         badgeID,
		BadgeTemplateID: req.BadgeTemplateID,
		ValueText:       req.ValueText,
		ValueNumber:     req.ValueNumber,
		ValueMinutes:    req.ValueMinutes,
		ValueSeconds:    req.ValueSeconds,
		ReferenceLabel:  req.ReferenceLabel,
		ReferenceValue:  req.ReferenceValue,
		ProofMediaID:    req.ProofMediaID,
		EarnedDate:      earnedDate,
		Visibility:      req.Visibility,
		DisplayOrder:    req.DisplayOrder,
		MetadataJSON:    req.MetadataJSON,
	}
}

func profileBadgesToDTO(input profilesservice.ProfileBadges, includeTemplates bool) ProfileBadgesResponse {
	badges := make([]UserBadge, 0, len(input.Badges))
	for _, badge := range input.Badges {
		badges = append(badges, userBadgeToDTO(badge))
	}
	autoStats := make([]UserBadge, 0, len(input.AutoStats))
	for _, badge := range input.AutoStats {
		autoStats = append(autoStats, userBadgeToDTO(badge))
	}
	categorySummaries := make([]BadgeCategorySummary, 0, len(input.CategorySummaries))
	for _, item := range input.CategorySummaries {
		categorySummaries = append(categorySummaries, BadgeCategorySummary{
			Category:     item.Category,
			Label:        item.Label,
			IdentityName: item.IdentityName,
			ImageURL:     item.ImageURL,
			Count:        item.Count,
		})
	}
	resp := ProfileBadgesResponse{Badges: badges, AutoStats: autoStats, CategorySummaries: categorySummaries}
	if includeTemplates {
		resp.Templates = badgeTemplatesToDTO(input.Templates)
	}
	return resp
}

func badgeTemplatesToDTO(input []profilesservice.BadgeTemplate) []BadgeTemplate {
	items := make([]BadgeTemplate, 0, len(input))
	for _, item := range input {
		items = append(items, BadgeTemplate{
			ID:            item.ID,
			Slug:          item.Slug,
			Name:          item.Name,
			Category:      item.Category,
			ValueType:     item.ValueType,
			Unit:          item.Unit,
			Icon:          item.Icon,
			BadgeImageURL: item.BadgeImageURL,
			Description:   item.Description,
			IsSystem:      item.IsSystem,
			DisplayOrder:  item.DisplayOrder,
			Rarity:        item.Rarity,
			IsPublic:      item.IsPublic,
			IsRepeatable:  item.IsRepeatable,
			SourceModule:  item.SourceModule,
			MetadataJSON:  item.MetadataJSON,
		})
	}
	return items
}

func userBadgeToDTO(input profilesservice.UserBadge) UserBadge {
	return UserBadge{
		ID:                  input.ID,
		Template:            badgeTemplatesToDTO([]profilesservice.BadgeTemplate{input.Template})[0],
		TemplateSlug:        input.Template.Slug,
		Name:                input.Template.Name,
		Category:            input.Template.Category,
		ValueType:           input.Template.ValueType,
		ValueText:           input.ValueText,
		ValueNumber:         input.ValueNumber,
		ValueMinutes:        input.ValueMinutes,
		ValueSeconds:        input.ValueSeconds,
		DisplayValue:        input.DisplayValue,
		FormattedValue:      input.DisplayValue,
		Unit:                input.Template.Unit,
		Icon:                input.Template.Icon,
		Description:         input.Template.Description,
		ReferenceLabel:      input.ReferenceLabel,
		ReferenceValue:      input.ReferenceValue,
		ProofMediaID:        input.ProofMediaID,
		ProofMediaObjectKey: input.ProofMediaObjectKey,
		VerificationStatus:  input.VerificationStatus,
		VerifiedAt:          formatOptionalTime(input.VerifiedAt),
		VerifiedBy:          input.VerifiedBy,
		IsSystemVerified:    input.IsSystemVerified,
		SourceType:          input.SourceType,
		SourceID:            input.SourceID,
		EarnedDate:          formatOptionalDate(input.EarnedDate),
		Visibility:          input.Visibility,
		DisplayOrder:        input.DisplayOrder,
		Rarity:              input.Rarity,
		SourceModule:        input.SourceModule,
		IsAutoStat:          input.IsAutoStat,
		MetadataJSON:        input.MetadataJSON,
		CreatedAt:           input.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:           input.UpdatedAt.UTC().Format(time.RFC3339),
	}
}
