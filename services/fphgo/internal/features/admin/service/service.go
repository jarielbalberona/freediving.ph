package service

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"

	adminrepo "fphgo/internal/features/admin/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

const (
	DefaultLimit = 10
	MaxLimit     = 100
)

type repository interface {
	ListProfiles(ctx context.Context, input adminrepo.ListInput) ([]adminrepo.Profile, int, error)
	ListDiveSites(ctx context.Context, input adminrepo.ListInput) ([]adminrepo.DiveSite, int, error)
	ListGroups(ctx context.Context, input adminrepo.ListInput) ([]adminrepo.Group, int, error)
	GetGroup(ctx context.Context, groupID string) (adminrepo.Group, error)
	UpdateGroup(ctx context.Context, groupID string, input adminrepo.UpdateGroupInput) (adminrepo.Group, error)
}

type Service struct {
	repo repository
}

type ListInput struct {
	Page  int
	Limit int
}

type UpdateGroupInput struct {
	Name       *string
	Visibility *string
	JoinPolicy *string
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (e ValidationFailure) Error() string { return "validation failed" }

type ProfileListResult struct {
	Items []adminrepo.Profile
	Total int
	Page  int
	Limit int
}

type DiveSiteListResult struct {
	Items []adminrepo.DiveSite
	Total int
	Page  int
	Limit int
}

type GroupListResult struct {
	Items []adminrepo.Group
	Total int
	Page  int
	Limit int
}

func New(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListProfiles(ctx context.Context, input ListInput) (ProfileListResult, error) {
	normalized := normalizeListInput(input)
	items, total, err := s.repo.ListProfiles(ctx, adminrepo.ListInput{
		Page:  normalized.Page,
		Limit: normalized.Limit,
	})
	if err != nil {
		return ProfileListResult{}, apperrors.New(http.StatusInternalServerError, "admin_profiles_list_failed", "failed to list profiles", err)
	}
	return ProfileListResult{Items: items, Total: total, Page: normalized.Page, Limit: normalized.Limit}, nil
}

func (s *Service) ListDiveSites(ctx context.Context, input ListInput) (DiveSiteListResult, error) {
	normalized := normalizeListInput(input)
	items, total, err := s.repo.ListDiveSites(ctx, adminrepo.ListInput{
		Page:  normalized.Page,
		Limit: normalized.Limit,
	})
	if err != nil {
		return DiveSiteListResult{}, apperrors.New(http.StatusInternalServerError, "admin_dive_sites_list_failed", "failed to list dive sites", err)
	}
	return DiveSiteListResult{Items: items, Total: total, Page: normalized.Page, Limit: normalized.Limit}, nil
}

func (s *Service) ListGroups(ctx context.Context, input ListInput) (GroupListResult, error) {
	normalized := normalizeListInput(input)
	items, total, err := s.repo.ListGroups(ctx, adminrepo.ListInput{
		Page:  normalized.Page,
		Limit: normalized.Limit,
	})
	if err != nil {
		return GroupListResult{}, apperrors.New(http.StatusInternalServerError, "admin_groups_list_failed", "failed to list groups", err)
	}
	return GroupListResult{Items: items, Total: total, Page: normalized.Page, Limit: normalized.Limit}, nil
}

func (s *Service) UpdateGroup(ctx context.Context, groupID string, input UpdateGroupInput) (adminrepo.Group, error) {
	if _, err := uuid.Parse(groupID); err != nil {
		return adminrepo.Group{}, validationIssue("groupId", "invalid_uuid", "Must be a valid UUID")
	}
	normalized, err := s.normalizeUpdateInput(ctx, groupID, input)
	if err != nil {
		return adminrepo.Group{}, err
	}
	group, err := s.repo.UpdateGroup(ctx, groupID, normalized)
	if err != nil {
		if adminrepo.IsNoRows(err) {
			return adminrepo.Group{}, apperrors.New(http.StatusNotFound, "group_not_found", "group not found", err)
		}
		return adminrepo.Group{}, apperrors.New(http.StatusInternalServerError, "admin_group_update_failed", "failed to update group", err)
	}
	return group, nil
}

func (s *Service) ArchiveGroup(ctx context.Context, groupID string) (adminrepo.Group, error) {
	if _, err := uuid.Parse(groupID); err != nil {
		return adminrepo.Group{}, validationIssue("groupId", "invalid_uuid", "Must be a valid UUID")
	}
	current, err := s.repo.GetGroup(ctx, groupID)
	if err != nil {
		if adminrepo.IsNoRows(err) {
			return adminrepo.Group{}, apperrors.New(http.StatusNotFound, "group_not_found", "group not found", err)
		}
		return adminrepo.Group{}, apperrors.New(http.StatusInternalServerError, "admin_group_get_failed", "failed to fetch group", err)
	}
	if current.Status == "deleted" {
		return adminrepo.Group{}, apperrors.New(http.StatusConflict, "group_deleted", "deleted groups cannot be archived", nil)
	}
	if current.Status == "archived" {
		return current, nil
	}
	status := "archived"
	group, err := s.repo.UpdateGroup(ctx, groupID, adminrepo.UpdateGroupInput{Status: &status})
	if err != nil {
		return adminrepo.Group{}, apperrors.New(http.StatusInternalServerError, "admin_group_archive_failed", "failed to archive group", err)
	}
	return group, nil
}

func normalizeListInput(input ListInput) ListInput {
	page := input.Page
	if page < 1 {
		page = 1
	}
	limit := input.Limit
	if limit < 1 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}
	return ListInput{Page: page, Limit: limit}
}

func (s *Service) normalizeUpdateInput(ctx context.Context, groupID string, input UpdateGroupInput) (adminrepo.UpdateGroupInput, error) {
	var normalized adminrepo.UpdateGroupInput
	if input.Name != nil {
		value := strings.TrimSpace(*input.Name)
		if len(value) < 3 || len(value) > 120 {
			return normalized, validationIssue("name", "invalid_length", "Name must be between 3 and 120 characters")
		}
		normalized.Name = &value
	}
	if input.Visibility != nil {
		value := strings.TrimSpace(strings.ToLower(*input.Visibility))
		if value != "public" && value != "private" {
			return normalized, validationIssue("visibility", "invalid_enum", "Visibility must be public or private")
		}
		normalized.Visibility = &value
	}
	if input.JoinPolicy != nil {
		value := strings.TrimSpace(strings.ToLower(*input.JoinPolicy))
		if value != "open" && value != "invite_only" {
			return normalized, validationIssue("joinPolicy", "invalid_enum", "Join policy must be open or invite_only")
		}
		normalized.JoinPolicy = &value
	}
	if normalized.Visibility != nil && *normalized.Visibility == "private" {
		if normalized.JoinPolicy != nil && *normalized.JoinPolicy == "open" {
			return normalized, validationIssue("joinPolicy", "private_invite_only", "Private groups must be invite-only")
		}
		if normalized.JoinPolicy == nil {
			value := "invite_only"
			normalized.JoinPolicy = &value
		}
	}
	if normalized.Visibility == nil && normalized.JoinPolicy != nil && *normalized.JoinPolicy == "open" {
		current, err := s.repo.GetGroup(ctx, groupID)
		if err != nil {
			if adminrepo.IsNoRows(err) {
				return normalized, apperrors.New(http.StatusNotFound, "group_not_found", "group not found", err)
			}
			return normalized, apperrors.New(http.StatusInternalServerError, "admin_group_get_failed", "failed to fetch group", err)
		}
		if current.Visibility == "private" {
			return normalized, validationIssue("joinPolicy", "private_invite_only", "Private groups must be invite-only")
		}
	}
	return normalized, nil
}

func validationIssue(path, code, message string) ValidationFailure {
	return ValidationFailure{Issues: []validatex.Issue{{
		Path:    []any{path},
		Code:    code,
		Message: message,
	}}}
}
