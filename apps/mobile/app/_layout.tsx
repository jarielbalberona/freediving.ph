import "react-native-gesture-handler";
import "../src/global.css";

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppProviders } from "@/providers/app-providers";
import { useMobileTheme } from "@/providers/mobile-theme-provider";

function RootNavigator() {
  const { statusBarStyle } = useMobileTheme();

  return (
    <ThemeProvider value={statusBarStyle === "light" ? DarkTheme : DefaultTheme}>
      <StatusBar style={statusBarStyle} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(app)" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
