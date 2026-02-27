package service

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	blocksrepo "fphgo/internal/features/blocks/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

type Service struct {
	repo repository
}

type repository interface {
	CreateBlock(ctx context.Context, blockerID, blockedID string) error
	DeleteBlock(ctx context.Context, blockerID, blockedID string) error
	ListBlocksByBlocker(ctx context.Context, input blocksrepo.ListBlocksInput) ([]blocksrepo.Block, error)
	IsBlockedEitherDirection(ctx context.Context, a, b string) (bool, error)
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

func New(repo repository) *Service {
	return &Service{repo: repo}
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

	if err := s.repo.DeleteBlock(ctx, blockerID, blockedID); err != nil {
		return apperrors.New(http.StatusInternalServerError, "block_delete_failed", "failed to unblock user", err)
	}
	return nil
}

func (s *Service) ListBlocks(ctx context.Context, blockerID string, limit int32, cursor string) (ListResult, error) {
	if _, err := uuid.Parse(blockerID); err != nil {
		return ListResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}

	if limit <= 0 || limit > 100 {
		limit = 20
	}

	cursorCreated := time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC)
	cursorUserID := "ffffffff-ffff-ffff-ffff-ffffffffffff"
	if strings.TrimSpace(cursor) != "" {
		createdAt, blockedUserID, err := decodeCursor(cursor)
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
		nextCursor = encodeCursor(next.CreatedAt, next.BlockedUserID)
		rows = rows[:limit]
	}

	items := make([]Block, 0, len(rows))
	for _, row := range rows {
		items = append(items, Block{
			BlockedUserID: row.BlockedUserID,
			Username:      row.Username,
			DisplayName:   row.DisplayName,
			AvatarURL:     row.AvatarURL,
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

func encodeCursor(createdAt time.Time, blockedUserID string) string {
	payload := fmt.Sprintf("%d|%s", createdAt.UnixNano(), blockedUserID)
	return base64.RawURLEncoding.EncodeToString([]byte(payload))
}

func decodeCursor(cursor string) (time.Time, string, error) {
	raw, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return time.Time{}, "", err
	}
	parts := strings.Split(string(raw), "|")
	if len(parts) != 2 {
		return time.Time{}, "", fmt.Errorf("invalid cursor format")
	}
	nanos, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return time.Time{}, "", err
	}
	blocked := parts[1]
	if _, err := uuid.Parse(blocked); err != nil {
		return time.Time{}, "", err
	}
	return time.Unix(0, nanos).UTC(), blocked, nil
}
