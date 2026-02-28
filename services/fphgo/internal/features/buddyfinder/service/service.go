package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	buddyfinderrepo "fphgo/internal/features/buddyfinder/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/pagination"
	sharedratelimit "fphgo/internal/shared/ratelimit"
	"fphgo/internal/shared/validatex"
)

type Service struct {
	repo     repository
	blocks   blockChecker
	limiter  rateLimiter
	siteRepo siteLookup
}

type repository interface {
	CountPreviewByArea(ctx context.Context, area string) (int64, error)
	ListPreviewByArea(ctx context.Context, area string, limit int32) ([]buddyfinderrepo.PreviewIntent, error)
	ListPreviewBySite(ctx context.Context, diveSiteID string, limit int32) ([]buddyfinderrepo.PreviewIntent, error)
	ListMemberIntentsByArea(ctx context.Context, input buddyfinderrepo.ListMemberIntentsInput) ([]buddyfinderrepo.MemberIntent, error)
	ListMemberIntentsBySite(ctx context.Context, input buddyfinderrepo.ListSiteIntentsInput) ([]buddyfinderrepo.MemberIntent, error)
	GetIntentByID(ctx context.Context, intentID string) (buddyfinderrepo.Intent, error)
	GetSharePreviewByID(ctx context.Context, intentID string) (buddyfinderrepo.SharePreview, error)
	CreateIntent(ctx context.Context, input buddyfinderrepo.CreateIntentInput) (buddyfinderrepo.Intent, error)
	DeleteIntentByOwner(ctx context.Context, intentID, authorAppUserID string) (int64, error)
}

type siteLookup interface {
	GetSiteForWrite(ctx context.Context, siteID string) (SiteRecord, error)
}

type SiteRecord struct {
	ID              string
	Area            string
	ModerationState string
}

type blockChecker interface {
	IsBlockedEitherDirection(ctx context.Context, a, b string) (bool, error)
}

