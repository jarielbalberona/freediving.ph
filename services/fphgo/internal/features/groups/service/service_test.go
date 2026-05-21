package service

import (
	"context"
	"errors"
	"net/http"
	"slices"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	groupsrepo "fphgo/internal/features/groups/repo"
	notificationsservice "fphgo/internal/features/notifications/service"
	apperrors "fphgo/internal/shared/errors"
)

const (
	testOwnerID    = "00000000-0000-0000-0000-000000000001"
	testMemberID   = "00000000-0000-0000-0000-000000000002"
	testInviteeID  = "00000000-0000-0000-0000-000000000003"
	testInvitee2ID = "00000000-0000-0000-0000-000000000004"
	testStrangerID = "00000000-0000-0000-0000-000000000005"
	testBlockedID  = "00000000-0000-0000-0000-000000000006"

	openGroupID       = "11111111-1111-1111-1111-111111111111"
	inviteOnlyGroupID = "22222222-2222-2222-2222-222222222222"
	privateGroupID    = "33333333-3333-3333-3333-333333333333"
)

func TestCreatePostEmitsScopedGroupPostNotification(t *testing.T) {
	const (
		groupID   = "550e8400-e29b-41d4-a716-446655442001"
		actorID   = "550e8400-e29b-41d4-a716-446655442002"
		postID    = "550e8400-e29b-41d4-a716-446655442003"
		groupName = "Batangas Line Divers"
	)
	repo := &groupsRepoStub{
		group: groupsrepo.Group{
			ID:     groupID,
			Name:   groupName,
			Status: "active",
		},
		membership: groupsrepo.GroupMember{
			GroupID: groupID,
			UserID:  actorID,
			Role:    "member",
			Status:  "active",
		},
		createdPost: groupsrepo.GroupPost{
			ID:           postID,
			GroupID:      groupID,
			AuthorUserID: actorID,
			Title:        "Weekend line",
			Content:      "Training plan",
			Status:       "active",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}
	notifications := &groupsNotificationCapture{}
	svc := New(repo, WithNotifications(notifications))

	if _, err := svc.CreatePost(context.Background(), groupID, actorID, "Weekend line", "Training plan"); err != nil {
		t.Fatalf("CreatePost returned error: %v", err)
	}
	if len(notifications.posts) != 1 {
		t.Fatalf("expected one group post notification trigger, got %d", len(notifications.posts))
	}
	got := notifications.posts[0]
	if got.GroupID != groupID || got.PostID != postID || got.AuthorUserID != actorID || got.GroupName != groupName {
		t.Fatalf("unexpected notification input: %+v", got)
	}
}

type groupsNotificationCapture struct {
	posts   []notificationsservice.GroupPostCreatedInput
	invites []notificationsservice.GroupInviteReceivedInput
}

func (c *groupsNotificationCapture) NotifyGroupPostCreated(_ context.Context, input notificationsservice.GroupPostCreatedInput) error {
	c.posts = append(c.posts, input)
	return nil
}

func (c *groupsNotificationCapture) NotifyGroupInviteReceived(_ context.Context, input notificationsservice.GroupInviteReceivedInput) error {
	c.invites = append(c.invites, input)
	return nil
}

type groupsRepoStub struct {
	group       groupsrepo.Group
	membership  groupsrepo.GroupMember
	createdPost groupsrepo.GroupPost
}

func (r *groupsRepoStub) ListGroups(context.Context, groupsrepo.ListGroupsInput) ([]groupsrepo.Group, int, error) {
	return nil, 0, nil
}

func (r *groupsRepoStub) GetGroupByID(context.Context, string, string) (groupsrepo.Group, error) {
	return r.group, nil
}

func (r *groupsRepoStub) CreateGroup(context.Context, groupsrepo.CreateGroupInput) (groupsrepo.Group, error) {
	return groupsrepo.Group{}, nil
}

func (r *groupsRepoStub) AddOwnerMembership(context.Context, string, string) error { return nil }

func (r *groupsRepoStub) UpdateGroup(context.Context, groupsrepo.UpdateGroupInput) (groupsrepo.Group, error) {
	return groupsrepo.Group{}, nil
}

func (r *groupsRepoStub) GetMembership(context.Context, string, string) (groupsrepo.GroupMember, error) {
	return r.membership, nil
}

func (r *groupsRepoStub) UpsertMembership(context.Context, string, string, string, string) (groupsrepo.GroupMember, error) {
	return groupsrepo.GroupMember{}, nil
}

func (r *groupsRepoStub) InviteMember(context.Context, string, string, string) (groupsrepo.GroupMember, error) {
	return groupsrepo.GroupMember{}, nil
}

func (r *groupsRepoStub) AcceptInvite(context.Context, string, string) (groupsrepo.GroupMember, error) {
	return groupsrepo.GroupMember{}, nil
}

func (r *groupsRepoStub) RejectInvite(context.Context, string, string) (groupsrepo.GroupMember, error) {
	return groupsrepo.GroupMember{}, nil
}

func (r *groupsRepoStub) LeaveGroup(context.Context, string, string) error { return nil }

func (r *groupsRepoStub) ListMembers(context.Context, groupsrepo.ListGroupMembersInput) ([]groupsrepo.GroupMember, int, error) {
	return nil, 0, nil
}

func (r *groupsRepoStub) ListPosts(context.Context, groupsrepo.ListGroupPostsInput) ([]groupsrepo.GroupPost, int, error) {
	return nil, 0, nil
}

func (r *groupsRepoStub) CreatePost(context.Context, groupsrepo.CreateGroupPostInput) (groupsrepo.GroupPost, error) {
	return r.createdPost, nil
}

func (r *groupsRepoStub) UserIsActive(context.Context, string) (bool, error) { return true, nil }

func TestViewingOpenGroupDoesNotAutoJoinAndJoinRequiresExplicitAction(t *testing.T) {
	ctx := context.Background()
	repo := newFakeRepo()
	repo.groups[openGroupID] = fakeGroup(openGroupID, "public", "open")

	svc := New(repo)

	if _, err := svc.GetGroup(ctx, openGroupID, testStrangerID); err != nil {
		t.Fatalf("GetGroup() returned error: %v", err)
	}
	if _, err := repo.GetMembership(ctx, openGroupID, testStrangerID); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatalf("GetGroup() auto-created membership; err=%v", err)
	}

	member, err := svc.JoinGroup(ctx, openGroupID, testStrangerID)
	if err != nil {
		t.Fatalf("JoinGroup() returned error: %v", err)
	}
	if member.Status != "active" {
		t.Fatalf("JoinGroup() status = %q, want active", member.Status)
	}
}

