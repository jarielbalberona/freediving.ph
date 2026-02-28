package http

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	explorerepo "fphgo/internal/features/explore/repo"
	exploreservice "fphgo/internal/features/explore/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/pagination"
	"fphgo/internal/shared/validatex"
)

type Handlers struct {
	service   exploreService
	validator httpx.Validator
}

type exploreService interface {
	ListSites(ctx context.Context, input exploreservice.ListSitesInput) (exploreservice.ListSitesResult, error)
	ListLatestUpdates(ctx context.Context, input exploreservice.ListLatestUpdatesInput) (exploreservice.ListLatestUpdatesResult, error)
	GetSiteBySlug(ctx context.Context, slug, updatesCursor string, updatesLimit int32) (exploreservice.SiteDetailResult, error)
	GetBuddyPreviewBySlug(ctx context.Context, slug string, limit int32) (exploreservice.SiteBuddyPreviewResult, error)
	GetBuddyIntentsBySlug(ctx context.Context, viewerID, slug, cursor string, limit int32) (exploreservice.SiteBuddyIntentsResult, error)
	CreateUpdate(ctx context.Context, input exploreservice.CreateUpdateInput) (explorerepo.SiteUpdate, error)
	SaveSite(ctx context.Context, actorID, siteID string) error
	UnsaveSite(ctx context.Context, actorID, siteID string) error
}

func New(service exploreService, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) ListSites(w http.ResponseWriter, r *http.Request) {
	limit, err := pagination.ParseLimit(r.URL.Query().Get("limit"), pagination.DefaultLimit, pagination.MaxLimit)
	if err != nil {
		httpx.WriteValidationError(w, anyIssue("limit", "custom", "limit must be a positive integer"))
		return
	}

	viewerID := actorIDIfPresent(r)
	result, svcErr := h.service.ListSites(r.Context(), exploreservice.ListSitesInput{
		ViewerUserID: viewerID,
		Area:         r.URL.Query().Get("area"),
		Difficulty:   r.URL.Query().Get("difficulty"),
		VerifiedOnly: strings.EqualFold(r.URL.Query().Get("verifiedOnly"), "true"),
		Search:       r.URL.Query().Get("search"),
		Cursor:       r.URL.Query().Get("cursor"),
		Limit:        limit,
	})
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}

	items := make([]SiteCard, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, mapSiteCard(item))
	}
	httpx.JSON(w, http.StatusOK, ListSitesResponse{Items: items, NextCursor: result.NextCursor})
}

func (h *Handlers) GetSiteBySlug(w http.ResponseWriter, r *http.Request) {
	limit, err := pagination.ParseLimit(r.URL.Query().Get("updatesLimit"), 10, 50)
	if err != nil {
		httpx.WriteValidationError(w, anyIssue("updatesLimit", "custom", "updatesLimit must be a positive integer"))
		return
	}

	result, svcErr := h.service.GetSiteBySlug(r.Context(), chi.URLParam(r, "slug"), r.URL.Query().Get("updatesCursor"), limit)
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}

	updates := make([]SiteUpdate, 0, len(result.Updates))
	for _, item := range result.Updates {
		updates = append(updates, mapSiteUpdate(item))
	}

	httpx.JSON(w, http.StatusOK, SiteDetailResponse{
		Site:              mapSiteDetail(result.Site),
		Updates:           updates,
		NextUpdatesCursor: result.NextUpdatesCursor,
	})
}

func (h *Handlers) ListLatestUpdates(w http.ResponseWriter, r *http.Request) {
	limit, err := pagination.ParseLimit(r.URL.Query().Get("limit"), pagination.DefaultLimit, pagination.MaxLimit)
	if err != nil {
		httpx.WriteValidationError(w, anyIssue("limit", "custom", "limit must be a positive integer"))
		return
	}
	result, svcErr := h.service.ListLatestUpdates(r.Context(), exploreservice.ListLatestUpdatesInput{
		Area:   r.URL.Query().Get("area"),
		Cursor: r.URL.Query().Get("cursor"),
		Limit:  limit,
	})
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	items := make([]LatestUpdate, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, LatestUpdate{
			ID:                item.ID,
			DiveSiteID:        item.DiveSiteID,
			SiteSlug:          item.SiteSlug,
			SiteName:          item.SiteName,
			SiteArea:          item.SiteArea,
			AuthorAppUserID:   item.AuthorAppUserID,
			AuthorDisplayName: item.AuthorDisplayName,
			AuthorTrust:       mapTrustCard(item.AuthorTrust),
			Note:              item.Note,
			ConditionVisibilityM: item.ConditionVisibilityM,
			ConditionCurrent:  item.ConditionCurrent,
			ConditionWaves:    item.ConditionWaves,
			ConditionTempC:    item.ConditionTempC,
			OccurredAt:        item.OccurredAt.Format(time.RFC3339),
			CreatedAt:         item.CreatedAt.Format(time.RFC3339),
		})
	}
	httpx.JSON(w, http.StatusOK, ListLatestUpdatesResponse{Items: items, NextCursor: result.NextCursor})
}

