package service

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"

	profilesrepo "fphgo/internal/features/profiles/repo"
	apperrors "fphgo/internal/shared/errors"
)

type Service struct {
	repo *profilesrepo.Repo
}

type Profile struct {
	UserID      string            `json:"userId"`
	Username    string            `json:"username"`
	DisplayName string            `json:"displayName"`
	Bio         string            `json:"bio"`
	AvatarURL   string            `json:"avatarUrl"`
	Location    string            `json:"location"`
	Socials     map[string]string `json:"socials"`
}

type UpdateMyProfileInput struct {
	ActorID     string
	DisplayName *string
	Bio         *string
	AvatarURL   *string
	Location    *string
	Socials     *map[string]string
}

func New(repo *profilesrepo.Repo) *Service {
	return &Service{repo: repo}
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

	return mapProfile(item), nil
}

func (s *Service) UpdateMyProfile(ctx context.Context, input UpdateMyProfileInput) (Profile, error) {
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return Profile{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
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
		update.AvatarURL = strings.TrimSpace(*input.AvatarURL)
	}
	if input.Location != nil {
		update.Location = strings.TrimSpace(*input.Location)
	}
	if input.Socials != nil {
		update.Socials = trimSocials(*input.Socials)
	}

	item, err := s.repo.UpsertMyProfile(ctx, update)
	if err != nil {
		return Profile{}, apperrors.New(http.StatusInternalServerError, "profile_update_failed", "failed to update profile", err)
	}

	return mapProfile(item), nil
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
			AvatarURL:   row.AvatarURL,
			Location:    coarseLocation(row.Location),
			Socials:     map[string]string{},
		})
	}

	return items, nil
}

func mapProfile(item profilesrepo.Profile) Profile {
	return Profile{
		UserID:      item.UserID,
		Username:    item.Username,
		DisplayName: item.DisplayName,
		Bio:         item.Bio,
		AvatarURL:   item.AvatarURL,
		Location:    coarseLocation(item.Location),
		Socials:     trimSocials(item.Socials),
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
