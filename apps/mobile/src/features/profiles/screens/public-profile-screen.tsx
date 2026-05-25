import { Stack, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Text, View } from "react-native";

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

        <MobileSection title="Posts">
          {posts.length === 0 ? (
            <MobileEmptyState
              description="Public media posts will appear here when available."
              title="No posts"
            />
          ) : (
            <View className="gap-3">
              {posts.map((post) => (
                <View key={post.id} className="rounded-2xl border border-border bg-card p-4">
                  {post.thumbUrl ? (
                    <Image
                      accessibilityLabel=""
                      className="h-44 w-full rounded-xl bg-secondary"
                      contentFit="cover"
                      source={{ uri: post.thumbUrl }}
                    />
                  ) : null}
                  <Text className="mt-3 text-sm font-semibold text-foreground">
                    {post.siteName}
                  </Text>
                  {post.caption ? (
                    <Text className="mt-1 text-sm leading-6 text-muted-foreground">
                      {post.caption}
                    </Text>
                  ) : null}
                  <Text className="mt-2 text-xs text-muted-foreground">
                    {post.likeCount} likes · {post.commentCount} comments
                  </Text>
                </View>
              ))}
            </View>
          )}
        </MobileSection>

        <MobileSection title="Diving">
          <View className="gap-3">
            {presences.map((presence) => (
              <ProfileDetailRow
                key={presence.id}
                label={presence.diveSiteName}
                value={`${presence.presenceType}${presence.note ? ` · ${presence.note}` : ""}`}
              />
            ))}
            {affinities.map((affinity) => (
              <ProfileDetailRow
                key={affinity.id}
                label={affinity.diveSiteName}
                value={affinity.relationship}
              />
            ))}
            {presences.length === 0 && affinities.length === 0 ? (
              <MobileEmptyState
                description="Visible dive presence and dive-site relationships will appear here."
                title="No diving activity"
              />
            ) : null}
          </View>
        </MobileSection>
      </MobileScrollScreen>
    </>
  );
}
