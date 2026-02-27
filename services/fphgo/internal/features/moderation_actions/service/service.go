package service

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"

	moderationrepo "fphgo/internal/features/moderation_actions/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

const (
	statusActive    = "active"
	statusReadOnly  = "read_only"
	statusSuspended = "suspended"
)

type repository interface {
	SetUserStatusAndAudit(ctx context.Context, userID, accountStatus string, action moderationrepo.ActionInput) (moderationrepo.ModerationAction, error)
	HideThreadAndAudit(ctx context.Context, threadID string, action moderationrepo.ActionInput) (moderationrepo.ModerationAction, error)
	UnhideThreadAndAudit(ctx context.Context, threadID string, action moderationrepo.ActionInput) (moderationrepo.ModerationAction, error)
	HideCommentAndAudit(ctx context.Context, commentID int64, action moderationrepo.ActionInput) (moderationrepo.ModerationAction, error)
	UnhideCommentAndAudit(ctx context.Context, commentID int64, action moderationrepo.ActionInput) (moderationrepo.ModerationAction, error)
	ReportExists(ctx context.Context, reportID string) (bool, error)
}

type Service struct {
	repo repository
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (e ValidationFailure) Error() string { return "validation failed" }

type ActionInput struct {
	ActorUserID string
	Reason      string
	ReportID    *string
}

type ModerationAction struct {
	ID          string
	ActorUserID string
	TargetType  string
	TargetID    string
	Action      string
	Reason      string
	ReportID    string
	CreatedAt   string
}

func New(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) SuspendUser(ctx context.Context, appUserID string, input ActionInput) (ModerationAction, error) {
	return s.applyUserAction(ctx, appUserID, statusSuspended, "suspend_user", input)
}

func (s *Service) UnsuspendUser(ctx context.Context, appUserID string, input ActionInput) (ModerationAction, error) {
	return s.applyUserAction(ctx, appUserID, statusActive, "unsuspend_user", input)
}

func (s *Service) SetUserReadOnly(ctx context.Context, appUserID string, input ActionInput) (ModerationAction, error) {
	return s.applyUserAction(ctx, appUserID, statusReadOnly, "set_user_read_only", input)
}

func (s *Service) ClearUserReadOnly(ctx context.Context, appUserID string, input ActionInput) (ModerationAction, error) {
	return s.applyUserAction(ctx, appUserID, statusActive, "clear_user_read_only", input)
}

func (s *Service) HideThread(ctx context.Context, threadID string, input ActionInput) (ModerationAction, error) {
	if _, err := uuid.Parse(threadID); err != nil {
		return ModerationAction{}, invalidUUIDIssue("threadId")
	}
	if err := s.validateActionInput(ctx, input); err != nil {
		return ModerationAction{}, err
	}

	created, err := s.repo.HideThreadAndAudit(ctx, threadID, moderationrepo.ActionInput{
		ActorUserID: input.ActorUserID,
		Target: moderationrepo.Target{
			Type: "chika_thread",
			UUID: &threadID,
		},
		Action:   "hide_chika_thread",
		Reason:   strings.TrimSpace(input.Reason),
		ReportID: input.ReportID,
	})
	if err != nil {
		if moderationrepo.IsNoRows(err) {
			return ModerationAction{}, apperrors.New(http.StatusNotFound, "not_found", "thread not found", err)
		}
		return ModerationAction{}, apperrors.New(http.StatusInternalServerError, "moderation_action_failed", "failed to apply moderation action", err)
	}
	return mapAction(created), nil
}

func (s *Service) UnhideThread(ctx context.Context, threadID string, input ActionInput) (ModerationAction, error) {
	if _, err := uuid.Parse(threadID); err != nil {
		return ModerationAction{}, invalidUUIDIssue("threadId")
	}
	if err := s.validateActionInput(ctx, input); err != nil {
		return ModerationAction{}, err
	}

	created, err := s.repo.UnhideThreadAndAudit(ctx, threadID, moderationrepo.ActionInput{
		ActorUserID: input.ActorUserID,
		Target: moderationrepo.Target{
			Type: "chika_thread",
			UUID: &threadID,
		},
		Action:   "unhide_chika_thread",
		Reason:   strings.TrimSpace(input.Reason),
		ReportID: input.ReportID,
	})
	if err != nil {
		if moderationrepo.IsNoRows(err) {
			return ModerationAction{}, apperrors.New(http.StatusNotFound, "not_found", "thread not found", err)
		}
		return ModerationAction{}, apperrors.New(http.StatusInternalServerError, "moderation_action_failed", "failed to apply moderation action", err)
	}
	return mapAction(created), nil
}

func (s *Service) HideComment(ctx context.Context, commentID int64, input ActionInput) (ModerationAction, error) {
	if commentID <= 0 {
		return ModerationAction{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"commentId"},
			Code:    "custom",
			Message: "commentId must be a positive integer",
		}}}
	}
	if err := s.validateActionInput(ctx, input); err != nil {
		return ModerationAction{}, err
	}

	created, err := s.repo.HideCommentAndAudit(ctx, commentID, moderationrepo.ActionInput{
		ActorUserID: input.ActorUserID,
		Target: moderationrepo.Target{
			Type:   "chika_comment",
			Bigint: &commentID,
		},
		Action:   "hide_chika_comment",
		Reason:   strings.TrimSpace(input.Reason),
		ReportID: input.ReportID,
	})
	if err != nil {
		if moderationrepo.IsNoRows(err) {
			return ModerationAction{}, apperrors.New(http.StatusNotFound, "not_found", "comment not found", err)
		}
		return ModerationAction{}, apperrors.New(http.StatusInternalServerError, "moderation_action_failed", "failed to apply moderation action", err)
	}
	return mapAction(created), nil
}

