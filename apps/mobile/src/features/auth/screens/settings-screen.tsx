import { useClerk, useUser } from "@clerk/expo";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { MobileButton } from "@/components/ui/mobile-button";
import { MobileCard, MobileScrollScreen, MobileSection } from "@/components/shell";
import { useMyProfileQuery } from "@/features/profiles/hooks/use-my-profile-query";
import { getProfileSetupStatus } from "@/features/profiles/lib/profile-completion";

export function SettingsScreen() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const profileQuery = useMyProfileQuery();
  const setupStatus = getProfileSetupStatus(profileQuery.data?.profile);

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
      <MobileButton variant="danger" onPress={() => void signOut()}>
        Sign out
      </MobileButton>
    </MobileScrollScreen>
  );
}
