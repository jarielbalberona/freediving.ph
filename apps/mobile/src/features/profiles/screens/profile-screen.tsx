import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

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
import { useMyProfileQuery } from "@/features/profiles/hooks/use-my-profile-query";
import {
  certLevelLabel,
  profileCountLabel,
  profileLocationLabel,
} from "@/features/profiles/lib/profile-format";

export function ProfileScreen() {
  const profileQuery = useMyProfileQuery();
  const profile = profileQuery.data?.profile;

  if (profileQuery.isLoading) {
    return (
      <MobileScrollScreen subtitle="Your diver profile" title="Profile">
        <MobileLoadingState message="Loading your profile." />
      </MobileScrollScreen>
    );
  }

  if (profileQuery.error) {
    return (
      <MobileScrollScreen subtitle="Your diver profile" title="Profile">
        <View className="gap-3">
          <MobileErrorState
            message="Your profile is taking longer than expected to load."
            title="Profile unavailable"
          />
          <MobileButton
            variant="secondary"
            onPress={() => void profileQuery.refetch()}
          >
            Try again
          </MobileButton>
        </View>
      </MobileScrollScreen>
    );
  }

  if (!profile) {
    return (
      <MobileScrollScreen subtitle="Your diver profile" title="Profile">
        <MobileEmptyState
          description="Your profile is ready. Add more details on the web while mobile editing is being prepared."
          title="Profile ready"
        />
      </MobileScrollScreen>
    );
  }

  const location = profileLocationLabel(profile);
  const certLevel = certLevelLabel(profile.certLevel);

  return (
    <MobileScrollScreen subtitle="Your diver profile" title="Profile">
      <MobileSection
        description="Review how your profile appears across the Freediving Philippines community."
        title="Your profile"
      >
        <ProfileSummaryCard
          avatarUrl={profile.avatarUrl}
          bio={profile.bio}
          displayName={profile.displayName}
          meta={location || certLevel}
          username={profile.username}
        />
      </MobileSection>

      <MobileSection title="Diver details">
        <View className="gap-3">
          <ProfileDetailRow label="Home area" value={location} />
          <ProfileDetailRow label="Certification" value={certLevel} />
          <ProfileDetailRow
            label="Buddies"
            value={profileCountLabel(profile.buddyCount, "buddies")}
          />
          <ProfileDetailRow
            label="Dive reports"
            value={profileCountLabel(profile.reportCount, "reports")}
          />
          {profile.interests?.length ? (
            <ProfileDetailRow
              label="Interests"
              value={profile.interests.join(", ")}
            />
          ) : null}
        </View>
      </MobileSection>

      <MobileSection title="Settings">
        <Link href="/(app)/(tabs)/profile/settings" asChild>
          <Pressable accessibilityRole="link">
            <View className="rounded-2xl border border-border bg-card p-4">
              <Text className="text-base font-semibold text-foreground">
                Account settings
              </Text>
              <Text className="mt-1 text-sm leading-6 text-muted-foreground">
                Manage sign-out and account access from settings.
              </Text>
            </View>
          </Pressable>
        </Link>
      </MobileSection>
    </MobileScrollScreen>
  );
}
