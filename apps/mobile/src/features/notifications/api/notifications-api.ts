import type {
  ListNotificationsResponse,
  NotificationFilters,
  NotificationSettings,
  PushDeviceToken,
  RegisterPushDeviceRequest,
  Notification,
  UpdateNotificationSettingsRequest,
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

export const getNotificationSettings = (authToken: string) =>
  fphgoFetch<NotificationSettings>("/v1/notifications/preferences", {
    auth: "required",
    authToken,
  });

export const updateNotificationSettings = (
  input: UpdateNotificationSettingsRequest,
  authToken: string,
) =>
  fphgoFetch<NotificationSettings>("/v1/notifications/preferences", {
    auth: "required",
    authToken,
    body: input,
    method: "PUT",
  });

export const registerPushDevice = (
  input: RegisterPushDeviceRequest,
  authToken: string,
) =>
  fphgoFetch<PushDeviceToken>("/v1/notifications/devices", {
    auth: "required",
    authToken,
    body: input,
    method: "POST",
  });

export const deletePushDevice = (deviceId: string, authToken: string) =>
  fphgoFetch<void>(`/v1/notifications/devices/${encodeURIComponent(deviceId)}`, {
    auth: "required",
    authToken,
    method: "DELETE",
  });

export const markNotificationRead = (notificationId: number, authToken: string) =>
  fphgoFetch<Notification>(
    `/v1/notifications/${encodeURIComponent(String(notificationId))}/read`,
    {
      auth: "required",
      authToken,
      method: "POST",
    },
  );

export const deleteNotification = (notificationId: number, authToken: string) =>
  fphgoFetch<void>(
    `/v1/notifications/${encodeURIComponent(String(notificationId))}`,
    {
      auth: "required",
      authToken,
      method: "DELETE",
    },
  );
