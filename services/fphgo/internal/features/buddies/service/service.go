package service

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"

	buddiesrepo "fphgo/internal/features/buddies/repo"
	apperrors "fphgo/internal/shared/errors"
	sharedratelimit "fphgo/internal/shared/ratelimit"
	"fphgo/internal/shared/validatex"
)

const (
	statusPending   = "pending"
	statusAccepted  = "accepted"
	statusDeclined  = "declined"
	statusCancelled = "cancelled"

	defaultPreviewLimit = 6
)

type Service struct {
	repo    repository
	limiter rateLimiter
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

type repository interface {
	UserExists(ctx context.Context, userID string) (bool, error)
	IsBlockedEitherDirection(ctx context.Context, a, b string) (bool, error)
	AreBuddies(ctx context.Context, a, b string) (bool, error)
	GetPendingRequestBetweenUsers(ctx context.Context, a, b string) (buddiesrepo.BuddyRequest, error)
	CreateBuddyRequest(ctx context.Context, requesterUserID, targetUserID string) (buddiesrepo.BuddyRequest, error)
	GetBuddyRequestByID(ctx context.Context, requestID string) (buddiesrepo.BuddyRequest, error)
	UpdateBuddyRequestStatus(ctx context.Context, requestID, status string) error
	CreateBuddyPair(ctx context.Context, a, b string) error
	AcceptBuddyRequest(ctx context.Context, requestID, requesterID, targetUserID string) error
	DeleteBuddyPair(ctx context.Context, a, b string) error
	ListIncomingBuddyRequests(ctx context.Context, actorUserID string) ([]buddiesrepo.IncomingRequest, error)
	ListOutgoingBuddyRequests(ctx context.Context, actorUserID string) ([]buddiesrepo.OutgoingRequest, error)
	ListBuddies(ctx context.Context, actorUserID string) ([]buddiesrepo.Buddy, error)
	BuddyPreview(ctx context.Context, targetUserID, viewerUserID string, limit int) (buddiesrepo.BuddyPreviewResult, error)
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

func (s *Service) CreateRequest(ctx context.Context, actorID, targetUserID string) (buddiesrepo.BuddyRequest, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if err := s.enforceRateLimit(ctx, "buddies.create_request", actorID, 20, time.Hour, "buddy request rate exceeded"); err != nil {
		return buddiesrepo.BuddyRequest{}, err
	}
	if _, err := uuid.Parse(targetUserID); err != nil {
		return buddiesrepo.BuddyRequest{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"targetUserId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if actorID == targetUserID {
		return buddiesrepo.BuddyRequest{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"targetUserId"},
			Code:    "custom",
			Message: "cannot request yourself",
		}}}
	}

	exists, err := s.repo.UserExists(ctx, targetUserID)
	if err != nil {
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusInternalServerError, "buddy_request_failed", "failed to validate target user", err)
	}
	if !exists {
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusNotFound, "target_user_not_found", "target user not found", nil)
	}

	blocked, err := s.repo.IsBlockedEitherDirection(ctx, actorID, targetUserID)
	if err != nil {
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusInternalServerError, "block_check_failed", "failed to validate block state", err)
	}
	if blocked {
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusForbidden, "blocked", "buddy request blocked between users", nil)
	}

	areBuddies, err := s.repo.AreBuddies(ctx, actorID, targetUserID)
	if err != nil {
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusInternalServerError, "buddy_check_failed", "failed to validate buddy relationship", err)
	}
	if areBuddies {
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusConflict, "already_buddies", "users are already buddies", nil)
	}

	existing, err := s.repo.GetPendingRequestBetweenUsers(ctx, actorID, targetUserID)
	if err == nil {
		if existing.RequesterUserID == actorID && existing.TargetUserID == targetUserID {
			return existing, nil
		}
		// Reverse pending request exists (target already sent us a request).
		// Auto-accept: both users clearly want to be buddies.
		if err := s.repo.AcceptBuddyRequest(ctx, existing.ID, existing.RequesterUserID, existing.TargetUserID); err != nil {
			return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusInternalServerError, "buddy_accept_failed", "failed to auto-accept reverse request", err)
		}
		existing.Status = statusAccepted
		existing.UpdatedAt = time.Now().UTC()
		return existing, nil
	}
	if !buddiesrepo.IsNoRows(err) {
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusInternalServerError, "buddy_request_failed", "failed to validate existing buddy request", err)
	}

	request, err := s.repo.CreateBuddyRequest(ctx, actorID, targetUserID)
	if err != nil {
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusInternalServerError, "buddy_request_failed", "failed to create buddy request", err)
	}
	return request, nil
}

func (s *Service) ListIncoming(ctx context.Context, actorID string) ([]buddiesrepo.IncomingRequest, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return nil, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	items, err := s.repo.ListIncomingBuddyRequests(ctx, actorID)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "buddy_list_failed", "failed to list incoming requests", err)
	}
	return items, nil
}

func (s *Service) ListOutgoing(ctx context.Context, actorID string) ([]buddiesrepo.OutgoingRequest, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return nil, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	items, err := s.repo.ListOutgoingBuddyRequests(ctx, actorID)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "buddy_list_failed", "failed to list outgoing requests", err)
	}
	return items, nil
}

func (s *Service) AcceptRequest(ctx context.Context, actorID, requestID string) (buddiesrepo.BuddyRequest, error) {
	return s.transitionRequest(ctx, actorID, requestID, statusAccepted)
}

func (s *Service) DeclineRequest(ctx context.Context, actorID, requestID string) (buddiesrepo.BuddyRequest, error) {
	return s.transitionRequest(ctx, actorID, requestID, statusDeclined)
}