func (h *Handlers) GetBuddyPreviewBySlug(w http.ResponseWriter, r *http.Request) {
	limit, err := pagination.ParseLimit(r.URL.Query().Get("limit"), 6, 12)
	if err != nil {
		httpx.WriteValidationError(w, anyIssue("limit", "custom", "limit must be a positive integer"))
		return
	}
	result, svcErr := h.service.GetBuddyPreviewBySlug(r.Context(), chi.URLParam(r, "slug"), limit)
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	items := make([]SiteBuddyPreviewIntent, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, SiteBuddyPreviewIntent{
			ID:                 item.ID,
			DiveSiteID:         item.DiveSiteID,
			Area:               item.Area,
			IntentType:         item.IntentType,
			TimeWindow:         item.TimeWindow,
			DateStart:          formatDate(item.DateStart),
			DateEnd:            formatDate(item.DateEnd),
			NotePreview:        redactNote(item.Note),
			CreatedAt:          item.CreatedAt.Format(time.RFC3339),
			EmailVerified:      item.EmailVerified,
			PhoneVerified:      item.PhoneVerified,
			CertLevel:          item.CertLevel,
			MutualBuddiesCount: item.MutualBuddiesCount,
		})
	}
	httpx.JSON(w, http.StatusOK, SiteBuddyPreviewResponse{
		Items: items,
		SourceBreakdown: SiteBuddySourceBreakdown{
			SiteLinkedCount:   result.SourceBreakdown.SiteLinkedCount,
			AreaFallbackCount: result.SourceBreakdown.AreaFallbackCount,
		},
	})
}

func (h *Handlers) GetBuddyIntentsBySlug(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	limit, parseErr := pagination.ParseLimit(r.URL.Query().Get("limit"), pagination.DefaultLimit, pagination.MaxLimit)
	if parseErr != nil {
		httpx.WriteValidationError(w, anyIssue("limit", "custom", "limit must be a positive integer"))
		return
	}
	result, svcErr := h.service.GetBuddyIntentsBySlug(
		r.Context(),
		actorID,
		chi.URLParam(r, "slug"),
		r.URL.Query().Get("cursor"),
		limit,
	)
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	items := make([]SiteBuddyIntent, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, SiteBuddyIntent{
			ID:                 item.ID,
			AuthorAppUserID:    item.AuthorAppUserID,
			DiveSiteID:         item.DiveSiteID,
			Username:           item.Username,
			DisplayName:        item.DisplayName,
			AvatarURL:          item.AvatarURL,
			HomeArea:           item.HomeArea,
			Area:               item.Area,
			IntentType:         item.IntentType,
			TimeWindow:         item.TimeWindow,
			DateStart:          formatDate(item.DateStart),
			DateEnd:            formatDate(item.DateEnd),
			Note:               item.Note,
			CreatedAt:          item.CreatedAt.Format(time.RFC3339),
			ExpiresAt:          item.ExpiresAt.Format(time.RFC3339),
			EmailVerified:      item.EmailVerified,
			PhoneVerified:      item.PhoneVerified,
			CertLevel:          item.CertLevel,
			MutualBuddiesCount: item.MutualBuddiesCount,
		})
	}
	httpx.JSON(w, http.StatusOK, SiteBuddyIntentsResponse{
		Items:      items,
		NextCursor: result.NextCursor,
		SourceBreakdown: SiteBuddySourceBreakdown{
			SiteLinkedCount:   result.SourceBreakdown.SiteLinkedCount,
			AreaFallbackCount: result.SourceBreakdown.AreaFallbackCount,
		},
	})
}

func (h *Handlers) CreateUpdate(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	siteID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "siteId"), "siteId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	req, issues, ok := httpx.DecodeAndValidate[CreateUpdateRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	occurredAt := time.Time{}
	if req.OccurredAt != nil && strings.TrimSpace(*req.OccurredAt) != "" {
		parsed, parseErr := time.Parse(time.RFC3339, *req.OccurredAt)
		if parseErr != nil {
			httpx.WriteValidationError(w, anyIssue("occurredAt", "invalid_datetime", "Must be a valid RFC3339 datetime"))
			return
		}
		occurredAt = parsed
	}

	update, svcErr := h.service.CreateUpdate(r.Context(), exploreservice.CreateUpdateInput{
		ActorID:              actorID,
		SiteID:               siteID,
		Note:                 req.Note,
		ConditionVisibilityM: req.ConditionVisibilityM,
		ConditionCurrent:     req.ConditionCurrent,
		ConditionWaves:       req.ConditionWaves,
		ConditionTempC:       req.ConditionTempC,
		OccurredAt:           occurredAt,
	})
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}

	httpx.JSON(w, http.StatusCreated, map[string]SiteUpdate{"update": mapSiteUpdate(update)})
}

