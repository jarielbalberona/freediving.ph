package http

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	buddyfinderrepo "fphgo/internal/features/buddyfinder/repo"
	explorerepo "fphgo/internal/features/explore/repo"
	exploreservice "fphgo/internal/features/explore/service"
	feedservice "fphgo/internal/features/feed/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/mediaurl"
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
	GetSiteBySlug(ctx context.Context, viewerID, slug, updatesCursor string, updatesLimit int32) (exploreservice.SiteDetailResult, error)
	GetRelatedBySlug(ctx context.Context, viewerID, slug string) (exploreservice.SiteRelatedResult, error)
	ListCommunityPostsBySlug(ctx context.Context, viewerID, slug, cursor string, limit int32) (exploreservice.SiteCommunityPostsResult, error)
	ListGlobalDivePresences(ctx context.Context, input exploreservice.GlobalDivePresencesInput) (exploreservice.GlobalDivePresencesResult, error)
	ListMyDivePresences(ctx context.Context, actorID string) (exploreservice.CurrentUserDivePresencesResult, error)
	ListDivePresencesBySlug(ctx context.Context, viewerID, slug string, limit int32) (exploreservice.SiteDivePresencesResult, error)
	ListMyDiveSiteAffinities(ctx context.Context, actorID string) (exploreservice.CurrentUserDiveAffinitiesResult, error)
	ListDiveAffinitiesBySlug(ctx context.Context, viewerID, slug string, limit int32) (exploreservice.SiteDiveAffinitiesResult, error)
	ListDiveReviewsBySlug(ctx context.Context, viewerID, slug string, limit int32) (exploreservice.SiteDiveReviewsResult, error)
	CreateDivePresence(ctx context.Context, input exploreservice.DivePresenceInput) (explorerepo.DivePresence, error)
	UpdateDivePresence(ctx context.Context, input exploreservice.DivePresenceInput) (explorerepo.DivePresence, error)
	CancelDivePresence(ctx context.Context, actorID, slug, presenceID string) error
	CreateDiveSiteAffinity(ctx context.Context, input exploreservice.DiveSiteAffinityInput) (explorerepo.DiveSiteAffinity, error)
	UpdateDiveSiteAffinity(ctx context.Context, input exploreservice.DiveSiteAffinityInput) (explorerepo.DiveSiteAffinity, error)
	DeleteDiveSiteAffinity(ctx context.Context, actorID, slug, affinityID string) error
	CreateDiveSiteReview(ctx context.Context, input exploreservice.DiveSiteReviewInput) (explorerepo.DiveSiteReview, error)
	CreateSiteSubmission(ctx context.Context, input exploreservice.CreateSiteSubmissionInput) (explorerepo.SiteSubmission, error)
	ListMySiteSubmissions(ctx context.Context, input exploreservice.SubmissionListInput) (exploreservice.SubmissionListResult, error)
	GetMySiteSubmissionByID(ctx context.Context, actorID, submissionID string) (explorerepo.SiteSubmission, error)
	ListPendingSites(ctx context.Context, input exploreservice.SubmissionListInput) (exploreservice.SubmissionListResult, error)
	GetSiteByIDForModeration(ctx context.Context, siteID string) (explorerepo.SiteSubmission, error)
	ApproveSite(ctx context.Context, input exploreservice.ModerateSiteInput) (explorerepo.SiteSubmission, error)
	RejectSite(ctx context.Context, input exploreservice.ModerateSiteInput) (explorerepo.SiteSubmission, error)
	CreateSiteEditProposal(ctx context.Context, input exploreservice.CreateSiteEditProposalInput) (exploreservice.CreateSiteEditProposalResult, error)
	ListMySiteEditProposals(ctx context.Context, input exploreservice.SubmissionListInput) (exploreservice.SiteEditProposalListResult, error)
	GetMySiteEditProposalByID(ctx context.Context, actorID, proposalID string) (explorerepo.SiteEditProposal, error)
	ListPendingSiteEditProposals(ctx context.Context, input exploreservice.SubmissionListInput) (exploreservice.SiteEditProposalListResult, error)
	GetSiteEditProposalForModeration(ctx context.Context, proposalID string) (explorerepo.SiteEditProposal, error)
	ApplySiteEditProposal(ctx context.Context, input exploreservice.ModerateSiteEditProposalInput) (explorerepo.SiteEditProposal, error)
	RejectSiteEditProposal(ctx context.Context, input exploreservice.ModerateSiteEditProposalInput) (explorerepo.SiteEditProposal, error)
	GetBuddyPreviewBySlug(ctx context.Context, slug string, limit int32) (exploreservice.SiteBuddyPreviewResult, error)
	GetBuddyIntentsBySlug(ctx context.Context, viewerID, slug, cursor string, limit int32) (exploreservice.SiteBuddyIntentsResult, error)
	CreateUpdate(ctx context.Context, input exploreservice.CreateUpdateInput) (explorerepo.SiteUpdate, error)
	SaveSite(ctx context.Context, actorID, siteID string) error
	UnsaveSite(ctx context.Context, actorID, siteID string) error
	LikeDiveSite(ctx context.Context, actorID, siteID string) (exploreservice.LikeStateResult, error)
	UnlikeDiveSite(ctx context.Context, actorID, siteID string) (exploreservice.LikeStateResult, error)
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

	savedOnly, savedOnlyIssues := parseOptionalBoolQuery(r, "savedOnly")
	if len(savedOnlyIssues) > 0 {
		httpx.WriteValidationError(w, savedOnlyIssues)
		return
	}

	bounds, boundsIssues := parseListSitesBounds(r)
	if len(boundsIssues) > 0 {
		httpx.WriteValidationError(w, boundsIssues)
		return
	}

	viewerID := actorIDIfPresent(r)
	if savedOnly && viewerID == "" {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusUnauthorized, "authentication_required", "sign in to view saved dive spots", nil))
		return
	}
	result, svcErr := h.service.ListSites(r.Context(), exploreservice.ListSitesInput{
		ViewerUserID: viewerID,
		Area:         r.URL.Query().Get("area"),
		Difficulty:   r.URL.Query().Get("difficulty"),
		VerifiedOnly: strings.EqualFold(r.URL.Query().Get("verifiedOnly"), "true"),
		SavedOnly:    savedOnly,
		Search:       r.URL.Query().Get("search"),
		Bounds:       bounds,
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

func parseOptionalBoolQuery(r *http.Request, name string) (bool, []validatex.Issue) {
	raw := strings.TrimSpace(r.URL.Query().Get(name))
	if raw == "" {
		return false, nil
	}
	if strings.EqualFold(raw, "true") {
		return true, nil
	}
	if strings.EqualFold(raw, "false") {
		return false, nil
	}
	return false, []validatex.Issue{{
		Path:    []any{name},
		Code:    "invalid_enum",
		Message: name + " must be true or false",
	}}
}

func parseOptionalQueryTime(w http.ResponseWriter, r *http.Request, name string) (time.Time, bool) {
	raw := strings.TrimSpace(r.URL.Query().Get(name))
	if raw == "" {
		return time.Time{}, true
	}
	if parsed, err := time.Parse(time.RFC3339, raw); err == nil {
		return parsed.UTC(), true
	}
	if parsed, err := time.Parse("2006-01-02", raw); err == nil {
		return parsed.UTC(), true
	}
	httpx.WriteValidationError(w, anyIssue(name, "invalid_datetime", name+" must be an RFC3339 datetime or YYYY-MM-DD date"))
	return time.Time{}, false
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func parseListSitesBounds(r *http.Request) (*exploreservice.MapBounds, []validatex.Issue) {
	query := r.URL.Query()
	names := []string{"north", "south", "east", "west"}
	present := 0
	values := make(map[string]float64, len(names))
	issues := make([]validatex.Issue, 0, 1)

	for _, name := range names {
		raw := strings.TrimSpace(query.Get(name))
		if raw == "" {
			continue
		}
		present++
		parsed, err := strconv.ParseFloat(raw, 64)
		if err != nil {
			issues = append(issues, validatex.Issue{
				Path:    []any{name},
				Code:    "invalid_type",
				Message: name + " must be a number",
			})
			continue
		}
		values[name] = parsed
	}

	if len(issues) > 0 {
		return nil, issues
	}
	if present == 0 {
		return nil, nil
	}
	if present != len(names) {
		return nil, []validatex.Issue{{
			Path:    []any{"bounds"},
			Code:    "custom",
			Message: "north, south, east, and west must be provided together",
		}}
	}

	return &exploreservice.MapBounds{
		North: values["north"],
		South: values["south"],
		East:  values["east"],
		West:  values["west"],
	}, nil
}

func (h *Handlers) GetSiteBySlug(w http.ResponseWriter, r *http.Request) {
	limit, err := pagination.ParseLimit(r.URL.Query().Get("updatesLimit"), 10, 50)
	if err != nil {
		httpx.WriteValidationError(w, anyIssue("updatesLimit", "custom", "updatesLimit must be a positive integer"))
		return
	}

	result, svcErr := h.service.GetSiteBySlug(r.Context(), actorIDIfPresent(r), chi.URLParam(r, "slug"), r.URL.Query().Get("updatesCursor"), limit)
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

func (h *Handlers) GetRelatedBySlug(w http.ResponseWriter, r *http.Request) {
	result, svcErr := h.service.GetRelatedBySlug(r.Context(), actorIDIfPresent(r), chi.URLParam(r, "slug"))
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusOK, SiteRelatedResponse{
		Counts: SiteRelatedCounts{
			Buddies:             result.Counts.AvailableBuddies,
			AvailableBuddies:    result.Counts.AvailableBuddies,
			LocalRegulars:       result.Counts.LocalRegulars,
			CommunityPosts:      result.Counts.CommunityPosts,
			Reviews:             result.Counts.Reviews,
			AverageRating:       result.Counts.AverageRating,
			LegacyCommunityPost: result.Counts.CommunityPosts,
			RecentConditions:    result.Counts.RecentConditions,
		},
		Previews: SiteRelatedPreviews{
			Buddies:          mapVisibleDivePresences(result.Previews.AvailableBuddies),
			AvailableBuddies: mapVisibleDivePresences(result.Previews.AvailableBuddies),
			LocalRegulars:    mapVisibleDiveSiteAffinities(result.Previews.LocalRegulars),
			CommunityPosts:   mapActivityFeedItems(result.Previews.CommunityPosts),
			Reviews:          mapVisibleDiveSiteReviews(result.Previews.Reviews),
		},
		SourceBreakdown: SiteBuddySourceBreakdown{
			SiteLinkedCount:   int(result.Counts.AvailableBuddies),
			AreaFallbackCount: 0,
		},
	})
}

func (h *Handlers) ListCommunityPostsBySlug(w http.ResponseWriter, r *http.Request) {
	limit, err := pagination.ParseLimit(r.URL.Query().Get("limit"), pagination.DefaultLimit, pagination.MaxLimit)
	if err != nil {
		httpx.WriteValidationError(w, anyIssue("limit", "custom", "limit must be a positive integer"))
		return
	}
	result, svcErr := h.service.ListCommunityPostsBySlug(
		r.Context(),
		actorIDIfPresent(r),
		chi.URLParam(r, "slug"),
		r.URL.Query().Get("cursor"),
		limit,
	)
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusOK, SiteCommunityPostsResponse{
		Items:      mapActivityFeedItems(result.Items),
		NextCursor: result.NextCursor,
	})
}

func (h *Handlers) ListDivePresencesBySlug(w http.ResponseWriter, r *http.Request) {
	limit, err := pagination.ParseLimit(r.URL.Query().Get("limit"), pagination.DefaultLimit, pagination.MaxLimit)
	if err != nil {
		httpx.WriteValidationError(w, anyIssue("limit", "custom", "limit must be a positive integer"))
		return
	}
	result, svcErr := h.service.ListDivePresencesBySlug(r.Context(), actorIDIfPresent(r), chi.URLParam(r, "slug"), limit)
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusOK, DivePresenceListResponse{Items: mapVisibleDivePresences(result.Items)})
}

func (h *Handlers) ListGlobalDivePresences(w http.ResponseWriter, r *http.Request) {
	limit, err := pagination.ParseLimit(r.URL.Query().Get("limit"), pagination.DefaultLimit, pagination.MaxLimit)
	if err != nil {
		httpx.WriteValidationError(w, anyIssue("limit", "custom", "limit must be a positive integer"))
		return
	}
	dateFrom, dateFromOK := parseOptionalQueryTime(w, r, "dateFrom")
	if !dateFromOK {
		return
	}
	dateTo, dateToOK := parseOptionalQueryTime(w, r, "dateTo")
	if !dateToOK {
		return
	}
	flexibleOnly, flexibleIssues := parseOptionalBoolQuery(r, "flexible")
	if len(flexibleIssues) > 0 {
		httpx.WriteValidationError(w, flexibleIssues)
		return
	}
	result, svcErr := h.service.ListGlobalDivePresences(r.Context(), exploreservice.GlobalDivePresencesInput{
		ViewerID:     actorIDIfPresent(r),
		SiteSlug:     r.URL.Query().Get("siteSlug"),
		Area:         firstNonEmpty(r.URL.Query().Get("area"), r.URL.Query().Get("province")),
		PresenceType: r.URL.Query().Get("presenceType"),
		FlexibleOnly: flexibleOnly,
		DateFrom:     dateFrom,
		DateTo:       dateTo,
		Limit:        limit,
	})
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusOK, DivePresenceListResponse{Items: mapVisibleDivePresences(result.Items)})
}

