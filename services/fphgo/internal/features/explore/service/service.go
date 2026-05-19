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
	feedservice "fphgo/internal/features/feed/service"
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
	activity activityPublisher
	feed     activityFeed
}

type repository interface {
	ListSites(ctx context.Context, input explorerepo.ListSitesInput) ([]explorerepo.SiteCard, error)
	GetSiteBySlug(ctx context.Context, slug, viewerUserID string) (explorerepo.SiteDetail, error)
	FindApprovedSiteDuplicate(ctx context.Context, name, area string) (string, error)
	SlugExists(ctx context.Context, slug string) (bool, error)
	CreateSiteSubmission(ctx context.Context, input explorerepo.CreateSiteSubmissionInput) (explorerepo.SiteSubmission, error)
	ListMySiteSubmissions(ctx context.Context, input explorerepo.ListSiteSubmissionsInput) ([]explorerepo.SiteSubmission, error)
	GetMySiteSubmissionByID(ctx context.Context, id, submittedByAppUserID string) (explorerepo.SiteSubmission, error)
	ListPendingSites(ctx context.Context, input explorerepo.ListPendingSitesInput) ([]explorerepo.SiteSubmission, error)
	GetSiteByIDForModeration(ctx context.Context, id string) (explorerepo.SiteSubmission, error)
	ApproveSite(ctx context.Context, id, slug, reviewedByAppUserID string, reviewedAt time.Time, moderationReason *string) (explorerepo.SiteSubmission, error)
	RejectOrHideSite(ctx context.Context, id, reviewedByAppUserID string, reviewedAt time.Time, moderationReason *string) (explorerepo.SiteSubmission, error)
	CreateSiteEditProposal(ctx context.Context, input explorerepo.CreateSiteEditProposalInput) (explorerepo.SiteEditProposal, error)
	CreateAndApplySiteEditProposal(ctx context.Context, input explorerepo.CreateSiteEditProposalInput, reviewedByAppUserID string, reviewedAt time.Time, moderationReason *string) (explorerepo.SiteEditProposal, error)
	ListMySiteEditProposals(ctx context.Context, input explorerepo.ListSiteEditProposalsInput) ([]explorerepo.SiteEditProposal, error)
	GetMySiteEditProposalByID(ctx context.Context, id, submittedByAppUserID string) (explorerepo.SiteEditProposal, error)
	ListPendingSiteEditProposals(ctx context.Context, input explorerepo.ListPendingSiteEditProposalsInput) ([]explorerepo.SiteEditProposal, error)
	GetSiteEditProposalForModeration(ctx context.Context, id string) (explorerepo.SiteEditProposal, error)
	ApplySiteEditProposal(ctx context.Context, id, reviewedByAppUserID string, reviewedAt time.Time, moderationReason *string) (explorerepo.SiteEditProposal, error)
	RejectSiteEditProposal(ctx context.Context, id, reviewedByAppUserID string, reviewedAt time.Time, moderationReason *string) (explorerepo.SiteEditProposal, error)
	ListUpdatesForSite(ctx context.Context, input explorerepo.ListUpdatesInput) ([]explorerepo.SiteUpdate, error)
	ListLatestUpdates(ctx context.Context, area string, cursorOccurredAt time.Time, cursorID string, limit int32) ([]explorerepo.LatestUpdate, error)
	CreateUpdate(ctx context.Context, input explorerepo.CreateUpdateInput) (explorerepo.SiteUpdate, error)
	GetSiteForWrite(ctx context.Context, siteID string) (explorerepo.SiteSummary, error)
	SaveSite(ctx context.Context, appUserID, siteID string) error
	UnsaveSite(ctx context.Context, appUserID, siteID string) error
	GetVisibleDiveSiteLikeState(ctx context.Context, siteID, viewerUserID string) (explorerepo.LikeState, error)
	LikeDiveSite(ctx context.Context, siteID, userID string) error
	UnlikeDiveSite(ctx context.Context, siteID, userID string) error
	CreateDivePresence(ctx context.Context, input explorerepo.CreateDivePresenceInput) (explorerepo.DivePresence, error)
	UpdateDivePresenceByOwner(ctx context.Context, presenceID string, input explorerepo.CreateDivePresenceInput) (explorerepo.DivePresence, error)
	CancelDivePresenceByOwner(ctx context.Context, presenceID, userID, siteID string) (int64, error)
	ExpirePastDivePresences(ctx context.Context) error
	CountActiveDivePresencesByUser(ctx context.Context, userID string) (int64, error)
	ListCurrentUserDivePresences(ctx context.Context, userID string) ([]explorerepo.VisibleDivePresence, error)
	ListVisibleDivePresencesGlobal(ctx context.Context, input explorerepo.GlobalDivePresenceInput) ([]explorerepo.VisibleDivePresence, error)
	ListVisibleDivePresencesBySite(ctx context.Context, viewerUserID, siteID string, limit int32) ([]explorerepo.VisibleDivePresence, error)
	CountVisibleDivePresencesBySite(ctx context.Context, viewerUserID, siteID string) (int64, error)
	UpsertDiveSiteAffinity(ctx context.Context, input explorerepo.UpsertDiveSiteAffinityInput) (explorerepo.DiveSiteAffinity, error)
	UpdateDiveSiteAffinityByOwner(ctx context.Context, affinityID string, input explorerepo.UpsertDiveSiteAffinityInput) (explorerepo.DiveSiteAffinity, error)
	DeleteDiveSiteAffinityByOwner(ctx context.Context, affinityID, userID, siteID string) (int64, error)
	ListCurrentUserDiveSiteAffinities(ctx context.Context, userID string) ([]explorerepo.DiveSiteAffinity, error)
	ListVisibleDiveSiteAffinitiesBySite(ctx context.Context, viewerUserID, siteID string, limit int32) ([]explorerepo.VisibleDiveSiteAffinity, error)
	CountVisibleDiveSiteAffinitiesBySite(ctx context.Context, viewerUserID, siteID string) (int64, error)
	UpsertDiveSiteReview(ctx context.Context, input explorerepo.UpsertDiveSiteReviewInput) (explorerepo.DiveSiteReview, error)
	ListVisibleDiveSiteReviewsBySite(ctx context.Context, viewerUserID, siteID string, limit int32) ([]explorerepo.VisibleDiveSiteReview, error)
	CountVisibleDiveSiteReviewsBySite(ctx context.Context, viewerUserID, siteID string) (int64, error)
	GetVisibleDiveSiteReviewSummaryBySite(ctx context.Context, viewerUserID, siteID string) (explorerepo.DiveSiteReviewSummary, error)
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

type activityPublisher interface {
	PublishActivity(ctx context.Context, input feedservice.ActivityPublishInput) error
}

type activityFeed interface {
	Activity(ctx context.Context, input feedservice.ActivityInput) (feedservice.ActivityResult, error)
	CountActivity(ctx context.Context, input feedservice.ActivityInput) (int64, error)
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

func WithActivityPublisher(publisher activityPublisher) Option {
	return func(s *Service) {
		s.activity = publisher
	}
}

func WithActivityFeed(feed activityFeed) Option {
	return func(s *Service) {
		s.feed = feed
	}
}

type ListSitesInput struct {
	ViewerUserID string
	Area         string
	Difficulty   string
	VerifiedOnly bool
	SavedOnly    bool
	Search       string
	Bounds       *MapBounds
	Cursor       string
	Limit        int32
}

type MapBounds struct {
	North float64
	South float64
	East  float64
	West  float64
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

type LikeStateResult struct {
	TargetID       string
	LikeCount      int64
	ViewerHasLiked bool
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

type SiteRelatedCounts struct {
	AvailableBuddies int64
	LocalRegulars    int64
	CommunityPosts   int64
	Reviews          int64
	AverageRating    float64
	RecentConditions int64
}

type SiteRelatedPreviews struct {
	AvailableBuddies []explorerepo.VisibleDivePresence
	LocalRegulars    []explorerepo.VisibleDiveSiteAffinity
	CommunityPosts   []feedservice.ActivityItem
	Reviews          []explorerepo.VisibleDiveSiteReview
}

type SiteRelatedResult struct {
	Site     explorerepo.SiteDetail
	Counts   SiteRelatedCounts
	Previews SiteRelatedPreviews
}

type SiteCommunityPostsResult struct {
	Site       explorerepo.SiteDetail
	Items      []feedservice.ActivityItem
	NextCursor string
}

type SiteDivePresencesResult struct {
	Site  explorerepo.SiteDetail
	Items []explorerepo.VisibleDivePresence
}

type GlobalDivePresencesInput struct {
	ViewerID     string
	SiteSlug     string
	Area         string
	PresenceType string
	FlexibleOnly bool
	DateFrom     time.Time
	DateTo       time.Time
	Limit        int32
}

type GlobalDivePresencesResult struct {
	Items []explorerepo.VisibleDivePresence
}

type CurrentUserDivePresencesResult struct {
	Items []explorerepo.VisibleDivePresence
}

type SiteDiveAffinitiesResult struct {
	Site  explorerepo.SiteDetail
	Items []explorerepo.VisibleDiveSiteAffinity
}

type CurrentUserDiveAffinitiesResult struct {
	Items []explorerepo.DiveSiteAffinity
}

type SiteDiveReviewsResult struct {
	Site          explorerepo.SiteDetail
	Items         []explorerepo.VisibleDiveSiteReview
	AverageRating float64
	ReviewCount   int64
}

type DivePresenceInput struct {
	ActorID        string
	Slug           string
	PresenceID     string
	PresenceType   string
	StartAt        *time.Time
	EndAt          *time.Time
	Visibility     string
	ContactEnabled bool
	Note           *string
}

type DiveSiteAffinityInput struct {
	ActorID        string
	Slug           string
	AffinityID     string
	Relationship   string
	Visibility     string
	ContactEnabled bool
	Note           *string
}

type DiveSiteReviewInput struct {
	ActorID    string
	Slug       string
	Rating     int32
	Comment    *string
	Visibility string
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
	Description       string
	Difficulty        string
	DepthMinM         *float64
	DepthMaxM         *float64
	Hazards           []string
	BestSeason        *string
	TypicalConditions *string
	Access            *string
	Fees              *string
}

type CreateSiteEditProposalInput struct {
	ActorID           string
	ActorRole         string
	Slug              string
	Name              string
	Description       string
	Difficulty        string
	DepthMinM         *float64
	DepthMaxM         *float64
	Hazards           []string
	BestSeason        *string
	TypicalConditions *string
	Access            *string
	Fees              *string
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

type SiteEditProposalListResult struct {
	Items      []explorerepo.SiteEditProposal
	NextCursor string
}

type CreateSiteEditProposalResult struct {
	Proposal           explorerepo.SiteEditProposal
	AppliedImmediately bool
}

type ModerateSiteInput struct {
	ActorID string
	SiteID  string
	Reason  *string
}

type ModerateSiteEditProposalInput struct {
	ActorID    string
	ProposalID string
	Reason     *string
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
	if input.SavedOnly && strings.TrimSpace(input.ViewerUserID) == "" {
		return ListSitesResult{}, apperrors.New(http.StatusUnauthorized, "authentication_required", "sign in to view saved dive spots", nil)
	}
	if issues := validateMapBounds(input.Bounds); len(issues) > 0 {
		return ListSitesResult{}, ValidationFailure{Issues: issues}
	}

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
		SavedOnly:       input.SavedOnly,
		Search:          strings.TrimSpace(input.Search),
		Bounds:          repoBounds(input.Bounds),
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

func repoBounds(bounds *MapBounds) *explorerepo.MapBounds {
	if bounds == nil {
		return nil
	}
	return &explorerepo.MapBounds{
		North: bounds.North,
		South: bounds.South,
		East:  bounds.East,
		West:  bounds.West,
	}
}

func validateMapBounds(bounds *MapBounds) []validatex.Issue {
	if bounds == nil {
		return nil
	}
	issues := make([]validatex.Issue, 0, 4)
	if bounds.North < -90 || bounds.North > 90 {
		issues = append(issues, validatex.Issue{Path: []any{"north"}, Code: "custom", Message: "north must be between -90 and 90"})
	}
	if bounds.South < -90 || bounds.South > 90 {
		issues = append(issues, validatex.Issue{Path: []any{"south"}, Code: "custom", Message: "south must be between -90 and 90"})
	}
	if bounds.East < -180 || bounds.East > 180 {
		issues = append(issues, validatex.Issue{Path: []any{"east"}, Code: "custom", Message: "east must be between -180 and 180"})
	}
	if bounds.West < -180 || bounds.West > 180 {
		issues = append(issues, validatex.Issue{Path: []any{"west"}, Code: "custom", Message: "west must be between -180 and 180"})
	}
	if bounds.North < bounds.South {
		issues = append(issues, validatex.Issue{Path: []any{"bounds"}, Code: "custom", Message: "north must be greater than or equal to south"})
	}
	if bounds.West > bounds.East {
		issues = append(issues, validatex.Issue{Path: []any{"bounds"}, Code: "custom", Message: "antimeridian-crossing bounds are not supported"})
	}
	return issues
}

func (s *Service) GetSiteBySlug(ctx context.Context, viewerID, slug, updatesCursor string, updatesLimit int32) (SiteDetailResult, error) {
	site, err := s.repo.GetSiteBySlug(ctx, strings.TrimSpace(slug), strings.TrimSpace(viewerID))
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
	description := strings.TrimSpace(input.Description)
	difficulty := strings.TrimSpace(input.Difficulty)
	issues := validateSubmissionInput(name, description, difficulty, input.Lat, input.Lng, input.DepthMinM, input.DepthMaxM)
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
		Description:          description,
		Difficulty:           difficulty,
		DepthMinM:            input.DepthMinM,
		DepthMaxM:            input.DepthMaxM,
		Hazards:              cleanStringList(input.Hazards),
		BestSeason:           trimPtr(input.BestSeason),
		TypicalConditions:    trimPtr(input.TypicalConditions),
		Access:               trimPtr(input.Access),
		Fees:                 trimPtr(input.Fees),
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

func (s *Service) CreateSiteEditProposal(ctx context.Context, input CreateSiteEditProposalInput) (CreateSiteEditProposalResult, error) {
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return CreateSiteEditProposalResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}

	site, err := s.repo.GetSiteBySlug(ctx, strings.TrimSpace(input.Slug), input.ActorID)
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return CreateSiteEditProposalResult{}, apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
		}
		return CreateSiteEditProposalResult{}, apperrors.New(http.StatusInternalServerError, "site_detail_failed", "failed to load dive site", err)
	}

	proposed, issues := normalizeSiteEditValues(input)
	if len(issues) > 0 {
		return CreateSiteEditProposalResult{}, ValidationFailure{Issues: issues}
	}
	if !siteEditChanged(site, proposed) {
		return CreateSiteEditProposalResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"changes"},
			Code:    "custom",
			Message: "Change at least one site detail before submitting",
		}}}
	}

	editInput := explorerepo.CreateSiteEditProposalInput{
		DiveSiteID:           site.ID,
		SubmittedByAppUserID: input.ActorID,
		Proposed:             proposed,
	}

	if strings.EqualFold(strings.TrimSpace(input.ActorRole), "super_admin") {
		reason := "Applied immediately by super admin"
		applied, err := s.repo.CreateAndApplySiteEditProposal(ctx, editInput, input.ActorID, time.Now().UTC(), &reason)
		if err != nil {
			return CreateSiteEditProposalResult{}, apperrors.New(http.StatusInternalServerError, "site_edit_apply_failed", "failed to apply site edit", err)
		}
		return CreateSiteEditProposalResult{Proposal: applied, AppliedImmediately: true}, nil
	}

	proposal, err := s.repo.CreateSiteEditProposal(ctx, editInput)
	if err != nil {
		return CreateSiteEditProposalResult{}, apperrors.New(http.StatusInternalServerError, "site_edit_proposal_failed", "failed to submit site edit", err)
	}

	return CreateSiteEditProposalResult{Proposal: proposal}, nil
}

