import { useAuth } from "@clerk/expo";
import type { Href } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { Redirect } from "expo-router";

import { MobileErrorState, MobileLoadingState } from "@/components/shell";
import { MobileDrawerContent } from "@/components/shell/mobile-drawer-content";
import { PushNotificationRouteListener } from "@/features/notifications/components/push-notification-route-listener";
import { useMyProfileQuery } from "@/features/profiles/hooks/use-my-profile-query";
import { getProfileSetupStatus } from "@/features/profiles/lib/profile-completion";

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const profileQuery = useMyProfileQuery();
  const profile = profileQuery.data?.profile;

  if (!isLoaded) {
    return <MobileLoadingState message="Checking your session." />;
  }

  if (isSignedIn && profileQuery.isLoading) {
    return <MobileLoadingState message="Loading your profile." />;
  }

  if (isSignedIn && profileQuery.error) {
    return (
      <MobileErrorState
        message="Your profile could not be loaded. Check your connection and try again."
        title="Profile unavailable"
      />
    );
  }

  if (isSignedIn && !getProfileSetupStatus(profile).isComplete) {
    return <Redirect href={"/onboarding" as Href} />;
  }

  return (
    <>
      <PushNotificationRouteListener />
      <Drawer
        drawerContent={(props) => <MobileDrawerContent {...props} />}
        screenOptions={{
          drawerActiveTintColor: "#0677A8",
          drawerInactiveTintColor: "#0A1F2E",
          drawerLabelStyle: {
            fontSize: 14,
            fontWeight: "600",
          },
          headerShown: false,
        }}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            drawerItemStyle: { display: "none" },
          }}
        />
      </Drawer>
    </>
  );
}
