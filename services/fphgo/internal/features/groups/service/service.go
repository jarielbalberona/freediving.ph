package service

import (
	"context"
	"net/http"
	"regexp"
	"strings"

	"github.com/google/uuid"

	groupsrepo "fphgo/internal/features/groups/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

type Service struct {
	repo repository
}

type repository interface {
	ListGroups(ctx context.Context, input groupsrepo.ListGroupsInput) ([]groupsrepo.Group, int, error)
	GetGroupByID(ctx context.Context, groupID string) (groupsrepo.Group, error)
	CreateGroup(ctx context.Context, input groupsrepo.CreateGroupInput) (groupsrepo.Group, error)
	AddOwnerMembership(ctx context.Context, groupID, userID string) error
	UpdateGroup(ctx context.Context, input groupsrepo.UpdateGroupInput) (groupsrepo.Group, error)
	GetMembership(ctx context.Context, groupID, userID string) (groupsrepo.GroupMember, error)
	UpsertMembership(ctx context.Context, groupID, userID, role, status string) (groupsrepo.GroupMember, error)
	LeaveGroup(ctx context.Context, groupID, userID string) error
	ListMembers(ctx context.Context, input groupsrepo.ListGroupMembersInput) ([]groupsrepo.GroupMember, int, error)
	ListPosts(ctx context.Context, input groupsrepo.ListGroupPostsInput) ([]groupsrepo.GroupPost, int, error)
	CreatePost(ctx context.Context, input groupsrepo.CreateGroupPostInput) (groupsrepo.GroupPost, error)
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (e ValidationFailure) Error() string { return "validation failed" }

func New(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListGroups(ctx context.Context, viewerUserID, search, visibility string, mine bool, page, limit int) ([]groupsrepo.Group, int, error) {
	return s.repo.ListGroups(ctx, groupsrepo.ListGroupsInput{
		ViewerUserID: strings.TrimSpace(viewerUserID),
		Search:       strings.TrimSpace(search),
		Visibility:   strings.TrimSpace(visibility),
		Mine:         mine,
		Page:         normalizePage(page),
		Limit:        normalizeLimit(limit),
	})
}

func (s *Service) GetGroup(ctx context.Context, groupID, viewerUserID string) (groupsrepo.Group, error) {
	if _, err := uuid.Parse(groupID); err != nil {
		return groupsrepo.Group{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"groupId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	group, err := s.repo.GetGroupByID(ctx, groupID)
	if err != nil {
		if groupsrepo.IsNoRows(err) {
			return groupsrepo.Group{}, apperrors.New(http.StatusNotFound, "group_not_found", "group not found", err)
		}
		return groupsrepo.Group{}, apperrors.New(http.StatusInternalServerError, "group_get_failed", "failed to fetch group", err)
	}
	if group.Status != "active" {
		return groupsrepo.Group{}, apperrors.New(http.StatusNotFound, "group_not_found", "group not found", nil)
	}
	if group.Visibility == "public" {
		return group, nil
	}
	viewerUserID = strings.TrimSpace(viewerUserID)
	if viewerUserID == "" {
		return groupsrepo.Group{}, apperrors.New(http.StatusForbidden, "forbidden", "group is not public", nil)
	}
	membership, err := s.repo.GetMembership(ctx, groupID, viewerUserID)
	if err != nil || membership.Status != "active" {
		return groupsrepo.Group{}, apperrors.New(http.StatusForbidden, "forbidden", "group is not public", nil)
	}
	return group, nil
}

func (s *Service) CreateGroup(ctx context.Context, actorID string, input groupsrepo.CreateGroupInput) (groupsrepo.Group, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return groupsrepo.Group{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return groupsrepo.Group{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"name"},
			Code:    "required",
			Message: "This field is required",
		}}}
	}
	visibility := normalizeVisibility(input.Visibility)
	joinPolicy := normalizeJoinPolicy(input.JoinPolicy)
	slug := sanitizeSlug(input.Slug)
	if slug == "" {
		slug = sanitizeSlug(name)
	}
	if slug == "" {
		slug = "group-" + strings.ToLower(strings.ReplaceAll(uuid.NewString()[:8], "-", ""))
	}
	created, err := s.repo.CreateGroup(ctx, groupsrepo.CreateGroupInput{
		Name:        name,
		Slug:        slug,
		Description: strings.TrimSpace(input.Description),
		Visibility:  visibility,
		JoinPolicy:  joinPolicy,
		Location:    strings.TrimSpace(input.Location),
		CreatedBy:   actorID,
	})
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "idx_groups_slug") || strings.Contains(strings.ToLower(err.Error()), "groups_slug") {
			return groupsrepo.Group{}, apperrors.New(http.StatusConflict, "slug_conflict", "group slug already exists", err)
		}
		return groupsrepo.Group{}, apperrors.New(http.StatusInternalServerError, "group_create_failed", "failed to create group", err)
	}
	if err := s.repo.AddOwnerMembership(ctx, created.ID, actorID); err != nil {
		return groupsrepo.Group{}, apperrors.New(http.StatusInternalServerError, "group_membership_create_failed", "failed to create owner membership", err)
	}
	return s.repo.GetGroupByID(ctx, created.ID)
}