func (h *Handlers) SaveSite(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	siteID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "siteId"), "siteId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	if err := h.service.SaveSite(r.Context(), actorID, siteID); err != nil {
		h.writeError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, SaveSiteResponse{Saved: true})
}

func (h *Handlers) UnsaveSite(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	siteID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "siteId"), "siteId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	if err := h.service.UnsaveSite(r.Context(), actorID, siteID); err != nil {
		h.writeError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) writeError(w http.ResponseWriter, r *http.Request, err error) {
	var validationErr exploreservice.ValidationFailure
	if errors.As(err, &validationErr) {
		httpx.WriteValidationError(w, validationErr.Issues)
		return
	}
	httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
}

func requireActorID(r *http.Request) (string, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return identity.UserID, nil
}

func actorIDIfPresent(r *http.Request) string {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok {
		return ""
	}
	return identity.UserID
}

func mapSiteCard(input explorerepo.SiteCard) SiteCard {
	return SiteCard{
		ID:                   input.ID,
		Slug:                 input.Slug,
		Name:                 input.Name,
		Area:                 input.Area,
		Latitude:             input.Latitude,
		Longitude:            input.Longitude,
		Difficulty:           input.Difficulty,
		DepthMinM:            input.DepthMinM,
		DepthMaxM:            input.DepthMaxM,
		Hazards:              input.Hazards,
		VerificationStatus:   input.VerificationStatus,
		LastUpdatedAt:        input.LastUpdatedAt.Format(time.RFC3339),
		RecentUpdateCount:    input.RecentUpdateCount,
		LastConditionSummary: input.LastConditionSummary,
		IsSaved:              input.IsSaved,
	}
}

func mapSiteDetail(input explorerepo.SiteDetail) SiteDetail {
	return SiteDetail{
		ID:                    input.ID,
		Slug:                  input.Slug,
		Name:                  input.Name,
		Area:                  input.Area,
		Latitude:              input.Latitude,
		Longitude:             input.Longitude,
		Difficulty:            input.Difficulty,
		DepthMinM:             input.DepthMinM,
		DepthMaxM:             input.DepthMaxM,
		Hazards:               input.Hazards,
		BestSeason:            input.BestSeason,
		TypicalConditions:     input.TypicalConditions,
		Access:                input.Access,
		Fees:                  input.Fees,
		ContactInfo:           input.ContactInfo,
		VerificationStatus:    input.VerificationStatus,
		VerifiedByUserID:      input.VerifiedByUserID,
		VerifiedByDisplayName: input.VerifiedByDisplayName,
		LastUpdatedAt:         input.LastUpdatedAt.Format(time.RFC3339),
		CreatedAt:             input.CreatedAt.Format(time.RFC3339),
		ReportCount:           input.ReportCount,
		LastConditionSummary:  input.LastConditionSummary,
	}
}

func mapSiteUpdate(input explorerepo.SiteUpdate) SiteUpdate {
	return SiteUpdate{
		ID:                   input.ID,
		DiveSiteID:           input.DiveSiteID,
		AuthorAppUserID:      input.AuthorAppUserID,
		AuthorDisplayName:    input.AuthorDisplayName,
		AuthorTrust:          mapTrustCard(input.AuthorTrust),
		Note:                 input.Note,
		ConditionVisibilityM: input.ConditionVisibilityM,
		ConditionCurrent:     input.ConditionCurrent,
		ConditionWaves:       input.ConditionWaves,
		ConditionTempC:       input.ConditionTempC,
		OccurredAt:           input.OccurredAt.Format(time.RFC3339),
		CreatedAt:            input.CreatedAt.Format(time.RFC3339),
	}
}

func formatDate(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.UTC().Format("2006-01-02")
}

func mapTrustCard(input explorerepo.TrustSignals) TrustCard {
	return TrustCard{
		EmailVerified: input.EmailVerified,
		PhoneVerified: input.PhoneVerified,
		CertLevel:     input.CertLevel,
		BuddyCount:    input.BuddyCount,
		ReportCount:   input.ReportCount,
	}
}

func redactNote(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	return "Sign in to reveal the full note."
}

func anyIssue(path, code, message string) []validatex.Issue {
	return []validatex.Issue{{
		Path:    []any{path},
		Code:    code,
		Message: message,
	}}
}