func (s *Service) transitionRequest(ctx context.Context, actorID, requestID, nextStatus string) (buddiesrepo.BuddyRequest, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if err := s.enforceRateLimit(ctx, "buddies.transition", actorID, 60, time.Minute, "buddy transition rate exceeded"); err != nil {
		return buddiesrepo.BuddyRequest{}, err
	}
	if _, err := uuid.Parse(requestID); err != nil {
		return buddiesrepo.BuddyRequest{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"requestId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}

	request, err := s.repo.GetBuddyRequestByID(ctx, requestID)
	if err != nil {
		if buddiesrepo.IsNoRows(err) {
			return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusNotFound, "request_not_found", "buddy request not found", err)
		}
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusInternalServerError, "buddy_request_failed", "failed to fetch buddy request", err)
	}
	if request.Status != statusPending {
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusConflict, "invalid_state", "buddy request is not pending", nil)
	}
	if request.TargetUserID != actorID {
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusForbidden, "forbidden", "only target user can resolve request", nil)
	}

	if nextStatus == statusAccepted {
		blocked, checkErr := s.repo.IsBlockedEitherDirection(ctx, request.RequesterUserID, request.TargetUserID)
		if checkErr != nil {
			return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusInternalServerError, "block_check_failed", "failed to validate block state", checkErr)
		}
		if blocked {
			return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusForbidden, "blocked", "buddy request blocked between users", nil)
		}
		if err := s.repo.AcceptBuddyRequest(ctx, request.ID, request.RequesterUserID, request.TargetUserID); err != nil {
			return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusInternalServerError, "buddy_accept_failed", "failed to accept buddy request", err)
		}
	} else if err := s.repo.UpdateBuddyRequestStatus(ctx, request.ID, nextStatus); err != nil {
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusInternalServerError, "buddy_request_failed", "failed to update buddy request", err)
	}

	request.Status = nextStatus
	request.UpdatedAt = time.Now().UTC()
	return request, nil
}

func (s *Service) RemoveBuddy(ctx context.Context, actorID, buddyUserID string) error {
	if _, err := uuid.Parse(actorID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if err := s.enforceRateLimit(ctx, "buddies.remove", actorID, 30, time.Minute, "buddy removal rate exceeded"); err != nil {
		return err
	}
	if _, err := uuid.Parse(buddyUserID); err != nil {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"buddyUserId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if actorID == buddyUserID {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"buddyUserId"},
			Code:    "custom",
			Message: "cannot remove yourself",
		}}}
	}

	if err := s.repo.DeleteBuddyPair(ctx, actorID, buddyUserID); err != nil {
		return apperrors.New(http.StatusInternalServerError, "buddy_remove_failed", "failed to remove buddy", err)
	}
	return nil
}

func (s *Service) CancelRequest(ctx context.Context, actorID, requestID string) (buddiesrepo.BuddyRequest, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if err := s.enforceRateLimit(ctx, "buddies.transition", actorID, 60, time.Minute, "buddy transition rate exceeded"); err != nil {
		return buddiesrepo.BuddyRequest{}, err
	}
	if _, err := uuid.Parse(requestID); err != nil {
		return buddiesrepo.BuddyRequest{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"requestId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}

	request, err := s.repo.GetBuddyRequestByID(ctx, requestID)
	if err != nil {
		if buddiesrepo.IsNoRows(err) {
			return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusNotFound, "request_not_found", "buddy request not found", err)
		}
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusInternalServerError, "buddy_request_failed", "failed to fetch buddy request", err)
	}
	if request.Status != statusPending {
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusConflict, "invalid_state", "buddy request is not pending", nil)
	}
	if request.RequesterUserID != actorID {
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusForbidden, "forbidden", "only the requester can cancel their request", nil)
	}

	if err := s.repo.UpdateBuddyRequestStatus(ctx, request.ID, statusCancelled); err != nil {
		return buddiesrepo.BuddyRequest{}, apperrors.New(http.StatusInternalServerError, "buddy_request_failed", "failed to cancel buddy request", err)
	}

	request.Status = statusCancelled
	request.UpdatedAt = time.Now().UTC()
	return request, nil
}

func (s *Service) ListBuddies(ctx context.Context, actorID string) ([]buddiesrepo.Buddy, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return nil, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	items, err := s.repo.ListBuddies(ctx, actorID)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "buddy_list_failed", "failed to list buddies", err)
	}
	return items, nil
}

func (s *Service) BuddyPreview(ctx context.Context, viewerID, targetUserID string) (buddiesrepo.BuddyPreviewResult, error) {
	if _, err := uuid.Parse(viewerID); err != nil {
		return buddiesrepo.BuddyPreviewResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(targetUserID); err != nil {
		return buddiesrepo.BuddyPreviewResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"userId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}

	exists, err := s.repo.UserExists(ctx, targetUserID)
	if err != nil {
		return buddiesrepo.BuddyPreviewResult{}, apperrors.New(http.StatusInternalServerError, "buddy_preview_failed", "failed to validate target user", err)
	}
	if !exists {
		return buddiesrepo.BuddyPreviewResult{}, apperrors.New(http.StatusNotFound, "user_not_found", "user not found", nil)
	}

	result, err := s.repo.BuddyPreview(ctx, targetUserID, viewerID, defaultPreviewLimit)
	if err != nil {
		return buddiesrepo.BuddyPreviewResult{}, apperrors.New(http.StatusInternalServerError, "buddy_preview_failed", "failed to load buddy preview", err)
	}
	return result, nil
}