func (s *Service) ListMySiteEditProposals(ctx context.Context, input SubmissionListInput) (SiteEditProposalListResult, error) {
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return SiteEditProposalListResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	limit := input.Limit
	if limit <= 0 || limit > pagination.MaxLimit {
		limit = pagination.DefaultLimit
	}
	cursorCreatedAt, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(input.Cursor) != "" {
		createdAt, tieID, err := pagination.DecodeUUID(input.Cursor)
		if err != nil {
			return SiteEditProposalListResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"cursor"},
				Code:    "custom",
				Message: "invalid cursor",
			}}}
		}
		cursorCreatedAt = createdAt
		cursorID = tieID
	}
	items, err := s.repo.ListMySiteEditProposals(ctx, explorerepo.ListSiteEditProposalsInput{
		SubmittedByAppUserID: input.ActorID,
		CursorCreatedAt:      cursorCreatedAt,
		CursorID:             cursorID,
		Limit:                limit + 1,
	})
	if err != nil {
		return SiteEditProposalListResult{}, apperrors.New(http.StatusInternalServerError, "site_edit_proposal_list_failed", "failed to list your site edits", err)
	}
	nextCursor := ""
	if int32(len(items)) > limit {
		next := items[limit-1]
		nextCursor = pagination.Encode(next.CreatedAt, next.ID)
		items = items[:limit]
	}
	return SiteEditProposalListResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) GetMySiteEditProposalByID(ctx context.Context, actorID, proposalID string) (explorerepo.SiteEditProposal, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return explorerepo.SiteEditProposal{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(proposalID); err != nil {
		return explorerepo.SiteEditProposal{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"id"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	item, err := s.repo.GetMySiteEditProposalByID(ctx, proposalID, actorID)
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return explorerepo.SiteEditProposal{}, apperrors.New(http.StatusNotFound, "site_edit_not_found", "site edit proposal not found", err)
		}
		return explorerepo.SiteEditProposal{}, apperrors.New(http.StatusInternalServerError, "site_edit_detail_failed", "failed to load site edit proposal", err)
	}
	return item, nil
}

func (s *Service) ListPendingSiteEditProposals(ctx context.Context, input SubmissionListInput) (SiteEditProposalListResult, error) {
	limit := input.Limit
	if limit <= 0 || limit > pagination.MaxLimit {
		limit = pagination.DefaultLimit
	}
	cursorCreatedAt, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(input.Cursor) != "" {
		createdAt, tieID, err := pagination.DecodeUUID(input.Cursor)
		if err != nil {
			return SiteEditProposalListResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"cursor"},
				Code:    "custom",
				Message: "invalid cursor",
			}}}
		}
		cursorCreatedAt = createdAt
		cursorID = tieID
	}
	items, err := s.repo.ListPendingSiteEditProposals(ctx, explorerepo.ListPendingSiteEditProposalsInput{
		CursorCreatedAt: cursorCreatedAt,
		CursorID:        cursorID,
		Limit:           limit + 1,
	})
	if err != nil {
		return SiteEditProposalListResult{}, apperrors.New(http.StatusInternalServerError, "pending_site_edits_failed", "failed to list pending site edits", err)
	}
	nextCursor := ""
	if int32(len(items)) > limit {
		next := items[limit-1]
		nextCursor = pagination.Encode(next.CreatedAt, next.ID)
		items = items[:limit]
	}
	return SiteEditProposalListResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) GetSiteEditProposalForModeration(ctx context.Context, proposalID string) (explorerepo.SiteEditProposal, error) {
	if _, err := uuid.Parse(proposalID); err != nil {
		return explorerepo.SiteEditProposal{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"id"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	item, err := s.repo.GetSiteEditProposalForModeration(ctx, proposalID)
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return explorerepo.SiteEditProposal{}, apperrors.New(http.StatusNotFound, "site_edit_not_found", "site edit proposal not found", err)
		}
		return explorerepo.SiteEditProposal{}, apperrors.New(http.StatusInternalServerError, "site_edit_detail_failed", "failed to load site edit proposal", err)
	}
	return item, nil
}

