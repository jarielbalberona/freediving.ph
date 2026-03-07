package service

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	blocksrepo "fphgo/internal/features/blocks/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/mediaurl"
	"fphgo/internal/shared/pagination"
	sharedratelimit "fphgo/internal/shared/ratelimit"
	"fphgo/internal/shared/validatex"
)

type Service struct {
	repo    repository
	limiter rateLimiter
}

type repository interface {
	CreateBlock(ctx context.Context, blockerID, blockedID string) error
	DeleteBlock(ctx context.Context, blockerID, blockedID string) error
	ListBlocksByBlocker(ctx context.Context, input blocksrepo.ListBlocksInput) ([]blocksrepo.Block, error)
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

type Block struct {
	BlockedUserID string `json:"blockedUserId"`
	Username      string `json:"username"`
	DisplayName   string `json:"displayName"`
	AvatarURL     string `json:"avatarUrl"`
	CreatedAt     string `json:"createdAt"`
}

type ListResult struct {
	Items      []Block
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

func (s *Service) BlockUser(ctx context.Context, blockerID, blockedID string) error {
	if _, err := uuid.Parse(blockerID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(blockedID); err != nil {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"blockedUserId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if blockerID == blockedID {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"blockedUserId"},
			Code:    "custom",
			Message: "cannot block yourself",
		}}}
	}
	if err := s.enforceRateLimit(ctx, "blocks.write", blockerID, 40, time.Minute, "block write rate exceeded"); err != nil {
		return err
	}

	if err := s.repo.CreateBlock(ctx, blockerID, blockedID); err != nil {
		return apperrors.New(http.StatusInternalServerError, "block_create_failed", "failed to block user", err)
	}
	return nil
}

func (s *Service) UnblockUser(ctx context.Context, blockerID, blockedID string) error {
	if _, err := uuid.Parse(blockerID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(blockedID); err != nil {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"blockedUserId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if err := s.enforceRateLimit(ctx, "blocks.write", blockerID, 40, time.Minute, "block write rate exceeded"); err != nil {
		return err
	}

	if err := s.repo.DeleteBlock(ctx, blockerID, blockedID); err != nil {
		return apperrors.New(http.StatusInternalServerError, "block_delete_failed", "failed to unblock user", err)
	}
	return nil
}

func (s *Service) ListBlocks(ctx context.Context, blockerID string, limit int32, cursor string) (ListResult, error) {
	if _, err := uuid.Parse(blockerID); err != nil {
		return ListResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}

	if limit <= 0 || limit > pagination.MaxLimit {
		limit = pagination.DefaultLimit
	}

	cursorCreated, cursorUserID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(cursor) != "" {
		createdAt, blockedUserID, err := pagination.DecodeUUID(cursor)
		if err != nil {
			return ListResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"cursor"},
				Code:    "custom",
				Message: "invalid cursor",
			}}}
		}
		cursorCreated = createdAt
		cursorUserID = blockedUserID
	}

	rows, err := s.repo.ListBlocksByBlocker(ctx, blocksrepo.ListBlocksInput{
		BlockerUserID: blockerID,
		CursorCreated: cursorCreated,
		CursorUserID:  cursorUserID,
		Limit:         limit + 1,
	})
	if err != nil {
		return ListResult{}, apperrors.New(http.StatusInternalServerError, "block_list_failed", "failed to list blocks", err)
	}

	nextCursor := ""
	if int32(len(rows)) > limit {
		next := rows[limit-1]
		nextCursor = pagination.Encode(next.CreatedAt, next.BlockedUserID)
		rows = rows[:limit]
	}

	items := make([]Block, 0, len(rows))
	for _, row := range rows {
		items = append(items, Block{
			BlockedUserID: row.BlockedUserID,
			Username:      row.Username,
			DisplayName:   row.DisplayName,
			AvatarURL:     mediaurl.MaterializeWithDefault(row.AvatarURL),
			CreatedAt:     row.CreatedAt.Format(time.RFC3339),
		})
	}
	return ListResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) IsBlockedEitherDirection(ctx context.Context, a, b string) (bool, error) {
	if _, err := uuid.Parse(a); err != nil {
		return false, apperrors.New(http.StatusBadRequest, "invalid_user_id", "invalid user id", err)
	}
	if _, err := uuid.Parse(b); err != nil {
		return false, apperrors.New(http.StatusBadRequest, "invalid_user_id", "invalid user id", err)
	}

	blocked, err := s.repo.IsBlockedEitherDirection(ctx, a, b)
	if err != nil {
		return false, apperrors.New(http.StatusInternalServerError, "block_check_failed", "failed to check block state", err)
	}
	return blocked, nil
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
