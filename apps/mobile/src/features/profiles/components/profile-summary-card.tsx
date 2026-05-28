import { Text, View } from "react-native";

import { UserIdentityRow } from "@/components/social";
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
    <View className="border-b border-border/60 bg-background px-4 py-5">
      <UserIdentityRow
        avatarUrl={avatarUrl}
        bottomSlot={
          <Text className="mt-2 text-sm leading-6 text-muted-foreground">
            {profileBio({ bio })}
          </Text>
        }
        displayName={displayName}
        locationText={profileHandle(username)}
        showUsername={false}
        username={username}
        size="md"
        subtitle={meta}
      />
    </View>
  );
}