func (s *Service) UpdateGroup(ctx context.Context, groupID string, input groupsrepo.UpdateGroupInput) (groupsrepo.Group, error) {
	if _, err := uuid.Parse(groupID); err != nil {
		return groupsrepo.Group{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"groupId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if input.Visibility != nil {
		v := normalizeVisibility(*input.Visibility)
		input.Visibility = &v
	}
	if input.Status != nil {
		s := normalizeGroupStatus(*input.Status)
		input.Status = &s
	}
	if input.JoinPolicy != nil {
		v := normalizeJoinPolicy(*input.JoinPolicy)
		input.JoinPolicy = &v
	}
	input.GroupID = groupID
	updated, err := s.repo.UpdateGroup(ctx, input)
	if err != nil {
		if groupsrepo.IsNoRows(err) {
			return groupsrepo.Group{}, apperrors.New(http.StatusNotFound, "group_not_found", "group not found", err)
		}
		return groupsrepo.Group{}, apperrors.New(http.StatusInternalServerError, "group_update_failed", "failed to update group", err)
	}
	return updated, nil
}

func (s *Service) JoinGroup(ctx context.Context, groupID, actorID string) (groupsrepo.GroupMember, error) {
	if _, err := uuid.Parse(groupID); err != nil {
		return groupsrepo.GroupMember{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"groupId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if _, err := uuid.Parse(actorID); err != nil {
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	group, err := s.repo.GetGroupByID(ctx, groupID)
	if err != nil {
		if groupsrepo.IsNoRows(err) {
			return groupsrepo.GroupMember{}, apperrors.New(http.StatusNotFound, "group_not_found", "group not found", err)
		}
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusInternalServerError, "group_get_failed", "failed to fetch group", err)
	}
	if group.Status != "active" {
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusConflict, "group_inactive", "group is not active", nil)
	}
	if group.JoinPolicy == "invite_only" || group.Visibility == "invite_only" {
		existing, err := s.repo.GetMembership(ctx, groupID, actorID)
		if err != nil || existing.Status != "invited" {
			return groupsrepo.GroupMember{}, apperrors.New(http.StatusForbidden, "invite_required", "group requires invite", nil)
		}
	}
	status := "active"
	if group.JoinPolicy == "approval" {
		status = "invited"
	}
	member, err := s.repo.UpsertMembership(ctx, groupID, actorID, "member", status)
	if err != nil {
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusInternalServerError, "group_join_failed", "failed to join group", err)
	}
	return member, nil
}