func (h *Handlers) ListMyDivePresences(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	result, svcErr := h.service.ListMyDivePresences(r.Context(), actorID)
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusOK, DivePresenceListResponse{Items: mapVisibleDivePresences(result.Items)})
}

func (h *Handlers) ListDiveAffinitiesBySlug(w http.ResponseWriter, r *http.Request) {
	limit, err := pagination.ParseLimit(r.URL.Query().Get("limit"), pagination.DefaultLimit, pagination.MaxLimit)
	if err != nil {
		httpx.WriteValidationError(w, anyIssue("limit", "custom", "limit must be a positive integer"))
		return
	}
	result, svcErr := h.service.ListDiveAffinitiesBySlug(r.Context(), actorIDIfPresent(r), chi.URLParam(r, "slug"), limit)
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusOK, DiveSiteAffinityListResponse{Items: mapVisibleDiveSiteAffinities(result.Items)})
}

func (h *Handlers) ListMyDiveSiteAffinities(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	result, svcErr := h.service.ListMyDiveSiteAffinities(r.Context(), actorID)
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusOK, DiveSiteAffinityListResponse{Items: mapDiveSiteAffinities(result.Items)})
}

func (h *Handlers) ListDiveReviewsBySlug(w http.ResponseWriter, r *http.Request) {
	limit, err := pagination.ParseLimit(r.URL.Query().Get("limit"), pagination.DefaultLimit, pagination.MaxLimit)
	if err != nil {
		httpx.WriteValidationError(w, anyIssue("limit", "custom", "limit must be a positive integer"))
		return
	}
	result, svcErr := h.service.ListDiveReviewsBySlug(r.Context(), actorIDIfPresent(r), chi.URLParam(r, "slug"), limit)
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusOK, DiveSiteReviewListResponse{
		Items:         mapVisibleDiveSiteReviews(result.Items),
		AverageRating: result.AverageRating,
		ReviewCount:   result.ReviewCount,
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
			ID:                   item.ID,
			DiveSiteID:           item.DiveSiteID,
			SiteSlug:             item.SiteSlug,
			SiteName:             item.SiteName,
			SiteArea:             item.SiteArea,
			AuthorAppUserID:      item.AuthorAppUserID,
			AuthorDisplayName:    item.AuthorDisplayName,
			AuthorTrust:          mapTrustCard(item.AuthorTrust),
			Note:                 item.Note,
			ConditionVisibilityM: item.ConditionVisibilityM,
			ConditionCurrent:     item.ConditionCurrent,
			ConditionWaves:       item.ConditionWaves,
			ConditionTempC:       item.ConditionTempC,
			OccurredAt:           item.OccurredAt.Format(time.RFC3339),
			CreatedAt:            item.CreatedAt.Format(time.RFC3339),
		})
	}
	httpx.JSON(w, http.StatusOK, ListLatestUpdatesResponse{Items: items, NextCursor: result.NextCursor})
}

