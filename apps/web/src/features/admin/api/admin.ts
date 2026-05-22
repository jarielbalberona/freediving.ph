import type {
  AdminDiveSitesResponse,
  AdminGroupResponse,
  AdminGroupsResponse,
  AdminListParams,
  AdminProfilesResponse,
  AdminUpdateGroupRequest,
} from "@freediving.ph/types";

import { fphgoFetchClient } from "@/lib/api/fphgo-fetch-client";
import { routes } from "@/lib/api/fphgo-routes";

const withQuery = (path: string, params: AdminListParams = {}) => {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const adminApi = {
  listProfiles: (params?: AdminListParams) =>
    fphgoFetchClient<AdminProfilesResponse>(
      withQuery(routes.v1.admin.profiles(), params),
    ),

  listDiveSites: (params?: AdminListParams) =>
    fphgoFetchClient<AdminDiveSitesResponse>(
      withQuery(routes.v1.admin.diveSites(), params),
    ),

  listGroups: (params?: AdminListParams) =>
    fphgoFetchClient<AdminGroupsResponse>(
      withQuery(routes.v1.admin.groups(), params),
    ),

  updateGroup: (groupId: string, data: AdminUpdateGroupRequest) =>
    fphgoFetchClient<AdminGroupResponse>(routes.v1.admin.group(groupId), {
      method: "PATCH",
      body: data,
    }),

  archiveGroup: (groupId: string) =>
    fphgoFetchClient<AdminGroupResponse>(
      routes.v1.admin.archiveGroup(groupId),
      { method: "POST" },
    ),
};
