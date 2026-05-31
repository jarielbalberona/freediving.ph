package service

import (
	"context"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"

	groupsrepo "fphgo/internal/features/groups/repo"
	notificationsservice "fphgo/internal/features/notifications/service"
	apperrors "fphgo/internal/shared/errors"
	sharedslug "fphgo/internal/shared/slug"
	"fphgo/internal/shared/validatex"
)

type Service struct {
	repo          repository
	notifications notificationPublisher
}

type repository interface {
	ListGroups(ctx context.Context, input groupsrepo.ListGroupsInput) ([]groupsrepo.Group, int, error)
	GetGroupByID(ctx context.Context, groupID, viewerUserID string) (groupsrepo.Group, error)
	GetGroupBySlug(ctx context.Context, slug, viewerUserID string) (groupsrepo.Group, error)
	SlugExists(ctx context.Context, slug string) (bool, error)
	CreateGroup(ctx context.Context, input groupsrepo.CreateGroupInput) (groupsrepo.Group, error)
	AddOwnerMembership(ctx context.Context, groupID, userID string) error
	UpdateGroup(ctx context.Context, input groupsrepo.UpdateGroupInput) (groupsrepo.Group, error)
	MediaBelongsToGroup(ctx context.Context, groupID, mediaID string) (bool, error)
	GetMembership(ctx context.Context, groupID, userID string) (groupsrepo.GroupMember, error)
	UpsertMembership(ctx context.Context, groupID, userID, role, status string) (groupsrepo.GroupMember, error)
	InviteMember(ctx context.Context, groupID, userID, invitedBy string) (groupsrepo.GroupMember, error)
	AcceptInvite(ctx context.Context, groupID, userID string) (groupsrepo.GroupMember, error)
	RejectInvite(ctx context.Context, groupID, userID string) (groupsrepo.GroupMember, error)
	LeaveGroup(ctx context.Context, groupID, userID string) error
	ListMembers(ctx context.Context, input groupsrepo.ListGroupMembersInput) ([]groupsrepo.GroupMember, int, error)
	ListPosts(ctx context.Context, input groupsrepo.ListGroupPostsInput) ([]groupsrepo.GroupPost, int, error)
	CreatePost(ctx context.Context, input groupsrepo.CreateGroupPostInput) (groupsrepo.GroupPost, error)
	UserIsActive(ctx context.Context, userID string) (bool, error)
}

