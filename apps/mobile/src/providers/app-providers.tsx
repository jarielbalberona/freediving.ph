import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { MobileAuthBridge } from "@/lib/auth";
import { env } from "@/lib/env";
import { initializeMonitoring } from "@/lib/monitoring";
import { MobileQueryProvider } from "@/providers/query-provider";

function ConfigErrorState() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView className="flex-1">
        <View className="flex-1 items-center justify-center bg-background px-6">
          <View className="w-full max-w-phone rounded-2xl border border-border bg-card p-5">
            <Text className="text-lg font-semibold text-foreground">Mobile setup needed</Text>
            <Text className="mt-2 text-sm leading-6 text-muted-foreground">
              Missing required environment values: {env.missingRequiredEnv.join(", ")}.
            </Text>
          </View>
        </View>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializeMonitoring();
    void SystemUI.setBackgroundColorAsync("#F7FBFD");
  }, []);

  if (!env.isConfigured) {
    return <ConfigErrorState />;
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={tokenCache}>
          <MobileQueryProvider>
            <MobileAuthBridge>{children}</MobileAuthBridge>
          </MobileQueryProvider>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