func (s *Service) UnhideComment(ctx context.Context, commentID int64, input ActionInput) (ModerationAction, error) {
	if commentID <= 0 {
		return ModerationAction{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"commentId"},
			Code:    "custom",
			Message: "commentId must be a positive integer",
		}}}
	}
	if err := s.validateActionInput(ctx, input); err != nil {
		return ModerationAction{}, err
	}

	created, err := s.repo.UnhideCommentAndAudit(ctx, commentID, moderationrepo.ActionInput{
		ActorUserID: input.ActorUserID,
		Target: moderationrepo.Target{
			Type:   "chika_comment",
			Bigint: &commentID,
		},
		Action:   "unhide_chika_comment",
		Reason:   strings.TrimSpace(input.Reason),
		ReportID: input.ReportID,
	})
	if err != nil {
		if moderationrepo.IsNoRows(err) {
			return ModerationAction{}, apperrors.New(http.StatusNotFound, "not_found", "comment not found", err)
		}
		return ModerationAction{}, apperrors.New(http.StatusInternalServerError, "moderation_action_failed", "failed to apply moderation action", err)
	}
	return mapAction(created), nil
}

func (s *Service) applyUserAction(ctx context.Context, appUserID, accountStatus, actionName string, input ActionInput) (ModerationAction, error) {
	if _, err := uuid.Parse(appUserID); err != nil {
		return ModerationAction{}, invalidUUIDIssue("appUserId")
	}
	if err := s.validateActionInput(ctx, input); err != nil {
		return ModerationAction{}, err
	}

	created, err := s.repo.SetUserStatusAndAudit(ctx, appUserID, accountStatus, moderationrepo.ActionInput{
		ActorUserID: input.ActorUserID,
		Target: moderationrepo.Target{
			Type: "user",
			UUID: &appUserID,
		},
		Action:   actionName,
		Reason:   strings.TrimSpace(input.Reason),
		ReportID: input.ReportID,
	})
	if err != nil {
		if moderationrepo.IsNoRows(err) {
			return ModerationAction{}, apperrors.New(http.StatusNotFound, "not_found", "user not found", err)
		}
		return ModerationAction{}, apperrors.New(http.StatusInternalServerError, "moderation_action_failed", "failed to apply moderation action", err)
	}
	return mapAction(created), nil
}

func (s *Service) validateActionInput(ctx context.Context, input ActionInput) error {
	if _, err := uuid.Parse(input.ActorUserID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}

	reason := strings.TrimSpace(input.Reason)
	if reason == "" {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"reason"},
			Code:    "required",
			Message: "reason is required",
		}}}
	}
	if len(reason) > 2000 {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"reason"},
			Code:    "too_big",
			Message: "reason must be at most 2000 characters",
		}}}
	}

	if input.ReportID == nil || strings.TrimSpace(*input.ReportID) == "" {
		return nil
	}

	reportID := strings.TrimSpace(*input.ReportID)
	if _, err := uuid.Parse(reportID); err != nil {
		return invalidUUIDIssue("reportId")
	}
	exists, err := s.repo.ReportExists(ctx, reportID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "report_lookup_failed", "failed to validate report id", err)
	}
	if !exists {
		return apperrors.New(http.StatusNotFound, "not_found", "report not found", nil)
	}
	return nil
}

func invalidUUIDIssue(field string) error {
	return ValidationFailure{Issues: []validatex.Issue{{
		Path:    []any{field},
		Code:    "invalid_uuid",
		Message: "Must be a valid UUID",
	}}}
}

func mapAction(action moderationrepo.ModerationAction) ModerationAction {
	return ModerationAction{
		ID:          action.ID,
		ActorUserID: action.ActorUserID,
		TargetType:  action.TargetType,
		TargetID:    action.TargetID,
		Action:      action.Action,
		Reason:      action.Reason,
		ReportID:    action.ReportID,
		CreatedAt:   action.CreatedAt.UTC().Format(timeRFC3339),
	}
}

const timeRFC3339 = "2006-01-02T15:04:05Z07:00"