type notificationPublisher interface {
	NotifyGroupPostCreated(ctx context.Context, input notificationsservice.GroupPostCreatedInput) error
	NotifyGroupInviteReceived(ctx context.Context, input notificationsservice.GroupInviteReceivedInput) error
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (e ValidationFailure) Error() string { return "validation failed" }

type Option func(*Service)

func WithNotifications(publisher notificationPublisher) Option {
	return func(s *Service) {
		s.notifications = publisher
	}
}

func New(repo repository, opts ...Option) *Service {
	svc := &Service{repo: repo}
	for _, opt := range opts {
		if opt != nil {
			opt(svc)
		}
	}
	return svc
}

func (s *Service) ListGroups(ctx context.Context, viewerUserID, search, visibility string, mine bool, page, limit int) ([]groupsrepo.Group, int, error) {
	viewerUserID = strings.TrimSpace(viewerUserID)
	if mine && viewerUserID == "" {
		return []groupsrepo.Group{}, 0, nil
	}
	return s.repo.ListGroups(ctx, groupsrepo.ListGroupsInput{
		ViewerUserID: viewerUserID,
		Search:       strings.TrimSpace(search),
		Visibility:   normalizeVisibilityFilter(visibility),
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
	viewerUserID = strings.TrimSpace(viewerUserID)
	group, err := s.repo.GetGroupByID(ctx, groupID, viewerUserID)
	if err != nil {
		if groupsrepo.IsNoRows(err) {
			return groupsrepo.Group{}, apperrors.New(http.StatusNotFound, "group_not_found", "group not found", err)
		}
		return groupsrepo.Group{}, apperrors.New(http.StatusInternalServerError, "group_get_failed", "failed to fetch group", err)
	}
	return s.enforceGroupReadAccess(ctx, group, viewerUserID)
}

func (s *Service) GetGroupBySlug(ctx context.Context, slug, viewerUserID string) (groupsrepo.Group, error) {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return groupsrepo.Group{}, apperrors.New(http.StatusNotFound, "group_not_found", "group not found", nil)
	}
	viewerUserID = strings.TrimSpace(viewerUserID)
	group, err := s.repo.GetGroupBySlug(ctx, slug, viewerUserID)
	if err != nil {
		if groupsrepo.IsNoRows(err) {
			return groupsrepo.Group{}, apperrors.New(http.StatusNotFound, "group_not_found", "group not found", err)
		}
		return groupsrepo.Group{}, apperrors.New(http.StatusInternalServerError, "group_get_failed", "failed to fetch group", err)
	}
	return s.enforceGroupReadAccess(ctx, group, viewerUserID)
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
	if visibility == "private" && joinPolicy == "open" {
		return groupsrepo.Group{}, privateGroupJoinPolicyFailure()
	}
	slugSource := input.Slug
	if strings.TrimSpace(slugSource) == "" {
		slugSource = name
	}
	slug, err := s.uniqueSlug(ctx, sharedslug.Make(slugSource, "group"))
	if err != nil {
		return groupsrepo.Group{}, apperrors.New(http.StatusInternalServerError, "group_slug_failed", "failed to generate group slug", err)
	}
	created, err := s.repo.CreateGroup(ctx, groupsrepo.CreateGroupInput{
		Name:             name,
		Slug:             slug,
		Bio:              strings.TrimSpace(input.Bio),
		Description:      strings.TrimSpace(input.Description),
		Visibility:       visibility,
		JoinPolicy:       joinPolicy,
		Location:         strings.TrimSpace(input.Location),
		LocationName:     strings.TrimSpace(input.LocationName),
		FormattedAddress: strings.TrimSpace(input.FormattedAddress),
		Latitude:         input.Latitude,
		Longitude:        input.Longitude,
		GooglePlaceID:    strings.TrimSpace(input.GooglePlaceID),
		RegionCode:       strings.TrimSpace(input.RegionCode),
		ProvinceCode:     strings.TrimSpace(input.ProvinceCode),
		CityCode:         strings.TrimSpace(input.CityCode),
		BarangayCode:     strings.TrimSpace(input.BarangayCode),
		LocationSource:   normalizeLocationSource(input.LocationSource),
		CreatedBy:        actorID,
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
	return s.repo.GetGroupByID(ctx, created.ID, actorID)
}

func (s *Service) enforceGroupReadAccess(ctx context.Context, group groupsrepo.Group, viewerUserID string) (groupsrepo.Group, error) {
	if group.Status != "active" {
		return groupsrepo.Group{}, apperrors.New(http.StatusNotFound, "group_not_found", "group not found", nil)
	}
	if group.Visibility == "public" {
		return group, nil
	}
	if viewerUserID == "" {
		return groupsrepo.Group{}, apperrors.New(http.StatusForbidden, "forbidden", "group is not public", nil)
	}
	membership, err := s.repo.GetMembership(ctx, group.ID, viewerUserID)
	if err != nil || (membership.Status != "active" && membership.Status != "invited") {
		return groupsrepo.Group{}, apperrors.New(http.StatusForbidden, "forbidden", "group is not public", nil)
	}
	return group, nil
}

func (s *Service) uniqueSlug(ctx context.Context, base string) (string, error) {
	candidate := sharedslug.Make(base, "group")
	for i := 0; i < 50; i++ {
		exists, err := s.repo.SlugExists(ctx, candidate)
		if err != nil {
			return "", err
		}
		if !exists {
			return candidate, nil
		}
		candidate = sharedslug.Append(base, strconv.Itoa(i+2), sharedslug.DefaultMaxLength)
	}
	return sharedslug.Append(base, strings.ReplaceAll(uuid.NewString(), "-", "")[:8], sharedslug.DefaultMaxLength), nil
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
	if input.Bio != nil {
		v := strings.TrimSpace(*input.Bio)
		input.Bio = &v
	}
	if input.Description != nil {
		v := strings.TrimSpace(*input.Description)
		input.Description = &v
	}
	if err := validateOptionalMediaUUID("logoMediaId", input.LogoMediaID); err != nil {
		return groupsrepo.Group{}, err
	}
	if err := validateOptionalMediaUUID("coverMediaId", input.CoverMediaID); err != nil {
		return groupsrepo.Group{}, err
	}
	if input.Status != nil {
		s := normalizeGroupStatus(*input.Status)
		if s != "active" {
			return groupsrepo.Group{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"status"},
				Code:    "unsupported_status_update",
				Message: "Use the archive endpoint to archive a group.",
			}}}
		}
		input.Status = &s
	}
	if input.JoinPolicy != nil {
		v := normalizeJoinPolicy(*input.JoinPolicy)
		input.JoinPolicy = &v
	}
	if input.Visibility != nil && *input.Visibility == "private" {
		if input.JoinPolicy != nil && *input.JoinPolicy == "open" {
			return groupsrepo.Group{}, privateGroupJoinPolicyFailure()
		}
		if input.JoinPolicy == nil {
			v := "invite_only"
			input.JoinPolicy = &v
		}
	}
	if input.Visibility == nil && input.JoinPolicy != nil && *input.JoinPolicy == "open" {
		current, err := s.repo.GetGroupByID(ctx, groupID, "")
		if err != nil {
			if groupsrepo.IsNoRows(err) {
				return groupsrepo.Group{}, apperrors.New(http.StatusNotFound, "group_not_found", "group not found", err)
			}
			return groupsrepo.Group{}, apperrors.New(http.StatusInternalServerError, "group_get_failed", "failed to fetch group", err)
		}
		if current.Visibility == "private" {
			return groupsrepo.Group{}, privateGroupJoinPolicyFailure()
		}
	}
	if input.LocationSource != nil {
		v := normalizeLocationSource(*input.LocationSource)
		input.LocationSource = &v
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

func (s *Service) UpdateGroupForMember(ctx context.Context, groupID, actorID string, input groupsrepo.UpdateGroupInput) (groupsrepo.Group, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return groupsrepo.Group{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	membership, err := s.repo.GetMembership(ctx, groupID, actorID)
	if err != nil || membership.Status != "active" {
		return groupsrepo.Group{}, apperrors.New(http.StatusForbidden, "forbidden", "only active group managers can edit this group", nil)
	}
	if membership.Role != "owner" && membership.Role != "moderator" {
		return groupsrepo.Group{}, apperrors.New(http.StatusForbidden, "forbidden", "only group owners and moderators can edit this group", nil)
	}
	if err := s.ensureGroupMediaUsable(ctx, groupID, "logoMediaId", input.LogoMediaID); err != nil {
		return groupsrepo.Group{}, err
	}
	if err := s.ensureGroupMediaUsable(ctx, groupID, "coverMediaId", input.CoverMediaID); err != nil {
		return groupsrepo.Group{}, err
	}
	return s.UpdateGroup(ctx, groupID, input)
}

func (s *Service) ArchiveGroup(ctx context.Context, groupID, actorID string) error {
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

	group, err := s.repo.GetGroupByID(ctx, groupID, actorID)
	if err != nil {
		if groupsrepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "group_not_found", "group not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "group_get_failed", "failed to fetch group", err)
	}
	if group.CreatedBy != actorID {
		return apperrors.New(http.StatusForbidden, "creator_required", "only the group creator can archive this group", nil)
	}
	if group.Status == "archived" {
		return nil
	}
	if group.Status != "active" {
		return apperrors.New(http.StatusConflict, "group_inactive", "group is not active", nil)
	}

	status := "archived"
	if _, err := s.repo.UpdateGroup(ctx, groupsrepo.UpdateGroupInput{
		GroupID: groupID,
		Status:  &status,
	}); err != nil {
		if groupsrepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "group_not_found", "group not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "group_archive_failed", "failed to archive group", err)
	}
	return nil
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
	group, err := s.repo.GetGroupByID(ctx, groupID, actorID)
	if err != nil {
		if groupsrepo.IsNoRows(err) {
			return groupsrepo.GroupMember{}, apperrors.New(http.StatusNotFound, "group_not_found", "group not found", err)
		}
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusInternalServerError, "group_get_failed", "failed to fetch group", err)
	}
	if group.Status != "active" {
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusConflict, "group_inactive", "group is not active", nil)
	}
	existing, hasMembership, err := s.lookupMembership(ctx, groupID, actorID)
	if err != nil {
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusInternalServerError, "membership_get_failed", "failed to fetch membership", err)
	}
	if hasMembership {
		switch existing.Status {
		case "active":
			return existing, nil
		case "blocked":
			return groupsrepo.GroupMember{}, apperrors.New(http.StatusForbidden, "member_blocked", "user is blocked from this group", nil)
		}
	}
	if group.Visibility == "private" && (!hasMembership || existing.Status != "invited") {
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusForbidden, "invite_required", "group requires invite", nil)
	}
	if group.JoinPolicy == "invite_only" && (!hasMembership || existing.Status != "invited") {
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusForbidden, "invite_required", "group requires invite", nil)
	}
	member, err := s.repo.UpsertMembership(ctx, groupID, actorID, "member", "active")
	if err != nil {
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusInternalServerError, "group_join_failed", "failed to join group", err)
	}
	return member, nil
}

