import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { ExploreSiteCard } from "@freediving.ph/types";

import { SocialActionRow, SocialListRow, SocialMetadataLine, StatusPill } from "@/components/social";
import {
  formatDepthRange,
  safeSiteSlug,
  titleCase,
  verificationLabel,
} from "@/features/explore/lib/explore-format";

type ExploreSiteCardProps = {
  actionsDisabled?: boolean;
  onLike?: (site: ExploreSiteCard) => void;
  onSave?: (site: ExploreSiteCard) => void;
  site: ExploreSiteCard;
};

function ExploreSiteCardContent({
  actionsDisabled,
  onLike,
  onSave,
  site,
}: ExploreSiteCardProps) {
  const depthRange = formatDepthRange(site);
  const likeIcon: "fish" | "fish-outline" = site.viewerHasLiked
    ? "fish"
    : "fish-outline";
  const saveIcon: "bookmark" | "bookmark-outline" = site.isSaved
    ? "bookmark"
    : "bookmark-outline";

  return (
    <SocialListRow
      body={site.lastConditionSummary}
      meta={[
        site.area,
        titleCase(site.difficulty),
        verificationLabel(site.verificationStatus),
        depthRange,
      ]}
      name="Dive spot"
      status={site.buddySignal?.label ? <StatusPill>{site.buddySignal.label}</StatusPill> : null}
      title={site.name}
    >
      {site.coverMedia?.displayUrl ? (
        <Image
          accessibilityLabel=""
          className="mb-3 w-full rounded-xl bg-secondary"
          contentFit="cover"
          source={{ uri: site.coverMedia.displayUrl }}
          style={{ aspectRatio: 4 / 5 }}
          transition={150}
        />
      ) : null}
      <SocialMetadataLine
        values={[
          `${site.likeCount.toLocaleString()} likes`,
          site.isSaved ? "Saved" : undefined,
        ]}
      />
      {onLike || onSave ? (
        <View className="mt-2">
          <SocialActionRow
            actions={[
              ...(onLike
                ? [
                    {
                      accessibilityLabel: site.viewerHasLiked
                        ? "Unlike dive spot"
                        : "Like dive spot",
                      active: site.viewerHasLiked,
                      disabled: actionsDisabled,
                      icon: likeIcon,
                      label: `${site.viewerHasLiked ? "Liked" : "Like"} · ${site.likeCount}`,
                      onPress: () => onLike(site),
                    },
                  ]
                : []),
              ...(onSave
                ? [
                    {
                      accessibilityLabel: site.isSaved ? "Unsave dive spot" : "Save dive spot",
                      active: site.isSaved,
                      disabled: actionsDisabled,
                      icon: saveIcon,
                      label: site.isSaved ? "Saved" : "Save",
                      onPress: () => onSave(site),
                    },
                  ]
                : []),
            ]}
          />
        </View>
      ) : null}
    </SocialListRow>
  );
}

export function ExploreSiteCard({
  actionsDisabled,
  onLike,
  onSave,
  site,
}: ExploreSiteCardProps) {
  const slug = safeSiteSlug(site.slug);

  if (!slug) {
    return (
      <ExploreSiteCardContent
        actionsDisabled={actionsDisabled}
        onLike={onLike}
        onSave={onSave}
        site={site}
      />
    );
  }

  return (
    <Link
      href={{
        pathname: "/(app)/(tabs)/(home)/explore/[slug]",
        params: { slug },
      }}
      asChild
    >
      <Pressable accessibilityRole="link">
        <ExploreSiteCardContent
          actionsDisabled={actionsDisabled}
          onLike={onLike}
          onSave={onSave}
          site={site}
        />
      </Pressable>
    </Link>
  );
}
