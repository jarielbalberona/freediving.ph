package service

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"

	"fph-api-go/internal/features/users/repo"
	apperrors "fph-api-go/internal/shared/errors"
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
	user, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, apperrors.New(http.StatusNotFound, "user_not_found", "user not found", err)
		}
		if strings.Contains(err.Error(), "invalid user id") {
			return User{}, apperrors.New(http.StatusBadRequest, "invalid_user_id", "invalid user id", err)
		}
		return User{}, apperrors.New(http.StatusInternalServerError, "get_user_failed", "failed to fetch user", err)
	}
	return User(user), nil
}

func (s *Service) EnsureLocalUserForClerk(ctx context.Context, clerkUserID string) (User, error) {
	user, err := s.repo.EnsureLocalUserForClerk(ctx, clerkUserID)
	if err != nil {
		if strings.Contains(err.Error(), "clerk user id is required") {
			return User{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", err)
		}
		return User{}, apperrors.New(http.StatusInternalServerError, "ensure_user_failed", "failed to resolve local user", err)
	}
	return User(user), nil
}
