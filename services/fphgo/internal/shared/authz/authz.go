package authz

type Permission string

const (
	PermissionUsersRead    Permission = "users.read"
	PermissionUsersManage  Permission = "users.manage"
	PermissionContentWrite Permission = "content.write"
	PermissionContentRead  Permission = "content.read"
	PermissionGroupsRead   Permission = "groups.read"
	PermissionGroupsManage Permission = "groups.manage"
	PermissionEventsRead   Permission = "events.read"
	PermissionEventsManage Permission = "events.manage"
	PermissionReportsRead  Permission = "reports.read"
	PermissionReportsWrite Permission = "reports.write"
)

type Identity struct {
	UserID        string
	ClerkUserID   string
	GlobalRole    string
	AccountStatus string
	Permissions   map[Permission]bool
	Overrides     map[Permission]bool
}

type Scope struct {
	GroupID   string
	GroupRole string
	EventID   string
	EventRole string
}

func RolePermissions(role string) map[Permission]bool {
	permissions := map[Permission]bool{
		PermissionContentRead:  true,
		PermissionContentWrite: true,
		PermissionReportsWrite: true,
	}

	switch role {
	case "moderator":
		permissions[PermissionUsersRead] = true
		permissions[PermissionReportsRead] = true
	case "admin":
		permissions[PermissionUsersRead] = true
		permissions[PermissionUsersManage] = true
		permissions[PermissionGroupsManage] = true
		permissions[PermissionEventsManage] = true
		permissions[PermissionReportsRead] = true
	case "super_admin":
		permissions[PermissionUsersRead] = true
		permissions[PermissionUsersManage] = true
		permissions[PermissionGroupsRead] = true
		permissions[PermissionGroupsManage] = true
		permissions[PermissionEventsRead] = true
		permissions[PermissionEventsManage] = true
		permissions[PermissionReportsRead] = true
	}

	return permissions
}

func ApplyOverrides(base map[Permission]bool, overrides map[Permission]bool) map[Permission]bool {
	merged := make(map[Permission]bool, len(base)+len(overrides))
	for permission, allowed := range base {
		merged[permission] = allowed
	}
	for permission, allowed := range overrides {
		merged[permission] = allowed
	}
	return merged
}

func (identity Identity) IsAuthenticated() bool {
	return identity.UserID != ""
}

func (identity Identity) IsActive() bool {
	return identity.AccountStatus == "active"
}

func (identity Identity) IsReadOnly() bool {
	return identity.AccountStatus == "read_only"
}

func (identity Identity) Can(permission Permission, scope Scope) bool {
	if identity.Permissions[permission] {
		return true
	}

	switch permission {
	case PermissionGroupsRead:
		return scope.GroupRole != ""
	case PermissionGroupsManage:
		return scope.GroupRole == "owner" || scope.GroupRole == "moderator"
	case PermissionEventsRead:
		return scope.EventRole != ""
	case PermissionEventsManage:
		return scope.EventRole == "organizer" || scope.EventRole == "staff"
	default:
		return false
	}
}