func (h *Handlers) CreateSiteSubmission(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[CreateSiteSubmissionRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	submission, svcErr := h.service.CreateSiteSubmission(r.Context(), exploreservice.CreateSiteSubmissionInput{
		ActorID:           actorID,
		Name:              req.Name,
		Lat:               req.Lat,
		Lng:               req.Lng,
		Description:       req.Description,
		Difficulty:        req.EntryDifficulty,
		DepthMinM:         req.DepthMinM,
		DepthMaxM:         req.DepthMaxM,
		Hazards:           req.Hazards,
		BestSeason:        req.BestSeason,
		TypicalConditions: req.TypicalConditions,
		Access:            req.Access,
		Fees:              req.Fees,
	})
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusCreated, SiteSubmissionResponse{Submission: mapSiteSubmission(submission)})
}

func (h *Handlers) CreateSiteEditProposal(w http.ResponseWriter, r *http.Request) {
	identity, err := requireIdentity(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[CreateSiteEditProposalRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	result, svcErr := h.service.CreateSiteEditProposal(r.Context(), exploreservice.CreateSiteEditProposalInput{
		ActorID:           identity.UserID,
		ActorRole:         identity.GlobalRole,
		Slug:              chi.URLParam(r, "slug"),
		Name:              req.Name,
		Description:       req.Description,
		Difficulty:        req.EntryDifficulty,
		DepthMinM:         req.DepthMinM,
		DepthMaxM:         req.DepthMaxM,
		Hazards:           req.Hazards,
		BestSeason:        req.BestSeason,
		TypicalConditions: req.TypicalConditions,
		Access:            req.Access,
		Fees:              req.Fees,
	})
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	status := http.StatusCreated
	if result.AppliedImmediately {
		status = http.StatusOK
	}
	httpx.JSON(w, status, SiteEditProposalResponse{
		Proposal:           mapSiteEditProposal(result.Proposal),
		AppliedImmediately: result.AppliedImmediately,
	})
}

func (h *Handlers) ListMySiteSubmissions(w http.ResponseWriter, r *http.Request) {
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
	result, svcErr := h.service.ListMySiteSubmissions(r.Context(), exploreservice.SubmissionListInput{
		ActorID: actorID,
		Cursor:  r.URL.Query().Get("cursor"),
		Limit:   limit,
	})
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	items := make([]SiteSubmission, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, mapSiteSubmission(item))
	}
	httpx.JSON(w, http.StatusOK, SiteSubmissionListResponse{Items: items, NextCursor: result.NextCursor})
}

func (h *Handlers) ListMySiteEditProposals(w http.ResponseWriter, r *http.Request) {
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
	result, svcErr := h.service.ListMySiteEditProposals(r.Context(), exploreservice.SubmissionListInput{
		ActorID: actorID,
		Cursor:  r.URL.Query().Get("cursor"),
		Limit:   limit,
	})
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	items := make([]SiteEditProposal, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, mapSiteEditProposal(item))
	}
	httpx.JSON(w, http.StatusOK, SiteEditProposalListResponse{Items: items, NextCursor: result.NextCursor})
}