type rateLimiter interface {
	Allow(ctx context.Context, scope, key string, maxEvents int, window time.Duration) (sharedratelimit.Result, error)
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

func WithBlocks(blocks blockChecker) Option {
	return func(s *Service) {
		if blocks != nil {
			s.blocks = blocks
		}
	}
}

func WithSiteLookup(repo siteLookup) Option {
	return func(s *Service) {
		if repo != nil {
			s.siteRepo = repo
		}
	}
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (e ValidationFailure) Error() string { return "validation failed" }

type PreviewResult struct {
	Area  string
	Count int64
	Items []buddyfinderrepo.PreviewIntent
}

type SitePreviewResult struct {
	Items           []buddyfinderrepo.PreviewIntent
	SourceBreakdown SourceBreakdown
}

type SourceBreakdown struct {
	SiteLinkedCount   int `json:"siteLinkedCount"`
	AreaFallbackCount int `json:"areaFallbackCount"`
}

type ListMemberIntentsInput struct {
	ViewerUserID string
	Area         string
	IntentType   string
	TimeWindow   string
	Cursor       string
	Limit        int32
}

type ListMemberIntentsResult struct {
	Items      []buddyfinderrepo.MemberIntent
	NextCursor string
}

type SiteIntentsInput struct {
	ViewerUserID string
	SiteID       string
	Area         string
	Cursor       string
	Limit        int32
}

type SiteIntentsResult struct {
	Items           []buddyfinderrepo.MemberIntent
	NextCursor      string
	SourceBreakdown SourceBreakdown
}

type CreateIntentInput struct {
	ActorID    string
	DiveSiteID *string
	Area       string
	IntentType string
	TimeWindow string
	DateStart  *time.Time
	DateEnd    *time.Time
	Note       *string
}

type MessageEntryResult struct {
	IntentID        string
	RecipientUserID string
	RequiresRequest bool
}

type SharePreviewResult struct {
	Intent buddyfinderrepo.SharePreview
}

func New(repo repository, opts ...Option) *Service {
	svc := &Service{repo: repo, limiter: noopLimiter{}}
	for _, opt := range opts {
		if opt != nil {
			opt(svc)
		}
	}
	return svc
}

func (s *Service) Preview(ctx context.Context, area string) (PreviewResult, error) {
	trimmedArea := strings.TrimSpace(area)
	count, err := s.repo.CountPreviewByArea(ctx, trimmedArea)
	if err != nil {
		return PreviewResult{}, apperrors.New(http.StatusInternalServerError, "buddy_preview_failed", "failed to count buddy intents", err)
	}
	items, err := s.repo.ListPreviewByArea(ctx, trimmedArea, 6)
	if err != nil {
		return PreviewResult{}, apperrors.New(http.StatusInternalServerError, "buddy_preview_failed", "failed to list buddy preview", err)
	}
	return PreviewResult{Area: trimmedArea, Count: count, Items: items}, nil
}

func (s *Service) GetSharePreview(ctx context.Context, intentID string) (SharePreviewResult, error) {
	if _, err := uuid.Parse(intentID); err != nil {
		return SharePreviewResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"id"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	intent, err := s.repo.GetSharePreviewByID(ctx, intentID)
	if err != nil {
		return SharePreviewResult{}, apperrors.New(http.StatusNotFound, "buddy_intent_not_found", "buddy intent not found", err)
	}
	return SharePreviewResult{Intent: intent}, nil
}

func (s *Service) PreviewForSite(ctx context.Context, siteID, area string, limit int32) (SitePreviewResult, error) {
	if _, err := uuid.Parse(siteID); err != nil {
		return SitePreviewResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"siteId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if limit <= 0 || limit > 12 {
		limit = 6
	}

	siteLinked, err := s.repo.ListPreviewBySite(ctx, siteID, limit)
	if err != nil {
		return SitePreviewResult{}, apperrors.New(http.StatusInternalServerError, "buddy_preview_failed", "failed to load site-linked buddy preview", err)
	}
	items := make([]buddyfinderrepo.PreviewIntent, 0, limit)
	items = append(items, siteLinked...)
	breakdown := SourceBreakdown{SiteLinkedCount: len(siteLinked)}
	if int32(len(items)) < limit {
		fallback, fillCounts, fillErr := s.fillPreviewAreaFallback(ctx, area, siteID, limit-int32(len(items)), items)
		if fillErr != nil {
			return SitePreviewResult{}, fillErr
		}
		items = append(items, fallback...)
		breakdown.AreaFallbackCount = fillCounts
	}
	if int32(len(items)) > limit {
		items = items[:limit]
	}
	return SitePreviewResult{Items: items, SourceBreakdown: breakdown}, nil
}

func (s *Service) ListMemberIntents(ctx context.Context, input ListMemberIntentsInput) (ListMemberIntentsResult, error) {
	if _, err := uuid.Parse(input.ViewerUserID); err != nil {
		return ListMemberIntentsResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	limit := input.Limit
	if limit <= 0 || limit > pagination.MaxLimit {
		limit = pagination.DefaultLimit
	}
	cursorCreated, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(input.Cursor) != "" {
		createdAt, tieID, err := pagination.DecodeUUID(input.Cursor)
		if err != nil {
			return ListMemberIntentsResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"cursor"},
				Code:    "custom",
				Message: "invalid cursor",
			}}}
		}
		cursorCreated = createdAt
		cursorID = tieID
	}
	items, err := s.repo.ListMemberIntentsByArea(ctx, buddyfinderrepo.ListMemberIntentsInput{
		ViewerUserID:    input.ViewerUserID,
		Area:            strings.TrimSpace(input.Area),
		IntentType:      strings.TrimSpace(input.IntentType),
		TimeWindow:      strings.TrimSpace(input.TimeWindow),
		CursorCreatedAt: cursorCreated,
		CursorID:        cursorID,
		Limit:           limit + 1,
	})
	if err != nil {
		return ListMemberIntentsResult{}, apperrors.New(http.StatusInternalServerError, "buddy_list_failed", "failed to list buddy intents", err)
	}

	nextCursor := ""
	if int32(len(items)) > limit {
		next := items[limit-1]
		nextCursor = pagination.Encode(next.CreatedAt, next.ID)
		items = items[:limit]
	}
	return ListMemberIntentsResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) ListMemberIntentsForSite(ctx context.Context, input SiteIntentsInput) (SiteIntentsResult, error) {
	if _, err := uuid.Parse(input.ViewerUserID); err != nil {
		return SiteIntentsResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(input.SiteID); err != nil {
		return SiteIntentsResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"siteId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}

	limit := input.Limit
	if limit <= 0 || limit > pagination.MaxLimit {
		limit = pagination.DefaultLimit
	}

	cursorState, err := decodeSiteCursor(input.Cursor)
	if err != nil {
		return SiteIntentsResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"cursor"},
			Code:    "custom",
			Message: "invalid cursor",
		}}}
	}

	if cursorState.Phase == "" {
		cursorState.Phase = siteCursorPhaseLinked
	}

	items := make([]buddyfinderrepo.MemberIntent, 0, limit)
	breakdown := SourceBreakdown{}

	if cursorState.Phase == siteCursorPhaseLinked {
		siteItems, siteHasMore, siteErr := s.listSiteLinkedPage(ctx, input, cursorState.SiteCursor, limit)
		if siteErr != nil {
			return SiteIntentsResult{}, siteErr
		}
		if int32(len(siteItems)) >= limit {
			next := encodeSiteCursor(siteListCursor{
				Phase:      siteCursorPhaseLinked,
				SiteCursor: pagination.Encode(siteItems[len(siteItems)-1].CreatedAt, siteItems[len(siteItems)-1].ID),
			})
			return SiteIntentsResult{
				Items:           siteItems[:limit],
				NextCursor:      next,
				SourceBreakdown: SourceBreakdown{SiteLinkedCount: len(siteItems[:limit])},
			}, nil
		}
		items = append(items, siteItems...)
		breakdown.SiteLinkedCount = len(siteItems)
		if siteHasMore {
			next := encodeSiteCursor(siteListCursor{
				Phase:      siteCursorPhaseLinked,
				SiteCursor: pagination.Encode(siteItems[len(siteItems)-1].CreatedAt, siteItems[len(siteItems)-1].ID),
			})
			return SiteIntentsResult{Items: items, NextCursor: next, SourceBreakdown: breakdown}, nil
		}
		cursorState.Phase = siteCursorPhaseArea
	}

	areaItems, areaNextCursor, areaErr := s.listAreaFallbackPage(ctx, input, cursorState.AreaCursor, limit-int32(len(items)), items)
	if areaErr != nil {
		return SiteIntentsResult{}, areaErr
	}
	items = append(items, areaItems...)
	breakdown.AreaFallbackCount = len(areaItems)

	nextCursor := ""
	if areaNextCursor != "" {
		nextCursor = encodeSiteCursor(siteListCursor{
			Phase:      siteCursorPhaseArea,
			AreaCursor: areaNextCursor,
		})
	}
	return SiteIntentsResult{Items: items, NextCursor: nextCursor, SourceBreakdown: breakdown}, nil
}

