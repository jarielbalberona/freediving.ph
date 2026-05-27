import { Text, View } from "react-native";

import { AvatarIdentityRow } from "@/components/social";
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
      <AvatarIdentityRow
        avatarUrl={avatarUrl}
        meta={[profileHandle(username), meta]}
        name={displayName}
      />
      <Text className="mt-4 text-sm leading-6 text-muted-foreground">
        {profileBio({ bio })}
      </Text>
    </View>
  );
}
