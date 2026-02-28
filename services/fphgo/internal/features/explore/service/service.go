package service

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"

	buddyfinderrepo "fphgo/internal/features/buddyfinder/repo"
	buddyfinderservice "fphgo/internal/features/buddyfinder/service"
	explorerepo "fphgo/internal/features/explore/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/pagination"
	sharedratelimit "fphgo/internal/shared/ratelimit"
	"fphgo/internal/shared/validatex"
)

type Service struct {
	repo     repository
	buddies  buddyMatcher
	limiter  rateLimiter
	geocoder reverseGeocoder
}

type repository interface {
	ListSites(ctx context.Context, input explorerepo.ListSitesInput) ([]explorerepo.SiteCard, error)
	GetSiteBySlug(ctx context.Context, slug string) (explorerepo.SiteDetail, error)
	FindApprovedSiteDuplicate(ctx context.Context, name, area string) (string, error)
	SlugExists(ctx context.Context, slug string) (bool, error)
	CreateSiteSubmission(ctx context.Context, input explorerepo.CreateSiteSubmissionInput) (explorerepo.SiteSubmission, error)
	ListMySiteSubmissions(ctx context.Context, input explorerepo.ListSiteSubmissionsInput) ([]explorerepo.SiteSubmission, error)
	GetMySiteSubmissionByID(ctx context.Context, id, submittedByAppUserID string) (explorerepo.SiteSubmission, error)
	ListPendingSites(ctx context.Context, input explorerepo.ListPendingSitesInput) ([]explorerepo.SiteSubmission, error)
	GetSiteByIDForModeration(ctx context.Context, id string) (explorerepo.SiteSubmission, error)
	ApproveSite(ctx context.Context, id, slug, reviewedByAppUserID string, reviewedAt time.Time, moderationReason *string) (explorerepo.SiteSubmission, error)
	RejectOrHideSite(ctx context.Context, id, reviewedByAppUserID string, reviewedAt time.Time, moderationReason *string) (explorerepo.SiteSubmission, error)
	ListUpdatesForSite(ctx context.Context, input explorerepo.ListUpdatesInput) ([]explorerepo.SiteUpdate, error)
	ListLatestUpdates(ctx context.Context, area string, cursorOccurredAt time.Time, cursorID string, limit int32) ([]explorerepo.LatestUpdate, error)
	CreateUpdate(ctx context.Context, input explorerepo.CreateUpdateInput) (explorerepo.SiteUpdate, error)
	GetSiteForWrite(ctx context.Context, siteID string) (explorerepo.SiteSummary, error)
	SaveSite(ctx context.Context, appUserID, siteID string) error
	UnsaveSite(ctx context.Context, appUserID, siteID string) error
}

type rateLimiter interface {
	Allow(ctx context.Context, scope, key string, maxEvents int, window time.Duration) (sharedratelimit.Result, error)
}

type buddyMatcher interface {
	PreviewForSite(ctx context.Context, siteID, area string, limit int32) (buddyfinderservice.SitePreviewResult, error)
	ListMemberIntentsForSite(ctx context.Context, input buddyfinderservice.SiteIntentsInput) (buddyfinderservice.SiteIntentsResult, error)
}

type reverseGeocoder interface {
	ReverseGeocodeArea(ctx context.Context, lat, lng float64) (string, error)
}

type noopLimiter struct{}

func (noopLimiter) Allow(context.Context, string, string, int, time.Duration) (sharedratelimit.Result, error) {
	return sharedratelimit.Result{Allowed: true}, nil
}

type disabledReverseGeocoder struct{}

func (disabledReverseGeocoder) ReverseGeocodeArea(context.Context, float64, float64) (string, error) {
	return "", fmt.Errorf("reverse geocoder is not configured")
}

type Option func(*Service)

func WithLimiter(limiter rateLimiter) Option {
	return func(s *Service) {
		if limiter != nil {
			s.limiter = limiter
		}
	}
}

func WithBuddyMatcher(matcher buddyMatcher) Option {
	return func(s *Service) {
		if matcher != nil {
			s.buddies = matcher
		}
	}
}