func TestMineOnlyReturnsActiveMemberships(t *testing.T) {
	ctx := context.Background()
	repo := newFakeRepo()
	activeGroup := "44444444-4444-4444-4444-444444444444"
	invitedGroup := "55555555-5555-5555-5555-555555555555"
	leftGroup := "66666666-6666-6666-6666-666666666666"
	publicGroup := "77777777-7777-7777-7777-777777777777"
	for _, id := range []string{activeGroup, invitedGroup, leftGroup, publicGroup} {
		repo.groups[id] = fakeGroup(id, "public", "open")
	}
	repo.members[key(activeGroup, testMemberID)] = fakeMember(activeGroup, testMemberID, "member", "active")
	repo.members[key(invitedGroup, testMemberID)] = fakeMember(invitedGroup, testMemberID, "member", "invited")
	repo.members[key(leftGroup, testMemberID)] = fakeMember(leftGroup, testMemberID, "member", "left")

	svc := New(repo)
	groups, total, err := svc.ListGroups(ctx, testMemberID, "", "", true, 1, 20)
	if err != nil {
		t.Fatalf("ListGroups(mine=true) returned error: %v", err)
	}
	if total != 1 || len(groups) != 1 || groups[0].ID != activeGroup {
		t.Fatalf("ListGroups(mine=true) = total %d groups %#v, want only active membership", total, groups)
	}

	groups, total, err = svc.ListGroups(ctx, "", "", "", true, 1, 20)
	if err != nil {
		t.Fatalf("ListGroups(anonymous mine=true) returned error: %v", err)
	}
	if total != 0 || len(groups) != 0 {
		t.Fatalf("anonymous mine=true = total %d groups %#v, want empty", total, groups)
	}
}

