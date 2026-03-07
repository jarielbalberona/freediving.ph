package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	groupsrepo "fphgo/internal/features/groups/repo"
	groupsservice "fphgo/internal/features/groups/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/mediaurl"
)

type Handlers struct {
	service   *groupsservice.Service
	validator httpx.Validator
}

func New(service *groupsservice.Service, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) ListGroups(w http.ResponseWriter, r *http.Request) {
	viewerID := optionalActorID(r)
	page := parseIntQuery(r, "page", 1)
	limit := parseIntQuery(r, "limit", 20)
	mine := strings.EqualFold(strings.TrimSpace(r.URL.Query().Get("mine")), "true")
	items, total, err := h.service.ListGroups(r.Context(), viewerID, r.URL.Query().Get("search"), r.URL.Query().Get("visibility"), mine, page, limit)
	if err != nil {
		handleError(w, r, err)
		return
	}
	mapped := make([]GroupResponse, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, mapGroup(item))
	}
	httpx.JSON(w, http.StatusOK, ListGroupsResponse{Groups: mapped, Pagination: paginate(page, limit, total)})
}

func (h *Handlers) GetGroup(w http.ResponseWriter, r *http.Request) {
	groupID := chi.URLParam(r, "groupId")
	group, err := h.service.GetGroup(r.Context(), groupID, optionalActorID(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, GroupDetailResponse{Group: mapGroup(group)})
}

func (h *Handlers) CreateGroup(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[CreateGroupRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	group, err := h.service.CreateGroup(r.Context(), actorID, groupsrepo.CreateGroupInput{
		Name:        req.Name,
		Slug:        req.Slug,
		Description: req.Description,
		Visibility:  req.Visibility,
		JoinPolicy:  req.JoinPolicy,
		Location:    req.Location,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, CreateGroupResponse{Group: mapGroup(group)})
}

func (h *Handlers) UpdateGroup(w http.ResponseWriter, r *http.Request) {
	groupID := chi.URLParam(r, "groupId")
	req, issues, ok := httpx.DecodeAndValidate[UpdateGroupRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	group, err := h.service.UpdateGroup(r.Context(), groupID, groupsrepo.UpdateGroupInput{
		Name:        req.Name,
		Description: req.Description,
		Visibility:  req.Visibility,
		Status:      req.Status,
		JoinPolicy:  req.JoinPolicy,
		Location:    req.Location,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, CreateGroupResponse{Group: mapGroup(group)})
}

func (h *Handlers) JoinGroup(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	groupID := chi.URLParam(r, "groupId")
	member, err := h.service.JoinGroup(r.Context(), groupID, actorID)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, JoinGroupResponse{Membership: mapMember(member)})
}

func (h *Handlers) LeaveGroup(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	groupID := chi.URLParam(r, "groupId")
	if err := h.service.LeaveGroup(r.Context(), groupID, actorID); err != nil {
		handleError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ListGroupMembers(w http.ResponseWriter, r *http.Request) {
	groupID := chi.URLParam(r, "groupId")
	page := parseIntQuery(r, "page", 1)
	limit := parseIntQuery(r, "limit", 20)
	items, total, err := h.service.ListMembers(r.Context(), groupID, optionalActorID(r), page, limit)
	if err != nil {
		handleError(w, r, err)
		return
	}
	mapped := make([]GroupMemberResponse, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, mapMember(item))
	}
	httpx.JSON(w, http.StatusOK, ListGroupMembersResponse{Members: mapped, Pagination: paginate(page, limit, total)})
}

func (h *Handlers) ListGroupPosts(w http.ResponseWriter, r *http.Request) {
	groupID := chi.URLParam(r, "groupId")
	page := parseIntQuery(r, "page", 1)
	limit := parseIntQuery(r, "limit", 20)
	items, total, err := h.service.ListPosts(r.Context(), groupID, optionalActorID(r), page, limit)
	if err != nil {
		handleError(w, r, err)
		return
	}
	mapped := make([]GroupPostResponse, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, mapPost(item))
	}
	httpx.JSON(w, http.StatusOK, ListGroupPostsResponse{Posts: mapped, Pagination: paginate(page, limit, total)})
}

func (h *Handlers) CreateGroupPost(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	groupID := chi.URLParam(r, "groupId")
	req, issues, ok := httpx.DecodeAndValidate[CreateGroupPostRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	post, err := h.service.CreatePost(r.Context(), groupID, actorID, req.Title, req.Content)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, CreateGroupPostResponse{Post: mapPost(post)})
}

func requireActorID(r *http.Request) (string, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return identity.UserID, nil
}

func optionalActorID(r *http.Request) string {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok {
		return ""
	}
	return strings.TrimSpace(identity.UserID)
}

func parseIntQuery(r *http.Request, key string, fallback int) int {
	value := strings.TrimSpace(r.URL.Query().Get(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 {
		return fallback
	}
	return parsed
}

func paginate(page, limit, total int) Pagination {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	totalPages := 0
	if total > 0 {
		totalPages = (total + limit - 1) / limit
	}
	return Pagination{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}
}

func handleError(w http.ResponseWriter, r *http.Request, err error) {
	var validationErr groupsservice.ValidationFailure
	if errors.As(err, &validationErr) {
		httpx.WriteValidationError(w, validationErr.Issues)
		return
	}
	httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
}

func mapGroup(item groupsrepo.Group) GroupResponse {
	return GroupResponse{
		ID:          item.ID,
		Name:        item.Name,
		Slug:        item.Slug,
		Description: item.Description,
		Visibility:  item.Visibility,
		Status:      item.Status,
		JoinPolicy:  item.JoinPolicy,
		Location:    item.Location,
		MemberCount: item.MemberCount,
		EventCount:  item.EventCount,
		PostCount:   item.PostCount,
		CreatedBy:   item.CreatedBy,
		CreatedAt:   item.CreatedAt,
		UpdatedAt:   item.UpdatedAt,
	}
}

func mapMember(item groupsrepo.GroupMember) GroupMemberResponse {
	return GroupMemberResponse{
		GroupID:     item.GroupID,
		UserID:      item.UserID,
		Role:        item.Role,
		Status:      item.Status,
		JoinedAt:    item.JoinedAt,
		CreatedAt:   item.CreatedAt,
		UpdatedAt:   item.UpdatedAt,
		Username:    item.Username,
		DisplayName: item.DisplayName,
		AvatarURL:   mediaurl.MaterializeWithDefault(item.AvatarURL),
	}
}

func mapPost(item groupsrepo.GroupPost) GroupPostResponse {
	return GroupPostResponse{
		ID:              item.ID,
		GroupID:         item.GroupID,
		AuthorUserID:    item.AuthorUserID,
		Title:           item.Title,
		Content:         item.Content,
		Status:          item.Status,
		LikeCount:       item.LikeCount,
		CommentCount:    item.CommentCount,
		CreatedAt:       item.CreatedAt,
		UpdatedAt:       item.UpdatedAt,
		AuthorName:      item.AuthorName,
		AuthorUsername:  item.AuthorUsername,
		AuthorAvatarURL: mediaurl.MaterializeWithDefault(item.AuthorAvatarURL),
	}
}
