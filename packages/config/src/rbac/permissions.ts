import type { GlobalRole } from "./roles";

export const PERMISSION_FLAGS = [
  "profiles.view",
  "profiles.update_self",
  "profiles.update_any",
  "messaging.send",
  "messaging.read",
  "buddy.request",
  "buddy.accept",
  "groups.create",
  "groups.join",
  "groups.manage",
  "chika.read",
  "chika.post",
  "chika.moderate",
  "chika.reveal_identity",
  "explore.read",
  "explore.submit",
  "explore.moderate",
  "events.create",
  "events.manage",
  "events.moderate",
  "records.submit",
  "records.verify",
  "reports.create",
  "reports.review",
  "sanctions.apply",
  "admin.manage_roles",
  "admin.manage_settings",
  "admin.view_audit_log"
] as const;

export type PermissionFlag = (typeof PERMISSION_FLAGS)[number];

export type PermissionMatrix = Record<PermissionFlag, boolean>;

export const emptyPermissions = (): PermissionMatrix =>
  Object.fromEntries(PERMISSION_FLAGS.map((perm) => [perm, false])) as PermissionMatrix;

const allow = (...flags: PermissionFlag[]): PermissionMatrix => {
  const matrix = emptyPermissions();
  for (const flag of flags) {
    matrix[flag] = true;
  }
  return matrix;
};

export const ROLE_CONFIGS: Record<GlobalRole, PermissionMatrix> = {
  member: allow(
    "profiles.view",
    "profiles.update_self",
    "messaging.send",
    "messaging.read",
    "buddy.request",
    "buddy.accept",
    "groups.create",
    "groups.join",
    "chika.read",
    "chika.post",
    "explore.read",
    "explore.submit",
    "events.create",
    "records.submit",
    "reports.create"
  ),
  trusted_member: allow(
    "profiles.view",
    "profiles.update_self",
    "messaging.send",
    "messaging.read",
    "buddy.request",
    "buddy.accept",
    "groups.create",
    "groups.join",
    "chika.read",
    "chika.post",
    "explore.read",
    "explore.submit",
    "events.create",
    "records.submit",
    "reports.create"
  ),
  support: allow(
    "profiles.view",
    "profiles.update_self",
    "profiles.update_any",
    "messaging.read",
    "groups.join",
    "chika.read",
    "explore.read",
    "events.create",
    "reports.create",
    "admin.view_audit_log"
  ),
  moderator: allow(
    "profiles.view",
    "profiles.update_self",
    "messaging.send",
    "messaging.read",
    "buddy.request",
    "buddy.accept",
    "groups.create",
    "groups.join",
    "groups.manage",
    "chika.read",
    "chika.post",
    "chika.moderate",
    "chika.reveal_identity",
    "explore.read",
    "explore.submit",
    "events.create",
    "events.moderate",
    "records.submit",
    "reports.create",
    "reports.review",
    "sanctions.apply"
  ),
  explore_curator: allow(
    "profiles.view",
    "profiles.update_self",
    "messaging.send",
    "messaging.read",
    "groups.join",
    "chika.read",
    "chika.post",
    "explore.read",
    "explore.submit",
    "explore.moderate",
    "events.create",
    "records.submit",
    "reports.create"
  ),
  records_verifier: allow(
    "profiles.view",
    "profiles.update_self",
    "messaging.send",
    "messaging.read",
    "groups.join",
    "chika.read",
    "chika.post",
    "explore.read",
    "explore.submit",
    "events.create",
    "records.submit",
    "records.verify",
    "reports.create"
  ),
  admin: allow(...PERMISSION_FLAGS),
  super_admin: allow(...PERMISSION_FLAGS)
};
