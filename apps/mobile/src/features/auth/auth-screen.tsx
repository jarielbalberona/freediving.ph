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
    <View className="flex-1 items-center bg-background px-4 py-6">
      <View className="w-full max-w-phone flex-1 justify-center gap-5">
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-primary">
            Freediving Philippines
          </Text>
          <Text className="text-2xl font-semibold text-foreground">
            {mode === "signIn" ? "Sign in" : "Create account"}
          </Text>
          <Text className="text-sm leading-6 text-muted-foreground">
            Use your FPH account to open the mobile app shell. Feature data
            integration comes next.
          </Text>
        </View>
        <View className="min-h-[460px] overflow-hidden rounded-2xl border border-border bg-card">
          <AuthView isDismissable={false} mode={mode} />
        </View>
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