func (s *Service) CreateIntent(ctx context.Context, input CreateIntentInput) (buddyfinderrepo.Intent, error) {
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return buddyfinderrepo.Intent{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if err := s.enforceRateLimit(ctx, "buddyfinder.create_intent", input.ActorID, 3, 24*time.Hour, "buddy intent cooldown active"); err != nil {
		return buddyfinderrepo.Intent{}, err
	}

	area := strings.TrimSpace(input.Area)
	intentType := strings.TrimSpace(input.IntentType)
	timeWindow := strings.TrimSpace(input.TimeWindow)
	siteID := ""
	if input.DiveSiteID != nil && strings.TrimSpace(*input.DiveSiteID) != "" {
		if _, err := uuid.Parse(strings.TrimSpace(*input.DiveSiteID)); err != nil {
			return buddyfinderrepo.Intent{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"diveSiteId"},
				Code:    "invalid_uuid",
				Message: "Must be a valid UUID",
			}}}
		}
		if s.siteRepo == nil {
			return buddyfinderrepo.Intent{}, apperrors.New(http.StatusInternalServerError, "site_lookup_failed", "site lookup is not configured", nil)
		}
		siteID = strings.TrimSpace(*input.DiveSiteID)
		site, err := s.siteRepo.GetSiteForWrite(ctx, siteID)
		if err != nil {
			return buddyfinderrepo.Intent{}, apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
		}
		if site.ModerationState != "" && site.ModerationState != "approved" {
			return buddyfinderrepo.Intent{}, apperrors.New(http.StatusForbidden, "forbidden", "linked dive site is not available", nil)
		}
		if area == "" {
			area = site.Area
		} else if area != site.Area {
			return buddyfinderrepo.Intent{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"area"},
				Code:    "custom",
				Message: "area must match the linked dive site area",
			}}}
		}
	}
	if area == "" {
		return buddyfinderrepo.Intent{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"area"},
			Code:    "required",
			Message: "area is required",
		}}}
	}
	if input.DateStart != nil && input.DateEnd != nil && input.DateEnd.Before(*input.DateStart) {
		return buddyfinderrepo.Intent{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"dateEnd"},
			Code:    "custom",
			Message: "dateEnd must be on or after dateStart",
		}}}
	}

	expiresAt := time.Now().UTC().Add(72 * time.Hour)
	if input.DateEnd != nil && !input.DateEnd.IsZero() {
		expiresAt = time.Date(input.DateEnd.Year(), input.DateEnd.Month(), input.DateEnd.Day(), 23, 59, 59, 0, time.UTC)
	}

	intent, err := s.repo.CreateIntent(ctx, buddyfinderrepo.CreateIntentInput{
		AuthorAppUserID: input.ActorID,
		DiveSiteID:      siteID,
		Area:            area,
		IntentType:      intentType,
		TimeWindow:      timeWindow,
		DateStart:       input.DateStart,
		DateEnd:         input.DateEnd,
		Note:            trimPtr(input.Note),
		ExpiresAt:       expiresAt,
	})
	if err != nil {
		return buddyfinderrepo.Intent{}, apperrors.New(http.StatusInternalServerError, "buddy_create_failed", "failed to create buddy intent", err)
	}
	return intent, nil
}

