import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { ExploreSiteCard } from "@freediving.ph/types";

import { MobileCard } from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
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

  return (
    <MobileCard>
      <View className="gap-3">
        {site.coverMedia?.displayUrl ? (
          <Image
            accessibilityLabel=""
            className="h-40 w-full rounded-xl bg-secondary"
            contentFit="cover"
            source={{ uri: site.coverMedia.displayUrl }}
            transition={150}
          />
        ) : null}

        <View className="gap-2">
          <Text className="text-base font-semibold leading-6 text-foreground">
            {site.name}
          </Text>
          <Text className="text-sm text-muted-foreground">{site.area}</Text>
          {site.lastConditionSummary ? (
            <Text
              className="text-sm leading-6 text-muted-foreground"
              numberOfLines={3}
            >
              {site.lastConditionSummary}
            </Text>
          ) : null}
        </View>

        <View className="flex-row flex-wrap gap-2">
          <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {titleCase(site.difficulty)}
          </Text>
          <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {verificationLabel(site.verificationStatus)}
          </Text>
          {depthRange ? (
            <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {depthRange}
            </Text>
          ) : null}
          {site.buddySignal?.label ? (
            <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {site.buddySignal.label}
            </Text>
          ) : null}
        </View>
        {(onLike || onSave) ? (
          <View className="flex-row gap-2">
            {onLike ? (
              <View className="flex-1">
                <MobileButton
                  disabled={actionsDisabled}
                  variant="secondary"
                  onPress={() => onLike(site)}
                >
                  {site.viewerHasLiked ? "Unlike" : "Like"} · {site.likeCount}
                </MobileButton>
              </View>
            ) : null}
            {onSave ? (
              <View className="flex-1">
                <MobileButton
                  disabled={actionsDisabled}
                  variant="secondary"
                  onPress={() => onSave(site)}
                >
                  {site.isSaved ? "Unsave" : "Save"}
                </MobileButton>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </MobileCard>
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