func (s *Service) InviteMember(ctx context.Context, groupID, actorID, inviteeID string) (groupsrepo.GroupMember, error) {
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
	if _, err := uuid.Parse(inviteeID); err != nil {
		return groupsrepo.GroupMember{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"userId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if actorID == inviteeID {
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusConflict, "self_invite_blocked", "cannot invite yourself", nil)
	}
	group, err := s.repo.GetGroupByID(ctx, groupID, actorID)
	if err != nil {
		if groupsrepo.IsNoRows(err) {
			return groupsrepo.GroupMember{}, apperrors.New(http.StatusNotFound, "group_not_found", "group not found", err)
		}
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusInternalServerError, "group_get_failed", "failed to fetch group", err)
	}
	if group.Status != "active" {
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusConflict, "group_inactive", "group is not active", nil)
	}
	actorMembership, err := s.repo.GetMembership(ctx, groupID, actorID)
	if err != nil || actorMembership.Status != "active" {
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusForbidden, "forbidden", "only active members can invite", nil)
	}
	activeUser, err := s.repo.UserIsActive(ctx, inviteeID)
	if err != nil {
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusInternalServerError, "user_get_failed", "failed to fetch invitee", err)
	}
	if !activeUser {
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusNotFound, "user_not_found", "invitee not found", nil)
	}
	existing, hasMembership, err := s.lookupMembership(ctx, groupID, inviteeID)
	if err != nil {
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusInternalServerError, "membership_get_failed", "failed to fetch invitee membership", err)
	}
	if hasMembership {
		switch existing.Status {
		case "active":
			return groupsrepo.GroupMember{}, apperrors.New(http.StatusConflict, "already_member", "user is already an active member", nil)
		case "blocked":
			return groupsrepo.GroupMember{}, apperrors.New(http.StatusForbidden, "member_blocked", "user is blocked from this group", nil)
		case "invited":
			return existing, nil
		}
	}
	member, err := s.repo.InviteMember(ctx, groupID, inviteeID, actorID)
	if err != nil {
		if groupsrepo.IsNoRows(err) {
			return groupsrepo.GroupMember{}, apperrors.New(http.StatusConflict, "invite_conflict", "user cannot be invited", err)
		}
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusInternalServerError, "group_invite_failed", "failed to invite member", err)
	}
	if s.notifications != nil {
		if err := s.notifications.NotifyGroupInviteReceived(ctx, notificationsservice.GroupInviteReceivedInput{
			GroupID:       groupID,
			GroupSlug:     group.Slug,
			GroupName:     group.Name,
			InviterUserID: actorID,
			InvitedUserID: inviteeID,
		}); err != nil {
			slog.Default().Warn("groups.notification.invite_received_failed",
				slog.String("group_id", groupID),
				slog.String("inviter_user_id", actorID),
				slog.String("invited_user_id", inviteeID),
				slog.Any("error", err),
			)
		}
	}
	return member, nil
}

