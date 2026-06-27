import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { MobileAuthBridge } from "@/lib/auth";
import { env } from "@/lib/env";
import { initializeMonitoring } from "@/lib/monitoring";
import { MobileThemeProvider } from "@/providers/mobile-theme-provider";
import { MobileQueryProvider } from "@/providers/query-provider";

function ConfigErrorState() {
  return (
    <SafeAreaProvider>
      <View className="flex-1 items-center justify-center bg-background px-6">
        <View className="w-full max-w-phone rounded-2xl border border-border bg-card p-5">
          <Text className="text-lg font-semibold text-foreground">Mobile setup needed</Text>
          <Text className="mt-2 text-sm leading-6 text-muted-foreground">
            Missing required environment values: {env.missingRequiredEnv.join(", ")}.
          </Text>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializeMonitoring();
  }, []);

  if (!env.isConfigured) {
    return (
      <GestureHandlerRootView className="flex-1">
        <MobileThemeProvider>
          <ConfigErrorState />
        </MobileThemeProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <MobileThemeProvider>
        <SafeAreaProvider>
          <ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={tokenCache}>
            <MobileQueryProvider>
              <MobileAuthBridge>{children}</MobileAuthBridge>
            </MobileQueryProvider>
          </ClerkProvider>
        </SafeAreaProvider>
      </MobileThemeProvider>
    </GestureHandlerRootView>
  );
}
