import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";

import type { BadgeCategory, UserBadge } from "@freediving.ph/types";

import { env } from "@/lib/env";
import { safeImageUrl } from "@/features/profiles/lib/profile-format";
import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
} from "@/components/shell";
import {
  badgeCategoryLabel,
  groupBadgesByCategory,
} from "@/features/profiles/components/profile-experience-sections";

type ProfileBadgeTemplateImageSource = {
  badgeImageUrl?: string | null;
  badgeImage?: string | null;
  imagePath?: string | null;
  imageUrl?: string | null;
  iconUrl?: string | null;
  logoPath?: string | null;
  logoUrl?: string | null;
};

const normalizeImageCandidate = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  return trimmed;
};

const hasImageLikeValue = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return false;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/")
  ) {
    return true;
  }
  return /\.(png|jpg|jpeg|gif|webp|avif|svg)(?:\?|#|$)/i.test(trimmed);
};

const resolveBadgeImageUrl = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (!env.apiBaseUrl) return "";

  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  try {
    return new URL(normalizedPath, `${env.apiBaseUrl}/`).toString();
  } catch {
    return "";
  }
};

const selectBadgeImageSource = (badge: UserBadge) => {
  const template = badge.template as ProfileBadgeTemplateImageSource;
  const topLevel = badge as { imageUrl?: string | null };
  const candidates: Array<string | null | undefined> = [
    template.badgeImageUrl,
    template.badgeImage,
    template.imageUrl,
    template.imagePath,
    template.iconUrl,
    template.logoPath,
    template.logoUrl,
    badge.icon,
    topLevel.imageUrl,
  ];

  return candidates.find(hasImageLikeValue);
};

const categoryLabel = (category: BadgeCategory) => {
  const titleByCategory: Record<BadgeCategory, string> = {
    personal_best: "Performance Marks",
    certification: "Credential Seals",
    experience: "Field Experience",
    community_role: "Leadership Crests",
    auto_stat: "Explorer Stamps",
  };
  return titleByCategory[category] ?? badgeCategoryLabel(category);
};

const formatDate = (value: string | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatMetadata = (badge: UserBadge) => {
  const earned = formatDate(badge.earnedDate || badge.earnedAt);
  const metadata = [earned, badge.displayValue, badge.formattedValue].filter(
    Boolean,
  ) as string[];
  return [...new Set(metadata)].join(" • ");
};

const badgeCategoryOrder = new Set([
  "personal_best",
  "certification",
  "experience",
  "community_role",
  "auto_stat",
]);

function ProfileBadgeTile({ badge }: { badge: UserBadge }) {
  const badgeName = badge.template.name || badge.name;
  const rawImageUrl = normalizeImageCandidate(selectBadgeImageSource(badge));
  const imageUrl = resolveBadgeImageUrl(rawImageUrl);
  const sourceUrl = imageUrl ? safeImageUrl(imageUrl) ?? "" : "";
  const [imageError, setImageError] = useState(false);
  const fallbackImage = !sourceUrl || imageError ? (
    <View className="size-14 items-center justify-center rounded-full bg-secondary">
      <Ionicons color="#475569" name="ribbon-outline" size={20} />
    </View>
  ) : null;

  return (
    <View className="w-[48%] rounded-2xl border border-border bg-card px-2.5 pb-2.5 pt-2.5">
      <View className="items-center">
        {sourceUrl && !imageError ? (
          <Image
            accessibilityLabel={`${badgeName} badge`}
            className="mb-3 size-20"
            contentFit="contain"
            onError={() => setImageError(true)}
            source={{ uri: sourceUrl }}
          />
        ) : (
          fallbackImage
        )}
        <Text className="text-center text-xs font-semibold text-foreground">
          {badgeName}
        </Text>
        {formatMetadata(badge) ? (
          <Text className="mt-1 text-center text-[11px] text-muted-foreground">
            {formatMetadata(badge)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function ProfileBadgesSection({
  autoStats,
  badges,
  error,
  isLoading,
}: {
  autoStats: UserBadge[];
  badges: UserBadge[];
  error: unknown;
  isLoading: boolean;
}) {
  const items = [...badges, ...autoStats];

  const grouped = useMemo(
    () => {
      const groups = groupBadgesByCategory([...badges], [...autoStats]);
      const ordered = [...badgeCategoryOrder]
        .map((category) => groups.find((item) => item.category === category))
        .filter((group): group is (typeof groups)[number] => Boolean(group));
      const groupedSet = new Set(ordered.map((group) => group.category));
      const rest = groups.filter((group) => !groupedSet.has(group.category));
      return [...ordered, ...rest];
    },
    [autoStats, badges],
  );

  if (isLoading && items.length === 0) {
    return <MobileLoadingState message="Loading badges." />;
  }

  if (error) {
    return (
      <MobileErrorState
        message="Badges and credentials are unavailable right now."
        title="Badges unavailable"
      />
    );
  }

  if (items.length === 0) {
    return (
      <MobileEmptyState
        description="Visible badges, credentials, and auto stats will appear here."
        title="No visible badges yet"
      />
    );
  }

  return (
    <View className="gap-4">
      {grouped.map((group) => (
        <View key={group.category} className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {categoryLabel(group.category as BadgeCategory)}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {group.items.map((badge) => (
              <ProfileBadgeTile key={badge.id} badge={badge} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
