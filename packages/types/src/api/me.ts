import type { Permission, Role } from "./authz";

export type AccountStatus = "active" | "read_only" | "suspended";

export type MeResponse = {
  userId: string;
  clerkSubject: string;
  globalRole: Role;
  accountStatus: AccountStatus;
  permissions: Permission[];
  scopes: {
    group: { groupId: string; role: Role } | null;
    event: { eventId: string; role: Role } | null;
  };
  displayName?: string;
  username?: string;
};
