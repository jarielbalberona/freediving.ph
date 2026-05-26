import { AuthView, type AuthViewMode } from "@clerk/expo/native";
import { useAuth } from "@clerk/expo";
import { Link, Redirect } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { MobileLoadingState } from "@/components/shell";

type AuthScreenProps = {
  mode: Extract<AuthViewMode, "signIn" | "signUp">;
};

export function AuthScreen({ mode }: AuthScreenProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <MobileLoadingState message="Loading authentication." />;
  }

  if (isSignedIn) {
    return <Redirect href="/(app)/(tabs)/(home)" />;
  }

  return (
    <View className="flex-1 bg-background">
      <AuthView isDismissable={false} mode={mode} />
      <View className="absolute bottom-8 left-4 right-4 gap-3">
        <Link href="/(app)/(tabs)/(home)" asChild>
          <Pressable className="items-center rounded-xl bg-card px-4 py-3 shadow-sm">
            <Text className="text-sm font-semibold text-foreground">
              Continue without signing in
            </Text>
          </Pressable>
        </Link>
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
    </View>
  );
}
