import type {
  ListNotificationsResponse,
  NotificationFilters,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

const withQuery = (
  path: string,
  params: Record<string, string | number | undefined>,
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const getNotifications = (
  filters: NotificationFilters,
  authToken: string,
) =>
  fphgoFetch<ListNotificationsResponse>(
    withQuery("/v1/notifications", {
      limit: filters.limit,
      offset: filters.offset,
      priority: filters.priority,
      status: filters.status,
      type: filters.type,
    }),
    {
      auth: "required",
      authToken,
    },
  );
