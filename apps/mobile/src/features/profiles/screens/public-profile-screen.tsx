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
import { ProfileDivingSection } from "@/features/profiles/components/profile-diving-section";
import {
  ProfilePostCard,
  ProfilePostFallback,
} from "@/features/profiles/components/profile-post-card";
import { ProfileSummaryCard } from "@/features/profiles/components/profile-summary-card";
import {
  useProfileDivingQuery,
  useProfilePostsQuery,
} from "@/features/profiles/hooks/use-profile-activity-query";
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
  const postsQuery = useProfilePostsQuery(username);
  const divingQuery = useProfileDivingQuery(username);
  const posts = postsQuery.data ?? [];
  const presences = divingQuery.data?.presences ?? [];
  const affinities = divingQuery.data?.affinities ?? [];
  const headerTitle = profile?.displayName ?? "Profile";

  if (!username) {
    return (
      <>
        <Stack.Screen options={{ title: "Profile" }} />
        <MobileScrollScreen subtitle="Diver profile" title="Profile">
          <MobileEmptyState
            description="Choose a diver from the community to see their profile."
            title="Profile not found"
          />
        </MobileScrollScreen>
      </>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Profile" }} />
        <MobileScrollScreen subtitle="Diver profile" title="Profile">
          <MobileLoadingState message="Loading profile." />
        </MobileScrollScreen>
      </>
    );
  }

  if (profileQuery.error) {
    return (
      <>
        <Stack.Screen options={{ title: "Profile unavailable" }} />
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
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Stack.Screen options={{ title: "Profile" }} />
        <MobileScrollScreen subtitle="Diver profile" title="Profile">
          <MobileEmptyState
            description="This diver has not shared much yet."
            title="Profile not found"
          />
        </MobileScrollScreen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
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

        <MobileSection title="Posts">
          {postsQuery.isLoading ? (
            <ProfileDetailRow label="Posts" value="Loading public posts." />
          ) : posts.length > 0 ? (
            <View className="gap-3">
              {posts.map((post) => (
                <ProfilePostCard key={post.id} post={post} />
              ))}
            </View>
          ) : (
            <ProfilePostFallback error={postsQuery.error} />
          )}
        </MobileSection>

        <MobileSection title="Diving">
          <ProfileDivingSection
            affinities={affinities}
            error={divingQuery.error}
            isLoading={divingQuery.isLoading}
            presences={presences}
          />
        </MobileSection>
      </MobileScrollScreen>
    </>
  );
}