const (
	siteCursorPhaseLinked = "site"
	siteCursorPhaseArea   = "area"
)

type siteListCursor struct {
	Phase      string `json:"phase"`
	SiteCursor string `json:"siteCursor,omitempty"`
	AreaCursor string `json:"areaCursor,omitempty"`
}

func (s *Service) fillPreviewAreaFallback(ctx context.Context, area, siteID string, remaining int32, existing []buddyfinderrepo.PreviewIntent) ([]buddyfinderrepo.PreviewIntent, int, error) {
	if remaining <= 0 {
		return nil, 0, nil
	}
	fallback, err := s.repo.ListPreviewByArea(ctx, strings.TrimSpace(area), maxInt32(remaining*3, remaining))
	if err != nil {
		return nil, 0, apperrors.New(http.StatusInternalServerError, "buddy_preview_failed", "failed to load area buddy preview", err)
	}
	seen := make(map[string]struct{}, len(existing))
	for _, item := range existing {
		seen[item.ID] = struct{}{}
	}
	items := make([]buddyfinderrepo.PreviewIntent, 0, remaining)
	for _, item := range fallback {
		if item.ID == "" || item.DiveSiteID == siteID {
			continue
		}
		if _, exists := seen[item.ID]; exists {
			continue
		}
		seen[item.ID] = struct{}{}
		items = append(items, item)
		if int32(len(items)) == remaining {
			break
		}
	}
	return items, len(items), nil
}

func (s *Service) listSiteLinkedPage(ctx context.Context, input SiteIntentsInput, cursor string, limit int32) ([]buddyfinderrepo.MemberIntent, bool, error) {
	cursorCreated, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(cursor) != "" {
		createdAt, tieID, err := pagination.DecodeUUID(cursor)
		if err != nil {
			return nil, false, err
		}
		cursorCreated = createdAt
		cursorID = tieID
	}
	items, err := s.repo.ListMemberIntentsBySite(ctx, buddyfinderrepo.ListSiteIntentsInput{
		ViewerUserID:    input.ViewerUserID,
		DiveSiteID:      input.SiteID,
		CursorCreatedAt: cursorCreated,
		CursorID:        cursorID,
		Limit:           limit + 1,
	})
	if err != nil {
		return nil, false, apperrors.New(http.StatusInternalServerError, "buddy_list_failed", "failed to list site-linked buddy intents", err)
	}
	hasMore := int32(len(items)) > limit
	if hasMore {
		items = items[:limit]
	}
	return items, hasMore, nil
}