func TestPrivateGroupsRequireInviteOnlyJoinPolicy(t *testing.T) {
	ctx := context.Background()
	repo := newFakeRepo()
	svc := New(repo)

	if _, err := svc.CreateGroup(ctx, testOwnerID, groupsrepo.CreateGroupInput{
		Name:       "Private Open Group",
		Visibility: "private",
		JoinPolicy: "open",
	}); !hasValidationIssue(err, "joinPolicy", "private_invite_only") {
		t.Fatalf("CreateGroup(private/open) err = %v, want private_invite_only validation", err)
	}

	repo.groups[openGroupID] = fakeGroup(openGroupID, "public", "open")
	privateVisibility := "private"
	updated, err := svc.UpdateGroup(ctx, openGroupID, groupsrepo.UpdateGroupInput{
		Visibility: &privateVisibility,
	})
	if err != nil {
		t.Fatalf("UpdateGroup(visibility private) returned error: %v", err)
	}
	if updated.Visibility != "private" || updated.JoinPolicy != "invite_only" {
		t.Fatalf("UpdateGroup(visibility private) = visibility %q joinPolicy %q, want private/invite_only", updated.Visibility, updated.JoinPolicy)
	}

	repo.groups[privateGroupID] = fakeGroup(privateGroupID, "private", "invite_only")
	openJoin := "open"
	if _, err := svc.UpdateGroup(ctx, privateGroupID, groupsrepo.UpdateGroupInput{
		JoinPolicy: &openJoin,
	}); !hasValidationIssue(err, "joinPolicy", "private_invite_only") {
		t.Fatalf("UpdateGroup(private join open) err = %v, want private_invite_only validation", err)
	}
}

func TestInviteOnlyLifecycle(t *testing.T) {
	ctx := context.Background()
	repo := newFakeRepo()
	repo.groups[inviteOnlyGroupID] = fakeGroup(inviteOnlyGroupID, "public", "invite_only")
	repo.members[key(inviteOnlyGroupID, testOwnerID)] = fakeMember(inviteOnlyGroupID, testOwnerID, "owner", "active")

	svc := New(repo)

	if _, err := svc.JoinGroup(ctx, inviteOnlyGroupID, testInviteeID); !hasAppError(err, http.StatusForbidden, "invite_required") {
		t.Fatalf("JoinGroup(invite-only without invite) err = %v, want invite_required", err)
	}

	invited, err := svc.InviteMember(ctx, inviteOnlyGroupID, testOwnerID, testInviteeID)
	if err != nil {
		t.Fatalf("InviteMember() returned error: %v", err)
	}
	if invited.Status != "invited" || invited.InvitedBy != testOwnerID {
		t.Fatalf("InviteMember() = %#v, want pending invite by owner", invited)
	}

	accepted, err := svc.AcceptInvite(ctx, inviteOnlyGroupID, testInviteeID)
	if err != nil {
		t.Fatalf("AcceptInvite() returned error: %v", err)
	}
	if accepted.Status != "active" || accepted.JoinedAt == nil {
		t.Fatalf("AcceptInvite() = %#v, want active membership with joined timestamp", accepted)
	}

	rejected, err := svc.InviteMember(ctx, inviteOnlyGroupID, testOwnerID, testInvitee2ID)
	if err != nil {
		t.Fatalf("InviteMember(second) returned error: %v", err)
	}
	if rejected.Status != "invited" {
		t.Fatalf("InviteMember(second) status = %q, want invited", rejected.Status)
	}
	rejected, err = svc.RejectInvite(ctx, inviteOnlyGroupID, testInvitee2ID)
	if err != nil {
		t.Fatalf("RejectInvite() returned error: %v", err)
	}
	if rejected.Status != "declined" || rejected.RespondedAt == nil {
		t.Fatalf("RejectInvite() = %#v, want declined with response timestamp", rejected)
	}
}

