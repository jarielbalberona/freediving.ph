import { useAuth } from "@clerk/expo";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";

import {
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { useMyProfileQuery } from "@/features/profiles/hooks/use-my-profile-query";
import { useUpdateMyProfileMutation } from "@/features/profiles/hooks/use-profile-mutations";
import { getProfileSetupStatus } from "@/features/profiles/lib/profile-completion";
import { FphgoApiError } from "@/lib/api";

const splitInterests = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);

const errorMessage = (error: unknown) => {
  if (error instanceof FphgoApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Could not save profile setup. Try again.";
};

export function OnboardingScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const profileQuery = useMyProfileQuery();
  const updateProfile = useUpdateMyProfileMutation();
  const profile = profileQuery.data?.profile;
  const setupStatus = getProfileSetupStatus(profile);
  const [displayName, setDisplayName] = useState("");
  const [homeArea, setHomeArea] = useState("");
  const [interests, setInterests] = useState("");
  const [certLevel, setCertLevel] = useState("");
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    if (!profile) return;
    setDisplayName((current) => current || profile.displayName || "");
    setHomeArea((current) => current || profile.homeArea || profile.location || "");
    setInterests((current) => current || (profile.interests ?? []).join(", "));
    setCertLevel((current) => current || profile.certLevel || "");
  }, [profile]);

  if (!isLoaded) {
    return <MobileLoadingState message="Checking your session." />;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  if (profileQuery.isLoading) {
    return (
      <MobileScrollScreen title="Set up profile">
        <MobileLoadingState message="Loading your profile." />
      </MobileScrollScreen>
    );
  }

  if (profileQuery.error) {
    return (
      <MobileScrollScreen title="Set up profile">
        <View className="gap-3">
          <MobileErrorState
            message="Your profile setup could not load. Check your connection and try again."
            title="Setup unavailable"
          />
          <MobileButton variant="secondary" onPress={() => void profileQuery.refetch()}>
            Try again
          </MobileButton>
        </View>
      </MobileScrollScreen>
    );
  }

  if (profile && setupStatus.isComplete) {
    return <Redirect href="/(app)/(tabs)/(home)" />;
  }

  const trimmedName = displayName.trim();
  const trimmedArea = homeArea.trim();
  const canSubmit = trimmedName.length >= 1 && trimmedArea.length >= 2;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <MobileScrollScreen title="Set up profile">
        <MobileSection
          description="Add the minimum details the app uses for nearby dive sites, Buddy Finder, and your public profile."
          title="Profile setup"
        >
          <View className="gap-3">
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Display name</Text>
              <TextInput
                autoCapitalize="words"
                className="rounded-2xl border border-border bg-card p-3 text-foreground"
                onChangeText={setDisplayName}
                placeholder="Your diving name"
                placeholderTextColor="#64748b"
                value={displayName}
              />
            </View>
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Home area</Text>
              <TextInput
                autoCapitalize="words"
                className="rounded-2xl border border-border bg-card p-3 text-foreground"
                onChangeText={setHomeArea}
                placeholder="Dauin, Negros Oriental"
                placeholderTextColor="#64748b"
                value={homeArea}
              />
            </View>
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Interests
              </Text>
              <TextInput
                className="min-h-20 rounded-2xl border border-border bg-card p-3 text-foreground"
                multiline
                onChangeText={setInterests}
                placeholder="reef, training, fun dive"
                placeholderTextColor="#64748b"
                value={interests}
              />
            </View>
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Certification
              </Text>
              <TextInput
                autoCapitalize="characters"
                className="rounded-2xl border border-border bg-card p-3 text-foreground"
                onChangeText={setCertLevel}
                placeholder="AIDA 2 / Wave 1 / Instructor"
                placeholderTextColor="#64748b"
                value={certLevel}
              />
            </View>
            {message ? (
              <Text className="text-sm leading-5 text-muted-foreground">{message}</Text>
            ) : null}
            {updateProfile.error ? (
              <Text className="text-sm leading-5 text-destructive">
                {errorMessage(updateProfile.error)}
              </Text>
            ) : null}
            <MobileButton
              disabled={updateProfile.isPending || !canSubmit}
              onPress={() => {
                setMessage(undefined);
                updateProfile.mutate(
                  {
                    certLevel: certLevel.trim() || undefined,
                    displayName: trimmedName,
                    homeArea: trimmedArea,
                    interests: splitInterests(interests),
                    location: trimmedArea,
                  },
                  {
                    onError: () => {
                      setMessage("Profile setup was not saved.");
                    },
                    onSuccess: () => {
                      router.replace("/(app)/(tabs)/(home)");
                    },
                  },
                );
              }}
            >
              {updateProfile.isPending ? "Saving..." : "Continue"}
            </MobileButton>
          </View>
        </MobileSection>
      </MobileScrollScreen>
    </KeyboardAvoidingView>
  );
}
