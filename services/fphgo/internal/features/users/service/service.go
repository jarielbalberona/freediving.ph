package service

import (
	"context"
	"errors"
	"net/http"
	"strings"

	clerkuser "github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/jackc/pgx/v5"

	"fphgo/internal/features/users/repo"
	apperrors "fphgo/internal/shared/errors"
)

type Service struct {
	repo *repo.Repo
}

type CreateUserInput struct {
	Username    string
	DisplayName string
	Bio         string
}

type User struct {
	ID          string
	Username    string
	DisplayName string
	Bio         string
}

func New(repo *repo.Repo) *Service { return &Service{repo: repo} }

func (s *Service) CreateUser(ctx context.Context, input CreateUserInput) (User, error) {
	if strings.TrimSpace(input.Username) == "" {
		return User{}, apperrors.New(http.StatusBadRequest, "invalid_input", "username is required", nil)
	}

	created, err := s.repo.CreateUserWithProfile(ctx, strings.TrimSpace(input.Username), strings.TrimSpace(input.DisplayName), strings.TrimSpace(input.Bio))
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return User{}, apperrors.New(http.StatusConflict, "username_taken", "username already exists", err)
		}
		return User{}, apperrors.New(http.StatusInternalServerError, "create_user_failed", "failed to create user", err)
	}

	return User(created), nil
}

func (s *Service) GetUser(ctx context.Context, id string) (User, error) {
	u, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, apperrors.New(http.StatusNotFound, "user_not_found", "user not found", err)
		}
		if strings.Contains(err.Error(), "invalid user id") {
			return User{}, apperrors.New(http.StatusBadRequest, "invalid_user_id", "invalid user id", err)
		}
		return User{}, apperrors.New(http.StatusInternalServerError, "get_user_failed", "failed to fetch user", err)
	}
	return User(u), nil
}

func (s *Service) GetUserByUsername(ctx context.Context, username string) (User, error) {
	u, err := s.repo.GetUserByUsername(ctx, username)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, apperrors.New(http.StatusNotFound, "profile_not_found", "profile not found", err)
		}
		return User{}, apperrors.New(http.StatusInternalServerError, "get_profile_failed", "failed to fetch profile", err)
	}
	return User(u), nil
}

func (s *Service) EnsureLocalUserForClerk(ctx context.Context, clerkUserID string) (User, error) {
	username, displayName := fetchClerkUserInfo(ctx, clerkUserID)

	u, err := s.repo.EnsureLocalUserForClerk(ctx, clerkUserID, username, displayName)
	if err != nil {
		if strings.Contains(err.Error(), "clerk user id is required") {
			return User{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", err)
		}
		return User{}, apperrors.New(http.StatusInternalServerError, "ensure_user_failed", "failed to resolve local user", err)
	}
	return User(u), nil
}

func fetchClerkUserInfo(ctx context.Context, clerkUserID string) (username, displayName string) {
	u, err := clerkuser.Get(ctx, clerkUserID)
	if err != nil || u == nil {
		return "", ""
	}

	if u.Username != nil {
		username = *u.Username
	}

	var parts []string
	if u.FirstName != nil && *u.FirstName != "" {
		parts = append(parts, *u.FirstName)
	}
	if u.LastName != nil && *u.LastName != "" {
		parts = append(parts, *u.LastName)
	}
	displayName = strings.Join(parts, " ")

	return username, displayName
}