func (s *Service) ApplySiteEditProposal(ctx context.Context, input ModerateSiteEditProposalInput) (explorerepo.SiteEditProposal, error) {
	return s.moderateSiteEditProposal(ctx, input, true)
}

func (s *Service) RejectSiteEditProposal(ctx context.Context, input ModerateSiteEditProposalInput) (explorerepo.SiteEditProposal, error) {
	return s.moderateSiteEditProposal(ctx, input, false)
}

func (s *Service) GetBuddyPreviewBySlug(ctx context.Context, slug string, limit int32) (SiteBuddyPreviewResult, error) {
	site, err := s.repo.GetSiteBySlug(ctx, strings.TrimSpace(slug), "")
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
	site, err := s.repo.GetSiteBySlug(ctx, strings.TrimSpace(slug), viewerID)
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

func (s *Service) GetRelatedBySlug(ctx context.Context, viewerID, slug string) (SiteRelatedResult, error) {
	site, err := s.repo.GetSiteBySlug(ctx, strings.TrimSpace(slug), strings.TrimSpace(viewerID))
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return SiteRelatedResult{}, apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
		}
		return SiteRelatedResult{}, apperrors.New(http.StatusInternalServerError, "site_detail_failed", "failed to load dive site", err)
	}

	result := SiteRelatedResult{
		Site: site,
		Counts: SiteRelatedCounts{
			RecentConditions: site.ReportCount,
		},
	}

	if err := s.repo.ExpirePastDivePresences(ctx); err != nil {
		return SiteRelatedResult{}, apperrors.New(http.StatusInternalServerError, "dive_presence_expire_failed", "failed to expire old dive presences", err)
	}
	presenceCount, err := s.repo.CountVisibleDivePresencesBySite(ctx, strings.TrimSpace(viewerID), site.ID)
	if err != nil {
		return SiteRelatedResult{}, apperrors.New(http.StatusInternalServerError, "dive_presence_count_failed", "failed to count available buddies", err)
	}
	presences, err := s.repo.ListVisibleDivePresencesBySite(ctx, strings.TrimSpace(viewerID), site.ID, 6)
	if err != nil {
		return SiteRelatedResult{}, apperrors.New(http.StatusInternalServerError, "dive_presence_list_failed", "failed to list available buddies", err)
	}
	affinityCount, err := s.repo.CountVisibleDiveSiteAffinitiesBySite(ctx, strings.TrimSpace(viewerID), site.ID)
	if err != nil {
		return SiteRelatedResult{}, apperrors.New(http.StatusInternalServerError, "dive_affinity_count_failed", "failed to count locals and regulars", err)
	}
	affinities, err := s.repo.ListVisibleDiveSiteAffinitiesBySite(ctx, strings.TrimSpace(viewerID), site.ID, 6)
	if err != nil {
		return SiteRelatedResult{}, apperrors.New(http.StatusInternalServerError, "dive_affinity_list_failed", "failed to list locals and regulars", err)
	}
	result.Counts.AvailableBuddies = presenceCount
	result.Counts.LocalRegulars = affinityCount
	result.Previews.AvailableBuddies = presences
	result.Previews.LocalRegulars = affinities
	reviewCount, err := s.repo.CountVisibleDiveSiteReviewsBySite(ctx, strings.TrimSpace(viewerID), site.ID)
	if err != nil {
		return SiteRelatedResult{}, apperrors.New(http.StatusInternalServerError, "dive_review_count_failed", "failed to count dive site reviews", err)
	}
	reviews, err := s.repo.ListVisibleDiveSiteReviewsBySite(ctx, strings.TrimSpace(viewerID), site.ID, 6)
	if err != nil {
		return SiteRelatedResult{}, apperrors.New(http.StatusInternalServerError, "dive_review_list_failed", "failed to list dive site reviews", err)
	}
	summary, err := s.repo.GetVisibleDiveSiteReviewSummaryBySite(ctx, strings.TrimSpace(viewerID), site.ID)
	if err != nil {
		return SiteRelatedResult{}, apperrors.New(http.StatusInternalServerError, "dive_review_summary_failed", "failed to load dive site review summary", err)
	}
	result.Counts.Reviews = reviewCount
	result.Counts.AverageRating = summary.AverageRating
	result.Previews.Reviews = reviews

	if s.feed != nil {
		input := feedservice.ActivityInput{
			UserID:     strings.TrimSpace(viewerID),
			Mode:       feedservice.ModeLatest,
			DiveSiteID: site.ID,
			Types:      []feedservice.ActivityType{feedservice.ActivityMediaPostCreated},
			Limit:      3,
		}
		communityCount, err := s.feed.CountActivity(ctx, input)
		if err != nil {
			return SiteRelatedResult{}, err
		}
		community, err := s.feed.Activity(ctx, input)
		if err != nil {
			return SiteRelatedResult{}, err
		}
		result.Counts.CommunityPosts = communityCount
		result.Previews.CommunityPosts = community.Items
	}

	return result, nil
}

