import { Link } from "expo-router";
import type { Href } from "expo-router";
import { Text, View } from "react-native";

import type { BuddyFinderIntent, BuddyFinderPreviewIntent } from "@freediving.ph/types";

import { SocialActionRow, SocialListRow } from "@/components/social";
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
  const displayName = "displayName" in intent ? intent.displayName : "Freediving buddy";

  return (
    <SocialListRow
      body={note}
      meta={[
        intent.area || "Area to be shared",
        intentTypeLabel(intent.intentType),
        timeWindowLabel(intent),
        certLevel,
        createdAt ? `Posted ${createdAt}` : undefined,
      ]}
      name={displayName}
      title={buddyStatsLabel(intent)}
    >
      {intent.emailVerified || intent.phoneVerified ? (
        <Text className="mb-2 text-xs text-muted-foreground">
          {[
            intent.emailVerified ? "Email verified" : "",
            intent.phoneVerified ? "Phone verified" : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      ) : null}

      <View className="gap-2">
        <SocialActionRow
          actions={[
            ...(onMessage
              ? [
                  {
                    accessibilityLabel: "Message buddy",
                    disabled: isMessagePending,
                    icon: "chatbubble-outline" as const,
                    label: "Message",
                    onPress: onMessage,
                  },
                ]
              : []),
          ]}
        />
        {onMessage ? (
          null
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
    </SocialListRow>
  );
}
