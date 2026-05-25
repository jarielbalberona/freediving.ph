import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { ProfileDetailRow } from "@/features/profiles/components/profile-detail-row";
import { ProfileSummaryCard } from "@/features/profiles/components/profile-summary-card";
import { usePublicProfileQuery } from "@/features/profiles/hooks/use-public-profile-query";
import {
  profileCountLabel,
  safeProfileUsername,
} from "@/features/profiles/lib/profile-format";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function PublicProfileScreen() {
  const params = useLocalSearchParams<{ username?: string | string[] }>();
  const username = safeProfileUsername(firstParam(params.username));
  const profileQuery = usePublicProfileQuery(username);
  const profile = profileQuery.data?.profile;

  if (!username) {
    return (
      <MobileScrollScreen subtitle="Diver profile" title="Profile">
        <MobileEmptyState
          description="Choose a diver from the community to see their profile."
          title="Profile not found"
        />
      </MobileScrollScreen>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <MobileScrollScreen subtitle="Diver profile" title="Profile">
        <MobileLoadingState message="Loading profile." />
      </MobileScrollScreen>
    );
  }

  if (profileQuery.error) {
    return (
      <MobileScrollScreen subtitle="Diver profile" title="Profile">
        <View className="gap-3">
          <MobileErrorState
            message="This diver profile is taking longer than expected to load."
            title="Profile unavailable"
          />
          <MobileButton variant="secondary" onPress={() => void profileQuery.refetch()}>
            Try again
          </MobileButton>
        </View>
      </MobileScrollScreen>
    );
  }

  if (!profile) {
    return (
      <MobileScrollScreen subtitle="Diver profile" title="Profile">
        <MobileEmptyState
          description="This diver has not shared much yet."
          title="Profile not found"
        />
      </MobileScrollScreen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: profile.displayName }} />
      <MobileScrollScreen subtitle="Diver profile" title="Profile">
        <MobileSection title={profile.displayName}>
          <ProfileSummaryCard
            avatarUrl={profile.avatarUrl}
            bio={profile.bio}
            displayName={profile.displayName}
            username={profile.username}
          />
        </MobileSection>

        <MobileSection title="Community activity">
          <View className="gap-3">
            <ProfileDetailRow
              label="Posts"
              value={profileCountLabel(profile.counts.posts, "posts")}
            />
            <ProfileDetailRow
              label="Followers"
              value={profileCountLabel(profile.counts.followers, "followers")}
            />
            <ProfileDetailRow
              label="Following"
              value={profileCountLabel(profile.counts.following, "following")}
            />
          </View>
        </MobileSection>
      </MobileScrollScreen>
    </>
  );
}
