package authz

import (
	"testing"
)

func TestRolePermissions(t *testing.T) {
	tests := []struct {
		role       string
		wantRead   bool
		wantManage bool
	}{
		{"member", false, false},
		{"moderator", true, false},
		{"admin", true, true},
		{"super_admin", true, true},
	}
	for _, tt := range tests {
		perms := RolePermissions(tt.role)
		if got := perms[PermissionUsersRead]; got != tt.wantRead {
			t.Errorf("RolePermissions(%q).UsersRead = %v, want %v", tt.role, got, tt.wantRead)
		}
		if got := perms[PermissionUsersManage]; got != tt.wantManage {
			t.Errorf("RolePermissions(%q).UsersManage = %v, want %v", tt.role, got, tt.wantManage)
		}
	}
}

func TestRolePermissions_MemberUsesGranularWritePermissions(t *testing.T) {
	perms := RolePermissions("member")

	if perms[PermissionContentWrite] {
		t.Fatal("member should not get broad content.write by default")
	}
	if !perms[PermissionMessagingWrite] {
		t.Fatal("member should get messaging.write")
	}
	if !perms[PermissionChikaWrite] {
		t.Fatal("member should get chika.write")
	}
	if !perms[PermissionBlocksRead] || !perms[PermissionBlocksWrite] {
		t.Fatal("member should get blocks.read and blocks.write")
	}
	if !perms[PermissionReportsWrite] {
		t.Fatal("member should get reports.write")
	}
}

func TestRolePermissions_ModeratorGetsReportModerationAndBlocks(t *testing.T) {
	perms := RolePermissions("moderator")

	if !perms[PermissionReportsRead] || !perms[PermissionReportsModerate] {
		t.Fatal("moderator should get reports.read and reports.moderate")
	}
	if !perms[PermissionBlocksRead] || !perms[PermissionBlocksWrite] {
		t.Fatal("moderator should get blocks.read and blocks.write")
	}
	if !perms[PermissionExploreModerate] {
		t.Fatal("moderator should get explore.moderate")
	}
}

func TestRolePermissions_MemberCannotModerateExplore(t *testing.T) {
	perms := RolePermissions("member")

	if perms[PermissionExploreModerate] {
		t.Fatal("member should not get explore.moderate")
	}
}

func TestApplyOverrides(t *testing.T) {
	base := map[Permission]bool{
		PermissionUsersRead:   true,
		PermissionUsersManage: false,
	}
	overrides := map[Permission]bool{
		PermissionUsersManage: true,  // grant
		PermissionUsersRead:   false, // revoke
	}
	merged := ApplyOverrides(base, overrides)
	if !merged[PermissionUsersManage] {
		t.Error("override should grant users.manage")
	}
	if merged[PermissionUsersRead] {
		t.Error("override should revoke users.read")
	}
}

func TestIdentity_Can_GlobalPermission(t *testing.T) {
	identity := Identity{
		UserID:      "u1",
		GlobalRole:  "admin",
		Permissions: RolePermissions("admin"),
	}
	if !identity.Can(PermissionUsersRead, Scope{}) {
		t.Error("admin should have users.read")
	}
	if !identity.Can(PermissionUsersManage, Scope{}) {
		t.Error("admin should have users.manage")
	}
}

func TestIdentity_Can_ScopedGroupRole(t *testing.T) {
	identity := Identity{
		UserID:      "u1",
		Permissions: RolePermissions("member"),
	}
	scope := Scope{GroupID: "g1", GroupRole: "owner"}
	if !identity.Can(PermissionGroupsManage, scope) {
		t.Error("group owner should have groups.manage via scope")
	}
	scope.GroupRole = "member"
	if identity.Can(PermissionGroupsManage, scope) {
		t.Error("group member should not have groups.manage")
	}
}

func TestIdentity_Can_ScopedEventRole(t *testing.T) {
	identity := Identity{
		UserID:      "u1",
		Permissions: RolePermissions("member"),
	}
	scope := Scope{EventID: "e1", EventRole: "organizer"}
	if !identity.Can(PermissionEventsManage, scope) {
		t.Error("event organizer should have events.manage via scope")
	}
}

func TestIdentity_Can_OverrideDeny(t *testing.T) {
	base := RolePermissions("admin")
	overrides := map[Permission]bool{PermissionUsersRead: false}
	identity := Identity{
		UserID:      "u1",
		Permissions: ApplyOverrides(base, overrides),
	}
	if identity.Can(PermissionUsersRead, Scope{}) {
		t.Error("override should revoke users.read")
	}
}