func (s *Service) listAreaFallbackPage(ctx context.Context, input SiteIntentsInput, cursor string, remaining int32, existing []buddyfinderrepo.MemberIntent) ([]buddyfinderrepo.MemberIntent, string, error) {
	if remaining <= 0 {
		return nil, "", nil
	}
	cursorCreated, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(cursor) != "" {
		createdAt, tieID, err := pagination.DecodeUUID(cursor)
		if err != nil {
			return nil, "", err
		}
		cursorCreated = createdAt
		cursorID = tieID
	}
	rows, err := s.repo.ListMemberIntentsByArea(ctx, buddyfinderrepo.ListMemberIntentsInput{
		ViewerUserID:    input.ViewerUserID,
		Area:            strings.TrimSpace(input.Area),
		CursorCreatedAt: cursorCreated,
		CursorID:        cursorID,
		Limit:           maxInt32(remaining*3, remaining+1),
	})
	if err != nil {
		return nil, "", apperrors.New(http.StatusInternalServerError, "buddy_list_failed", "failed to list area buddy intents", err)
	}
	seen := make(map[string]struct{}, len(existing))
	for _, item := range existing {
		seen[item.ID] = struct{}{}
	}
	items := make([]buddyfinderrepo.MemberIntent, 0, remaining)
	nextCursor := ""
	for _, row := range rows {
		if row.ID == "" || row.DiveSiteID == input.SiteID {
			continue
		}
		if _, exists := seen[row.ID]; exists {
			continue
		}
		seen[row.ID] = struct{}{}
		items = append(items, row)
		if int32(len(items)) == remaining {
			nextCursor = pagination.Encode(row.CreatedAt, row.ID)
			break
		}
	}
	if int32(len(items)) < remaining {
		nextCursor = ""
	}
	return items, nextCursor, nil
}

func decodeSiteCursor(raw string) (siteListCursor, error) {
	if strings.TrimSpace(raw) == "" {
		return siteListCursor{Phase: siteCursorPhaseLinked}, nil
	}
	decoded, err := base64.RawURLEncoding.DecodeString(strings.TrimSpace(raw))
	if err != nil {
		return siteListCursor{}, err
	}
	var cursor siteListCursor
	if err := json.Unmarshal(decoded, &cursor); err != nil {
		return siteListCursor{}, err
	}
	if cursor.Phase != siteCursorPhaseLinked && cursor.Phase != siteCursorPhaseArea {
		return siteListCursor{}, fmt.Errorf("invalid phase")
	}
	return cursor, nil
}

func encodeSiteCursor(cursor siteListCursor) string {
	payload, err := json.Marshal(cursor)
	if err != nil {
		return ""
	}
	return base64.RawURLEncoding.EncodeToString(payload)
}

func maxInt32(a, b int32) int32 {
	if a > b {
		return a
	}
	return b
}

func (s *Service) DeleteIntent(ctx context.Context, actorID, intentID string) error {
	if _, err := uuid.Parse(actorID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(intentID); err != nil {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"id"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}

	rows, err := s.repo.DeleteIntentByOwner(ctx, intentID, actorID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "buddy_delete_failed", "failed to delete buddy intent", err)
	}
	if rows == 0 {
		return apperrors.New(http.StatusNotFound, "intent_not_found", "buddy intent not found", nil)
	}
	return nil
}

func (s *Service) MessageEntry(ctx context.Context, actorID, intentID string) (MessageEntryResult, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return MessageEntryResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(intentID); err != nil {
		return MessageEntryResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"id"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	intent, err := s.repo.GetIntentByID(ctx, intentID)
	if err != nil {
		if buddyfinderrepo.IsNoRows(err) {
			return MessageEntryResult{}, apperrors.New(http.StatusNotFound, "intent_not_found", "buddy intent not found", err)
		}
		return MessageEntryResult{}, apperrors.New(http.StatusInternalServerError, "buddy_message_entry_failed", "failed to load buddy intent", err)
	}
	if intent.State != "active" || !intent.ExpiresAt.After(time.Now().UTC()) {
		return MessageEntryResult{}, apperrors.New(http.StatusConflict, "intent_inactive", "buddy intent is no longer active", nil)
	}
	if actorID == intent.AuthorAppUserID {
		return MessageEntryResult{}, apperrors.New(http.StatusBadRequest, "invalid_target", "cannot message your own intent", nil)
	}
	if s.blocks != nil {
		blocked, blockErr := s.blocks.IsBlockedEitherDirection(ctx, actorID, intent.AuthorAppUserID)
		if blockErr != nil {
			return MessageEntryResult{}, apperrors.New(http.StatusInternalServerError, "block_check_failed", "failed to validate block state", blockErr)
		}
		if blocked {
			return MessageEntryResult{}, apperrors.New(http.StatusForbidden, "blocked", "messaging is blocked between users", nil)
		}
	}
	key := actorID + ":" + intent.AuthorAppUserID
	if err := s.enforceRateLimit(ctx, "buddyfinder.message_entry", key, 1, 2*time.Minute, "message initiation cooldown active"); err != nil {
		return MessageEntryResult{}, err
	}
	return MessageEntryResult{
		IntentID:        intent.ID,
		RecipientUserID: intent.AuthorAppUserID,
		RequiresRequest: true,
	}, nil
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
