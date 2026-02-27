package service

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"

	chikarepo "fph-api-go/internal/features/chika/repo"
	apperrors "fph-api-go/internal/shared/errors"
)

type Service struct {
	repo *chikarepo.Repo
}

type CreatePostInput struct {
	ThreadID string
	UserID   string
	Content  string
}

func New(repo *chikarepo.Repo) *Service { return &Service{repo: repo} }

func (s *Service) CreatePost(ctx context.Context, input CreatePostInput) (chikarepo.Post, error) {
	if _, err := uuid.Parse(input.ThreadID); err != nil {
		return chikarepo.Post{}, apperrors.New(http.StatusBadRequest, "invalid_thread_id", "invalid thread id", err)
	}
	if _, err := uuid.Parse(input.UserID); err != nil {
		return chikarepo.Post{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid user id", err)
	}
	if strings.TrimSpace(input.Content) == "" {
		return chikarepo.Post{}, apperrors.New(http.StatusBadRequest, "invalid_content", "content is required", nil)
	}

	if err := s.repo.EnsureThread(ctx, input.ThreadID); err != nil {
		return chikarepo.Post{}, apperrors.New(http.StatusInternalServerError, "thread_upsert_failed", "failed to ensure thread", err)
	}

	enabled, err := s.repo.PseudonymEnabled(ctx, input.UserID)
	if err != nil {
		return chikarepo.Post{}, apperrors.New(http.StatusInternalServerError, "pseudonym_policy_failed", "failed to resolve pseudonym settings", err)
	}

	pseudonym := "anon-" + input.UserID[:8]
	if !enabled {
		username, err := s.repo.Username(ctx, input.UserID)
		if err != nil {
			return chikarepo.Post{}, apperrors.New(http.StatusInternalServerError, "username_lookup_failed", "failed to resolve author username", err)
		}
		pseudonym = username
	}

	post, err := s.repo.CreatePost(ctx, input.ThreadID, input.UserID, pseudonym, strings.TrimSpace(input.Content))
	if err != nil {
		return chikarepo.Post{}, apperrors.New(http.StatusInternalServerError, "post_create_failed", "failed to create post", err)
	}
	return post, nil
}
