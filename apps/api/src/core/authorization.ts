export type PlatformRole = "guest" | "member" | "moderator" | "admin";
export type GroupRole = "owner" | "admin" | "moderator" | "member";

const PLATFORM_RANK: Record<PlatformRole, number> = {
	guest: 0,
	member: 1,
	moderator: 2,
	admin: 3
};

const MODERATOR_ROLES = new Set(["EDITOR"]);
const ADMIN_ROLES = new Set(["ADMINISTRATOR", "SUPER_ADMIN"]);
const MEMBER_ROLES = new Set(["USER", "SUBSCRIBER", "CONTRIBUTOR", "AUTHOR"]);
const MODERATOR_ALIASES = new Set(["moderator", "mod", "editor"]);
const ADMIN_ALIASES = new Set(["admin", "administrator", "super_admin"]);
const MEMBER_ALIASES = new Set(["member", "user", "subscriber", "contributor", "author"]);
const GUEST_ALIASES = new Set(["guest", "anonymous", "anon"]);

export const mapDbRoleToPlatformRole = (dbRole?: string | null): PlatformRole => {
	if (!dbRole) return "guest";
	if (ADMIN_ROLES.has(dbRole)) return "admin";
	if (MODERATOR_ROLES.has(dbRole)) return "moderator";
	if (MEMBER_ROLES.has(dbRole)) return "member";
	return "guest";
};

export const mapAnyRoleToPlatformRole = (role?: string | null): PlatformRole => {
	if (!role) return "guest";

	const normalized = role.trim().toLowerCase();
	if (ADMIN_ALIASES.has(normalized)) return "admin";
	if (MODERATOR_ALIASES.has(normalized)) return "moderator";
	if (MEMBER_ALIASES.has(normalized)) return "member";
	if (GUEST_ALIASES.has(normalized)) return "guest";

	return mapDbRoleToPlatformRole(role.toUpperCase());
};

export const hasMinimumPlatformRole = (
	userDbRole: string | null | undefined,
	requiredRole: PlatformRole
): boolean => {
	const userRole = mapDbRoleToPlatformRole(userDbRole);
	return PLATFORM_RANK[userRole] >= PLATFORM_RANK[requiredRole];
};

export const hasMinimumRole = (
	userRole: string | null | undefined,
	requiredRole: string | null | undefined
): boolean => {
	const userPlatformRole = mapAnyRoleToPlatformRole(userRole);
	const requiredPlatformRole = mapAnyRoleToPlatformRole(requiredRole);
	return PLATFORM_RANK[userPlatformRole] >= PLATFORM_RANK[requiredPlatformRole];
};

export const isModeratorDbRole = (role: string | null | undefined): boolean =>
	hasMinimumRole(role, "moderator");

export const isAdminDbRole = (role: string | null | undefined): boolean =>
	hasMinimumRole(role, "admin");

const GROUP_ROLE_RANK: Record<GroupRole, number> = {
	member: 1,
	moderator: 2,
	admin: 3,
	owner: 4
};

export const hasMinimumGroupRole = (
	userGroupRole: string | null | undefined,
	requiredRole: GroupRole
): boolean => {
	if (!userGroupRole) return false;
	const normalizedRole = userGroupRole.toLowerCase() as GroupRole;
	const roleRank = GROUP_ROLE_RANK[normalizedRole];
	if (!roleRank) return false;
	return roleRank >= GROUP_ROLE_RANK[requiredRole];
};
