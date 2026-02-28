package service

import (
	"context"
	"fmt"
	"net/http"
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
	repo    repository
	buddies buddyMatcher
	limiter rateLimiter
}

type repository interface {
	ListSites(ctx context.Context, input explorerepo.ListSitesInput) ([]explorerepo.SiteCard, error)
	GetSiteBySlug(ctx context.Context, slug string) (explorerepo.SiteDetail, error)
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

type noopLimiter struct{}

func (noopLimiter) Allow(context.Context, string, string, int, time.Duration) (sharedratelimit.Result, error) {
	return sharedratelimit.Result{Allowed: true}, nil
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

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (e ValidationFailure) Error() string { return "validation failed" }

func New(repo repository, opts ...Option) *Service {
	svc := &Service{repo: repo, limiter: noopLimiter{}}
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