func (s *Service) AcceptInvite(ctx context.Context, groupID, actorID string) (groupsrepo.GroupMember, error) {
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
	membership, err := s.repo.GetMembership(ctx, groupID, actorID)
	if err != nil || membership.Status != "invited" {
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusNotFound, "invite_not_found", "pending invite not found", nil)
	}
	member, err := s.repo.AcceptInvite(ctx, groupID, actorID)
	if err != nil {
		if groupsrepo.IsNoRows(err) {
			return groupsrepo.GroupMember{}, apperrors.New(http.StatusNotFound, "invite_not_found", "pending invite not found", err)
		}
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusInternalServerError, "group_invite_accept_failed", "failed to accept invite", err)
	}
	return member, nil
}

func (s *Service) RejectInvite(ctx context.Context, groupID, actorID string) (groupsrepo.GroupMember, error) {
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
	membership, err := s.repo.GetMembership(ctx, groupID, actorID)
	if err != nil || membership.Status != "invited" {
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusNotFound, "invite_not_found", "pending invite not found", nil)
	}
	member, err := s.repo.RejectInvite(ctx, groupID, actorID)
	if err != nil {
		if groupsrepo.IsNoRows(err) {
			return groupsrepo.GroupMember{}, apperrors.New(http.StatusNotFound, "invite_not_found", "pending invite not found", err)
		}
		return groupsrepo.GroupMember{}, apperrors.New(http.StatusInternalServerError, "group_invite_reject_failed", "failed to reject invite", err)
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
		membership, err := s.repo.GetMembership(ctx, groupID, strings.TrimSpace(viewerUserID))
		if err != nil || membership.Status != "active" {
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
	group, err := s.GetGroup(ctx, groupID, viewerUserID)
	if err != nil {
		return nil, 0, err
	}
	if group.Visibility != "public" {
		membership, err := s.repo.GetMembership(ctx, groupID, strings.TrimSpace(viewerUserID))
		if err != nil || membership.Status != "active" {
			return nil, 0, apperrors.New(http.StatusForbidden, "forbidden", "group is not public", nil)
		}
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
	group, err := s.repo.GetGroupByID(ctx, groupID, actorID)
	if err != nil {
		if groupsrepo.IsNoRows(err) {
			return groupsrepo.GroupPost{}, apperrors.New(http.StatusNotFound, "group_not_found", "group not found", err)
		}
		return groupsrepo.GroupPost{}, apperrors.New(http.StatusInternalServerError, "group_get_failed", "failed to fetch group", err)
	}
	if group.Status != "active" {
		return groupsrepo.GroupPost{}, apperrors.New(http.StatusConflict, "group_inactive", "group is not active", nil)
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
	if s.notifications != nil {
		if err := s.notifications.NotifyGroupPostCreated(ctx, notificationsservice.GroupPostCreatedInput{
			GroupID:      groupID,
			GroupSlug:    group.Slug,
			GroupName:    group.Name,
			PostID:       post.ID,
			PostTitle:    post.Title,
			AuthorUserID: actorID,
		}); err != nil {
			slog.Default().Warn("groups.notification.post_created_failed",
				slog.String("group_id", groupID),
				slog.String("post_id", post.ID),
				slog.String("author_user_id", actorID),
				slog.Any("error", err),
			)
		}
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

func (s *Service) lookupMembership(ctx context.Context, groupID, userID string) (groupsrepo.GroupMember, bool, error) {
	membership, err := s.repo.GetMembership(ctx, groupID, userID)
	if err != nil {
		if groupsrepo.IsNoRows(err) {
			return groupsrepo.GroupMember{}, false, nil
		}
		return groupsrepo.GroupMember{}, false, err
	}
	return membership, true, nil
}

func privateGroupJoinPolicyFailure() ValidationFailure {
	return ValidationFailure{Issues: []validatex.Issue{{
		Path:    []any{"joinPolicy"},
		Code:    "private_invite_only",
		Message: "Private groups are invite-only.",
	}}}
}

func validateOptionalMediaUUID(field string, value *string) error {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil
	}
	if _, err := uuid.Parse(strings.TrimSpace(*value)); err != nil {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{field},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	return nil
}

func (s *Service) ensureGroupMediaUsable(ctx context.Context, groupID, field string, mediaID *string) error {
	if mediaID == nil || strings.TrimSpace(*mediaID) == "" {
		return nil
	}
	ok, err := s.repo.MediaBelongsToGroup(ctx, groupID, strings.TrimSpace(*mediaID))
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "media_check_failed", "failed to validate media ownership", err)
	}
	if !ok {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{field},
			Code:    "not_found",
			Message: "Media was not found for this group",
		}}}
	}
	return nil
}

func normalizeVisibility(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "private", "invite_only", "invite-only":
		return "private"
	default:
		return "public"
	}
}

func normalizeVisibilityFilter(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "public":
		return "public"
	case "private":
		return "private"
	default:
		return ""
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
	case "approval", "invite_only", "invite-only":
		return "invite_only"
	default:
		return "open"
	}
}

func normalizeLocationSource(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "google_places", "psgc", "psgc_mapped", "unmapped":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "manual"
	}
}