func WithReverseGeocoder(geocoder reverseGeocoder) Option {
	return func(s *Service) {
		if geocoder != nil {
			s.geocoder = geocoder
		}
	}
}

type ListSitesInput struct {
	ViewerUserID string
	Area         string
	Difficulty   string
	VerifiedOnly bool
	Search       string
	Cursor       string
	Limit        int32
}

type ListSitesResult struct {
	Items      []explorerepo.SiteCard
	NextCursor string
}

type SiteDetailResult struct {
	Site              explorerepo.SiteDetail
	Updates           []explorerepo.SiteUpdate
	NextUpdatesCursor string
}

type SiteBuddyPreviewResult struct {
	Site            explorerepo.SiteDetail
	Items           []buddyfinderrepo.PreviewIntent
	SourceBreakdown buddyfinderservice.SourceBreakdown
}

type SiteBuddyIntentsResult struct {
	Site            explorerepo.SiteDetail
	Items           []buddyfinderrepo.MemberIntent
	NextCursor      string
	SourceBreakdown buddyfinderservice.SourceBreakdown
}

type CreateUpdateInput struct {
	ActorID              string
	SiteID               string
	Note                 string
	ConditionVisibilityM *float64
	ConditionCurrent     *string
	ConditionWaves       *string
	ConditionTempC       *float64
	OccurredAt           time.Time
}

type ListLatestUpdatesInput struct {
	Area   string
	Cursor string
	Limit  int32
}

type ListLatestUpdatesResult struct {
	Items      []explorerepo.LatestUpdate
	NextCursor string
}

type CreateSiteSubmissionInput struct {
	ActorID           string
	Name              string
	Lat               *float64
	Lng               *float64
	Difficulty        string
	DepthMinM         *float64
	DepthMaxM         *float64
	Hazards           []string
	BestSeason        *string
	TypicalConditions *string
	Access            *string
	Fees              *string
	ContactInfo       *string
}

type SubmissionListInput struct {
	ActorID string
	Cursor  string
	Limit   int32
}

type SubmissionListResult struct {
	Items      []explorerepo.SiteSubmission
	NextCursor string
}

type ModerateSiteInput struct {
	ActorID string
	SiteID  string
	Reason  *string
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (e ValidationFailure) Error() string { return "validation failed" }

var slugUnsafePattern = regexp.MustCompile(`[^a-z0-9]+`)

func New(repo repository, opts ...Option) *Service {
	svc := &Service{repo: repo, limiter: noopLimiter{}, geocoder: disabledReverseGeocoder{}}
	for _, opt := range opts {
		if opt != nil {
			opt(svc)
		}
	}
	return svc
}

func (s *Service) ListSites(ctx context.Context, input ListSitesInput) (ListSitesResult, error) {
	limit := input.Limit
	if limit <= 0 || limit > pagination.MaxLimit {
		limit = pagination.DefaultLimit
	}

	cursorUpdated, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(input.Cursor) != "" {
		updatedAt, tieID, err := pagination.DecodeUUID(input.Cursor)
		if err != nil {
			return ListSitesResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"cursor"},
				Code:    "custom",
				Message: "invalid cursor",
			}}}
		}
		cursorUpdated = updatedAt
		cursorID = tieID
	}

	items, err := s.repo.ListSites(ctx, explorerepo.ListSitesInput{
		ViewerUserID:    input.ViewerUserID,
		Area:            strings.TrimSpace(input.Area),
		Difficulty:      strings.TrimSpace(input.Difficulty),
		VerifiedOnly:    input.VerifiedOnly,
		Search:          strings.TrimSpace(input.Search),
		CursorUpdatedAt: cursorUpdated,
		CursorID:        cursorID,
		Limit:           limit + 1,
	})
	if err != nil {
		return ListSitesResult{}, apperrors.New(http.StatusInternalServerError, "explore_list_failed", "failed to list dive sites", err)
	}

	nextCursor := ""
	if int32(len(items)) > limit {
		next := items[limit-1]
		nextCursor = pagination.Encode(next.LastUpdatedAt, next.ID)
		items = items[:limit]
	}

	return ListSitesResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) GetSiteBySlug(ctx context.Context, slug, updatesCursor string, updatesLimit int32) (SiteDetailResult, error) {
	site, err := s.repo.GetSiteBySlug(ctx, strings.TrimSpace(slug))
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return SiteDetailResult{}, apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
		}
		return SiteDetailResult{}, apperrors.New(http.StatusInternalServerError, "site_detail_failed", "failed to load dive site", err)
	}

	limit := updatesLimit
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	cursorOccurred, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(updatesCursor) != "" {
		occurredAt, tieID, err := pagination.DecodeUUID(updatesCursor)
		if err != nil {
			return SiteDetailResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"updatesCursor"},
				Code:    "custom",
				Message: "invalid updatesCursor",
			}}}
		}
		cursorOccurred = occurredAt
		cursorID = tieID
	}

	updates, err := s.repo.ListUpdatesForSite(ctx, explorerepo.ListUpdatesInput{
		SiteID:           site.ID,
		CursorOccurredAt: cursorOccurred,
		CursorID:         cursorID,
		Limit:            limit + 1,
	})
	if err != nil {
		return SiteDetailResult{}, apperrors.New(http.StatusInternalServerError, "site_updates_failed", "failed to list site updates", err)
	}

	nextCursor := ""
	if int32(len(updates)) > limit {
		next := updates[limit-1]
		nextCursor = pagination.Encode(next.OccurredAt, next.ID)
		updates = updates[:limit]
	}

	return SiteDetailResult{Site: site, Updates: updates, NextUpdatesCursor: nextCursor}, nil
}