func (s *Service) ListDivePresencesBySlug(ctx context.Context, viewerID, slug string, limit int32) (SiteDivePresencesResult, error) {
	site, err := s.repo.GetSiteBySlug(ctx, strings.TrimSpace(slug), strings.TrimSpace(viewerID))
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return SiteDivePresencesResult{}, apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
		}
		return SiteDivePresencesResult{}, apperrors.New(http.StatusInternalServerError, "site_detail_failed", "failed to load dive site", err)
	}
	if limit <= 0 || limit > pagination.MaxLimit {
		limit = pagination.DefaultLimit
	}
	if err := s.repo.ExpirePastDivePresences(ctx); err != nil {
		return SiteDivePresencesResult{}, apperrors.New(http.StatusInternalServerError, "dive_presence_expire_failed", "failed to expire old dive presences", err)
	}
	items, err := s.repo.ListVisibleDivePresencesBySite(ctx, strings.TrimSpace(viewerID), site.ID, limit)
	if err != nil {
		return SiteDivePresencesResult{}, apperrors.New(http.StatusInternalServerError, "dive_presence_list_failed", "failed to list available buddies", err)
	}
	return SiteDivePresencesResult{Site: site, Items: items}, nil
}

func (s *Service) ListGlobalDivePresences(ctx context.Context, input GlobalDivePresencesInput) (GlobalDivePresencesResult, error) {
	if input.Limit <= 0 || input.Limit > pagination.MaxLimit {
		input.Limit = pagination.DefaultLimit
	}
	if input.PresenceType != "" && !oneOf(input.PresenceType, "available", "planning", "training", "fun_dive") {
		return GlobalDivePresencesResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"presenceType"}, Code: "invalid_enum", Message: "presenceType must be available, planning, training, or fun_dive"}}}
	}
	if !input.DateFrom.IsZero() && !input.DateTo.IsZero() && input.DateFrom.After(input.DateTo) {
		return GlobalDivePresencesResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"dateTo"}, Code: "custom", Message: "dateTo must be after dateFrom"}}}
	}
	if err := s.repo.ExpirePastDivePresences(ctx); err != nil {
		return GlobalDivePresencesResult{}, apperrors.New(http.StatusInternalServerError, "dive_presence_expire_failed", "failed to expire old dive presences", err)
	}
	items, err := s.repo.ListVisibleDivePresencesGlobal(ctx, explorerepo.GlobalDivePresenceInput{
		ViewerUserID: strings.TrimSpace(input.ViewerID),
		SiteSlug:     strings.TrimSpace(input.SiteSlug),
		Area:         strings.TrimSpace(input.Area),
		PresenceType: strings.TrimSpace(input.PresenceType),
		FlexibleOnly: input.FlexibleOnly,
		DateFrom:     input.DateFrom,
		DateTo:       input.DateTo,
		Limit:        input.Limit,
	})
	if err != nil {
		return GlobalDivePresencesResult{}, apperrors.New(http.StatusInternalServerError, "dive_presence_list_failed", "failed to list available buddies", err)
	}
	return GlobalDivePresencesResult{Items: items}, nil
}

