export const GLOBAL_ROLES = [
  "member",
  "trusted_member",
  "support",
  "moderator",
  "explore_curator",
  "records_verifier",
  "admin",
  "super_admin"
] as const;

export type GlobalRole = (typeof GLOBAL_ROLES)[number];

export const GROUP_ROLES = ["group_member", "group_moderator", "group_admin"] as const;
export type GroupRole = (typeof GROUP_ROLES)[number];

export const EVENT_ROLES = ["event_attendee", "event_cohost", "event_host"] as const;
export type EventRole = (typeof EVENT_ROLES)[number];

export const ACCOUNT_STATUSES = ["active", "read_only", "suspended"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const GLOBAL_ROLE_RANK: Record<GlobalRole, number> = {
  member: 1,
  trusted_member: 2,
  support: 3,
  moderator: 4,
  explore_curator: 4,
  records_verifier: 4,
  admin: 5,
  super_admin: 6
};

export const GROUP_ROLE_RANK: Record<GroupRole, number> = {
  group_member: 1,
  group_moderator: 2,
  group_admin: 3
};

export const EVENT_ROLE_RANK: Record<EventRole, number> = {
  event_attendee: 1,
  event_cohost: 2,
  event_host: 3
};

export const hasMinimumGlobalRole = (current: GlobalRole, required: GlobalRole): boolean =>
  GLOBAL_ROLE_RANK[current] >= GLOBAL_ROLE_RANK[required];

export const hasMinimumGroupRole = (current: GroupRole, required: GroupRole): boolean =>
  GROUP_ROLE_RANK[current] >= GROUP_ROLE_RANK[required];

export const hasMinimumEventRole = (current: EventRole, required: EventRole): boolean =>
  EVENT_ROLE_RANK[current] >= EVENT_ROLE_RANK[required];
