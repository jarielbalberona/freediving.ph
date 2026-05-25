import { Text, View } from "react-native";

import type { BuddyFinderPreviewIntent } from "@freediving.ph/types";

import { MobileCard } from "@/components/shell";
import {
  buddyStatsLabel,
  certLevelLabel,
  formatRecency,
  intentTypeLabel,
  timeWindowLabel,
} from "@/features/buddies/lib/buddy-format";

type BuddyIntentCardProps = {
  intent: BuddyFinderPreviewIntent;
};

export function BuddyIntentCard({ intent }: BuddyIntentCardProps) {
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
            Freediving buddy
          </Text>
          <Text className="text-sm text-muted-foreground">
            {intent.area || "Area to be shared"}
          </Text>
          {intent.notePreview ? (
            <Text className="text-sm leading-6 text-muted-foreground" numberOfLines={4}>
              {intent.notePreview}
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
