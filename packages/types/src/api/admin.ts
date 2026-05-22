import type { Role } from "./authz";

export type AdminAccountStatus = "active" | "read_only" | "suspended";

export type AdminPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type AdminProfile = {
  userId: string;
  username: string;
  displayName: string;
  globalRole: Role;
  accountStatus: AdminAccountStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  avatarUrl?: string;
  homeArea?: string;
  certLevel?: string;
  buddyCount: number;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminDiveSite = {
  id: string;
  slug: string;
  name: string;
  area: string;
  moderationState: "approved" | "pending" | "hidden";
  verificationStatus: "community" | "instructor" | "moderator" | "verified";
  entryDifficulty: "easy" | "moderate" | "hard";
  updateCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  lastUpdatedAt: string;
};

export type AdminGroup = {
  id: string;
  name: string;
  slug: string;
  visibility: "public" | "private";
  status: "active" | "archived" | "deleted";
  joinPolicy: "open" | "invite_only";
  memberCount: number;
  eventCount: number;
  postCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminListParams = {
  page?: number;
  limit?: number;
};

export type AdminUpdateGroupRequest = {
  name?: string;
  visibility?: "public" | "private";
  joinPolicy?: "open" | "invite_only";
};

export type AdminProfilesResponse = {
  items: AdminProfile[];
  pagination: AdminPagination;
};

export type AdminDiveSitesResponse = {
  items: AdminDiveSite[];
  pagination: AdminPagination;
};

export type AdminGroupsResponse = {
  items: AdminGroup[];
  pagination: AdminPagination;
};

export type AdminGroupResponse = {
  group: AdminGroup;
};
