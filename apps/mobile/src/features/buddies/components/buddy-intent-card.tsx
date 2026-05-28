import { Link, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { Text, View } from "react-native";

import type { BuddyFinderIntent, BuddyFinderPreviewIntent } from "@freediving.ph/types";

import { SocialActionRow, UserIdentityRow } from "@/components/social";
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
  const username = "username" in intent ? intent.username : undefined;
  const area = intent.area || "Area to be shared";
  const router = useRouter();

  const locationText = [
    area,
    intentTypeLabel(intent.intentType),
    timeWindowLabel(intent),
  ]
    .filter(Boolean)
    .join(" · ");

  const metaText = [
    certLevel,
    createdAt ? `Posted ${createdAt}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  const verificationText = [
    intent.emailVerified ? "Email verified" : "",
    intent.phoneVerified ? "Phone verified" : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <UserIdentityRow
      avatarUrl={"avatarUrl" in intent ? intent.avatarUrl : undefined}
      bottomSlot={
        <View className="mt-2 gap-2">
          {locationText ? (
            <Text className="text-xs text-muted-foreground">{locationText}</Text>
          ) : null}
          {metaText ? <Text className="text-xs text-muted-foreground">{metaText}</Text> : null}
          {verificationText ? (
            <Text className="text-xs text-muted-foreground">{verificationText}</Text>
          ) : null}
          {note ? (
            <Text className="text-sm leading-6 text-muted-foreground">{note}</Text>
          ) : null}
          <Text className="text-xs text-muted-foreground">{buddyStatsLabel(intent)}</Text>

          <SocialActionRow
            actions={
              onMessage
                ? [
                    {
                      accessibilityLabel: "Message buddy",
                      disabled: isMessagePending,
                      icon: "chatbubble-outline" as const,
                      label: "Message",
                      onPress: onMessage,
                    },
                  ]
                : []
            }
          />
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
      }
      displayName={displayName}
      locationText={area}
      showLocation
      showUsername={Boolean(username)}
      size="md"
      username={username}
      onPress={
        profileHref
          ? () => {
              router.push(profileHref);
            }
          : undefined
      }
    />
  );
}
