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
	GetPublicProfileByUsername(ctx context.Context, username string) (profilesrepo.PublicProfile, error)
	ListPublicProfilePostsByUsername(ctx context.Context, username string, limit int32) ([]profilesrepo.PublicProfilePost, error)
	ListProfileBucketListByUsername(ctx context.Context, username string, limit int32) ([]profilesrepo.ProfileBucketListItem, error)
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

type PublicProfile struct {
	UserID      string
	Username    string
	DisplayName string
	Bio         string
	AvatarURL   string
	Counts      PublicProfileCounts
}

type PublicProfileCounts struct {
	Posts     int64
	Followers int64
	Following int64
}

type PublicProfilePost struct {
	ID           string
	SiteID       string
	SiteSlug     string
	SiteName     string
	SiteArea     string
	Caption      string
	OccurredAt   string
	ThumbURL     string
	MediaType    string
	LikeCount    int64
	CommentCount int64
}

type ProfileBucketListItem struct {
	SiteID   string
	SiteSlug string
	SiteName string
	SiteArea string
	PinnedAt string
	HasDived bool
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

func (s *Service) GetPublicProfileByUsername(ctx context.Context, username string) (PublicProfile, error) {
	value := strings.TrimSpace(username)
	if value == "" {
		return PublicProfile{}, apperrors.New(http.StatusBadRequest, "invalid_username", "username is required", nil)
	}
	item, err := s.repo.GetPublicProfileByUsername(ctx, value)
	if err != nil {
		if profilesrepo.IsNoRows(err) {
			return PublicProfile{}, apperrors.New(http.StatusNotFound, "profile_not_found", "profile not found", err)
		}
		return PublicProfile{}, apperrors.New(http.StatusInternalServerError, "profile_get_failed", "failed to fetch profile", err)
	}
	return PublicProfile{
		UserID:      item.UserID,
		Username:    item.Username,
		DisplayName: item.DisplayName,
		Bio:         item.Bio,
		AvatarURL:   mediaurl.Materialize(item.AvatarURL, s.mediaBaseURL),
		Counts: PublicProfileCounts{
			Posts:     item.PostsCount,
			Followers: item.FollowersCount,
			Following: item.FollowingCount,
		},
	}, nil
}

func (s *Service) ListPublicProfilePostsByUsername(ctx context.Context, username string, limit int32) ([]PublicProfilePost, error) {
	value := strings.TrimSpace(username)
	if value == "" {
		return nil, apperrors.New(http.StatusBadRequest, "invalid_username", "username is required", nil)
	}
	if limit <= 0 || limit > 60 {
		limit = 24
	}
	items, err := s.repo.ListPublicProfilePostsByUsername(ctx, value, limit)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "profile_posts_failed", "failed to fetch profile posts", err)
	}
	posts := make([]PublicProfilePost, 0, len(items))
	for _, item := range items {
		posts = append(posts, PublicProfilePost{
			ID:           item.ID,
			SiteID:       item.SiteID,
			SiteSlug:     item.SiteSlug,
			SiteName:     item.SiteName,
			SiteArea:     item.SiteArea,
			Caption:      item.Caption,
			OccurredAt:   item.OccurredAt,
			ThumbURL:     item.ThumbURL,
			MediaType:    item.MediaType,
			LikeCount:    item.LikeCount,
			CommentCount: item.CommentCount,
		})
	}
	return posts, nil
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
