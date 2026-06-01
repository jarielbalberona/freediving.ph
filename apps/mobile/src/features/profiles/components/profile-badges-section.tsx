import type { UserBadge } from "@freediving.ph/types";
import { Text, View } from "react-native";

import { MobileEmptyState, MobileErrorState, MobileLoadingState } from "@/components/shell";

const badgeLabel = (badge: UserBadge) =>
  badge.formattedValue || badge.displayValue
    ? `${badge.name} • ${badge.formattedValue ?? badge.displayValue}`
    : badge.name;

export function ProfileBadgesSection({
  autoStats,
  badges,
  error,
  isLoading,
}: {
  autoStats: UserBadge[];
  badges: UserBadge[];
  error: unknown;
  isLoading: boolean;
}) {
  const items = [...badges, ...autoStats];

  if (isLoading && items.length === 0) {
    return <MobileLoadingState message="Loading badges." />;
  }

  if (error) {
    return (
      <MobileErrorState
        message="Badges and credentials are unavailable right now."
        title="Badges unavailable"
      />
    );
  }

  if (items.length === 0) {
    return (
      <MobileEmptyState
        description="Visible badges, credentials, and auto stats will appear here."
        title="No visible badges yet"
      />
    );
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {items.slice(0, 12).map((badge) => (
        <View
          key={badge.id}
          className="rounded-full border border-border bg-card px-3 py-2"
        >
          <Text className="text-xs font-semibold text-foreground">
            {badgeLabel(badge)}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {badge.verificationStatus}
          </Text>
        </View>
      ))}
    </View>
  );
}
