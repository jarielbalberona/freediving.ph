import { useClerk, useUser } from "@clerk/expo";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { MobileButton } from "@/components/ui/mobile-button";
import { MobileCard, MobileScrollScreen, MobileSection } from "@/components/shell";
import { useMyProfileQuery } from "@/features/profiles/hooks/use-my-profile-query";
import { getProfileSetupStatus } from "@/features/profiles/lib/profile-completion";
import { useBlockedUsersQuery } from "@/features/safety/hooks/use-blocked-users-query";
import { useUnblockUserMutation } from "@/features/safety/hooks/use-safety-mutations";

export function SettingsScreen() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const profileQuery = useMyProfileQuery();
  const blockedUsersQuery = useBlockedUsersQuery();
  const unblockUser = useUnblockUserMutation();
  const setupStatus = getProfileSetupStatus(profileQuery.data?.profile);
  const blockedUsers = blockedUsersQuery.data?.items ?? [];

  return (
    <MobileScrollScreen subtitle="Shell controls" title="Settings">
      <MobileSection title="Account">
        <MobileCard>
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">
              {user?.primaryEmailAddress?.emailAddress ?? "Signed in"}
            </Text>
            <Text className="text-sm leading-6 text-muted-foreground">
              Account settings are intentionally minimal in the foundation pass.
            </Text>
          </View>
        </MobileCard>
      </MobileSection>
      <MobileSection title="Profile setup">
        <Link href={"/onboarding" as Href} asChild>
          <Pressable accessibilityRole="link">
            <MobileCard>
              <View className="gap-1">
                <Text className="text-sm font-semibold text-foreground">
                  {setupStatus.isComplete ? "Setup complete" : "Finish setup"}
                </Text>
                <Text className="text-sm leading-6 text-muted-foreground">
                  Update the basic details used for your profile, Explore, and Buddy Finder.
                </Text>
              </View>
            </MobileCard>
          </Pressable>
        </Link>
      </MobileSection>
      <MobileSection
        description="Blocked users are managed by backend policy. Unblocking restores normal eligibility checks; it does not force relationships or messages."
        title="Blocked users"
      >
        <View className="gap-3">
          {blockedUsersQuery.isLoading ? (
            <Text className="text-sm text-muted-foreground">Loading blocked users.</Text>
          ) : null}
          {blockedUsersQuery.error ? (
            <Text className="text-sm text-muted-foreground">
              Blocked users could not be loaded.
            </Text>
          ) : null}
          {!blockedUsersQuery.isLoading &&
          !blockedUsersQuery.error &&
          blockedUsers.length === 0 ? (
            <Text className="text-sm text-muted-foreground">
              You have not blocked anyone.
            </Text>
          ) : null}
          {blockedUsers.map((blockedUser) => (
            <MobileCard key={blockedUser.blockedUserId}>
              <View className="gap-3">
                <View className="gap-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {blockedUser.displayName || blockedUser.username}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    @{blockedUser.username}
                  </Text>
                </View>
                <View className="self-start">
                  <MobileButton
                    disabled={unblockUser.isPending}
                    onPress={() => unblockUser.mutate(blockedUser.blockedUserId)}
                    variant="secondary"
                  >
                    Unblock
                  </MobileButton>
                </View>
              </View>
            </MobileCard>
          ))}
        </View>
      </MobileSection>
      <MobileButton variant="danger" onPress={() => void signOut()}>
        Sign out
      </MobileButton>
    </MobileScrollScreen>
  );
}
