import { hasMinimumRole, type PlatformRole } from "@/core/authorization";

export type PolicyAction = "reports.read" | "reports.moderate" | "reports.create";

export const policyMinimumRoleMap: Record<PolicyAction, PlatformRole> = {
	"reports.create": "member",
	"reports.read": "moderator",
	"reports.moderate": "moderator",
};

export const policyRoleMap: Record<PolicyAction, PlatformRole[]> = {
	"reports.create": ["member", "moderator", "admin"],
	"reports.read": ["moderator", "admin"],
	"reports.moderate": ["moderator", "admin"],
};

export const canPerformPolicyAction = (
	role: string | null | undefined,
	action: PolicyAction
): boolean => {
	return hasMinimumRole(role, policyMinimumRoleMap[action]);
};