func (s *Service) ListMyDivePresences(ctx context.Context, actorID string) (CurrentUserDivePresencesResult, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return CurrentUserDivePresencesResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if err := s.repo.ExpirePastDivePresences(ctx); err != nil {
		return CurrentUserDivePresencesResult{}, apperrors.New(http.StatusInternalServerError, "dive_presence_expire_failed", "failed to expire old dive presences", err)
	}
	items, err := s.repo.ListCurrentUserDivePresences(ctx, actorID)
	if err != nil {
		return CurrentUserDivePresencesResult{}, apperrors.New(http.StatusInternalServerError, "dive_presence_list_failed", "failed to list your dive presences", err)
	}
	return CurrentUserDivePresencesResult{Items: items}, nil
}

func (s *Service) ListDiveAffinitiesBySlug(ctx context.Context, viewerID, slug string, limit int32) (SiteDiveAffinitiesResult, error) {
	site, err := s.repo.GetSiteBySlug(ctx, strings.TrimSpace(slug), strings.TrimSpace(viewerID))
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return SiteDiveAffinitiesResult{}, apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
		}
		return SiteDiveAffinitiesResult{}, apperrors.New(http.StatusInternalServerError, "site_detail_failed", "failed to load dive site", err)
	}
	if limit <= 0 || limit > pagination.MaxLimit {
		limit = pagination.DefaultLimit
	}
	items, err := s.repo.ListVisibleDiveSiteAffinitiesBySite(ctx, strings.TrimSpace(viewerID), site.ID, limit)
	if err != nil {
		return SiteDiveAffinitiesResult{}, apperrors.New(http.StatusInternalServerError, "dive_affinity_list_failed", "failed to list locals and regulars", err)
	}
	return SiteDiveAffinitiesResult{Site: site, Items: items}, nil
}

func (s *Service) ListMyDiveSiteAffinities(ctx context.Context, actorID string) (CurrentUserDiveAffinitiesResult, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return CurrentUserDiveAffinitiesResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	items, err := s.repo.ListCurrentUserDiveSiteAffinities(ctx, actorID)
	if err != nil {
		return CurrentUserDiveAffinitiesResult{}, apperrors.New(http.StatusInternalServerError, "dive_affinity_list_failed", "failed to list your dive site affinities", err)
	}
	return CurrentUserDiveAffinitiesResult{Items: items}, nil
}

func (s *Service) ListDiveReviewsBySlug(ctx context.Context, viewerID, slug string, limit int32) (SiteDiveReviewsResult, error) {
	site, err := s.repo.GetSiteBySlug(ctx, strings.TrimSpace(slug), strings.TrimSpace(viewerID))
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return SiteDiveReviewsResult{}, apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
		}
		return SiteDiveReviewsResult{}, apperrors.New(http.StatusInternalServerError, "site_detail_failed", "failed to load dive site", err)
	}
	if limit <= 0 || limit > pagination.MaxLimit {
		limit = pagination.DefaultLimit
	}
	items, err := s.repo.ListVisibleDiveSiteReviewsBySite(ctx, strings.TrimSpace(viewerID), site.ID, limit)
	if err != nil {
		return SiteDiveReviewsResult{}, apperrors.New(http.StatusInternalServerError, "dive_review_list_failed", "failed to list dive site reviews", err)
	}
	summary, err := s.repo.GetVisibleDiveSiteReviewSummaryBySite(ctx, strings.TrimSpace(viewerID), site.ID)
	if err != nil {
		return SiteDiveReviewsResult{}, apperrors.New(http.StatusInternalServerError, "dive_review_summary_failed", "failed to load dive site review summary", err)
	}
	return SiteDiveReviewsResult{Site: site, Items: items, AverageRating: summary.AverageRating, ReviewCount: summary.ReviewCount}, nil
}

func (s *Service) CreateDiveSiteReview(ctx context.Context, input DiveSiteReviewInput) (explorerepo.DiveSiteReview, error) {
	site, err := s.siteForMemberWrite(ctx, input.ActorID, input.Slug)
	if err != nil {
		return explorerepo.DiveSiteReview{}, err
	}
	if issues := validateDiveSiteReview(input); len(issues) > 0 {
		return explorerepo.DiveSiteReview{}, ValidationFailure{Issues: issues}
	}
	return s.repo.UpsertDiveSiteReview(ctx, explorerepo.UpsertDiveSiteReviewInput{
		UserID:     input.ActorID,
		DiveSiteID: site.ID,
		Rating:     input.Rating,
		Comment:    cleanOptionalComment(input.Comment),
		Visibility: input.Visibility,
	})
}

func (s *Service) CreateDivePresence(ctx context.Context, input DivePresenceInput) (explorerepo.DivePresence, error) {
	site, err := s.siteForMemberWrite(ctx, input.ActorID, input.Slug)
	if err != nil {
		return explorerepo.DivePresence{}, err
	}
	if issues := validateDivePresence(input); len(issues) > 0 {
		return explorerepo.DivePresence{}, ValidationFailure{Issues: issues}
	}
	if err := s.repo.ExpirePastDivePresences(ctx); err != nil {
		return explorerepo.DivePresence{}, apperrors.New(http.StatusInternalServerError, "dive_presence_expire_failed", "failed to expire old dive presences", err)
	}
	count, err := s.repo.CountActiveDivePresencesByUser(ctx, input.ActorID)
	if err != nil {
		return explorerepo.DivePresence{}, apperrors.New(http.StatusInternalServerError, "dive_presence_count_failed", "failed to count active dive presences", err)
	}
	if count >= 5 {
		return explorerepo.DivePresence{}, apperrors.New(http.StatusConflict, "active_presence_limit_reached", "you can have at most 5 active dive presences", nil)
	}
	return s.repo.CreateDivePresence(ctx, explorerepo.CreateDivePresenceInput{
		UserID:         input.ActorID,
		DiveSiteID:     site.ID,
		PresenceType:   input.PresenceType,
		StartAt:        input.StartAt,
		EndAt:          input.EndAt,
		Visibility:     input.Visibility,
		ContactEnabled: input.ContactEnabled,
		Note:           cleanOptionalNote(input.Note),
	})
}