func (s *Service) ListLatestUpdates(ctx context.Context, input ListLatestUpdatesInput) (ListLatestUpdatesResult, error) {
	limit := input.Limit
	if limit <= 0 || limit > pagination.MaxLimit {
		limit = pagination.DefaultLimit
	}
	cursorOccurred, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(input.Cursor) != "" {
		occurredAt, tieID, err := pagination.DecodeUUID(input.Cursor)
		if err != nil {
			return ListLatestUpdatesResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"cursor"},
				Code:    "custom",
				Message: "invalid cursor",
			}}}
		}
		cursorOccurred = occurredAt
		cursorID = tieID
	}
	items, err := s.repo.ListLatestUpdates(ctx, strings.TrimSpace(input.Area), cursorOccurred, cursorID, limit+1)
	if err != nil {
		return ListLatestUpdatesResult{}, apperrors.New(http.StatusInternalServerError, "explore_updates_failed", "failed to list latest updates", err)
	}
	nextCursor := ""
	if int32(len(items)) > limit {
		next := items[limit-1]
		nextCursor = pagination.Encode(next.OccurredAt, next.ID)
		items = items[:limit]
	}
	return ListLatestUpdatesResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) CreateSiteSubmission(ctx context.Context, input CreateSiteSubmissionInput) (explorerepo.SiteSubmission, error) {
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return explorerepo.SiteSubmission{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}

	name := strings.TrimSpace(input.Name)
	difficulty := strings.TrimSpace(input.Difficulty)
	issues := validateSubmissionInput(name, difficulty, input.Lat, input.Lng, input.DepthMinM, input.DepthMaxM)
	if len(issues) > 0 {
		return explorerepo.SiteSubmission{}, ValidationFailure{Issues: issues}
	}

	if err := s.enforceRateLimit(ctx, "explore.submit_site.hour", input.ActorID, 1, time.Hour, "site submission cooldown active"); err != nil {
		return explorerepo.SiteSubmission{}, err
	}
	if err := s.enforceRateLimit(ctx, "explore.submit_site.day", input.ActorID, 5, 24*time.Hour, "daily site submission cap exceeded"); err != nil {
		return explorerepo.SiteSubmission{}, err
	}

	area, err := s.geocoder.ReverseGeocodeArea(ctx, *input.Lat, *input.Lng)
	if err != nil {
		return explorerepo.SiteSubmission{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"location"},
			Code:    "invalid_location",
			Message: "Unable to determine area from map pin. Please pick a different spot.",
		}}}
	}

	if _, err := s.repo.FindApprovedSiteDuplicate(ctx, name, area); err == nil {
		return explorerepo.SiteSubmission{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"name"},
			Code:    "custom",
			Message: "A published dive site with the same name and area already exists",
		}}}
	} else if !explorerepo.IsNoRows(err) {
		return explorerepo.SiteSubmission{}, apperrors.New(http.StatusInternalServerError, "site_lookup_failed", "failed to check for duplicate dive sites", err)
	}

	submission, err := s.repo.CreateSiteSubmission(ctx, explorerepo.CreateSiteSubmissionInput{
		Name:                 name,
		Slug:                 pendingSlug(),
		Area:                 area,
		Latitude:             input.Lat,
		Longitude:            input.Lng,
		Difficulty:           difficulty,
		DepthMinM:            input.DepthMinM,
		DepthMaxM:            input.DepthMaxM,
		Hazards:              cleanStringList(input.Hazards),
		BestSeason:           trimPtr(input.BestSeason),
		TypicalConditions:    trimPtr(input.TypicalConditions),
		Access:               trimPtr(input.Access),
		Fees:                 trimPtr(input.Fees),
		ContactInfo:          trimPtr(input.ContactInfo),
		SubmittedByAppUserID: input.ActorID,
	})
	if err != nil {
		return explorerepo.SiteSubmission{}, apperrors.New(http.StatusInternalServerError, "site_submission_failed", "failed to submit dive site", err)
	}
	return submission, nil
}

