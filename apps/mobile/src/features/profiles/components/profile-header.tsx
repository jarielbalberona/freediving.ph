import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { UserIdentityRow } from "@/components/social";
import { MobileButton } from "@/components/ui/mobile-button";
import { certLevelLabel, profileBio, profileHandle } from "@/features/profiles/lib/profile-format";

import type { Profile, PublicProfileApiProfile } from "@freediving.ph/types";

type HeaderProfile = Profile | PublicProfileApiProfile;

type ProfileStat = {
  label: string;
  value: string | number;
};

const formatCount = (value: string | number) =>
  new Intl.NumberFormat().format(Number(value ?? 0));

export function ProfileHeader({
  isOwner,
  onEdit,
  profile,
  stats,
}: {
  isOwner: boolean;
  onEdit?: () => void;
  profile: HeaderProfile;
  stats: ProfileStat[];
}) {
  const username = profile.username;
  const certification = certLevelLabel(
    "certLevel" in profile ? profile.certLevel : undefined,
  );
  const meta = [
    "location" in profile ? profile.location : undefined,
    "homeArea" in profile ? profile.homeArea : undefined,
    certification,
  ]
    .filter(Boolean)
    .join(" · ") || certification || profileHandle(username);
  const settingsHref = `/(app)/(tabs)/(home)/profile/settings`;

  return (
    <View className="gap-4">
      <UserIdentityRow
        avatarUrl={profile.avatarUrl}
        bottomSlot={
          <Text className="mt-2 text-sm leading-6 text-muted-foreground">
            {profileBio(profile)}
          </Text>
        }
        displayName={profile.displayName || username}
        locationText={meta}
        showLocation
        showUsername
        size="md"
        username={username}
      />

      <View className="gap-3">
        <View className="flex-row flex-wrap items-center gap-4">
          {stats.map((item) => (
            <View key={item.label} className="items-center">
              <Text className="text-base font-semibold text-foreground">
                {formatCount(item.value)}
              </Text>
              <Text className="text-xs uppercase text-muted-foreground">{item.label}</Text>
            </View>
          ))}
        </View>

        {isOwner ? (
        <View className="flex-row gap-2">
          <MobileButton onPress={onEdit} variant="secondary">
            Edit profile
          </MobileButton>
            <Link href={settingsHref} asChild>
              <Pressable
                accessibilityLabel="Open profile settings"
                accessibilityRole="link"
                className="h-11 flex-1 items-center justify-center rounded-full border border-border"
              >
                <Text className="text-sm font-semibold text-foreground">Settings</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export type { HeaderProfile };
