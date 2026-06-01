import { useState } from "react";
import { Text, View } from "react-native";
import type { ProfileView } from "@freediving.ph/types";

import { MobileButton } from "@/components/ui/mobile-button";
import { ReportAction } from "@/features/safety/components/report-action";
import {
  useBlockUserMutation,
  useUnblockUserMutation,
} from "@/features/safety/hooks/use-safety-mutations";

export function ProfileSafetyActions({ profile }: { profile: ProfileView }) {
  const blockUser = useBlockUserMutation();
  const unblockUser = useUnblockUserMutation();
  const [message, setMessage] = useState<string | null>(null);
  const relationship = profile.viewerRelationship;

  if (relationship.isSelf || relationship.canEdit) return null;

  const blocked = relationship.isBlocked;
  const blockedViewer = relationship.hasBlockedViewer;
  const disabled = blockUser.isPending || unblockUser.isPending;

  return (
    <View className="gap-2">
      {blockedViewer ? (
        <Text className="text-sm text-muted-foreground">
          This diver has limited interactions with you.
        </Text>
      ) : null}
      {blocked ? (
        <Text className="text-sm text-muted-foreground">
          You blocked this diver. Messaging and relationship actions are limited.
        </Text>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        <ReportAction
          contextLabel="profile"
          targetId={profile.id}
          targetType="user"
        />
        <MobileButton
          disabled={disabled}
          onPress={() => {
            setMessage(null);
            if (blocked) {
              unblockUser.mutate(profile.id, {
                onError: () => setMessage("Could not unblock this diver."),
                onSuccess: () => setMessage("Diver unblocked."),
              });
              return;
            }
            blockUser.mutate(profile.id, {
              onError: () => setMessage("Could not block this diver."),
              onSuccess: () => setMessage("Diver blocked."),
            });
          }}
          variant={blocked ? "secondary" : "danger"}
        >
          {blocked ? "Unblock" : "Block"}
        </MobileButton>
      </View>
      {message ? <Text className="text-xs text-muted-foreground">{message}</Text> : null}
    </View>
  );
}
