import { AuthView, type AuthViewMode } from "@clerk/expo/native";
import { useAuth } from "@clerk/expo";
import { Link, Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { MobileLoadingState } from "@/components/shell";

type AuthScreenProps = {
  mode: Extract<AuthViewMode, "signIn" | "signUp">;
};

export function AuthScreen({ mode }: AuthScreenProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const [showAuthView, setShowAuthView] = useState(false);

  if (!isLoaded) {
    return <MobileLoadingState message="Loading authentication." />;
  }

  if (isSignedIn) {
    return <Redirect href="/(app)/(tabs)/(home)" />;
  }

  if (!showAuthView) {
    return (
      <View className="flex-1 justify-center gap-4 bg-background px-6">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">
            Freediving Philippines
          </Text>
          <Text className="text-base text-muted-foreground">
            Browse public dive spots, Chika, events, and buddy posts without
            signing in.
          </Text>
        </View>
        <Link href="/(app)/(tabs)/(home)" asChild>
          <Pressable className="items-center rounded-xl bg-primary px-4 py-3">
            <Text className="text-sm font-semibold text-primary-foreground">
              Continue without signing in
            </Text>
          </Pressable>
        </Link>
        <Pressable
          className="items-center rounded-xl bg-card px-4 py-3 shadow-sm"
          onPress={() => setShowAuthView(true)}
        >
          <Text className="text-sm font-semibold text-foreground">
            {mode === "signIn" ? "Sign in" : "Create an account"}
          </Text>
        </Pressable>
        <Link href={mode === "signIn" ? "/sign-up" : "/sign-in"} asChild>
          <Pressable className="items-center rounded-xl bg-secondary px-4 py-3">
            <Text className="text-sm font-semibold text-secondary-foreground">
              {mode === "signIn"
                ? "Need an account? Sign up"
                : "Already have an account? Sign in"}
            </Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <AuthView isDismissable={false} mode={mode} />
    </View>
  );
}
