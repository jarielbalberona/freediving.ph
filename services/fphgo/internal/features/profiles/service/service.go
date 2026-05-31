package service

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	profilesrepo "fphgo/internal/features/profiles/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/mediaurl"
	sharedratelimit "fphgo/internal/shared/ratelimit"
)

type Service struct {
	repo         repository
	limiter      rateLimiter
	mediaBaseURL string
}

type repository interface {
	GetProfileByUserID(ctx context.Context, userID string) (profilesrepo.Profile, error)
	UpsertMyProfile(ctx context.Context, input profilesrepo.UpsertProfileInput) (profilesrepo.Profile, error)
	SearchUsers(ctx context.Context, viewerID, q string, limit int32) ([]profilesrepo.SearchUser, error)
	ListSavedSitesForUser(ctx context.Context, appUserID string) ([]profilesrepo.SavedSite, error)
	ListSavedUsersForUser(ctx context.Context, viewerUserID string) ([]profilesrepo.SavedUser, error)
	GetProfileViewByUsername(ctx context.Context, username, viewerUserID string) (profilesrepo.ProfileView, error)
	ListProfileBucketListByUsername(ctx context.Context, username string, limit int32) ([]profilesrepo.ProfileBucketListItem, error)
	ListProfileDivingByUsername(ctx context.Context, username, viewerUserID string) (profilesrepo.ProfileDiving, error)
	ListBadgeTemplates(ctx context.Context) ([]profilesrepo.BadgeTemplate, error)
	GetBadgeTemplate(ctx context.Context, templateID string) (profilesrepo.BadgeTemplate, error)
	ListUserBadgesByUserID(ctx context.Context, userID string) ([]profilesrepo.UserBadge, error)
	ListProfileBadgesByUsername(ctx context.Context, username string) ([]profilesrepo.UserBadge, error)
	CreateUserBadge(ctx context.Context, input profilesrepo.UpsertUserBadgeInput) (profilesrepo.UserBadge, error)
	UpdateUserBadge(ctx context.Context, input profilesrepo.UpsertUserBadgeInput) (profilesrepo.UserBadge, error)
	DeleteUserBadge(ctx context.Context, badgeID, userID string) error
	CountDiveSitesVisitedByUsername(ctx context.Context, username string) (int64, error)
	CountDiveSitesVisitedByUserID(ctx context.Context, userID string) (int64, error)
	UserOwnsProofMedia(ctx context.Context, userID, mediaID string) (bool, error)
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

func WithMediaBaseURL(baseURL string) Option {
	return func(s *Service) {
		s.mediaBaseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	}
}

type Profile struct {
	UserID        string            `json:"userId"`
	Username      string            `json:"username"`
	DisplayName   string            `json:"displayName"`
	EmailVerified bool              `json:"emailVerified"`
	PhoneVerified bool              `json:"phoneVerified"`
	BuddyCount    int64             `json:"buddyCount"`
	ReportCount   int64             `json:"reportCount"`
	Bio           string            `json:"bio"`
	AvatarURL     string            `json:"avatarUrl"`
	Location      string            `json:"location"`
	HomeArea      string            `json:"homeArea"`
	Interests     []string          `json:"interests"`
	CertLevel     string            `json:"certLevel"`
	Socials       map[string]string `json:"socials"`
}

type SavedHub struct {
	Sites []profilesrepo.SavedSite `json:"sites"`
	Users []profilesrepo.SavedUser `json:"users"`
}

type ProfileView struct {
	UserID      string
	Username    string
	DisplayName string
	Bio         string
	AvatarURL   string
	Location    string
	CreatedAt   time.Time
	Counts      ProfileViewCounts
	Viewer      ProfileViewerRelationship
}

type ProfileViewCounts struct {
	MediaPosts int64
	Followers  int64
	Following  int64
}

type ProfileViewerRelationship struct {
	IsSelf           bool
	IsFollowing      bool
	IsBlocked        bool
	HasBlockedViewer bool
	CanMessage       bool
	CanFollow        bool
	CanEdit          bool
}

type ProfileBucketListItem struct {
	SiteID   string
	SiteSlug string
	SiteName string
	SiteArea string
	PinnedAt string
	HasDived bool
}

type ProfileDivePresence struct {
	ID               string
	DiveSiteID       string
	DiveSiteSlug     string
	DiveSiteName     string
	DiveSiteArea     string
	PresenceType     string
	StartAt          *time.Time
	EndAt            *time.Time
	Visibility       string
	ContactEnabled   bool
	ViewerCanContact bool
	Note             string
	CreatedAt        time.Time
}

type ProfileDiveSiteAffinity struct {
	ID               string
	DiveSiteID       string
	DiveSiteSlug     string
	DiveSiteName     string
	DiveSiteArea     string
	Relationship     string
	Visibility       string
	ContactEnabled   bool
	ViewerCanContact bool
	Note             string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type ProfileDiving struct {
	Presences  []ProfileDivePresence
	Affinities []ProfileDiveSiteAffinity
}

type BadgeTemplate struct {
	ID           string         `json:"id"`
	Slug         string         `json:"slug"`
	Name         string         `json:"name"`
	Category     string         `json:"category"`
	ValueType    string         `json:"valueType"`
	Unit         string         `json:"unit,omitempty"`
	Icon         string         `json:"icon,omitempty"`
	Description  string         `json:"description,omitempty"`
	IsSystem     bool           `json:"isSystem"`
	DisplayOrder int32          `json:"displayOrder"`
	Rarity       string         `json:"rarity"`
	IsPublic     bool           `json:"isPublic"`
	IsRepeatable bool           `json:"isRepeatable"`
	SourceModule string         `json:"sourceModule"`
	MetadataJSON map[string]any `json:"metadataJson,omitempty"`
}

type UserBadge struct {
	ID                  string         `json:"id"`
	Template            BadgeTemplate  `json:"template"`
	ValueText           string         `json:"valueText,omitempty"`
	ValueNumber         *float64       `json:"valueNumber,omitempty"`
	ValueMinutes        *int32         `json:"valueMinutes,omitempty"`
	ValueSeconds        *int32         `json:"valueSeconds,omitempty"`
	DisplayValue        string         `json:"displayValue,omitempty"`
	ReferenceLabel      string         `json:"referenceLabel,omitempty"`
	ReferenceValue      string         `json:"referenceValue,omitempty"`
	ProofMediaID        string         `json:"proofMediaId,omitempty"`
	ProofMediaObjectKey string         `json:"proofMediaObjectKey,omitempty"`
	VerificationStatus  string         `json:"verificationStatus"`
	VerifiedAt          *time.Time     `json:"verifiedAt,omitempty"`
	VerifiedBy          string         `json:"verifiedBy,omitempty"`
	IsSystemVerified    bool           `json:"isSystemVerified"`
	SourceType          string         `json:"sourceType"`
	SourceID            string         `json:"sourceId,omitempty"`
	EarnedAt            *time.Time     `json:"earnedAt,omitempty"`
	Visibility          string         `json:"visibility"`
	DisplayOrder        int32          `json:"displayOrder"`
	Rarity              string         `json:"rarity"`
	SourceModule        string         `json:"sourceModule"`
	IsAutoStat          bool           `json:"isAutoStat"`
	MetadataJSON        map[string]any `json:"metadataJson,omitempty"`
	CreatedAt           time.Time      `json:"createdAt"`
	UpdatedAt           time.Time      `json:"updatedAt"`
}

type ProfileBadges struct {
	Templates []BadgeTemplate `json:"templates,omitempty"`
	Badges    []UserBadge     `json:"badges"`
	AutoStats []UserBadge     `json:"autoStats"`
}

type UpsertUserBadgeInput struct {
	ActorID         string
	BadgeID         string
	BadgeTemplateID string
	ValueText       *string
	ValueNumber     *float64
	ValueMinutes    *int32
	ValueSeconds    *int32
	ReferenceLabel  *string
	ReferenceValue  *string
	ProofMediaID    *string
	SourceType      *string
	SourceID        *string
	EarnedAt        *time.Time
	Visibility      *string
	DisplayOrder    *int32
	MetadataJSON    map[string]any
}

type UpdateMyProfileInput struct {
	ActorID     string
	DisplayName *string
	Bio         *string
	AvatarURL   *string
	Location    *string
	HomeArea    *string
	Interests   *[]string
	CertLevel   *string
	Socials     *map[string]string
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

func (s *Service) GetProfileByUserID(ctx context.Context, userID string) (Profile, error) {
	if _, err := uuid.Parse(userID); err != nil {
		return Profile{}, apperrors.New(http.StatusBadRequest, "invalid_user_id", "invalid user id", err)
	}

	item, err := s.repo.GetProfileByUserID(ctx, userID)
	if err != nil {
		if profilesrepo.IsNoRows(err) {
			return Profile{}, apperrors.New(http.StatusNotFound, "profile_not_found", "profile not found", err)
		}
		return Profile{}, apperrors.New(http.StatusInternalServerError, "profile_get_failed", "failed to fetch profile", err)
	}

	return s.mapProfile(item), nil
}

func (s *Service) UpdateMyProfile(ctx context.Context, input UpdateMyProfileInput) (Profile, error) {
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return Profile{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if err := s.enforceRateLimit(ctx, "profiles.update", input.ActorID, 10, time.Minute, "profile update rate exceeded"); err != nil {
		return Profile{}, err
	}

	current, err := s.repo.GetProfileByUserID(ctx, input.ActorID)
	if err != nil {
		if profilesrepo.IsNoRows(err) {
			return Profile{}, apperrors.New(http.StatusNotFound, "profile_not_found", "profile not found", err)
		}
		return Profile{}, apperrors.New(http.StatusInternalServerError, "profile_get_failed", "failed to fetch profile", err)
	}

	update := profilesrepo.UpsertProfileInput{
		UserID:      input.ActorID,
		DisplayName: current.DisplayName,
		Bio:         current.Bio,
		AvatarURL:   current.AvatarURL,
		Location:    current.Location,
		HomeArea:    current.HomeArea,
		Interests:   current.Interests,
		CertLevel:   current.CertLevel,
		Socials:     current.Socials,
	}

	if input.DisplayName != nil {
		update.DisplayName = strings.TrimSpace(*input.DisplayName)
		update.UpdateName = true
	}
	if input.Bio != nil {
		update.Bio = strings.TrimSpace(*input.Bio)
	}
	if input.AvatarURL != nil {
		update.AvatarURL = mediaurl.NormalizeReference(*input.AvatarURL)
	}
	if input.Location != nil {
		update.Location = strings.TrimSpace(*input.Location)
	}
	if input.HomeArea != nil {
		update.HomeArea = strings.TrimSpace(*input.HomeArea)
	}
	if input.Interests != nil {
		update.Interests = trimInterests(*input.Interests)
	}
	if input.CertLevel != nil {
		update.CertLevel = strings.TrimSpace(*input.CertLevel)
	}
	if input.Socials != nil {
		update.Socials = trimSocials(*input.Socials)
	}

	item, err := s.repo.UpsertMyProfile(ctx, update)
	if err != nil {
		return Profile{}, apperrors.New(http.StatusInternalServerError, "profile_update_failed", "failed to update profile", err)
	}

	return s.mapProfile(item), nil
}

func (s *Service) SearchUsers(ctx context.Context, actorID, query string, limit int32) ([]Profile, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return nil, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}

	q := strings.TrimSpace(query)
	if q == "" {
		return []Profile{}, nil
	}
	if limit <= 0 || limit > 25 {
		limit = 10
	}

	rows, err := s.repo.SearchUsers(ctx, actorID, q, limit)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "profile_search_failed", "failed to search users", err)
	}

	items := make([]Profile, 0, len(rows))
	for _, row := range rows {
		items = append(items, Profile{
			UserID:      row.UserID,
			Username:    row.Username,
			DisplayName: row.DisplayName,
			AvatarURL:   mediaurl.Materialize(row.AvatarURL, s.mediaBaseURL),
			Location:    coarseLocation(row.Location),
			Socials:     map[string]string{},
			Interests:   []string{},
		})
	}

	return items, nil
}

func (s *Service) GetSavedHub(ctx context.Context, actorID string) (SavedHub, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return SavedHub{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	sites, err := s.repo.ListSavedSitesForUser(ctx, actorID)
	if err != nil {
		return SavedHub{}, apperrors.New(http.StatusInternalServerError, "saved_sites_failed", "failed to load saved sites", err)
	}
	users, err := s.repo.ListSavedUsersForUser(ctx, actorID)
	if err != nil {
		return SavedHub{}, apperrors.New(http.StatusInternalServerError, "saved_users_failed", "failed to load saved users", err)
	}
	materializedUsers := make([]profilesrepo.SavedUser, 0, len(users))
	for _, user := range users {
		user.AvatarURL = mediaurl.Materialize(user.AvatarURL, s.mediaBaseURL)
		materializedUsers = append(materializedUsers, user)
	}
	return SavedHub{Sites: sites, Users: materializedUsers}, nil
}

func (s *Service) GetProfileViewByUsername(ctx context.Context, username, viewerUserID string) (ProfileView, error) {
	value := strings.TrimSpace(username)
	if value == "" {
		return ProfileView{}, apperrors.New(http.StatusBadRequest, "invalid_username", "username is required", nil)
	}
	viewerID := strings.TrimSpace(viewerUserID)
	if viewerID != "" {
		if _, err := uuid.Parse(viewerID); err != nil {
			return ProfileView{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid viewer id", err)
		}
	}

	item, err := s.repo.GetProfileViewByUsername(ctx, value, viewerID)
	if err != nil {
		if profilesrepo.IsNoRows(err) {
			return ProfileView{}, apperrors.New(http.StatusNotFound, "profile_not_found", "profile not found", err)
		}
		return ProfileView{}, apperrors.New(http.StatusInternalServerError, "profile_get_failed", "failed to fetch profile", err)
	}

	isSelf := viewerID != "" && viewerID == item.UserID
	canInteract := viewerID != "" && !isSelf && !item.IsBlocked && !item.HasBlocked

	return ProfileView{
		UserID:      item.UserID,
		Username:    item.Username,
		DisplayName: item.DisplayName,
		Bio:         item.Bio,
		AvatarURL:   mediaurl.Materialize(item.AvatarURL, s.mediaBaseURL),
		Location:    coarseLocation(item.LocationText),
		CreatedAt:   item.CreatedAt.UTC(),
		Counts: ProfileViewCounts{
			MediaPosts: item.PostsCount,
			Followers:  item.FollowersCount,
			Following:  item.FollowingCount,
		},
		Viewer: ProfileViewerRelationship{
			IsSelf:           isSelf,
			IsFollowing:      canInteract && item.IsFollowing,
			IsBlocked:        item.IsBlocked,
			HasBlockedViewer: item.HasBlocked,
			CanMessage:       canInteract,
			CanFollow:        canInteract,
			CanEdit:          isSelf,
		},
	}, nil
}

func (s *Service) ListProfileBucketListByUsername(ctx context.Context, username string, limit int32) ([]ProfileBucketListItem, error) {
	value := strings.TrimSpace(username)
	if value == "" {
		return nil, apperrors.New(http.StatusBadRequest, "invalid_username", "username is required", nil)
	}
	if limit <= 0 || limit > 60 {
		limit = 24
	}
	items, err := s.repo.ListProfileBucketListByUsername(ctx, value, limit)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "profile_bucketlist_failed", "failed to fetch profile bucketlist", err)
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
	return bucket, nil
}

func (s *Service) GetProfileDivingByUsername(ctx context.Context, username, viewerUserID string) (ProfileDiving, error) {
	value := strings.TrimSpace(username)
	if value == "" {
		return ProfileDiving{}, apperrors.New(http.StatusBadRequest, "invalid_username", "username is required", nil)
	}
	viewerID := strings.TrimSpace(viewerUserID)
	if viewerID != "" {
		if _, err := uuid.Parse(viewerID); err != nil {
			return ProfileDiving{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid viewer id", err)
		}
	}

	result, err := s.repo.ListProfileDivingByUsername(ctx, value, viewerID)
	if err != nil {
		return ProfileDiving{}, apperrors.New(http.StatusInternalServerError, "profile_diving_failed", "failed to fetch profile diving data", err)
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
			StartAt:          item.StartAt,
			EndAt:            item.EndAt,
			Visibility:       item.Visibility,
			ContactEnabled:   item.ContactEnabled,
			ViewerCanContact: item.ViewerCanContact,
			Note:             item.Note,
			CreatedAt:        item.CreatedAt,
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
			CreatedAt:        item.CreatedAt,
			UpdatedAt:        item.UpdatedAt,
		})
	}

	return ProfileDiving{Presences: presences, Affinities: affinities}, nil
}

func (s *Service) GetMyBadges(ctx context.Context, actorID string) (ProfileBadges, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return ProfileBadges{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}

	templates, err := s.repo.ListBadgeTemplates(ctx)
	if err != nil {
		return ProfileBadges{}, apperrors.New(http.StatusInternalServerError, "badge_templates_failed", "failed to load badge templates", err)
	}
	rows, err := s.repo.ListUserBadgesByUserID(ctx, actorID)
	if err != nil {
		return ProfileBadges{}, apperrors.New(http.StatusInternalServerError, "badges_failed", "failed to load badges", err)
	}
	visited, err := s.repo.CountDiveSitesVisitedByUserID(ctx, actorID)
	if err != nil {
		return ProfileBadges{}, apperrors.New(http.StatusInternalServerError, "badge_stats_failed", "failed to load badge stats", err)
	}

	return ProfileBadges{
		Templates: mapBadgeTemplates(templates),
		Badges:    s.mapUserBadges(rows),
		AutoStats: buildAutoStats(templates, visited),
	}, nil
}

func (s *Service) GetProfileBadgesByUsername(ctx context.Context, username string) (ProfileBadges, error) {
	value := strings.TrimSpace(username)
	if value == "" {
		return ProfileBadges{}, apperrors.New(http.StatusBadRequest, "invalid_username", "username is required", nil)
	}
	rows, err := s.repo.ListProfileBadgesByUsername(ctx, value)
	if err != nil {
		return ProfileBadges{}, apperrors.New(http.StatusInternalServerError, "badges_failed", "failed to load badges", err)
	}
	templates, err := s.repo.ListBadgeTemplates(ctx)
	if err != nil {
		return ProfileBadges{}, apperrors.New(http.StatusInternalServerError, "badge_templates_failed", "failed to load badge templates", err)
	}
	visited, err := s.repo.CountDiveSitesVisitedByUsername(ctx, value)
	if err != nil {
		return ProfileBadges{}, apperrors.New(http.StatusInternalServerError, "badge_stats_failed", "failed to load badge stats", err)
	}
	return ProfileBadges{
		Badges:    s.mapUserBadges(rows),
		AutoStats: buildAutoStats(templates, visited),
	}, nil
}

func (s *Service) CreateUserBadge(ctx context.Context, input UpsertUserBadgeInput) (UserBadge, error) {
	cleaned, err := s.validateBadgeInput(ctx, input, false)
	if err != nil {
		return UserBadge{}, err
	}
	if err := s.enforceRateLimit(ctx, "profiles.badges.write", cleaned.UserID, 20, time.Minute, "badge update rate exceeded"); err != nil {
		return UserBadge{}, err
	}
	row, err := s.repo.CreateUserBadge(ctx, cleaned)
	if err != nil {
		return UserBadge{}, apperrors.New(http.StatusInternalServerError, "badge_create_failed", "failed to create badge", err)
	}
	return s.mapUserBadge(row), nil
}

func (s *Service) UpdateUserBadge(ctx context.Context, input UpsertUserBadgeInput) (UserBadge, error) {
	cleaned, err := s.validateBadgeInput(ctx, input, true)
	if err != nil {
		return UserBadge{}, err
	}
	if err := s.enforceRateLimit(ctx, "profiles.badges.write", cleaned.UserID, 20, time.Minute, "badge update rate exceeded"); err != nil {
		return UserBadge{}, err
	}
	row, err := s.repo.UpdateUserBadge(ctx, cleaned)
	if err != nil {
		if profilesrepo.IsNoRows(err) {
			return UserBadge{}, apperrors.New(http.StatusNotFound, "badge_not_found", "badge not found", err)
		}
		return UserBadge{}, apperrors.New(http.StatusInternalServerError, "badge_update_failed", "failed to update badge", err)
	}
	return s.mapUserBadge(row), nil
}

func (s *Service) DeleteUserBadge(ctx context.Context, actorID, badgeID string) error {
	if _, err := uuid.Parse(actorID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(badgeID); err != nil {
		return apperrors.New(http.StatusBadRequest, "invalid_badge_id", "invalid badge id", err)
	}
	if err := s.enforceRateLimit(ctx, "profiles.badges.write", actorID, 20, time.Minute, "badge update rate exceeded"); err != nil {
		return err
	}
	if err := s.repo.DeleteUserBadge(ctx, badgeID, actorID); err != nil {
		if profilesrepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "badge_not_found", "badge not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "badge_delete_failed", "failed to delete badge", err)
	}
	return nil
}

func (s *Service) validateBadgeInput(ctx context.Context, input UpsertUserBadgeInput, requireBadgeID bool) (profilesrepo.UpsertUserBadgeInput, error) {
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return profilesrepo.UpsertUserBadgeInput{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if requireBadgeID {
		if _, err := uuid.Parse(input.BadgeID); err != nil {
			return profilesrepo.UpsertUserBadgeInput{}, apperrors.New(http.StatusBadRequest, "invalid_badge_id", "invalid badge id", err)
		}
	}
	if _, err := uuid.Parse(input.BadgeTemplateID); err != nil {
		return profilesrepo.UpsertUserBadgeInput{}, apperrors.New(http.StatusBadRequest, "invalid_badge_template_id", "invalid badge template id", err)
	}
	template, err := s.repo.GetBadgeTemplate(ctx, input.BadgeTemplateID)
	if err != nil {
		if profilesrepo.IsNoRows(err) {
			return profilesrepo.UpsertUserBadgeInput{}, apperrors.New(http.StatusBadRequest, "invalid_badge_template_id", "badge template not found", err)
		}
		return profilesrepo.UpsertUserBadgeInput{}, apperrors.New(http.StatusInternalServerError, "badge_template_failed", "failed to load badge template", err)
	}
	if template.IsSystem {
		return profilesrepo.UpsertUserBadgeInput{}, apperrors.New(http.StatusBadRequest, "system_badge_read_only", "system badges cannot be edited", nil)
	}

	valueText := trimOptional(input.ValueText, 160)
	referenceLabel := trimOptional(input.ReferenceLabel, 80)
	referenceValue := trimOptional(input.ReferenceValue, 160)
	proofMediaID := trimOptional(input.ProofMediaID, 80)
	sourceType := defaultStringPtr(input.SourceType, "manual")
	sourceID := trimOptional(input.SourceID, 160)
	visibility := defaultStringPtr(input.Visibility, "public")
	displayOrder := int32(0)
	if input.DisplayOrder != nil {
		displayOrder = *input.DisplayOrder
	}
	earnedAt := input.EarnedAt
	if earnedAt == nil && !requireBadgeID {
		now := time.Now().UTC()
		earnedAt = &now
	}
	if !validBadgeSourceType(sourceType) {
		return profilesrepo.UpsertUserBadgeInput{}, apperrors.New(http.StatusBadRequest, "invalid_source_type", "invalid badge source type", nil)
	}
	if !validBadgeVisibility(visibility) {
		return profilesrepo.UpsertUserBadgeInput{}, apperrors.New(http.StatusBadRequest, "invalid_visibility", "invalid badge visibility", nil)
	}
	if proofMediaID != nil {
		if _, err := uuid.Parse(*proofMediaID); err != nil {
			return profilesrepo.UpsertUserBadgeInput{}, apperrors.New(http.StatusBadRequest, "invalid_proof_media_id", "invalid proof media id", err)
		}
		ok, err := s.repo.UserOwnsProofMedia(ctx, input.ActorID, *proofMediaID)
		if err != nil {
			return profilesrepo.UpsertUserBadgeInput{}, apperrors.New(http.StatusInternalServerError, "proof_media_check_failed", "failed to check proof media", err)
		}
		if !ok {
			return profilesrepo.UpsertUserBadgeInput{}, apperrors.New(http.StatusBadRequest, "invalid_proof_media_id", "proof media must be an active badge proof upload owned by the user", nil)
		}
	}

	cleaned := profilesrepo.UpsertUserBadgeInput{
		ID:             input.BadgeID,
		UserID:         input.ActorID,
		TemplateID:     input.BadgeTemplateID,
		ValueText:      valueText,
		ReferenceLabel: referenceLabel,
		ReferenceValue: referenceValue,
		ProofMediaID:   proofMediaID,
		SourceType:     sourceType,
		SourceID:       sourceID,
		EarnedAt:       earnedAt,
		Visibility:     visibility,
		DisplayOrder:   displayOrder,
		MetadataJSON:   cleanMetadata(input.MetadataJSON),
	}

	switch template.ValueType {
	case "time":
		if input.ValueMinutes == nil && input.ValueSeconds == nil {
			return profilesrepo.UpsertUserBadgeInput{}, apperrors.New(http.StatusBadRequest, "badge_value_required", "time badge requires minutes or seconds", nil)
		}
		minutes := int32(0)
		seconds := int32(0)
		if input.ValueMinutes != nil {
			minutes = *input.ValueMinutes
		}
		if input.ValueSeconds != nil {
			seconds = *input.ValueSeconds
		}
		if minutes < 0 || seconds < 0 || seconds > 59 {
			return profilesrepo.UpsertUserBadgeInput{}, apperrors.New(http.StatusBadRequest, "invalid_badge_value", "time badge seconds must be 0-59 and minutes must be non-negative", nil)
		}
		cleaned.ValueMinutes = &minutes
		cleaned.ValueSeconds = &seconds
	case "distance", "number":
		if input.ValueNumber == nil || *input.ValueNumber < 0 {
			return profilesrepo.UpsertUserBadgeInput{}, apperrors.New(http.StatusBadRequest, "badge_value_required", "numeric badge requires a non-negative value", nil)
		}
		cleaned.ValueNumber = input.ValueNumber
	case "text":
		if valueText == nil {
			return profilesrepo.UpsertUserBadgeInput{}, apperrors.New(http.StatusBadRequest, "badge_value_required", "text badge requires a value", nil)
		}
	case "none":
	default:
		return profilesrepo.UpsertUserBadgeInput{}, apperrors.New(http.StatusBadRequest, "invalid_badge_value_type", "unsupported badge value type", nil)
	}

	return cleaned, nil
}

func (s *Service) mapProfile(item profilesrepo.Profile) Profile {
	return Profile{
		UserID:        item.UserID,
		Username:      item.Username,
		DisplayName:   item.DisplayName,
		EmailVerified: item.EmailVerified,
		PhoneVerified: item.PhoneVerified,
		BuddyCount:    item.BuddyCount,
		ReportCount:   item.ReportCount,
		Bio:           item.Bio,
		AvatarURL:     mediaurl.Materialize(item.AvatarURL, s.mediaBaseURL),
		Location:      coarseLocation(item.Location),
		HomeArea:      coarseLocation(firstNonEmpty(item.HomeArea, item.Location)),
		Interests:     trimInterests(item.Interests),
		CertLevel:     strings.TrimSpace(item.CertLevel),
		Socials:       trimSocials(item.Socials),
	}
}

func (s *Service) mapUserBadges(rows []profilesrepo.UserBadge) []UserBadge {
	items := make([]UserBadge, 0, len(rows))
	for _, row := range rows {
		items = append(items, s.mapUserBadge(row))
	}
	return items
}

func (s *Service) mapUserBadge(row profilesrepo.UserBadge) UserBadge {
	item := UserBadge{
		ID:                  row.ID,
		Template:            mapBadgeTemplate(row.Template),
		ValueText:           row.ValueText,
		ValueNumber:         row.ValueNumber,
		ValueMinutes:        row.ValueMinutes,
		ValueSeconds:        row.ValueSeconds,
		ReferenceLabel:      row.ReferenceLabel,
		ReferenceValue:      row.ReferenceValue,
		ProofMediaID:        row.ProofMediaID,
		ProofMediaObjectKey: row.ProofMediaObjectKey,
		VerificationStatus:  row.VerificationStatus,
		VerifiedAt:          row.VerifiedAt,
		VerifiedBy:          row.VerifiedBy,
		SourceType:          row.SourceType,
		SourceID:            row.SourceID,
		EarnedAt:            row.EarnedAt,
		Visibility:          row.Visibility,
		DisplayOrder:        row.DisplayOrder,
		Rarity:              row.Template.Rarity,
		SourceModule:        row.Template.SourceModule,
		IsAutoStat:          row.Template.Category == "auto_stat",
		MetadataJSON:        cleanMetadata(row.MetadataJSON),
		CreatedAt:           row.CreatedAt,
		UpdatedAt:           row.UpdatedAt,
	}
	item.DisplayValue = displayBadgeValue(item.Template, item.ValueNumber, item.ValueMinutes, item.ValueSeconds, item.ValueText)
	return item
}

func mapBadgeTemplates(rows []profilesrepo.BadgeTemplate) []BadgeTemplate {
	items := make([]BadgeTemplate, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapBadgeTemplate(row))
	}
	return items
}

func mapBadgeTemplate(row profilesrepo.BadgeTemplate) BadgeTemplate {
	return BadgeTemplate{
		ID:           row.ID,
		Slug:         row.Slug,
		Name:         row.Name,
		Category:     row.Category,
		ValueType:    row.ValueType,
		Unit:         row.Unit,
		Icon:         row.Icon,
		Description:  row.Description,
		IsSystem:     row.IsSystem,
		DisplayOrder: row.DisplayOrder,
		Rarity:       row.Rarity,
		IsPublic:     row.IsPublic,
		IsRepeatable: row.IsRepeatable,
		SourceModule: row.SourceModule,
		MetadataJSON: cleanMetadata(row.MetadataJSON),
	}
}

func buildAutoStats(templates []profilesrepo.BadgeTemplate, diveSitesVisited int64) []UserBadge {
	items := make([]UserBadge, 0, 1)
	for _, template := range templates {
		if template.Slug != "dive-sites-visited" {
			continue
		}
		value := float64(diveSitesVisited)
		item := UserBadge{
			ID:                 "system:dive-sites-visited",
			Template:           mapBadgeTemplate(template),
			ValueNumber:        &value,
			DisplayValue:       fmt.Sprintf("%d", diveSitesVisited),
			VerificationStatus: "verified",
			IsSystemVerified:   true,
			SourceType:         "system",
			Visibility:         "public",
			DisplayOrder:       template.DisplayOrder,
			Rarity:             template.Rarity,
			SourceModule:       template.SourceModule,
			IsAutoStat:         true,
			MetadataJSON: map[string]any{
				"contract": "transitional_media_posts_until_user_dive_sites",
			},
		}
		items = append(items, item)
	}
	return items
}

func displayBadgeValue(template BadgeTemplate, valueNumber *float64, minutes *int32, seconds *int32, valueText string) string {
	switch template.ValueType {
	case "time":
		minuteValue := int32(0)
		secondValue := int32(0)
		if minutes != nil {
			minuteValue = *minutes
		}
		if seconds != nil {
			secondValue = *seconds
		}
		return fmt.Sprintf("%d:%02d", minuteValue, secondValue)
	case "distance":
		if valueNumber == nil {
			return ""
		}
		unit := strings.TrimSpace(template.Unit)
		return fmt.Sprintf("%s%s", formatNumber(*valueNumber), unit)
	case "number":
		if valueNumber == nil {
			return ""
		}
		return formatNumber(*valueNumber)
	case "text":
		return strings.TrimSpace(valueText)
	default:
		return ""
	}
}

func formatNumber(value float64) string {
	if value == float64(int64(value)) {
		return fmt.Sprintf("%d", int64(value))
	}
	return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%.2f", value), "0"), ".")
}

func trimOptional(input *string, maxLen int) *string {
	if input == nil {
		return nil
	}
	value := strings.TrimSpace(*input)
	if value == "" {
		return nil
	}
	if maxLen > 0 && len(value) > maxLen {
		value = value[:maxLen]
	}
	return &value
}

func defaultStringPtr(input *string, fallback string) string {
	if input == nil || strings.TrimSpace(*input) == "" {
		return fallback
	}
	return strings.TrimSpace(*input)
}

func validBadgeSourceType(value string) bool {
	switch value {
	case "manual", "profile", "dive_map", "course", "event", "school", "system", "admin":
		return true
	default:
		return false
	}
}

func validBadgeVisibility(value string) bool {
	switch value {
	case "public", "private":
		return true
	default:
		return false
	}
}

func cleanMetadata(input map[string]any) map[string]any {
	if len(input) == 0 {
		return map[string]any{}
	}
	return input
}

// BadgeJourneyEventPayload documents the stable payload future Dive Journey
// integration should receive from badge create/update/verification/removal
// flows. The profile service does not emit Journey events yet.
type BadgeJourneyEventPayload struct {
	UserID             string
	BadgeTemplateID    string
	UserBadgeID        string
	SourceType         string
	SourceID           string
	EarnedAt           *time.Time
	Visibility         string
	VerificationStatus string
}

func coarseLocation(input string) string {
	value := strings.TrimSpace(input)
	if value == "" {
		return ""
	}

	parts := strings.Split(value, ",")
	if len(parts) == 0 {
		return value
	}
	return strings.TrimSpace(parts[0])
}

func trimSocials(input map[string]string) map[string]string {
	if len(input) == 0 {
		return map[string]string{}
	}
	result := make(map[string]string, len(input))
	for key, value := range input {
		trimmedValue := strings.TrimSpace(value)
		if strings.TrimSpace(key) == "" || trimmedValue == "" {
			continue
		}
		result[strings.TrimSpace(key)] = trimmedValue
	}
	return result
}

func trimInterests(input []string) []string {
	if len(input) == 0 {
		return []string{}
	}
	result := make([]string, 0, len(input))
	seen := map[string]struct{}{}
	for _, value := range input {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
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
