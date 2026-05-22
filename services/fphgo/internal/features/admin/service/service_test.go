package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	adminrepo "fphgo/internal/features/admin/repo"
)

const (
	testPublicGroupID  = "11111111-1111-1111-1111-111111111111"
	testPrivateGroupID = "22222222-2222-2222-2222-222222222222"
)

func TestUpdateGroupRejectsPrivateOpenAndLegacyEnums(t *testing.T) {
	ctx := context.Background()
	repo := newAdminRepoStub()
	repo.groups[testPrivateGroupID] = adminTestGroup(testPrivateGroupID, "private", "invite_only")
	svc := New(repo)

	tests := []struct {
		name  string
		input UpdateGroupInput
		path  string
		code  string
	}{
		{
			name: "private open in same request",
			input: UpdateGroupInput{
				Visibility: ptr("private"),
				JoinPolicy: ptr("open"),
			},
			path: "joinPolicy",
			code: "private_invite_only",
		},
		{
			name:  "legacy visibility invite_only",
			input: UpdateGroupInput{Visibility: ptr("invite_only")},
			path:  "visibility",
			code:  "invalid_enum",
		},
		{
			name:  "legacy join policy approval",
			input: UpdateGroupInput{JoinPolicy: ptr("approval")},
			path:  "joinPolicy",
			code:  "invalid_enum",
		},
		{
			name:  "open join on existing private group",
			input: UpdateGroupInput{JoinPolicy: ptr("open")},
			path:  "joinPolicy",
			code:  "private_invite_only",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := svc.UpdateGroup(ctx, testPrivateGroupID, tc.input); !hasAdminValidationIssue(err, tc.path, tc.code) {
				t.Fatalf("UpdateGroup() err = %v, want %s/%s validation", err, tc.path, tc.code)
			}
		})
	}
}

func TestUpdateGroupPrivateVisibilityNormalizesJoinPolicy(t *testing.T) {
	ctx := context.Background()
	repo := newAdminRepoStub()
	repo.groups[testPublicGroupID] = adminTestGroup(testPublicGroupID, "public", "open")
	svc := New(repo)

	updated, err := svc.UpdateGroup(ctx, testPublicGroupID, UpdateGroupInput{
		Visibility: ptr("private"),
	})
	if err != nil {
		t.Fatalf("UpdateGroup(visibility private) returned error: %v", err)
	}
	if updated.Visibility != "private" || updated.JoinPolicy != "invite_only" {
		t.Fatalf("UpdateGroup(visibility private) = visibility %q joinPolicy %q, want private/invite_only", updated.Visibility, updated.JoinPolicy)
	}
}

func TestUpdateGroupDoesNotChangePublicJoinModeUnlessRequested(t *testing.T) {
	ctx := context.Background()
	repo := newAdminRepoStub()
	repo.groups[testPublicGroupID] = adminTestGroup(testPublicGroupID, "public", "open")
	svc := New(repo)

	updated, err := svc.UpdateGroup(ctx, testPublicGroupID, UpdateGroupInput{
		Name: ptr("Updated Public Group"),
	})
	if err != nil {
		t.Fatalf("UpdateGroup(name only) returned error: %v", err)
	}
	if updated.Visibility != "public" || updated.JoinPolicy != "open" {
		t.Fatalf("UpdateGroup(name only) = visibility %q joinPolicy %q, want public/open unchanged", updated.Visibility, updated.JoinPolicy)
	}
}

func TestListGroupsIncludesPublicAndPrivate(t *testing.T) {
	ctx := context.Background()
	repo := newAdminRepoStub()
	repo.groups[testPublicGroupID] = adminTestGroup(testPublicGroupID, "public", "open")
	repo.groups[testPrivateGroupID] = adminTestGroup(testPrivateGroupID, "private", "invite_only")
	svc := New(repo)

	result, err := svc.ListGroups(ctx, ListInput{Page: 1, Limit: 10})
	if err != nil {
		t.Fatalf("ListGroups() returned error: %v", err)
	}
	if result.Total != 2 || len(result.Items) != 2 {
		t.Fatalf("ListGroups() total=%d len=%d, want public and private groups", result.Total, len(result.Items))
	}
	if repo.groups[testPublicGroupID].Visibility != "public" || repo.groups[testPublicGroupID].JoinPolicy != "open" {
		t.Fatalf("ListGroups() mutated public group to %#v", repo.groups[testPublicGroupID])
	}
}

type adminRepoStub struct {
	groups map[string]adminrepo.Group
}

func newAdminRepoStub() *adminRepoStub {
	return &adminRepoStub{groups: map[string]adminrepo.Group{}}
}

func (r *adminRepoStub) ListProfiles(context.Context, adminrepo.ListInput) ([]adminrepo.Profile, int, error) {
	return nil, 0, nil
}

func (r *adminRepoStub) ListDiveSites(context.Context, adminrepo.ListInput) ([]adminrepo.DiveSite, int, error) {
	return nil, 0, nil
}

func (r *adminRepoStub) ListGroups(context.Context, adminrepo.ListInput) ([]adminrepo.Group, int, error) {
	items := make([]adminrepo.Group, 0, len(r.groups))
	for _, group := range r.groups {
		items = append(items, group)
	}
	return items, len(items), nil
}

func (r *adminRepoStub) GetGroup(_ context.Context, groupID string) (adminrepo.Group, error) {
	group, ok := r.groups[groupID]
	if !ok {
		return adminrepo.Group{}, pgx.ErrNoRows
	}
	return group, nil
}

func (r *adminRepoStub) UpdateGroup(_ context.Context, groupID string, input adminrepo.UpdateGroupInput) (adminrepo.Group, error) {
	group, ok := r.groups[groupID]
	if !ok {
		return adminrepo.Group{}, pgx.ErrNoRows
	}
	if input.Name != nil {
		group.Name = *input.Name
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
	group.UpdatedAt = time.Now().UTC()
	r.groups[groupID] = group
	return group, nil
}

func adminTestGroup(id, visibility, joinPolicy string) adminrepo.Group {
	now := time.Now().UTC()
	return adminrepo.Group{
		ID:         id,
		Name:       "Test Group",
		Slug:       id[:8],
		Visibility: visibility,
		Status:     "active",
		JoinPolicy: joinPolicy,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
}

func ptr(value string) *string {
	return &value
}

func hasAdminValidationIssue(err error, path string, code string) bool {
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
