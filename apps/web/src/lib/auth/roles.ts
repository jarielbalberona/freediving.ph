export type AppRole = "GUEST" | "MEMBER" | "MODERATOR" | "ADMIN";

const ROLE_RANK: Record<AppRole, number> = {
  GUEST: 0,
  MEMBER: 1,
  MODERATOR: 2,
  ADMIN: 3,
};

export const normalizeRole = (role: unknown): AppRole => {
  if (typeof role !== "string") return "GUEST";
  const upper = role.toUpperCase();
  if (["SUPER_ADMIN", "ADMINISTRATOR", "ADMIN"].includes(upper)) return "ADMIN";
  if (["EDITOR", "MODERATOR"].includes(upper)) return "MODERATOR";
  if (["USER", "SUBSCRIBER", "CONTRIBUTOR", "AUTHOR", "MEMBER"].includes(upper)) return "MEMBER";
  return "GUEST";
};

export const hasRequiredRole = (role: AppRole, required: AppRole) => {
  return ROLE_RANK[role] >= ROLE_RANK[required];
};
