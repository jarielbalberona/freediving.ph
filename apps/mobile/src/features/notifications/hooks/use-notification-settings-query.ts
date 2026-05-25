import { getNotificationSettings } from "@/features/notifications/api/notifications-api";
import { mobileQueryKeys, useAuthenticatedFphgoQuery } from "@/lib/query";

export function useNotificationSettingsQuery() {
  return useAuthenticatedFphgoQuery({
    queryFn: (_context, authToken) => getNotificationSettings(authToken),
    queryKey: mobileQueryKeys.notifications.settings(),
    staleTime: 5 * 60 * 1000,
  });
}
