import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { MobileEmptyState } from "@/components/shell";
import { ProfileDetailRow } from "@/features/profiles/components/profile-detail-row";
import { certLevelLabel } from "@/features/profiles/lib/profile-format";
import type {
  ProfileDivePresence,
  ProfileDiveSiteAffinity,
} from "@freediving.ph/types";

type ProfileDivingSectionProps = {
  affinities: ProfileDiveSiteAffinity[];
  error?: unknown;
  isLoading?: boolean;
  presences: ProfileDivePresence[];
};

const visibilityLabel = (value: string) =>
  value === "members" ? "Members" : value === "private" ? "Private" : "Public";

const presenceLabel = (presence: ProfileDivePresence) =>
  certLevelLabel(presence.presenceType) || "Dive presence";

const affinityLabel = (affinity: ProfileDiveSiteAffinity) =>
  certLevelLabel(affinity.relationship) || "Dive site";

function DiveSiteRow({
  label,
  slug,
  value,
}: {
  label: string;
  slug?: string;
  value: string;
}) {
  if (!slug) return <ProfileDetailRow label={label} value={value} />;

  return (
    <Link
      href={{
        pathname: "/(app)/(tabs)/(home)/explore/[slug]",
        params: { slug },
      }}
      asChild
    >
      <Pressable accessibilityRole="link">
        <ProfileDetailRow label={label} value={value} />
      </Pressable>
    </Link>
  );
}

export function ProfileDivingSection({
  affinities,
  error,
  isLoading = false,
  presences,
}: ProfileDivingSectionProps) {
  if (isLoading) {
    return (
      <ProfileDetailRow label="Diving" value="Loading visible diving activity." />
    );
  }

  if (error) {
    return (
      <ProfileDetailRow
        label="Diving"
        value="Diving activity is unavailable right now."
      />
    );
  }

  if (presences.length === 0 && affinities.length === 0) {
    return (
      <MobileEmptyState
        description="Visible dive presence and dive-site relationships will appear here."
        title="No diving activity"
      />
    );
  }

  return (
    <View className="gap-3">
      {presences.map((presence) => (
        <DiveSiteRow
          key={presence.id}
          label={presence.diveSiteName}
          slug={presence.diveSiteSlug}
          value={[
            presenceLabel(presence),
            visibilityLabel(presence.visibility),
            presence.note,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      ))}
      {affinities.map((affinity) => (
        <DiveSiteRow
          key={affinity.id}
          label={affinity.diveSiteName}
          slug={affinity.diveSiteSlug}
          value={[
            affinityLabel(affinity),
            visibilityLabel(affinity.visibility),
            affinity.note,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      ))}
      <Text className="text-xs leading-5 text-muted-foreground">
        Only diving details this profile can share are shown.
      </Text>
    </View>
  );
}
