import { getNotifications } from "@/features/notifications/api/notifications-api";
import { mobileQueryKeys, useAuthenticatedFphgoQuery } from "@/lib/query";

const NOTIFICATIONS_LIMIT = 20;

export function useNotificationsQuery() {
  const filters = {
    limit: NOTIFICATIONS_LIMIT,
    offset: 0,
  };

  return useAuthenticatedFphgoQuery({
    queryFn: (_context, authToken) => getNotifications(filters, authToken),
    queryKey: mobileQueryKeys.notifications.list(filters),
    staleTime: 2 * 60 * 1000,
  });
}
