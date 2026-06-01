import type {
  CreateGroupRequest,
  CreateGroupResponse,
  CreateGroupPostResponse,
  CreateGroupPostRequest,
  GroupDetailResponse,
  GroupFilters,
  GroupMembershipResponse,
  GroupListResponse,
  GroupMembersResponse,
  GroupPostsResponse,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

const withQuery = (
  path: string,
  params: Record<string, string | number | boolean | undefined>,
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const getGroups = (filters: GroupFilters = {}) =>
  fphgoFetch<GroupListResponse>(
    withQuery("/v1/groups", {
      limit: filters.limit,
      mine: filters.mine,
      page: filters.page,
      search: filters.search,
      visibility: filters.visibility,
    }),
    { auth: "optional" },
  );

export const getGroupDetail = (slug: string) =>
  fphgoFetch<GroupDetailResponse>(`/v1/groups/${encodeURIComponent(slug)}`, {
    auth: "optional",
  });

export const getGroupMembers = (groupId: string) =>
  fphgoFetch<GroupMembersResponse>(
    `/v1/groups/${encodeURIComponent(groupId)}/members?limit=12`,
    { auth: "optional" },
  );

export const getGroupPosts = (groupId: string) =>
  fphgoFetch<GroupPostsResponse>(
    `/v1/groups/${encodeURIComponent(groupId)}/posts?limit=20`,
    { auth: "optional" },
  );

export const joinGroup = (groupId: string, authToken: string) =>
  fphgoFetch<GroupMembershipResponse>(
    `/v1/groups/${encodeURIComponent(groupId)}/join`,
    { auth: "required", authToken, method: "POST" },
  );

export const leaveGroup = (groupId: string, authToken: string) =>
  fphgoFetch<void>(`/v1/groups/${encodeURIComponent(groupId)}/leave`, {
    auth: "required",
    authToken,
    method: "POST",
  });

export const acceptGroupInvite = (groupId: string, authToken: string) =>
  fphgoFetch<GroupMembershipResponse>(
    `/v1/groups/${encodeURIComponent(groupId)}/invites/accept`,
    { auth: "required", authToken, method: "POST" },
  );

export const rejectGroupInvite = (groupId: string, authToken: string) =>
  fphgoFetch<GroupMembershipResponse>(
    `/v1/groups/${encodeURIComponent(groupId)}/invites/reject`,
    { auth: "required", authToken, method: "POST" },
  );

export const createGroupPost = (
  payload: CreateGroupPostRequest,
  authToken: string,
) =>
  fphgoFetch<CreateGroupPostResponse>(
    `/v1/groups/${encodeURIComponent(payload.groupId)}/posts`,
    {
      auth: "required",
      authToken,
      body: { content: payload.content, title: payload.title },
      method: "POST",
    },
  );

export const createGroup = (payload: CreateGroupRequest, authToken: string) =>
  fphgoFetch<CreateGroupResponse>("/v1/groups", {
    auth: "required",
    authToken,
    body: payload,
    method: "POST",
  });
