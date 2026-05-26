import { Link } from "expo-router";
import type { Href } from "expo-router";
import { Text, View } from "react-native";

import type { BuddyFinderIntent, BuddyFinderPreviewIntent } from "@freediving.ph/types";

import { MobileCard } from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import {
  buddyStatsLabel,
  certLevelLabel,
  formatRecency,
  intentTypeLabel,
  timeWindowLabel,
} from "@/features/buddies/lib/buddy-format";

type BuddyIntentCardProps = {
  intent: BuddyFinderIntent | BuddyFinderPreviewIntent;
  isClosePending?: boolean;
  isMessagePending?: boolean;
  onMessage?: () => void;
  onClose?: () => void;
  profileHref?: Href;
  showEditDeferred?: boolean;
};

export function BuddyIntentCard({
  intent,
  isClosePending = false,
  isMessagePending = false,
  onClose,
  onMessage,
  profileHref,
  showEditDeferred = false,
}: BuddyIntentCardProps) {
  const certLevel = certLevelLabel(intent.certLevel);
  const createdAt = formatRecency(intent.createdAt);
  const note =
    "note" in intent ? intent.note : "notePreview" in intent ? intent.notePreview : undefined;

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
            {"displayName" in intent ? intent.displayName : "Freediving buddy"}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {intent.area || "Area to be shared"}
          </Text>
          {note ? (
            <Text className="text-sm leading-6 text-muted-foreground" numberOfLines={4}>
              {note}
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

        {onMessage ? (
          <MobileButton
            disabled={isMessagePending}
            variant="secondary"
            onPress={onMessage}
          >
            Message
          </MobileButton>
        ) : null}
        {profileHref ? (
          <Link asChild href={profileHref}>
            <MobileButton variant="ghost">View profile</MobileButton>
          </Link>
        ) : null}
        {showEditDeferred ? (
          <Text className="text-xs text-muted-foreground">
            To change this post, close it and create a new one.
          </Text>
        ) : null}
        {onClose ? (
          <MobileButton
            disabled={isClosePending}
            variant="danger"
            onPress={onClose}
          >
            Close intent
          </MobileButton>
        ) : null}
      </View>
    </MobileCard>
  );
}