func (h *Handlers) GetMySiteSubmissionByID(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	submissionID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "id"), "id")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, svcErr := h.service.GetMySiteSubmissionByID(r.Context(), actorID, submissionID)
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusOK, SiteSubmissionResponse{Submission: mapSiteSubmission(item)})
}

func (h *Handlers) GetMySiteEditProposalByID(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	proposalID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "id"), "id")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, svcErr := h.service.GetMySiteEditProposalByID(r.Context(), actorID, proposalID)
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusOK, SiteEditProposalResponse{Proposal: mapSiteEditProposal(item)})
}

func (h *Handlers) ListPendingSites(w http.ResponseWriter, r *http.Request) {
	limit, parseErr := pagination.ParseLimit(r.URL.Query().Get("limit"), pagination.DefaultLimit, pagination.MaxLimit)
	if parseErr != nil {
		httpx.WriteValidationError(w, anyIssue("limit", "custom", "limit must be a positive integer"))
		return
	}
	result, svcErr := h.service.ListPendingSites(r.Context(), exploreservice.SubmissionListInput{
		Cursor: r.URL.Query().Get("cursor"),
		Limit:  limit,
	})
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	items := make([]SiteSubmission, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, mapSiteSubmission(item))
	}
	httpx.JSON(w, http.StatusOK, SiteSubmissionListResponse{Items: items, NextCursor: result.NextCursor})
}

func (h *Handlers) ListPendingSiteEditProposals(w http.ResponseWriter, r *http.Request) {
	limit, parseErr := pagination.ParseLimit(r.URL.Query().Get("limit"), pagination.DefaultLimit, pagination.MaxLimit)
	if parseErr != nil {
		httpx.WriteValidationError(w, anyIssue("limit", "custom", "limit must be a positive integer"))
		return
	}
	result, svcErr := h.service.ListPendingSiteEditProposals(r.Context(), exploreservice.SubmissionListInput{
		Cursor: r.URL.Query().Get("cursor"),
		Limit:  limit,
	})
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	items := make([]SiteEditProposal, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, mapSiteEditProposal(item))
	}
	httpx.JSON(w, http.StatusOK, SiteEditProposalListResponse{Items: items, NextCursor: result.NextCursor})
}

