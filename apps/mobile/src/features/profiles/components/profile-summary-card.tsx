import { Text, View } from "react-native";

import { MobileCard } from "@/components/shell";
import { ProfileAvatar } from "@/features/profiles/components/profile-avatar";
import {
  profileBio,
  profileHandle,
} from "@/features/profiles/lib/profile-format";

type ProfileSummaryCardProps = {
  avatarUrl?: string;
  bio?: string;
  displayName: string;
  meta?: string;
  username: string;
};

export function ProfileSummaryCard({
  avatarUrl,
  bio,
  displayName,
  meta,
  username,
}: ProfileSummaryCardProps) {
  return (
    <MobileCard>
      <View className="gap-4">
        <View className="flex-row gap-4">
          <ProfileAvatar displayName={displayName} imageUrl={avatarUrl} />
          <View className="min-w-0 flex-1 justify-center gap-1">
            <Text className="text-lg font-semibold leading-6 text-foreground">
              {displayName}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {profileHandle(username)}
            </Text>
            {meta ? (
              <Text className="text-sm text-muted-foreground">{meta}</Text>
            ) : null}
          </View>
        </View>

        <Text className="text-sm leading-6 text-muted-foreground">
          {profileBio({ bio })}
        </Text>
      </View>
    </MobileCard>
  );
}
