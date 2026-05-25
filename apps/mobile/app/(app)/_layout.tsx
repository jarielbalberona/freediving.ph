import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

import { MobileLoadingState } from "@/components/shell/mobile-loading-state";

export default function ProtectedLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <MobileLoadingState message="Checking your session." />;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="explore/[slug]" />
      <Stack.Screen name="chika/[slug]" />
      <Stack.Screen name="events/[slug]" />
      <Stack.Screen name="profile/[username]" />
    </Stack>
  );
}