func (s *Service) UpdateDivePresence(ctx context.Context, input DivePresenceInput) (explorerepo.DivePresence, error) {
	site, err := s.siteForMemberWrite(ctx, input.ActorID, input.Slug)
	if err != nil {
		return explorerepo.DivePresence{}, err
	}
	if _, err := uuid.Parse(input.PresenceID); err != nil {
		return explorerepo.DivePresence{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"presenceId"}, Code: "invalid_uuid", Message: "Must be a valid UUID"}}}
	}
	if issues := validateDivePresence(input); len(issues) > 0 {
		return explorerepo.DivePresence{}, ValidationFailure{Issues: issues}
	}
	item, err := s.repo.UpdateDivePresenceByOwner(ctx, input.PresenceID, explorerepo.CreateDivePresenceInput{
		UserID:         input.ActorID,
		DiveSiteID:     site.ID,
		PresenceType:   input.PresenceType,
		StartAt:        input.StartAt,
		EndAt:          input.EndAt,
		Visibility:     input.Visibility,
		ContactEnabled: input.ContactEnabled,
		Note:           cleanOptionalNote(input.Note),
	})
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return explorerepo.DivePresence{}, apperrors.New(http.StatusNotFound, "presence_not_found", "dive presence not found", err)
		}
		return explorerepo.DivePresence{}, apperrors.New(http.StatusInternalServerError, "dive_presence_update_failed", "failed to update dive presence", err)
	}
	return item, nil
}

func (s *Service) CancelDivePresence(ctx context.Context, actorID, slug, presenceID string) error {
	site, err := s.siteForMemberWrite(ctx, actorID, slug)
	if err != nil {
		return err
	}
	if _, err := uuid.Parse(presenceID); err != nil {
		return ValidationFailure{Issues: []validatex.Issue{{Path: []any{"presenceId"}, Code: "invalid_uuid", Message: "Must be a valid UUID"}}}
	}
	rows, err := s.repo.CancelDivePresenceByOwner(ctx, presenceID, actorID, site.ID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "dive_presence_cancel_failed", "failed to cancel dive presence", err)
	}
	if rows == 0 {
		return apperrors.New(http.StatusNotFound, "presence_not_found", "dive presence not found", nil)
	}
	return nil
}

func (s *Service) CreateDiveSiteAffinity(ctx context.Context, input DiveSiteAffinityInput) (explorerepo.DiveSiteAffinity, error) {
	site, err := s.siteForMemberWrite(ctx, input.ActorID, input.Slug)
	if err != nil {
		return explorerepo.DiveSiteAffinity{}, err
	}
	if issues := validateDiveSiteAffinity(input); len(issues) > 0 {
		return explorerepo.DiveSiteAffinity{}, ValidationFailure{Issues: issues}
	}
	return s.repo.UpsertDiveSiteAffinity(ctx, explorerepo.UpsertDiveSiteAffinityInput{
		UserID:         input.ActorID,
		DiveSiteID:     site.ID,
		Relationship:   input.Relationship,
		Visibility:     input.Visibility,
		ContactEnabled: input.ContactEnabled,
		Note:           cleanOptionalNote(input.Note),
	})
}

func (s *Service) UpdateDiveSiteAffinity(ctx context.Context, input DiveSiteAffinityInput) (explorerepo.DiveSiteAffinity, error) {
	site, err := s.siteForMemberWrite(ctx, input.ActorID, input.Slug)
	if err != nil {
		return explorerepo.DiveSiteAffinity{}, err
	}
	if _, err := uuid.Parse(input.AffinityID); err != nil {
		return explorerepo.DiveSiteAffinity{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"affinityId"}, Code: "invalid_uuid", Message: "Must be a valid UUID"}}}
	}
	if issues := validateDiveSiteAffinity(input); len(issues) > 0 {
		return explorerepo.DiveSiteAffinity{}, ValidationFailure{Issues: issues}
	}
	item, err := s.repo.UpdateDiveSiteAffinityByOwner(ctx, input.AffinityID, explorerepo.UpsertDiveSiteAffinityInput{
		UserID:         input.ActorID,
		DiveSiteID:     site.ID,
		Relationship:   input.Relationship,
		Visibility:     input.Visibility,
		ContactEnabled: input.ContactEnabled,
		Note:           cleanOptionalNote(input.Note),
	})
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return explorerepo.DiveSiteAffinity{}, apperrors.New(http.StatusNotFound, "affinity_not_found", "dive site affinity not found", err)
		}
		return explorerepo.DiveSiteAffinity{}, apperrors.New(http.StatusInternalServerError, "dive_affinity_update_failed", "failed to update dive site affinity", err)
	}
	return item, nil
}

func (s *Service) DeleteDiveSiteAffinity(ctx context.Context, actorID, slug, affinityID string) error {
	site, err := s.siteForMemberWrite(ctx, actorID, slug)
	if err != nil {
		return err
	}
	if _, err := uuid.Parse(affinityID); err != nil {
		return ValidationFailure{Issues: []validatex.Issue{{Path: []any{"affinityId"}, Code: "invalid_uuid", Message: "Must be a valid UUID"}}}
	}
	rows, err := s.repo.DeleteDiveSiteAffinityByOwner(ctx, affinityID, actorID, site.ID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "dive_affinity_delete_failed", "failed to delete dive site affinity", err)
	}
	if rows == 0 {
		return apperrors.New(http.StatusNotFound, "affinity_not_found", "dive site affinity not found", nil)
	}
	return nil
}

func (s *Service) siteForMemberWrite(ctx context.Context, actorID, slug string) (explorerepo.SiteDetail, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return explorerepo.SiteDetail{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	site, err := s.repo.GetSiteBySlug(ctx, strings.TrimSpace(slug), actorID)
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return explorerepo.SiteDetail{}, apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
		}
		return explorerepo.SiteDetail{}, apperrors.New(http.StatusInternalServerError, "site_detail_failed", "failed to load dive site", err)
	}
	return site, nil
}

func validateDivePresence(input DivePresenceInput) []validatex.Issue {
	issues := make([]validatex.Issue, 0, 2)
	if !oneOf(input.PresenceType, "available", "planning", "training", "fun_dive") {
		issues = append(issues, validatex.Issue{Path: []any{"presenceType"}, Code: "invalid_enum", Message: "presenceType must be available, planning, training, or fun_dive"})
	}
	if !oneOf(input.Visibility, "public", "members", "private") {
		issues = append(issues, validatex.Issue{Path: []any{"visibility"}, Code: "invalid_enum", Message: "visibility must be public, members, or private"})
	}
	if input.StartAt != nil && input.EndAt != nil && !input.StartAt.Before(*input.EndAt) {
		issues = append(issues, validatex.Issue{Path: []any{"endAt"}, Code: "custom", Message: "endAt must be after startAt"})
	}
	if input.Note != nil && len(strings.TrimSpace(*input.Note)) > 280 {
		issues = append(issues, validatex.Issue{Path: []any{"note"}, Code: "too_big", Message: "note must be at most 280 characters"})
	}
	return issues
}

