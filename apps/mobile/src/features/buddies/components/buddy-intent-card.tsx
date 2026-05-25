import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { BuddyFinderIntent } from "@freediving.ph/types";

import { MobileCard } from "@/components/shell";
import {
  buddyProfileHref,
  buddyStatsLabel,
  certLevelLabel,
  formatRecency,
  intentTypeLabel,
  timeWindowLabel,
} from "@/features/buddies/lib/buddy-format";

type BuddyIntentCardProps = {
  intent: BuddyFinderIntent;
};

function BuddyIntentCardContent({ intent }: BuddyIntentCardProps) {
  const certLevel = certLevelLabel(intent.certLevel);
  const createdAt = formatRecency(intent.createdAt);

  return (
    <MobileCard>
      <View className="gap-3">
        <View className="flex-row flex-wrap gap-2">
          <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {intentTypeLabel(intent.intentType)}
          </Text>
          <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {timeWindowLabel(intent)}
          </Text>
          {certLevel ? (
            <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {certLevel}
            </Text>
          ) : null}
        </View>

        <View className="gap-2">
          <Text className="text-base font-semibold leading-6 text-foreground">
            {intent.displayName}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {intent.area || intent.homeArea || "Area to be shared"}
          </Text>
          {intent.note ? (
            <Text className="text-sm leading-6 text-muted-foreground" numberOfLines={4}>
              {intent.note}
            </Text>
          ) : null}
        </View>

        <View className="gap-1">
          <Text className="text-xs text-muted-foreground">
            {buddyStatsLabel(intent)}
          </Text>
          {createdAt ? (
            <Text className="text-xs text-muted-foreground">Posted {createdAt}</Text>
          ) : null}
          {intent.emailVerified || intent.phoneVerified ? (
            <Text className="text-xs text-muted-foreground">
              {[
                intent.emailVerified ? "Email verified" : "",
                intent.phoneVerified ? "Phone verified" : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          ) : null}
        </View>
      </View>
    </MobileCard>
  );
}

export function BuddyIntentCard({ intent }: BuddyIntentCardProps) {
  const href = buddyProfileHref(intent);

  if (!href) {
    return <BuddyIntentCardContent intent={intent} />;
  }

  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link">
        <BuddyIntentCardContent intent={intent} />
      </Pressable>
    </Link>
  );
}