func (s *Service) ListMySiteSubmissions(ctx context.Context, input SubmissionListInput) (SubmissionListResult, error) {
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return SubmissionListResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	limit := input.Limit
	if limit <= 0 || limit > pagination.MaxLimit {
		limit = pagination.DefaultLimit
	}
	cursorCreatedAt, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(input.Cursor) != "" {
		createdAt, tieID, err := pagination.DecodeUUID(input.Cursor)
		if err != nil {
			return SubmissionListResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"cursor"},
				Code:    "custom",
				Message: "invalid cursor",
			}}}
		}
		cursorCreatedAt = createdAt
		cursorID = tieID
	}
	items, err := s.repo.ListMySiteSubmissions(ctx, explorerepo.ListSiteSubmissionsInput{
		SubmittedByAppUserID: input.ActorID,
		CursorCreatedAt:      cursorCreatedAt,
		CursorID:             cursorID,
		Limit:                limit + 1,
	})
	if err != nil {
		return SubmissionListResult{}, apperrors.New(http.StatusInternalServerError, "site_submission_list_failed", "failed to list your site submissions", err)
	}
	nextCursor := ""
	if int32(len(items)) > limit {
		next := items[limit-1]
		nextCursor = pagination.Encode(next.CreatedAt, next.ID)
		items = items[:limit]
	}
	return SubmissionListResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) GetMySiteSubmissionByID(ctx context.Context, actorID, submissionID string) (explorerepo.SiteSubmission, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return explorerepo.SiteSubmission{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(submissionID); err != nil {
		return explorerepo.SiteSubmission{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"id"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	item, err := s.repo.GetMySiteSubmissionByID(ctx, submissionID, actorID)
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return explorerepo.SiteSubmission{}, apperrors.New(http.StatusNotFound, "site_submission_not_found", "dive site submission not found", err)
		}
		return explorerepo.SiteSubmission{}, apperrors.New(http.StatusInternalServerError, "site_submission_detail_failed", "failed to load dive site submission", err)
	}
	return item, nil
}

func (s *Service) ListPendingSites(ctx context.Context, input SubmissionListInput) (SubmissionListResult, error) {
	limit := input.Limit
	if limit <= 0 || limit > pagination.MaxLimit {
		limit = pagination.DefaultLimit
	}
	cursorCreatedAt, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(input.Cursor) != "" {
		createdAt, tieID, err := pagination.DecodeUUID(input.Cursor)
		if err != nil {
			return SubmissionListResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"cursor"},
				Code:    "custom",
				Message: "invalid cursor",
			}}}
		}
		cursorCreatedAt = createdAt
		cursorID = tieID
	}
	items, err := s.repo.ListPendingSites(ctx, explorerepo.ListPendingSitesInput{
		CursorCreatedAt: cursorCreatedAt,
		CursorID:        cursorID,
		Limit:           limit + 1,
	})
	if err != nil {
		return SubmissionListResult{}, apperrors.New(http.StatusInternalServerError, "pending_sites_failed", "failed to list pending dive sites", err)
	}
	nextCursor := ""
	if int32(len(items)) > limit {
		next := items[limit-1]
		nextCursor = pagination.Encode(next.CreatedAt, next.ID)
		items = items[:limit]
	}
	return SubmissionListResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) GetSiteByIDForModeration(ctx context.Context, siteID string) (explorerepo.SiteSubmission, error) {
	if _, err := uuid.Parse(siteID); err != nil {
		return explorerepo.SiteSubmission{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"id"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	item, err := s.repo.GetSiteByIDForModeration(ctx, siteID)
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return explorerepo.SiteSubmission{}, apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
		}
		return explorerepo.SiteSubmission{}, apperrors.New(http.StatusInternalServerError, "site_detail_failed", "failed to load dive site", err)
	}
	return item, nil
}