func TestPrivateGroupsAreHiddenAndContentRequiresActiveMembership(t *testing.T) {
	ctx := context.Background()
	repo := newFakeRepo()
	repo.groups[privateGroupID] = fakeGroup(privateGroupID, "private", "invite_only")
	repo.members[key(privateGroupID, testOwnerID)] = fakeMember(privateGroupID, testOwnerID, "owner", "active")
	repo.members[key(privateGroupID, testInviteeID)] = fakeMember(privateGroupID, testInviteeID, "member", "invited")
	repo.posts[privateGroupID] = []groupsrepo.GroupPost{{
		ID:           "99999999-9999-9999-9999-999999999999",
		GroupID:      privateGroupID,
		AuthorUserID: testOwnerID,
		Content:      "private plan",
		Status:       "active",
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}}

	svc := New(repo)

	groups, total, err := svc.ListGroups(ctx, testStrangerID, "", "", false, 1, 20)
	if err != nil {
		t.Fatalf("ListGroups(non-member) returned error: %v", err)
	}
	if total != 0 || len(groups) != 0 {
		t.Fatalf("private group leaked to non-member browse: total %d groups %#v", total, groups)
	}

	if _, err := svc.GetGroup(ctx, privateGroupID, testStrangerID); !hasAppError(err, http.StatusForbidden, "forbidden") {
		t.Fatalf("GetGroup(non-member private) err = %v, want forbidden", err)
	}
	if _, err := svc.GetGroup(ctx, privateGroupID, testInviteeID); err != nil {
		t.Fatalf("GetGroup(invited private) returned error: %v", err)
	}
	if _, _, err := svc.ListMembers(ctx, privateGroupID, testInviteeID, 1, 20); !hasAppError(err, http.StatusForbidden, "forbidden") {
		t.Fatalf("ListMembers(invited private) err = %v, want forbidden", err)
	}
	if _, _, err := svc.ListPosts(ctx, privateGroupID, testInviteeID, 1, 20); !hasAppError(err, http.StatusForbidden, "forbidden") {
		t.Fatalf("ListPosts(invited private) err = %v, want forbidden", err)
	}

	members, _, err := svc.ListMembers(ctx, privateGroupID, testOwnerID, 1, 20)
	if err != nil {
		t.Fatalf("ListMembers(owner private) returned error: %v", err)
	}
	if len(members) != 1 || members[0].UserID != testOwnerID {
		t.Fatalf("ListMembers(owner private) = %#v, want active owner only", members)
	}
	posts, _, err := svc.ListPosts(ctx, privateGroupID, testOwnerID, 1, 20)
	if err != nil {
		t.Fatalf("ListPosts(owner private) returned error: %v", err)
	}
	if len(posts) != 1 || posts[0].Content != "private plan" {
		t.Fatalf("ListPosts(owner private) = %#v, want private post", posts)
	}
}

func TestLeaveSetsLeftNotBlocked(t *testing.T) {
	ctx := context.Background()
	repo := newFakeRepo()
	repo.groups[openGroupID] = fakeGroup(openGroupID, "public", "open")
	repo.members[key(openGroupID, testMemberID)] = fakeMember(openGroupID, testMemberID, "member", "active")

	svc := New(repo)
	if err := svc.LeaveGroup(ctx, openGroupID, testMemberID); err != nil {
		t.Fatalf("LeaveGroup() returned error: %v", err)
	}
	member := repo.members[key(openGroupID, testMemberID)]
	if member.Status != "left" || member.LeftAt == nil {
		t.Fatalf("LeaveGroup() member = %#v, want left status with left timestamp", member)
	}
	if member.Status == "blocked" {
		t.Fatal("LeaveGroup() marked normal leave as blocked")
	}
}

