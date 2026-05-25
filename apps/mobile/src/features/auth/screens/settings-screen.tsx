import { useClerk, useUser } from "@clerk/expo";
import { Text, View } from "react-native";

import { MobileButton } from "@/components/ui/mobile-button";
import { MobileCard, MobileScrollScreen, MobileSection } from "@/components/shell";

export function SettingsScreen() {
  const { signOut } = useClerk();
  const { user } = useUser();

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
      <MobileButton variant="danger" onPress={() => void signOut()}>
        Sign out
      </MobileButton>
    </MobileScrollScreen>
  );
}
