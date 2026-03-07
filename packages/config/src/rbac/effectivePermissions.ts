import { ROLE_CONFIGS, type PermissionFlag, type PermissionMatrix } from "./permissions";
import type { GlobalRole } from "./roles";

export type PermissionOverrides = Partial<Record<PermissionFlag, boolean>>;

export const getEffectivePermissions = (
  role: GlobalRole,
  overrides?: PermissionOverrides | null
): PermissionMatrix => {
  const basePermissions = ROLE_CONFIGS[role];
  if (!overrides) {
    return { ...basePermissions };
  }

  const merged = { ...basePermissions };
  for (const [permission, value] of Object.entries(overrides) as Array<[PermissionFlag, boolean]>) {
    if (typeof value === "boolean") {
      merged[permission] = value;
    }
  }

  return merged;
};
