export type PolicyAction = "reports.read" | "reports.moderate" | "reports.create";

export const policyRoleMap: Record<PolicyAction, string[]> = {
  "reports.create": ["USER", "CONTRIBUTOR", "AUTHOR", "EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"],
  "reports.read": ["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"],
  "reports.moderate": ["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"],
};

export const canPerformPolicyAction = (role: string, action: PolicyAction): boolean => {
  return policyRoleMap[action].includes(role);
};