func (h *Handlers) GetSiteByIDForModeration(w http.ResponseWriter, r *http.Request) {
	siteID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "id"), "id")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, svcErr := h.service.GetSiteByIDForModeration(r.Context(), siteID)
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusOK, SiteSubmissionResponse{Submission: mapSiteSubmission(item)})
}

func (h *Handlers) GetSiteEditProposalForModeration(w http.ResponseWriter, r *http.Request) {
	proposalID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "id"), "id")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, svcErr := h.service.GetSiteEditProposalForModeration(r.Context(), proposalID)
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusOK, SiteEditProposalResponse{Proposal: mapSiteEditProposal(item)})
}

func (h *Handlers) ApproveSite(w http.ResponseWriter, r *http.Request) {
	h.handleModerationAction(w, r, func(ctx context.Context, input exploreservice.ModerateSiteInput) (explorerepo.SiteSubmission, error) {
		return h.service.ApproveSite(ctx, input)
	})
}

func (h *Handlers) RejectSite(w http.ResponseWriter, r *http.Request) {
	h.handleModerationAction(w, r, func(ctx context.Context, input exploreservice.ModerateSiteInput) (explorerepo.SiteSubmission, error) {
		return h.service.RejectSite(ctx, input)
	})
}

func (h *Handlers) ApplySiteEditProposal(w http.ResponseWriter, r *http.Request) {
	h.handleSiteEditModerationAction(w, r, func(ctx context.Context, input exploreservice.ModerateSiteEditProposalInput) (explorerepo.SiteEditProposal, error) {
		return h.service.ApplySiteEditProposal(ctx, input)
	})
}

func (h *Handlers) RejectSiteEditProposal(w http.ResponseWriter, r *http.Request) {
	h.handleSiteEditModerationAction(w, r, func(ctx context.Context, input exploreservice.ModerateSiteEditProposalInput) (explorerepo.SiteEditProposal, error) {
		return h.service.RejectSiteEditProposal(ctx, input)
	})
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
		items = append(items, mapSiteBuddyPreviewIntent(item))
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
			AvatarURL:          mediaurl.MaterializeWithDefault(item.AvatarURL),
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
			BuddyCount:         item.BuddyCount,
			ReportCount:        item.ReportCount,
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

func (h *Handlers) CreateDivePresence(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[DivePresenceRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	input, issues := divePresenceInputFromRequest(actorID, chi.URLParam(r, "slug"), "", req)
	if len(issues) > 0 {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, svcErr := h.service.CreateDivePresence(r.Context(), input)
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusCreated, DivePresenceResponse{Presence: mapDivePresence(item)})
}

func (h *Handlers) UpdateDivePresence(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[DivePresenceRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	input, issues := divePresenceInputFromRequest(actorID, chi.URLParam(r, "slug"), chi.URLParam(r, "presenceId"), req)
	if len(issues) > 0 {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, svcErr := h.service.UpdateDivePresence(r.Context(), input)
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusOK, DivePresenceResponse{Presence: mapDivePresence(item)})
}

func (h *Handlers) CancelDivePresence(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	if err := h.service.CancelDivePresence(r.Context(), actorID, chi.URLParam(r, "slug"), chi.URLParam(r, "presenceId")); err != nil {
		h.writeError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) CreateDiveSiteAffinity(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[DiveSiteAffinityRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, svcErr := h.service.CreateDiveSiteAffinity(r.Context(), diveSiteAffinityInputFromRequest(actorID, chi.URLParam(r, "slug"), "", req))
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusCreated, DiveSiteAffinityResponse{Affinity: mapDiveSiteAffinity(item)})
}

func (h *Handlers) UpdateDiveSiteAffinity(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[DiveSiteAffinityRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, svcErr := h.service.UpdateDiveSiteAffinity(r.Context(), diveSiteAffinityInputFromRequest(actorID, chi.URLParam(r, "slug"), chi.URLParam(r, "affinityId"), req))
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusOK, DiveSiteAffinityResponse{Affinity: mapDiveSiteAffinity(item)})
}

func (h *Handlers) DeleteDiveSiteAffinity(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	if err := h.service.DeleteDiveSiteAffinity(r.Context(), actorID, chi.URLParam(r, "slug"), chi.URLParam(r, "affinityId")); err != nil {
		h.writeError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) CreateDiveSiteReview(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[DiveSiteReviewRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, svcErr := h.service.CreateDiveSiteReview(r.Context(), exploreservice.DiveSiteReviewInput{
		ActorID:    actorID,
		Slug:       chi.URLParam(r, "slug"),
		Rating:     req.Rating,
		Comment:    req.Comment,
		Visibility: req.Visibility,
	})
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusCreated, DiveSiteReviewResponse{Review: mapDiveSiteReview(item)})
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

func (h *Handlers) LikeSite(w http.ResponseWriter, r *http.Request) {
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
	result, err := h.service.LikeDiveSite(r.Context(), actorID, siteID)
	if err != nil {
		h.writeError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, LikeStateResponse{
		TargetID:       result.TargetID,
		LikeCount:      result.LikeCount,
		ViewerHasLiked: result.ViewerHasLiked,
	})
}

func (h *Handlers) UnlikeSite(w http.ResponseWriter, r *http.Request) {
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
	result, err := h.service.UnlikeDiveSite(r.Context(), actorID, siteID)
	if err != nil {
		h.writeError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, LikeStateResponse{
		TargetID:       result.TargetID,
		LikeCount:      result.LikeCount,
		ViewerHasLiked: result.ViewerHasLiked,
	})
}

func (h *Handlers) writeError(w http.ResponseWriter, r *http.Request, err error) {
	var validationErr exploreservice.ValidationFailure
	if errors.As(err, &validationErr) {
		httpx.WriteValidationError(w, validationErr.Issues)
		return
	}
	httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
}

func (h *Handlers) handleModerationAction(
	w http.ResponseWriter,
	r *http.Request,
	run func(context.Context, exploreservice.ModerateSiteInput) (explorerepo.SiteSubmission, error),
) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	siteID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "id"), "id")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[ModerateSiteRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, svcErr := run(r.Context(), exploreservice.ModerateSiteInput{
		ActorID: actorID,
		SiteID:  siteID,
		Reason:  req.Reason,
	})
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusOK, SiteSubmissionResponse{Submission: mapSiteSubmission(item)})
}

func (h *Handlers) handleSiteEditModerationAction(
	w http.ResponseWriter,
	r *http.Request,
	run func(context.Context, exploreservice.ModerateSiteEditProposalInput) (explorerepo.SiteEditProposal, error),
) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	proposalID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "id"), "id")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[ModerateSiteRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, svcErr := run(r.Context(), exploreservice.ModerateSiteEditProposalInput{
		ActorID:    actorID,
		ProposalID: proposalID,
		Reason:     req.Reason,
	})
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusOK, SiteEditProposalResponse{Proposal: mapSiteEditProposal(item)})
}