func TestBlockedUserCannotJoinOrBeInvited(t *testing.T) {
	ctx := context.Background()
	repo := newFakeRepo()
	repo.groups[openGroupID] = fakeGroup(openGroupID, "public", "open")
	repo.members[key(openGroupID, testOwnerID)] = fakeMember(openGroupID, testOwnerID, "owner", "active")
	repo.members[key(openGroupID, testBlockedID)] = fakeMember(openGroupID, testBlockedID, "member", "blocked")

	svc := New(repo)
	if _, err := svc.JoinGroup(ctx, openGroupID, testBlockedID); !hasAppError(err, http.StatusForbidden, "member_blocked") {
		t.Fatalf("JoinGroup(blocked) err = %v, want member_blocked", err)
	}
	if _, err := svc.InviteMember(ctx, openGroupID, testOwnerID, testBlockedID); !hasAppError(err, http.StatusForbidden, "member_blocked") {
		t.Fatalf("InviteMember(blocked) err = %v, want member_blocked", err)
	}
	if member := repo.members[key(openGroupID, testBlockedID)]; member.Status != "blocked" {
		t.Fatalf("blocked membership changed to %q", member.Status)
	}
}

type fakeRepo struct {
	groups      map[string]groupsrepo.Group
	members     map[string]groupsrepo.GroupMember
	posts       map[string][]groupsrepo.GroupPost
	activeUsers map[string]bool
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		groups:  map[string]groupsrepo.Group{},
		members: map[string]groupsrepo.GroupMember{},
		posts:   map[string][]groupsrepo.GroupPost{},
		activeUsers: map[string]bool{
			testOwnerID:    true,
			testMemberID:   true,
			testInviteeID:  true,
			testInvitee2ID: true,
			testStrangerID: true,
			testBlockedID:  true,
		},
	}
}

func (r *fakeRepo) ListGroups(_ context.Context, input groupsrepo.ListGroupsInput) ([]groupsrepo.Group, int, error) {
	items := make([]groupsrepo.Group, 0, len(r.groups))
	for _, group := range r.groups {
		if group.Status != "active" {
			continue
		}
		membership, hasMembership := r.members[key(group.ID, input.ViewerUserID)]
		if input.Mine {
			if !hasMembership || membership.Status != "active" {
				continue
			}
		} else if group.Visibility != "public" {
			if !hasMembership || (membership.Status != "active" && membership.Status != "invited") {
				continue
			}
		}
		if input.Visibility != "" && group.Visibility != input.Visibility {
			continue
		}
		items = append(items, r.withViewer(group, input.ViewerUserID))
	}
	slices.SortFunc(items, func(a, b groupsrepo.Group) int {
		if a.ID < b.ID {
			return -1
		}
		if a.ID > b.ID {
			return 1
		}
		return 0
	})
	return items, len(items), nil
}

func (r *fakeRepo) GetGroupByID(_ context.Context, groupID, viewerUserID string) (groupsrepo.Group, error) {
	group, ok := r.groups[groupID]
	if !ok {
		return groupsrepo.Group{}, pgx.ErrNoRows
	}
	return r.withViewer(group, viewerUserID), nil
}

func (r *fakeRepo) CreateGroup(_ context.Context, input groupsrepo.CreateGroupInput) (groupsrepo.Group, error) {
	group := fakeGroup(openGroupID, input.Visibility, input.JoinPolicy)
	group.Name = input.Name
	group.Slug = input.Slug
	group.Bio = input.Bio
	group.Description = input.Description
	group.Location = input.Location
	group.LocationName = input.LocationName
	group.FormattedAddress = input.FormattedAddress
	group.RegionCode = input.RegionCode
	group.ProvinceCode = input.ProvinceCode
	group.CityCode = input.CityCode
	group.BarangayCode = input.BarangayCode
	group.LocationSource = input.LocationSource
	group.CreatedBy = input.CreatedBy
	r.groups[group.ID] = group
	return group, nil
}

