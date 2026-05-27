import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@clerk/expo";

import { SocialActionRow, SocialMetadataLine } from "@/components/social";
import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { ExploreDetailRow } from "@/features/explore/components/explore-detail-row";
import { useExploreSiteLikeMutation } from "@/features/explore/hooks/use-explore-mutations";
import { useExploreSiteDetailQuery } from "@/features/explore/hooks/use-explore-site-detail-query";
import {
  formatDepthRange,
  titleCase,
  verificationLabel,
} from "@/features/explore/lib/explore-format";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function ExploreSiteDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = firstParam(params.slug);
  const { isLoaded, isSignedIn } = useAuth();
  const detailQuery = useExploreSiteDetailQuery(slug);
  const likeMutation = useExploreSiteLikeMutation();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const data = detailQuery.data;
  const site = data?.site;
  const depthRange = site ? formatDepthRange(site) : undefined;
  const conditionSummary = site?.lastConditionSummary || site?.typicalConditions;

  if (!slug) {
    return (
      <>
        <Stack.Screen options={{ title: "Dive spot" }} />
        <MobileScrollScreen subtitle="Dive spot" title="Explore">
          <MobileEmptyState
            description="Choose a dive spot from Explore to see its details."
            title="Dive spot not found"
          />
        </MobileScrollScreen>
      </>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Dive spot" }} />
        <MobileScrollScreen subtitle="Dive spot" title="Explore">
          <MobileLoadingState message="Loading dive spot." />
        </MobileScrollScreen>
      </>
    );
  }

  if (detailQuery.error) {
    return (
      <>
        <Stack.Screen options={{ title: "Dive spot" }} />
        <MobileScrollScreen subtitle="Dive spot" title="Explore">
          <View className="gap-3">
            <MobileErrorState
              message="This dive spot is taking longer than expected to load."
              title="Dive spot unavailable"
            />
            <MobileButton variant="secondary" onPress={() => void detailQuery.refetch()}>
              Try again
            </MobileButton>
          </View>
        </MobileScrollScreen>
      </>
    );
  }

  if (!site) {
    return (
      <>
        <Stack.Screen options={{ title: "Dive spot" }} />
        <MobileScrollScreen subtitle="Dive spot" title="Explore">
          <MobileEmptyState
            description="This dive spot may have been removed or is not available yet."
            title="Dive spot not found"
          />
        </MobileScrollScreen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: site.name }} />
      <MobileScrollScreen subtitle={site.area} title={site.name}>
        <MobileSection
          description={conditionSummary ?? "Community details for this dive spot."}
          title={site.name}
        >
          <View className="gap-4">
            {site.coverMedia?.displayUrl ? (
              <Image
                accessibilityLabel=""
                className="h-52 w-full rounded-2xl bg-secondary"
                contentFit="cover"
                source={{ uri: site.coverMedia.displayUrl }}
                transition={150}
              />
            ) : null}

            <SocialMetadataLine
              values={[
                titleCase(site.difficulty),
                verificationLabel(site.verificationStatus),
                depthRange,
              ]}
            />

            <Text className="text-sm leading-6 text-muted-foreground">
              {site.description || "No site description has been added yet."}
            </Text>
          </View>
        </MobileSection>

        <MobileSection title="Dive information">
          <View className="gap-3">
            {actionMessage ? (
              <Text className="text-sm text-muted-foreground">{actionMessage}</Text>
            ) : null}
            {!isLoaded || !isSignedIn ? (
              <Text className="text-sm text-muted-foreground">
                Sign in to like this dive spot.
              </Text>
            ) : null}
            <SocialActionRow
              actions={[
                {
                  accessibilityLabel: site.viewerHasLiked
                    ? "Unlike dive spot"
                    : "Like dive spot",
                  active: site.viewerHasLiked,
                  disabled: !isLoaded || !isSignedIn || likeMutation.isPending,
                  icon: site.viewerHasLiked ? "fish" : "fish-outline",
                  label: `${site.viewerHasLiked ? "Liked" : "Like"} · ${
                    site.likeCount
                  }`,
                  onPress: () =>
                    likeMutation.mutate(
                      {
                        siteId: site.id,
                        viewerHasLiked: site.viewerHasLiked,
                      },
                      {
                        onError: () =>
                          setActionMessage("Could not update like. Try again."),
                        onSuccess: () =>
                          setActionMessage(
                            site.viewerHasLiked
                              ? "Removed like."
                              : "Liked dive spot.",
                          ),
                      },
                    ),
                },
              ]}
            />
            <ExploreDetailRow label="Area" value={site.area} />
            <ExploreDetailRow label="Recent conditions" value={conditionSummary} />
            <ExploreDetailRow label="Best season" value={site.bestSeason} />
            <ExploreDetailRow label="Access" value={site.access} />
            <ExploreDetailRow label="Fees" value={site.fees} />
            <ExploreDetailRow label="Contact" value={site.contactInfo} />
          </View>
        </MobileSection>

        <MobileSection title="Safety notes">
          <View className="gap-3">
            <ExploreDetailRow
              label="Typical conditions"
              value={site.typicalConditions}
            />
            <ExploreDetailRow
              label="Hazards"
              value={site.hazards.length > 0 ? site.hazards.join(", ") : undefined}
            />
          </View>
        </MobileSection>

        {data.updates.length > 0 ? (
          <MobileSection title="Recent reports">
            <View>
              {data.updates.map((update) => (
                <ExploreDetailRow
                  key={update.id}
                  label={update.authorDisplayName || "Community report"}
                  value={update.note}
                />
              ))}
            </View>
          </MobileSection>
        ) : null}
      </MobileScrollScreen>
    </>
  );
}