func (s *Service) LeaveGroup(ctx context.Context, groupID, actorID string) error {
	if _, err := uuid.Parse(groupID); err != nil {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"groupId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if _, err := uuid.Parse(actorID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	membership, err := s.repo.GetMembership(ctx, groupID, actorID)
	if err != nil || membership.Status != "active" {
		return apperrors.New(http.StatusNotFound, "membership_not_found", "group membership not found", nil)
	}
	if membership.Role == "owner" {
		return apperrors.New(http.StatusConflict, "owner_leave_blocked", "group owner cannot leave directly", nil)
	}
	if err := s.repo.LeaveGroup(ctx, groupID, actorID); err != nil {
		if groupsrepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "membership_not_found", "group membership not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "group_leave_failed", "failed to leave group", err)
	}
	return nil
}

func (s *Service) ListMembers(ctx context.Context, groupID, viewerUserID string, page, limit int) ([]groupsrepo.GroupMember, int, error) {
	group, err := s.GetGroup(ctx, groupID, viewerUserID)
	if err != nil {
		return nil, 0, err
	}
	if group.Visibility != "public" {
		if strings.TrimSpace(viewerUserID) == "" {
			return nil, 0, apperrors.New(http.StatusForbidden, "forbidden", "group is not public", nil)
		}
	}
	items, total, err := s.repo.ListMembers(ctx, groupsrepo.ListGroupMembersInput{GroupID: groupID, Page: normalizePage(page), Limit: normalizeLimit(limit)})
	if err != nil {
		return nil, 0, apperrors.New(http.StatusInternalServerError, "group_members_list_failed", "failed to list group members", err)
	}
	return items, total, nil
}

func (s *Service) ListPosts(ctx context.Context, groupID, viewerUserID string, page, limit int) ([]groupsrepo.GroupPost, int, error) {
	if _, err := s.GetGroup(ctx, groupID, viewerUserID); err != nil {
		return nil, 0, err
	}
	items, total, err := s.repo.ListPosts(ctx, groupsrepo.ListGroupPostsInput{GroupID: groupID, Page: normalizePage(page), Limit: normalizeLimit(limit)})
	if err != nil {
		return nil, 0, apperrors.New(http.StatusInternalServerError, "group_posts_list_failed", "failed to list group posts", err)
	}
	return items, total, nil
}

func (s *Service) CreatePost(ctx context.Context, groupID, actorID, title, content string) (groupsrepo.GroupPost, error) {
	if _, err := uuid.Parse(groupID); err != nil {
		return groupsrepo.GroupPost{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"groupId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if _, err := uuid.Parse(actorID); err != nil {
		return groupsrepo.GroupPost{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if strings.TrimSpace(content) == "" {
		return groupsrepo.GroupPost{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"content"},
			Code:    "required",
			Message: "This field is required",
		}}}
	}
	membership, err := s.repo.GetMembership(ctx, groupID, actorID)
	if err != nil || membership.Status != "active" {
		return groupsrepo.GroupPost{}, apperrors.New(http.StatusForbidden, "forbidden", "only active group members can post", nil)
	}
	post, err := s.repo.CreatePost(ctx, groupsrepo.CreateGroupPostInput{
		GroupID:      groupID,
		AuthorUserID: actorID,
		Title:        strings.TrimSpace(title),
		Content:      strings.TrimSpace(content),
	})
	if err != nil {
		return groupsrepo.GroupPost{}, apperrors.New(http.StatusInternalServerError, "group_post_create_failed", "failed to create group post", err)
	}
	return post, nil
}

func normalizePage(value int) int {
	if value < 1 {
		return 1
	}
	return value
}

func normalizeLimit(value int) int {
	if value < 1 {
		return 20
	}
	if value > 100 {
		return 100
	}
	return value
}

func normalizeVisibility(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "private":
		return "private"
	case "invite_only", "invite-only":
		return "invite_only"
	default:
		return "public"
	}
}

func normalizeGroupStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "archived":
		return "archived"
	case "deleted":
		return "deleted"
	default:
		return "active"
	}
}

func normalizeJoinPolicy(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "approval":
		return "approval"
	case "invite_only", "invite-only":
		return "invite_only"
	default:
		return "open"
	}
}

var slugReplace = regexp.MustCompile(`[^a-z0-9]+`)

func sanitizeSlug(value string) string {
	s := strings.ToLower(strings.TrimSpace(value))
	s = slugReplace.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if len(s) > 64 {
		s = s[:64]
		s = strings.Trim(s, "-")
	}
	return s
}
