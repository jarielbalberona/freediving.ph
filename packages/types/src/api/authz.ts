export type Permission = string;

export type Role =
  | "member"
  | "trusted_member"
  | "support"
  | "moderator"
  | "explore_curator"
  | "records_verifier"
  | "admin"
  | "super_admin";
