import { ROLE_CONFIGS, type PermissionFlag } from "./permissions";
import type { PermissionOverrides } from "./effectivePermissions";
import {
  hasMinimumGlobalRole,
  hasMinimumGroupRole,
  hasMinimumEventRole,
  type EventRole,
  type GlobalRole,
  type GroupRole,
} from "./roles";

export const canGroupManage = (
  globalRole: GlobalRole,
  groupRole?: GroupRole | null,
): boolean => {
  if (hasMinimumGlobalRole(globalRole, "admin")) {
    return true;
  }

  if (!groupRole) {
    return false;
  }

  return hasMinimumGroupRole(groupRole, "group_moderator");
};

export const canEventManage = (eventRole?: EventRole | null): boolean => {
  if (!eventRole) {
    return false;
  }

  return hasMinimumEventRole(eventRole, "event_cohost");
};

export interface ScopedPermissionContext {
  globalRole: GlobalRole;
  groupRole?: GroupRole | null;
  eventRole?: EventRole | null;
  overrides?: PermissionOverrides | null;
}

export const resolveScopedPermission = (
  permission: PermissionFlag,
  context: ScopedPermissionContext,
): boolean => {
  const fromRole = ROLE_CONFIGS[context.globalRole][permission];
  const fromOverride = context.overrides?.[permission];

  if (fromOverride === false) {
    return false;
  }

  if (fromOverride === true || fromRole) {
    return true;
  }

  if (permission === "groups.manage") {
    return canGroupManage(context.globalRole, context.groupRole);
  }

  if (permission === "events.manage") {
    return canEventManage(context.eventRole);
  }

  return false;
};