func validateDiveSiteAffinity(input DiveSiteAffinityInput) []validatex.Issue {
	issues := make([]validatex.Issue, 0, 2)
	if !oneOf(input.Relationship, "local", "regular", "instructor", "operator", "interested") {
		issues = append(issues, validatex.Issue{Path: []any{"relationship"}, Code: "invalid_enum", Message: "relationship must be local, regular, instructor, operator, or interested"})
	}
	if !oneOf(input.Visibility, "public", "members", "private") {
		issues = append(issues, validatex.Issue{Path: []any{"visibility"}, Code: "invalid_enum", Message: "visibility must be public, members, or private"})
	}
	if input.Note != nil && len(strings.TrimSpace(*input.Note)) > 280 {
		issues = append(issues, validatex.Issue{Path: []any{"note"}, Code: "too_big", Message: "note must be at most 280 characters"})
	}
	return issues
}

func validateDiveSiteReview(input DiveSiteReviewInput) []validatex.Issue {
	issues := make([]validatex.Issue, 0, 2)
	if input.Rating < 1 || input.Rating > 5 {
		issues = append(issues, validatex.Issue{Path: []any{"rating"}, Code: "out_of_range", Message: "rating must be between 1 and 5"})
	}
	if !oneOf(input.Visibility, "public", "members", "private") {
		issues = append(issues, validatex.Issue{Path: []any{"visibility"}, Code: "invalid_enum", Message: "visibility must be public, members, or private"})
	}
	if input.Comment != nil && len(strings.TrimSpace(*input.Comment)) > 2000 {
		issues = append(issues, validatex.Issue{Path: []any{"comment"}, Code: "too_big", Message: "comment must be at most 2000 characters"})
	}
	return issues
}

func oneOf(value string, allowed ...string) bool {
	for _, item := range allowed {
		if value == item {
			return true
		}
	}
	return false
}