func (s *Service) ApproveSite(ctx context.Context, input ModerateSiteInput) (explorerepo.SiteSubmission, error) {
	return s.moderateSite(ctx, input, true)
}

func (s *Service) RejectSite(ctx context.Context, input ModerateSiteInput) (explorerepo.SiteSubmission, error) {
	return s.moderateSite(ctx, input, false)
}

func (s *Service) GetBuddyPreviewBySlug(ctx context.Context, slug string, limit int32) (SiteBuddyPreviewResult, error) {
	site, err := s.repo.GetSiteBySlug(ctx, strings.TrimSpace(slug))
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return SiteBuddyPreviewResult{}, apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
		}
		return SiteBuddyPreviewResult{}, apperrors.New(http.StatusInternalServerError, "site_detail_failed", "failed to load dive site", err)
	}
	if s.buddies == nil {
		return SiteBuddyPreviewResult{Site: site}, nil
	}
	result, err := s.buddies.PreviewForSite(ctx, site.ID, site.Area, limit)
	if err != nil {
		return SiteBuddyPreviewResult{}, err
	}
	return SiteBuddyPreviewResult{
		Site:            site,
		Items:           result.Items,
		SourceBreakdown: result.SourceBreakdown,
	}, nil
}

func (s *Service) GetBuddyIntentsBySlug(ctx context.Context, viewerID, slug, cursor string, limit int32) (SiteBuddyIntentsResult, error) {
	if _, err := uuid.Parse(viewerID); err != nil {
		return SiteBuddyIntentsResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	site, err := s.repo.GetSiteBySlug(ctx, strings.TrimSpace(slug))
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return SiteBuddyIntentsResult{}, apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
		}
		return SiteBuddyIntentsResult{}, apperrors.New(http.StatusInternalServerError, "site_detail_failed", "failed to load dive site", err)
	}
	if s.buddies == nil {
		return SiteBuddyIntentsResult{Site: site}, nil
	}
	result, err := s.buddies.ListMemberIntentsForSite(ctx, buddyfinderservice.SiteIntentsInput{
		ViewerUserID: viewerID,
		SiteID:       site.ID,
		Area:         site.Area,
		Cursor:       cursor,
		Limit:        limit,
	})
	if err != nil {
		return SiteBuddyIntentsResult{}, err
	}
	return SiteBuddyIntentsResult{
		Site:            site,
		Items:           result.Items,
		NextCursor:      result.NextCursor,
		SourceBreakdown: result.SourceBreakdown,
	}, nil
}

