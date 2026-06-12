import { useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { ProfileBuddyActions } from "@/features/buddies/components/profile-buddy-actions";
import { ProfileBadgesSection } from "@/features/profiles/components/profile-badges-section";
import { ProfileDivingSection } from "@/features/profiles/components/profile-diving-section";
import {
  type HeaderProfile,
  ProfileHeader,
} from "@/features/profiles/components/profile-header";
import {
  ProfileDiveMemoriesSection,
  ProfileJourneySection,
  ProfilePassportSection,
} from "@/features/profiles/components/profile-experience-sections";
import { ProfileMediaMasonryGrid } from "@/features/profiles/components/profile-media-masonry-grid";
import { ProfileDiveSpotHighlights } from "@/features/profiles/components/profile-dive-spot-highlights";
import {
  normalizeProfileTab,
  ProfileTab,
  ProfileTabs,
} from "@/features/profiles/components/profile-tabs";
import { ProfileSafetyActions } from "@/features/safety/components/profile-safety-actions";
import {
  useProfileBadgesQuery,
  useProfileDiveMapQuery,
  useProfileDiveMemoriesQuery,
  useProfileDivingQuery,
  useProfileJourneyQuery,
  useProfilePassportQuery,
} from "@/features/profiles/hooks/use-profile-activity-query";
import {
  normalizeProfileDiveSpotHighlights,
  useProfileMediaQuery,
} from "@/features/media/hooks/use-profile-media-query";
import { usePublicProfileQuery } from "@/features/profiles/hooks/use-public-profile-query";
import { safeProfileUsername } from "@/features/profiles/lib/profile-format";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function PublicProfileScreen() {
  const params = useLocalSearchParams<{
    tab?: string | string[];
    username?: string | string[];
  }>();
  const routeUsername = safeProfileUsername(firstParam(params.username));
  const username = routeUsername;
  const profileQuery = usePublicProfileQuery(username);
  const profile = profileQuery.data?.profile;
  const mediaQuery = useProfileMediaQuery(profile?.username);
  const divingQuery = useProfileDivingQuery(profile?.username);
  const badgesQuery = useProfileBadgesQuery(profile?.username);
  const diveMapQuery = useProfileDiveMapQuery(profile?.username);
  const passportQuery = useProfilePassportQuery(profile?.username);
  const journeyQuery = useProfileJourneyQuery(profile?.username);
  const memoriesQuery = useProfileDiveMemoriesQuery(profile?.username);
  const posts = mediaQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const highlights = normalizeProfileDiveSpotHighlights(posts);
  const presences = divingQuery.data?.presences ?? [];
  const affinities = divingQuery.data?.affinities ?? [];
  const [activeTab, setActiveTab] = useState<ProfileTab>(() =>
    normalizeProfileTab(params.tab),
  );

  useEffect(() => {
    setActiveTab(normalizeProfileTab(params.tab));
  }, [params.tab]);

  if (!username) {
    return (
      <>
        <Stack.Screen options={{ title: "Profile not found" }} />
        <MobileScrollScreen subtitle="Diver profile" title="Profile">
          <MobileErrorState
            title="Profile not found"
            message="A username is required in the route to view a public profile."
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

  if (profileQuery.error || !profile) {
    return (
      <>
        <Stack.Screen options={{ title: "Profile unavailable" }} />
        <MobileScrollScreen subtitle="Diver profile" title="Profile">
          <View className="gap-3">
            <MobileErrorState
              message="This diver profile is taking longer than expected to load."
              title="Profile unavailable"
            />
            <Pressable
              accessibilityLabel="Retry loading profile"
              accessibilityRole="button"
              className="rounded-full bg-secondary px-3 py-2"
              onPress={() => void profileQuery.refetch()}
            >
              <Text className="text-center font-semibold text-secondary-foreground">
                Try again
              </Text>
            </Pressable>
          </View>
        </MobileScrollScreen>
      </>
    );
  }

  const headerStats = [
    { label: "Posts", value: profile.counts.mediaPosts },
    { label: "Followers", value: profile.counts.followers },
    { label: "Following", value: profile.counts.following },
  ];
  const isOwner = Boolean(profile.viewerRelationship?.canEdit);

  return (
    <>
      <Stack.Screen options={{ title: profile.displayName }} />
      <MobileScrollScreen subtitle="Diver profile" title="Profile">
      <MobileSection>
        <ProfileHeader
          isOwner={isOwner}
          profile={profile as HeaderProfile}
          stats={headerStats}
        />
        {!isOwner ? (
          <>
            <ProfileSafetyActions profile={profile} />
            {profile.viewerRelationship?.isBlocked ||
            profile.viewerRelationship?.hasBlockedViewer ? null : (
              <ProfileBuddyActions profile={profile} />
            )}
          </>
        ) : null}
      </MobileSection>

      <ProfileDiveSpotHighlights highlights={highlights} />

      <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "posts" ? (
          <MobileSection title="Posts">
            <ProfileMediaMasonryGrid
              error={mediaQuery.error}
              hasNextPage={Boolean(mediaQuery.hasNextPage)}
              isFetchingNextPage={mediaQuery.isFetchingNextPage}
              isLoading={mediaQuery.isLoading && posts.length === 0}
              items={posts}
              onLoadMore={() => {
                void mediaQuery.fetchNextPage();
              }}
            />
          </MobileSection>
        ) : null}

        {activeTab === "badges" ? (
          <MobileSection title="Badges & credentials">
            <ProfileBadgesSection
              autoStats={badgesQuery.data?.autoStats ?? []}
              badges={badgesQuery.data?.badges ?? []}
              error={badgesQuery.error}
              isLoading={badgesQuery.isLoading}
            />
          </MobileSection>
        ) : null}

        {activeTab === "diving" ? (
          <MobileSection title="Diving">
            <ProfileDivingSection
              affinities={affinities}
              error={divingQuery.error}
              isLoading={divingQuery.isLoading}
              presences={presences}
            />
          </MobileSection>
        ) : null}

        {activeTab === "dive-memories" ? (
          <MobileSection
            title="Dive Memories"
            description="Places and memories from this diver's dives."
          >
            <ProfileDiveMemoriesSection
              data={diveMapQuery.data}
              error={diveMapQuery.error}
              isLoading={diveMapQuery.isLoading}
              isOwner={isOwner}
              username={profile.username}
            />
          </MobileSection>
        ) : null}

        {activeTab === "journey" ? (
          <MobileSection title="Dive Journey">
            <ProfileJourneySection
              data={journeyQuery.data}
              error={journeyQuery.error}
              isLoading={journeyQuery.isLoading}
              isOwner={isOwner}
              username={profile.username}
            />
          </MobileSection>
        ) : null}

        {activeTab === "passport" ? (
          <MobileSection title="Dive Passport">
            <ProfilePassportSection
              availableBadges={[
                ...(badgesQuery.data?.badges ?? []),
                ...(badgesQuery.data?.autoStats ?? []),
              ]}
              data={passportQuery.data}
              error={passportQuery.error}
              isLoading={passportQuery.isLoading}
              isOwner={isOwner}
              username={profile.username}
            />
          </MobileSection>
        ) : null}
      </MobileScrollScreen>
    </>
  );
}
