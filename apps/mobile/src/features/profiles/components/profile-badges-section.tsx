import type { UserBadge } from "@freediving.ph/types";
import { Text, View } from "react-native";

import { MobileEmptyState, MobileErrorState, MobileLoadingState } from "@/components/shell";
import { badgeCategoryLabel } from "@/features/profiles/components/profile-experience-sections";

const badgeLabel = (badge: UserBadge) =>
  badge.formattedValue || badge.displayValue
    ? `${badge.name} • ${badge.formattedValue ?? badge.displayValue}`
    : badge.name;

const badgeMeta = (badge: UserBadge) => {
  const earned = badge.earnedDate || badge.earnedAt;
  const earnedLabel = earned
    ? new Intl.DateTimeFormat("en-PH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(earned))
    : null;
  const status =
    badge.verificationStatus === "verified"
      ? "Verified"
      : badge.verificationStatus === "pending"
        ? "Pending"
        : badge.verificationStatus === "rejected"
          ? "Rejected"
          : null;
  return [status, earnedLabel].filter(Boolean).join(" · ");
};

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
  const grouped = new Map<string, UserBadge[]>();

  for (const badge of items) {
    const current = grouped.get(badge.category) ?? [];
    current.push(badge);
    grouped.set(badge.category, current);
  }

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
    <View className="gap-4">
      {Array.from(grouped.entries()).map(([category, categoryItems]) => (
        <View key={category} className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {badgeCategoryLabel(category)}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {categoryItems.map((badge) => (
              <View
                key={badge.id}
                className="rounded-2xl border border-border bg-card px-3 py-2"
              >
                <Text className="text-xs font-semibold text-foreground">
                  {badgeLabel(badge)}
                </Text>
                {badgeMeta(badge) ? (
                  <Text className="mt-1 text-xs text-muted-foreground">
                    {badgeMeta(badge)}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