func (s *Service) CreateUpdate(ctx context.Context, input CreateUpdateInput) (explorerepo.SiteUpdate, error) {
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return explorerepo.SiteUpdate{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(input.SiteID); err != nil {
		return explorerepo.SiteUpdate{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"siteId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if err := s.enforceRateLimit(ctx, "explore.create_update", input.ActorID, 5, time.Hour, "site update rate exceeded"); err != nil {
		return explorerepo.SiteUpdate{}, err
	}

	site, err := s.repo.GetSiteForWrite(ctx, input.SiteID)
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return explorerepo.SiteUpdate{}, apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
		}
		return explorerepo.SiteUpdate{}, apperrors.New(http.StatusInternalServerError, "site_lookup_failed", "failed to load dive site", err)
	}
	if site.ModerationState != "approved" {
		return explorerepo.SiteUpdate{}, apperrors.New(http.StatusForbidden, "forbidden", "updates are disabled for this site", nil)
	}

	occurredAt := input.OccurredAt.UTC()
	if occurredAt.IsZero() {
		occurredAt = time.Now().UTC()
	}

	update, err := s.repo.CreateUpdate(ctx, explorerepo.CreateUpdateInput{
		SiteID:               input.SiteID,
		AuthorAppUserID:      input.ActorID,
		Note:                 strings.TrimSpace(input.Note),
		ConditionVisibilityM: input.ConditionVisibilityM,
		ConditionCurrent:     trimPtr(input.ConditionCurrent),
		ConditionWaves:       trimPtr(input.ConditionWaves),
		ConditionTempC:       input.ConditionTempC,
		OccurredAt:           occurredAt,
	})
	if err != nil {
		return explorerepo.SiteUpdate{}, apperrors.New(http.StatusInternalServerError, "site_update_failed", "failed to create site update", err)
	}
	return update, nil
}

func (s *Service) SaveSite(ctx context.Context, actorID, siteID string) error {
	if _, err := uuid.Parse(actorID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(siteID); err != nil {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"siteId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if _, err := s.repo.GetSiteForWrite(ctx, siteID); err != nil {
		if explorerepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "site_lookup_failed", "failed to load dive site", err)
	}
	if err := s.repo.SaveSite(ctx, actorID, siteID); err != nil {
		return apperrors.New(http.StatusInternalServerError, "site_save_failed", "failed to save dive site", err)
	}
	return nil
}

func (s *Service) UnsaveSite(ctx context.Context, actorID, siteID string) error {
	if _, err := uuid.Parse(actorID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(siteID); err != nil {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"siteId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if err := s.repo.UnsaveSite(ctx, actorID, siteID); err != nil {
		return apperrors.New(http.StatusInternalServerError, "site_unsave_failed", "failed to unsave dive site", err)
	}
	return nil
}

func (s *Service) enforceRateLimit(ctx context.Context, scope, key string, maxEvents int, window time.Duration, message string) error {
	result, err := s.limiter.Allow(ctx, scope, key, maxEvents, window)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "rate_limit_failed", "failed to enforce rate limit", err)
	}
	if result.Allowed {
		return nil
	}
	retry := int(result.RetryAfter.Seconds())
	if retry < 1 {
		retry = 1
	}
	return apperrors.NewRateLimited(fmt.Sprintf("%s; retry after %ds", message, retry), int(window.Seconds()), retry)
}

func trimPtr(input *string) *string {
	if input == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*input)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func validateSubmissionInput(name, difficulty string, lat, lng, depthMinM, depthMaxM *float64) []validatex.Issue {
	issues := make([]validatex.Issue, 0, 5)
	if name == "" {
		issues = append(issues, validatex.Issue{Path: []any{"name"}, Code: "required", Message: "Required"})
	}
	if difficulty != "easy" && difficulty != "moderate" && difficulty != "hard" {
		issues = append(issues, validatex.Issue{Path: []any{"entryDifficulty"}, Code: "invalid_enum", Message: "Must be one of: easy moderate hard"})
	}
	if lat == nil {
		issues = append(issues, validatex.Issue{Path: []any{"lat"}, Code: "required", Message: "Required"})
	}
	if lng == nil {
		issues = append(issues, validatex.Issue{Path: []any{"lng"}, Code: "required", Message: "Required"})
	}
	if lat != nil && *lat < -90 {
		issues = append(issues, validatex.Issue{Path: []any{"lat"}, Code: "too_small", Message: "Must be between -90 and 90"})
	}
	if lat != nil && *lat > 90 {
		issues = append(issues, validatex.Issue{Path: []any{"lat"}, Code: "too_big", Message: "Must be between -90 and 90"})
	}
	if lng != nil && *lng < -180 {
		issues = append(issues, validatex.Issue{Path: []any{"lng"}, Code: "too_small", Message: "Must be between -180 and 180"})
	}
	if lng != nil && *lng > 180 {
		issues = append(issues, validatex.Issue{Path: []any{"lng"}, Code: "too_big", Message: "Must be between -180 and 180"})
	}
	if depthMinM != nil && depthMaxM != nil && *depthMinM > *depthMaxM {
		issues = append(issues, validatex.Issue{Path: []any{"depthMinM"}, Code: "custom", Message: "depthMinM must be less than or equal to depthMaxM"})
	}
	return issues
}