func (r *fakeRepo) AddOwnerMembership(_ context.Context, groupID, userID string) error {
	r.members[key(groupID, userID)] = fakeMember(groupID, userID, "owner", "active")
	return nil
}

func (r *fakeRepo) UpdateGroup(_ context.Context, input groupsrepo.UpdateGroupInput) (groupsrepo.Group, error) {
	group, ok := r.groups[input.GroupID]
	if !ok {
		return groupsrepo.Group{}, pgx.ErrNoRows
	}
	if input.Name != nil {
		group.Name = *input.Name
	}
	if input.Bio != nil {
		group.Bio = *input.Bio
	}
	if input.Description != nil {
		group.Description = *input.Description
	}
	if input.Visibility != nil {
		group.Visibility = *input.Visibility
	}
	if input.Status != nil {
		group.Status = *input.Status
	}
	if input.JoinPolicy != nil {
		group.JoinPolicy = *input.JoinPolicy
	}
	if input.Location != nil {
		group.Location = *input.Location
	}
	r.groups[input.GroupID] = group
	return group, nil
}

func (r *fakeRepo) GetMembership(_ context.Context, groupID, userID string) (groupsrepo.GroupMember, error) {
	member, ok := r.members[key(groupID, userID)]
	if !ok {
		return groupsrepo.GroupMember{}, pgx.ErrNoRows
	}
	return member, nil
}

func (r *fakeRepo) UpsertMembership(_ context.Context, groupID, userID, role, status string) (groupsrepo.GroupMember, error) {
	now := time.Now().UTC()
	member, exists := r.members[key(groupID, userID)]
	if exists && member.Status == "blocked" {
		return groupsrepo.GroupMember{}, pgx.ErrNoRows
	}
	member.GroupID = groupID
	member.UserID = userID
	member.Role = role
	member.Status = status
	if member.CreatedAt.IsZero() {
		member.CreatedAt = now
	}
	member.UpdatedAt = now
	if status == "active" {
		if member.JoinedAt == nil {
			member.JoinedAt = &now
		}
		member.LeftAt = nil
		member.RespondedAt = &now
	}
	r.members[key(groupID, userID)] = member
	return member, nil
}

func (r *fakeRepo) InviteMember(_ context.Context, groupID, userID, invitedBy string) (groupsrepo.GroupMember, error) {
	now := time.Now().UTC()
	member, exists := r.members[key(groupID, userID)]
	if exists && (member.Status == "active" || member.Status == "blocked") {
		return groupsrepo.GroupMember{}, pgx.ErrNoRows
	}
	member.GroupID = groupID
	member.UserID = userID
	member.Role = "member"
	member.Status = "invited"
	member.InvitedBy = invitedBy
	if member.CreatedAt.IsZero() {
		member.CreatedAt = now
	}
	if member.InvitedAt == nil {
		member.InvitedAt = &now
	}
	member.RespondedAt = nil
	member.JoinedAt = nil
	member.LeftAt = nil
	member.UpdatedAt = now
	r.members[key(groupID, userID)] = member
	return member, nil
}

func (r *fakeRepo) AcceptInvite(_ context.Context, groupID, userID string) (groupsrepo.GroupMember, error) {
	now := time.Now().UTC()
	member, ok := r.members[key(groupID, userID)]
	if !ok || member.Status != "invited" {
		return groupsrepo.GroupMember{}, pgx.ErrNoRows
	}
	member.Status = "active"
	member.JoinedAt = &now
	member.RespondedAt = &now
	member.LeftAt = nil
	member.UpdatedAt = now
	r.members[key(groupID, userID)] = member
	return member, nil
}