func cleanOptionalNote(note *string) *string {
	if note == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*note)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func cleanOptionalComment(comment *string) *string {
	if comment == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*comment)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func (s *Service) ListCommunityPostsBySlug(ctx context.Context, viewerID, slug, cursor string, limit int32) (SiteCommunityPostsResult, error) {
	site, err := s.repo.GetSiteBySlug(ctx, strings.TrimSpace(slug), strings.TrimSpace(viewerID))
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return SiteCommunityPostsResult{}, apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
		}
		return SiteCommunityPostsResult{}, apperrors.New(http.StatusInternalServerError, "site_detail_failed", "failed to load dive site", err)
	}
	if s.feed == nil {
		return SiteCommunityPostsResult{Site: site}, nil
	}
	if limit <= 0 || limit > pagination.MaxLimit {
		limit = pagination.DefaultLimit
	}
	result, err := s.feed.Activity(ctx, feedservice.ActivityInput{
		UserID:     strings.TrimSpace(viewerID),
		Mode:       feedservice.ModeLatest,
		Cursor:     cursor,
		DiveSiteID: site.ID,
		Types:      []feedservice.ActivityType{feedservice.ActivityMediaPostCreated},
		Limit:      int(limit),
	})
	if err != nil {
		return SiteCommunityPostsResult{}, err
	}
	return SiteCommunityPostsResult{Site: site, Items: result.Items, NextCursor: result.NextCursor}, nil
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
	if s.activity != nil {
		_ = s.activity.PublishActivity(ctx, feedservice.ActivityPublishInput{
			Type:            feedservice.ActivityDiveSiteUpdateAdded,
			SourceModule:    feedservice.ActivitySourceExplore,
			SourceType:      "dive_site_update",
			SourceID:        update.ID,
			ActorUserID:     input.ActorID,
			TargetType:      "dive_site_update",
			TargetID:        update.ID,
			Visibility:      feedservice.ActivityVisibilityPublic,
			State:           feedservice.ActivityStateActive,
			Area:            site.Area,
			DiveSiteID:      site.ID,
			OccurredAt:      update.OccurredAt,
			SourceCreatedAt: update.CreatedAt,
			Title:           site.Name,
			Body:            update.Note,
			Metadata: map[string]any{
				"diveSiteName":     site.Name,
				"diveSiteSlug":     site.Slug,
				"conditionCurrent": update.ConditionCurrent,
				"conditionWaves":   update.ConditionWaves,
				"conditionTempC":   update.ConditionTempC,
				"visibilityMeters": update.ConditionVisibilityM,
			},
		})
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

func (s *Service) LikeDiveSite(ctx context.Context, actorID, siteID string) (LikeStateResult, error) {
	return s.setDiveSiteLike(ctx, actorID, siteID, true)
}

func (s *Service) UnlikeDiveSite(ctx context.Context, actorID, siteID string) (LikeStateResult, error) {
	return s.setDiveSiteLike(ctx, actorID, siteID, false)
}

func (s *Service) setDiveSiteLike(ctx context.Context, actorID, siteID string, liked bool) (LikeStateResult, error) {
	if _, err := uuid.Parse(strings.TrimSpace(actorID)); err != nil {
		return LikeStateResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(strings.TrimSpace(siteID)); err != nil {
		return LikeStateResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"siteId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if _, err := s.repo.GetVisibleDiveSiteLikeState(ctx, siteID, actorID); err != nil {
		if explorerepo.IsNoRows(err) {
			return LikeStateResult{}, apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
		}
		return LikeStateResult{}, apperrors.New(http.StatusInternalServerError, "site_like_failed", "failed to load dive site", err)
	}
	if liked {
		if err := s.repo.LikeDiveSite(ctx, siteID, actorID); err != nil {
			return LikeStateResult{}, apperrors.New(http.StatusInternalServerError, "site_like_failed", "failed to like dive site", err)
		}
	} else if err := s.repo.UnlikeDiveSite(ctx, siteID, actorID); err != nil {
		return LikeStateResult{}, apperrors.New(http.StatusInternalServerError, "site_like_failed", "failed to unlike dive site", err)
	}
	state, err := s.repo.GetVisibleDiveSiteLikeState(ctx, siteID, actorID)
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return LikeStateResult{}, apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
		}
		return LikeStateResult{}, apperrors.New(http.StatusInternalServerError, "site_like_failed", "failed to load dive site", err)
	}
	state.ViewerHasLiked = liked
	return LikeStateResult{
		TargetID:       state.TargetID,
		LikeCount:      state.LikeCount,
		ViewerHasLiked: state.ViewerHasLiked,
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

func stringValue(input *string) string {
	if input == nil {
		return ""
	}
	return *input
}

func validateSubmissionInput(name, description, difficulty string, lat, lng, depthMinM, depthMaxM *float64) []validatex.Issue {
	issues := make([]validatex.Issue, 0, 5)
	if name == "" {
		issues = append(issues, validatex.Issue{Path: []any{"name"}, Code: "required", Message: "Required"})
	}
	if description == "" {
		issues = append(issues, validatex.Issue{Path: []any{"description"}, Code: "required", Message: "Required"})
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

func normalizeSiteEditValues(input CreateSiteEditProposalInput) (explorerepo.SiteEditValues, []validatex.Issue) {
	name := strings.TrimSpace(input.Name)
	description := strings.TrimSpace(input.Description)
	difficulty := strings.TrimSpace(input.Difficulty)
	issues := make([]validatex.Issue, 0, 5)
	if name == "" {
		issues = append(issues, validatex.Issue{Path: []any{"name"}, Code: "required", Message: "Required"})
	}
	if len(name) > 120 {
		issues = append(issues, validatex.Issue{Path: []any{"name"}, Code: "too_big", Message: "Must be at most 120 characters"})
	}
	if description == "" {
		issues = append(issues, validatex.Issue{Path: []any{"description"}, Code: "required", Message: "Required"})
	}
	if len(description) > 2000 {
		issues = append(issues, validatex.Issue{Path: []any{"description"}, Code: "too_big", Message: "Must be at most 2000 characters"})
	}
	if difficulty != "easy" && difficulty != "moderate" && difficulty != "hard" {
		issues = append(issues, validatex.Issue{Path: []any{"entryDifficulty"}, Code: "invalid_enum", Message: "Must be one of: easy moderate hard"})
	}
	if input.DepthMinM != nil && *input.DepthMinM < 0 {
		issues = append(issues, validatex.Issue{Path: []any{"depthMinM"}, Code: "too_small", Message: "Must be greater than or equal to 0"})
	}
	if input.DepthMaxM != nil && *input.DepthMaxM < 0 {
		issues = append(issues, validatex.Issue{Path: []any{"depthMaxM"}, Code: "too_small", Message: "Must be greater than or equal to 0"})
	}
	if input.DepthMinM != nil && input.DepthMaxM != nil && *input.DepthMinM > *input.DepthMaxM {
		issues = append(issues, validatex.Issue{Path: []any{"depthMinM"}, Code: "custom", Message: "depthMinM must be less than or equal to depthMaxM"})
	}

	values := explorerepo.SiteEditValues{
		Name:              name,
		Description:       description,
		Difficulty:        difficulty,
		DepthMinM:         input.DepthMinM,
		DepthMaxM:         input.DepthMaxM,
		Hazards:           cleanStringList(input.Hazards),
		BestSeason:        stringValue(trimPtr(input.BestSeason)),
		TypicalConditions: stringValue(trimPtr(input.TypicalConditions)),
		Access:            stringValue(trimPtr(input.Access)),
		Fees:              stringValue(trimPtr(input.Fees)),
	}
	if len(values.BestSeason) > 160 {
		issues = append(issues, validatex.Issue{Path: []any{"bestSeason"}, Code: "too_big", Message: "Must be at most 160 characters"})
	}
	if len(values.TypicalConditions) > 500 {
		issues = append(issues, validatex.Issue{Path: []any{"typicalConditions"}, Code: "too_big", Message: "Must be at most 500 characters"})
	}
	if len(values.Access) > 500 {
		issues = append(issues, validatex.Issue{Path: []any{"access"}, Code: "too_big", Message: "Must be at most 500 characters"})
	}
	if len(values.Fees) > 280 {
		issues = append(issues, validatex.Issue{Path: []any{"fees"}, Code: "too_big", Message: "Must be at most 280 characters"})
	}
	for _, hazard := range values.Hazards {
		if len(hazard) > 60 {
			issues = append(issues, validatex.Issue{Path: []any{"hazards"}, Code: "too_big", Message: "Hazards must be at most 60 characters each"})
			break
		}
	}
	return values, issues
}

func siteEditChanged(site explorerepo.SiteDetail, proposed explorerepo.SiteEditValues) bool {
	current := explorerepo.SiteEditValues{
		Name:              site.Name,
		Description:       site.Description,
		Difficulty:        site.Difficulty,
		DepthMinM:         site.DepthMinM,
		DepthMaxM:         site.DepthMaxM,
		Hazards:           cleanStringList(site.Hazards),
		BestSeason:        strings.TrimSpace(site.BestSeason),
		TypicalConditions: strings.TrimSpace(site.TypicalConditions),
		Access:            strings.TrimSpace(site.Access),
		Fees:              strings.TrimSpace(site.Fees),
	}
	return current.Name != proposed.Name ||
		current.Description != proposed.Description ||
		current.Difficulty != proposed.Difficulty ||
		!floatPtrEqual(current.DepthMinM, proposed.DepthMinM) ||
		!floatPtrEqual(current.DepthMaxM, proposed.DepthMaxM) ||
		!stringSlicesEqual(current.Hazards, proposed.Hazards) ||
		current.BestSeason != proposed.BestSeason ||
		current.TypicalConditions != proposed.TypicalConditions ||
		current.Access != proposed.Access ||
		current.Fees != proposed.Fees
}

func floatPtrEqual(a, b *float64) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}

func stringSlicesEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
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

func (s *Service) moderateSiteEditProposal(ctx context.Context, input ModerateSiteEditProposalInput, approve bool) (explorerepo.SiteEditProposal, error) {
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return explorerepo.SiteEditProposal{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(input.ProposalID); err != nil {
		return explorerepo.SiteEditProposal{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"id"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	proposal, err := s.repo.GetSiteEditProposalForModeration(ctx, input.ProposalID)
	if err != nil {
		if explorerepo.IsNoRows(err) {
			return explorerepo.SiteEditProposal{}, apperrors.New(http.StatusNotFound, "site_edit_not_found", "site edit proposal not found", err)
		}
		return explorerepo.SiteEditProposal{}, apperrors.New(http.StatusInternalServerError, "site_edit_detail_failed", "failed to load site edit proposal", err)
	}
	if proposal.State != "pending" {
		return explorerepo.SiteEditProposal{}, apperrors.New(http.StatusConflict, "invalid_state", "site edit is not pending review", nil)
	}
	if approve && proposal.SiteChangedSinceProposal {
		return explorerepo.SiteEditProposal{}, apperrors.New(http.StatusConflict, "site_edit_conflict", "dive site changed after this edit was submitted; review the latest site details before approving", nil)
	}
	reason := trimPtr(input.Reason)
	reviewedAt := time.Now().UTC()
	if approve {
		item, applyErr := s.repo.ApplySiteEditProposal(ctx, input.ProposalID, input.ActorID, reviewedAt, reason)
		if applyErr != nil {
			if explorerepo.IsNoRows(applyErr) {
				return explorerepo.SiteEditProposal{}, apperrors.New(http.StatusConflict, "site_edit_conflict", "dive site changed after this edit was submitted; review the latest site details before approving", applyErr)
			}
			return explorerepo.SiteEditProposal{}, apperrors.New(http.StatusInternalServerError, "site_edit_apply_failed", "failed to apply site edit", applyErr)
		}
		return item, nil
	}
	item, rejectErr := s.repo.RejectSiteEditProposal(ctx, input.ProposalID, input.ActorID, reviewedAt, reason)
	if rejectErr != nil {
		return explorerepo.SiteEditProposal{}, apperrors.New(http.StatusInternalServerError, "site_edit_reject_failed", "failed to reject site edit", rejectErr)
	}
	return item, nil
}
