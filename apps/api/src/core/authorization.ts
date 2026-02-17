export type PlatformRole = "guest" | "member" | "moderator" | "admin";
export type GroupRole = "owner" | "moderator" | "member";

const PLATFORM_RANK: Record<PlatformRole, number> = {
	guest: 0,
	member: 1,
	moderator: 2,
	admin: 3
};

const MODERATOR_ROLES = new Set(["EDITOR"]);
const ADMIN_ROLES = new Set(["ADMINISTRATOR", "SUPER_ADMIN"]);
const MEMBER_ROLES = new Set(["USER", "SUBSCRIBER", "CONTRIBUTOR", "AUTHOR"]);

export const mapDbRoleToPlatformRole = (dbRole?: string | null): PlatformRole => {
	if (!dbRole) return "guest";
	if (ADMIN_ROLES.has(dbRole)) return "admin";
	if (MODERATOR_ROLES.has(dbRole)) return "moderator";
	if (MEMBER_ROLES.has(dbRole)) return "member";
	return "guest";
};

export const hasMinimumPlatformRole = (
	userDbRole: string | null | undefined,
	requiredRole: PlatformRole
): boolean => {
	const userRole = mapDbRoleToPlatformRole(userDbRole);
	return PLATFORM_RANK[userRole] >= PLATFORM_RANK[requiredRole];
};

const GROUP_ROLE_RANK: Record<GroupRole, number> = {
	member: 1,
	moderator: 2,
	owner: 3
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