func (r *fakeRepo) RejectInvite(_ context.Context, groupID, userID string) (groupsrepo.GroupMember, error) {
	now := time.Now().UTC()
	member, ok := r.members[key(groupID, userID)]
	if !ok || member.Status != "invited" {
		return groupsrepo.GroupMember{}, pgx.ErrNoRows
	}
	member.Status = "declined"
	member.RespondedAt = &now
	member.UpdatedAt = now
	r.members[key(groupID, userID)] = member
	return member, nil
}

func (r *fakeRepo) LeaveGroup(_ context.Context, groupID, userID string) error {
	now := time.Now().UTC()
	member, ok := r.members[key(groupID, userID)]
	if !ok || member.Status != "active" {
		return pgx.ErrNoRows
	}
	member.Status = "left"
	member.LeftAt = &now
	member.UpdatedAt = now
	r.members[key(groupID, userID)] = member
	return nil
}

func (r *fakeRepo) ListMembers(_ context.Context, input groupsrepo.ListGroupMembersInput) ([]groupsrepo.GroupMember, int, error) {
	items := []groupsrepo.GroupMember{}
	for _, member := range r.members {
		if member.GroupID == input.GroupID && member.Status == "active" {
			items = append(items, member)
		}
	}
	return items, len(items), nil
}

func (r *fakeRepo) ListPosts(_ context.Context, input groupsrepo.ListGroupPostsInput) ([]groupsrepo.GroupPost, int, error) {
	items := r.posts[input.GroupID]
	return items, len(items), nil
}

func (r *fakeRepo) CreatePost(_ context.Context, input groupsrepo.CreateGroupPostInput) (groupsrepo.GroupPost, error) {
	now := time.Now().UTC()
	post := groupsrepo.GroupPost{
		ID:           "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
		GroupID:      input.GroupID,
		AuthorUserID: input.AuthorUserID,
		Title:        input.Title,
		Content:      input.Content,
		Status:       "active",
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	r.posts[input.GroupID] = append(r.posts[input.GroupID], post)
	return post, nil
}

func (r *fakeRepo) UserIsActive(_ context.Context, userID string) (bool, error) {
	return r.activeUsers[userID], nil
}

func (r *fakeRepo) withViewer(group groupsrepo.Group, viewerUserID string) groupsrepo.Group {
	if member, ok := r.members[key(group.ID, viewerUserID)]; ok {
		group.ViewerRole = member.Role
		group.ViewerMembershipStatus = member.Status
		group.ViewerJoinedAt = member.JoinedAt
		group.ViewerInvitedAt = member.InvitedAt
	}
	group.MemberCount = 0
	for _, member := range r.members {
		if member.GroupID == group.ID && member.Status == "active" {
			group.MemberCount++
		}
	}
	group.PostCount = len(r.posts[group.ID])
	return group
}

func fakeGroup(id, visibility, joinPolicy string) groupsrepo.Group {
	now := time.Now().UTC()
	return groupsrepo.Group{
		ID:             id,
		Name:           "Test Group",
		Slug:           id[:8],
		Visibility:     visibility,
		Status:         "active",
		JoinPolicy:     joinPolicy,
		LocationSource: "manual",
		CreatedBy:      testOwnerID,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

func fakeMember(groupID, userID, role, status string) groupsrepo.GroupMember {
	now := time.Now().UTC()
	member := groupsrepo.GroupMember{
		GroupID:   groupID,
		UserID:    userID,
		Role:      role,
		Status:    status,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if status == "active" {
		member.JoinedAt = &now
	}
	if status == "invited" {
		member.InvitedBy = testOwnerID
		member.InvitedAt = &now
	}
	return member
}

func key(groupID, userID string) string {
	return groupID + ":" + userID
}

func hasAppError(err error, status int, code string) bool {
	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) {
		return false
	}
	return appErr.Status == status && appErr.Code == code
}

func hasValidationIssue(err error, path string, code string) bool {
	var validationErr ValidationFailure
	if !errors.As(err, &validationErr) {
		return false
	}
	for _, issue := range validationErr.Issues {
		if len(issue.Path) == 1 && issue.Path[0] == path && issue.Code == code {
			return true
		}
	}
	return false
}