func requireActorID(r *http.Request) (string, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return identity.UserID, nil
}

func requireIdentity(r *http.Request) (authz.Identity, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return authz.Identity{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return identity, nil
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
		LikeCount:            input.LikeCount,
		ViewerHasLiked:       input.ViewerHasLiked,
		BuddySignal:          mapBuddySignal(input),
		CoverMedia:           mapCoverMedia(input.CoverMedia),
	}
}

func mapBuddySignal(input explorerepo.SiteCard) *BuddySignal {
	if input.SiteBuddyIntentCount <= 0 && input.AreaBuddyIntentCount <= 0 {
		return nil
	}
	signal := &BuddySignal{
		SiteIntentCount: input.SiteBuddyIntentCount,
		AreaIntentCount: input.AreaBuddyIntentCount,
		HasSiteActivity: input.SiteBuddyIntentCount > 0,
		HasAreaActivity: input.AreaBuddyIntentCount > 0,
	}
	if input.SiteBuddyIntentCount == 1 {
		signal.Label = "1 buddy plan at this site"
		return signal
	}
	if input.SiteBuddyIntentCount > 1 {
		signal.Label = fmt.Sprintf("%d buddy plans at this site", input.SiteBuddyIntentCount)
		return signal
	}
	signal.Label = "Buddy plans in this area"
	return signal
}

func mapSiteDetail(input explorerepo.SiteDetail) SiteDetail {
	return SiteDetail{
		ID:                    input.ID,
		Slug:                  input.Slug,
		Name:                  input.Name,
		Area:                  input.Area,
		Latitude:              input.Latitude,
		Longitude:             input.Longitude,
		Description:           input.Description,
		Difficulty:            input.Difficulty,
		DepthMinM:             input.DepthMinM,
		DepthMaxM:             input.DepthMaxM,
		Hazards:               input.Hazards,
		BestSeason:            input.BestSeason,
		TypicalConditions:     input.TypicalConditions,
		Access:                input.Access,
		Fees:                  input.Fees,
		VerificationStatus:    input.VerificationStatus,
		VerifiedByUserID:      input.VerifiedByUserID,
		VerifiedByDisplayName: input.VerifiedByDisplayName,
		LastUpdatedAt:         input.LastUpdatedAt.Format(time.RFC3339),
		CreatedAt:             input.CreatedAt.Format(time.RFC3339),
		ReportCount:           input.ReportCount,
		LastConditionSummary:  input.LastConditionSummary,
		LikeCount:             input.LikeCount,
		ViewerHasLiked:        input.ViewerHasLiked,
		CoverMedia:            mapCoverMedia(input.CoverMedia),
	}
}