func cleanStringList(values []string) []string {
	if len(values) == 0 {
		return []string{}
	}
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}

func pendingSlug() string {
	raw := strings.ReplaceAll(uuid.NewString(), "-", "")
	return "pending-" + raw[:12]
}

func slugify(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = slugUnsafePattern.ReplaceAllString(normalized, "-")
	normalized = strings.Trim(normalized, "-")
	if normalized == "" {
		return "dive-site"
	}
	return normalized
}

func (s *Service) generateApprovedSlug(ctx context.Context, name, area string) (string, error) {
	base := slugify(name)
	areaBase := slugify(fmt.Sprintf("%s %s", name, area))
	candidates := []string{base}
	if areaBase != base {
		candidates = append(candidates, areaBase)
	}
	for _, candidate := range candidates {
		exists, err := s.repo.SlugExists(ctx, candidate)
		if err != nil {
			return "", err
		}
		if !exists {
			return candidate, nil
		}
	}
	for i := 2; i <= 50; i++ {
		candidate := fmt.Sprintf("%s-%d", base, i)
		exists, err := s.repo.SlugExists(ctx, candidate)
		if err != nil {
			return "", err
		}
		if !exists {
			return candidate, nil
		}
	}
	return fmt.Sprintf("%s-%s", base, strings.ReplaceAll(uuid.NewString(), "-", "")[:8]), nil
}

func (s *Service) moderateSite(ctx context.Context, input ModerateSiteInput, approve bool) (explorerepo.SiteSubmission, error) {
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return explorerepo.SiteSubmission{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(input.SiteID); err != nil {
		return explorerepo.SiteSubmission{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"id"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	site, err := s.repo.GetSiteByIDForModeration(ctx, input.SiteID)
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return explorerepo.SiteSubmission{}, apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
		}
		return explorerepo.SiteSubmission{}, apperrors.New(http.StatusInternalServerError, "site_detail_failed", "failed to load dive site", err)
	}
	if site.ModerationState != "pending" {
		return explorerepo.SiteSubmission{}, apperrors.New(http.StatusConflict, "invalid_state", "site is not pending review", nil)
	}
	reason := trimPtr(input.Reason)
	reviewedAt := time.Now().UTC()
	if approve {
		slug, slugErr := s.generateApprovedSlug(ctx, site.Name, site.Area)
		if slugErr != nil {
			return explorerepo.SiteSubmission{}, apperrors.New(http.StatusInternalServerError, "slug_generation_failed", "failed to generate site slug", slugErr)
		}
		item, approveErr := s.repo.ApproveSite(ctx, input.SiteID, slug, input.ActorID, reviewedAt, reason)
		if approveErr != nil {
			return explorerepo.SiteSubmission{}, apperrors.New(http.StatusInternalServerError, "site_approve_failed", "failed to approve dive site", approveErr)
		}
		item.SubmittedByDisplayName = site.SubmittedByDisplayName
		return item, nil
	}
	item, rejectErr := s.repo.RejectOrHideSite(ctx, input.SiteID, input.ActorID, reviewedAt, reason)
	if rejectErr != nil {
		return explorerepo.SiteSubmission{}, apperrors.New(http.StatusInternalServerError, "site_reject_failed", "failed to reject dive site", rejectErr)
	}
	item.SubmittedByDisplayName = site.SubmittedByDisplayName
	return item, nil
}
