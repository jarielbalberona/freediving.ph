import type { GlobalRole } from "@freediving.ph/config";

export const LEGACY_ROLE_TO_GLOBAL_ROLES: Record<string, GlobalRole[]> = {
  SUPER_ADMIN: ["super_admin"],
  ADMINISTRATOR: ["admin", "super_admin"],
  EDITOR: ["moderator", "admin", "super_admin"],
  AUTHOR: ["member", "trusted_member", "support", "moderator", "explore_curator", "records_verifier", "admin", "super_admin"],
  CONTRIBUTOR: ["member", "trusted_member", "support", "moderator", "explore_curator", "records_verifier", "admin", "super_admin"],
  SUBSCRIBER: ["member", "trusted_member", "support", "moderator", "explore_curator", "records_verifier", "admin", "super_admin"],
  USER: ["member", "trusted_member", "support", "moderator", "explore_curator", "records_verifier", "admin", "super_admin"]
};