func mapCoverMedia(input *explorerepo.SiteCoverMedia) *CoverMedia {
	if input == nil || strings.TrimSpace(input.DisplayURL) == "" {
		return nil
	}
	return &CoverMedia{
		MediaPostID:   input.MediaPostID,
		MediaItemID:   input.MediaItemID,
		MediaObjectID: input.MediaObjectID,
		DisplayURL:    input.DisplayURL,
		Width:         input.Width,
		Height:        input.Height,
		LikeCount:     input.LikeCount,
		CreatedAt:     input.CreatedAt.Format(time.RFC3339),
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

func mapSiteSubmission(input explorerepo.SiteSubmission) SiteSubmission {
	reviewedAt := ""
	if input.ReviewedAt != nil && !input.ReviewedAt.IsZero() {
		reviewedAt = input.ReviewedAt.Format(time.RFC3339)
	}
	return SiteSubmission{
		ID:                     input.ID,
		Slug:                   input.Slug,
		Name:                   input.Name,
		Area:                   input.Area,
		Latitude:               input.Latitude,
		Longitude:              input.Longitude,
		Description:            input.Description,
		Difficulty:             input.Difficulty,
		DepthMinM:              input.DepthMinM,
		DepthMaxM:              input.DepthMaxM,
		Hazards:                input.Hazards,
		BestSeason:             input.BestSeason,
		TypicalConditions:      input.TypicalConditions,
		Access:                 input.Access,
		Fees:                   input.Fees,
		VerificationStatus:     input.VerificationStatus,
		SubmittedByAppUserID:   input.SubmittedByAppUserID,
		SubmittedByDisplayName: input.SubmittedByDisplayName,
		ReviewedByAppUserID:    input.ReviewedByAppUserID,
		ReviewedByDisplayName:  input.ReviewedByDisplayName,
		ReviewedAt:             reviewedAt,
		ModerationReason:       input.ModerationReason,
		ModerationState:        input.ModerationState,
		LastUpdatedAt:          input.LastUpdatedAt.Format(time.RFC3339),
		UpdatedAt:              input.UpdatedAt.Format(time.RFC3339),
		CreatedAt:              input.CreatedAt.Format(time.RFC3339),
	}
}

func mapSiteEditProposal(input explorerepo.SiteEditProposal) SiteEditProposal {
	reviewedAt := ""
	if input.ReviewedAt != nil && !input.ReviewedAt.IsZero() {
		reviewedAt = input.ReviewedAt.Format(time.RFC3339)
	}
	return SiteEditProposal{
		ID:                       input.ID,
		DiveSiteID:               input.DiveSiteID,
		SiteSlug:                 input.SiteSlug,
		SiteArea:                 input.SiteArea,
		SubmittedByAppUserID:     input.SubmittedByAppUserID,
		SubmittedByDisplayName:   input.SubmittedByDisplayName,
		ReviewedByAppUserID:      input.ReviewedByAppUserID,
		ReviewedByDisplayName:    input.ReviewedByDisplayName,
		ReviewedAt:               reviewedAt,
		ModerationReason:         input.ModerationReason,
		State:                    input.State,
		BaseSiteUpdatedAt:        input.BaseSiteUpdatedAt.Format(time.RFC3339),
		CurrentSiteUpdatedAt:     input.CurrentSiteUpdatedAt.Format(time.RFC3339),
		SiteChangedSinceProposal: input.SiteChangedSinceProposal,
		Current:                  mapSiteEditValues(input.Current),
		Proposed:                 mapSiteEditValues(input.Proposed),
		CreatedAt:                input.CreatedAt.Format(time.RFC3339),
		UpdatedAt:                input.UpdatedAt.Format(time.RFC3339),
	}
}

func mapSiteEditValues(input explorerepo.SiteEditValues) SiteEditValues {
	return SiteEditValues{
		Name:              input.Name,
		Description:       input.Description,
		Difficulty:        input.Difficulty,
		DepthMinM:         input.DepthMinM,
		DepthMaxM:         input.DepthMaxM,
		Hazards:           input.Hazards,
		BestSeason:        input.BestSeason,
		TypicalConditions: input.TypicalConditions,
		Access:            input.Access,
		Fees:              input.Fees,
	}
}

func mapSiteBuddyPreviewIntents(items []buddyfinderrepo.PreviewIntent) []SiteBuddyPreviewIntent {
	out := make([]SiteBuddyPreviewIntent, 0, len(items))
	for _, item := range items {
		out = append(out, mapSiteBuddyPreviewIntent(item))
	}
	return out
}

func mapSiteBuddyPreviewIntent(item buddyfinderrepo.PreviewIntent) SiteBuddyPreviewIntent {
	return SiteBuddyPreviewIntent{
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
		BuddyCount:         item.BuddyCount,
		ReportCount:        item.ReportCount,
		MutualBuddiesCount: item.MutualBuddiesCount,
	}
}

func mapActivityFeedItems(items []feedservice.ActivityItem) []ActivityFeedItem {
	out := make([]ActivityFeedItem, 0, len(items))
	for _, item := range items {
		out = append(out, ActivityFeedItem{
			ID:           item.ID,
			Type:         string(item.Type),
			SourceModule: string(item.SourceModule),
			SourceType:   item.SourceType,
			SourceID:     item.SourceID,
			Actor: ActivityFeedActor{
				ID:        item.Actor.ID,
				Name:      item.Actor.Name,
				Username:  item.Actor.Username,
				AvatarURL: item.Actor.AvatarURL,
			},
			Target: ActivityFeedTarget{
				Type: item.Target.Type,
				ID:   item.Target.ID,
			},
			Visibility: string(item.Visibility),
			OccurredAt: item.OccurredAt,
			Title:      item.Title,
			Body:       item.Body,
			Area:       item.Area,
			DiveSiteID: item.DiveSiteID,
			GroupID:    item.GroupID,
			EventID:    item.EventID,
			Media:      item.Media,
			Stats:      item.Stats,
			Metadata:   item.Metadata,
			Href:       item.Href,
		})
	}
	return out
}

func divePresenceInputFromRequest(actorID, slug, presenceID string, req DivePresenceRequest) (exploreservice.DivePresenceInput, []validatex.Issue) {
	var issues []validatex.Issue
	var startAt, endAt *time.Time
	if !req.Flexible {
		startAt = parseOptionalRFC3339(req.StartAt, "startAt", &issues)
		endAt = parseOptionalRFC3339(req.EndAt, "endAt", &issues)
	}
	return exploreservice.DivePresenceInput{
		ActorID:        actorID,
		Slug:           slug,
		PresenceID:     presenceID,
		PresenceType:   req.PresenceType,
		StartAt:        startAt,
		EndAt:          endAt,
		Visibility:     req.Visibility,
		ContactEnabled: req.ContactEnabled,
		Note:           req.Note,
	}, issues
}

func diveSiteAffinityInputFromRequest(actorID, slug, affinityID string, req DiveSiteAffinityRequest) exploreservice.DiveSiteAffinityInput {
	return exploreservice.DiveSiteAffinityInput{
		ActorID:        actorID,
		Slug:           slug,
		AffinityID:     affinityID,
		Relationship:   req.Relationship,
		Visibility:     req.Visibility,
		ContactEnabled: req.ContactEnabled,
		Note:           req.Note,
	}
}

func parseOptionalRFC3339(raw *string, field string, issues *[]validatex.Issue) *time.Time {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil
	}
	parsed, err := time.Parse(time.RFC3339, *raw)
	if err != nil {
		*issues = append(*issues, validatex.Issue{Path: []any{field}, Code: "invalid_datetime", Message: "Must be a valid RFC3339 datetime"})
		return nil
	}
	utc := parsed.UTC()
	return &utc
}

func mapVisibleDivePresences(items []explorerepo.VisibleDivePresence) []DivePresenceItem {
	out := make([]DivePresenceItem, 0, len(items))
	for _, item := range items {
		mapped := mapDivePresence(item.DivePresence)
		mapped.Username = item.Username
		mapped.DisplayName = item.DisplayName
		mapped.AvatarURL = item.AvatarURL
		mapped.DiveSiteSlug = item.DiveSiteSlug
		mapped.DiveSiteName = item.DiveSiteName
		mapped.DiveSiteArea = item.DiveSiteArea
		mapped.ContactAllowed = item.ContactAllowed
		out = append(out, mapped)
	}
	return out
}

func mapDivePresence(item explorerepo.DivePresence) DivePresenceItem {
	return DivePresenceItem{
		ID:             item.ID,
		UserID:         item.UserID,
		DiveSiteID:     item.DiveSiteID,
		PresenceType:   item.PresenceType,
		StartAt:        formatOptionalTime(item.StartAt),
		EndAt:          formatOptionalTime(item.EndAt),
		Visibility:     item.Visibility,
		ContactEnabled: item.ContactEnabled,
		Note:           item.Note,
		Status:         item.Status,
		CreatedAt:      item.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      item.UpdatedAt.Format(time.RFC3339),
	}
}

func mapVisibleDiveSiteAffinities(items []explorerepo.VisibleDiveSiteAffinity) []DiveSiteAffinityItem {
	out := make([]DiveSiteAffinityItem, 0, len(items))
	for _, item := range items {
		mapped := mapDiveSiteAffinity(item.DiveSiteAffinity)
		mapped.Username = item.Username
		mapped.DisplayName = item.DisplayName
		mapped.AvatarURL = item.AvatarURL
		mapped.ContactAllowed = item.ContactAllowed
		out = append(out, mapped)
	}
	return out
}

func mapDiveSiteAffinities(items []explorerepo.DiveSiteAffinity) []DiveSiteAffinityItem {
	out := make([]DiveSiteAffinityItem, 0, len(items))
	for _, item := range items {
		out = append(out, mapDiveSiteAffinity(item))
	}
	return out
}

func mapDiveSiteAffinity(item explorerepo.DiveSiteAffinity) DiveSiteAffinityItem {
	return DiveSiteAffinityItem{
		ID:             item.ID,
		UserID:         item.UserID,
		DiveSiteID:     item.DiveSiteID,
		DiveSiteSlug:   item.DiveSiteSlug,
		DiveSiteName:   item.DiveSiteName,
		DiveSiteArea:   item.DiveSiteArea,
		Relationship:   item.Relationship,
		Visibility:     item.Visibility,
		ContactEnabled: item.ContactEnabled,
		Note:           item.Note,
		CreatedAt:      item.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      item.UpdatedAt.Format(time.RFC3339),
	}
}

func mapVisibleDiveSiteReviews(items []explorerepo.VisibleDiveSiteReview) []DiveSiteReviewItem {
	out := make([]DiveSiteReviewItem, 0, len(items))
	for _, item := range items {
		mapped := mapDiveSiteReview(item.DiveSiteReview)
		mapped.Username = item.Username
		mapped.DisplayName = item.DisplayName
		mapped.AvatarURL = item.AvatarURL
		out = append(out, mapped)
	}
	return out
}

func mapDiveSiteReview(item explorerepo.DiveSiteReview) DiveSiteReviewItem {
	return DiveSiteReviewItem{
		ID:         item.ID,
		DiveSiteID: item.DiveSiteID,
		UserID:     item.UserID,
		Rating:     item.Rating,
		Comment:    item.Comment,
		Visibility: item.Visibility,
		Status:     item.Status,
		CreatedAt:  item.CreatedAt.Format(time.RFC3339),
		UpdatedAt:  item.UpdatedAt.Format(time.RFC3339),
	}
}

func formatOptionalTime(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
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
