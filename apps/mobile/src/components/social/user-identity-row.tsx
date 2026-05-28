import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { ReactNode } from "react";

import {
  safeImageUrl,
  safeProfileUsername,
  profileHandle,
  profileRoute,
} from "@/features/profiles/lib/profile-format";
import { SocialAvatar } from "@/components/social/social-primitives";

type Size = "sm" | "md" | "lg";

export type UserIdentityRowProps = {
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  locationText?: string | null;
  subtitle?: string | null;
  bio?: string | null;
  size?: Size;
  disabled?: boolean;
  pressable?: boolean;
  showUsername?: boolean;
  showLocation?: boolean;
  showAvatar?: boolean;
  rightSlot?: ReactNode;
  bottomSlot?: ReactNode;
  onPress?: () => void;
  className?: string;
  testID?: string;
};

const pressedFeedbackStyle = (pressed: boolean) => ({
  opacity: pressed ? 0.95 : 1,
  transform: pressed ? [{ scale: 0.985 }] : [],
});

const nameClass: Record<Size, string> = {
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
};

const secondaryClass: Record<Size, string> = {
  sm: "text-xs",
  md: "text-xs",
  lg: "text-sm",
};

const trimOrUndefined = (value: string | null | undefined) => {
  const next = value?.trim();
  return next && next.length > 0 ? next : undefined;
};

export function UserIdentityRow({
  avatarUrl,
  bio,
  bottomSlot,
  className,
  disabled = false,
  displayName,
  locationText,
  pressable = true,
  rightSlot,
  showAvatar = true,
  showLocation = true,
  showUsername = true,
  size = "md",
  subtitle,
  testID,
  username,
  onPress,
}: UserIdentityRowProps) {
  const safeUsername = trimOrUndefined(username);
  const safeUsernameWithoutAt = safeProfileUsername(safeUsername);
  const displayText = trimOrUndefined(displayName) || safeUsernameWithoutAt || "Diver";
  const avatarLabel = trimOrUndefined(displayName) || safeUsernameWithoutAt;
  const usernameHandle = trimOrUndefined(profileHandle(safeUsernameWithoutAt));
  const locationLabel = trimOrUndefined(locationText);
  const subtitleText = trimOrUndefined(subtitle);
  const bioText = trimOrUndefined(bio);
  const targetHref = safeUsernameWithoutAt ? profileRoute(safeUsernameWithoutAt) : undefined;
  const canNavigate = pressable && !disabled && Boolean(targetHref);
  const shouldPress = pressable && (Boolean(onPress) || canNavigate);
  const handlePress = onPress
    ? onPress
    : targetHref
      ? () => router.push(targetHref)
      : undefined;

  const content = (
    <View className={`flex-row items-start gap-3 ${className ?? ""}`} testID={testID}>
      {showAvatar ? (
        <SocialAvatar
          imageUrl={safeImageUrl(trimOrUndefined(avatarUrl))}
          label={avatarLabel}
          size={size}
        />
      ) : null}
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text className={`min-w-0 flex-1 font-semibold ${nameClass[size]} text-foreground`} numberOfLines={1}>
            {displayText}
          </Text>
          {rightSlot ? <View className="shrink-0">{rightSlot}</View> : null}
        </View>

        {(showUsername || (showLocation && locationLabel)) && (
          <Text className={`mt-0.5 ${secondaryClass[size]} text-muted-foreground`} numberOfLines={1}>
            {showUsername ? usernameHandle : ""}
            {showUsername && locationLabel ? " • " : ""}
            {showLocation && locationLabel ? locationLabel : ""}
          </Text>
        )}

        {subtitleText ? (
          <Text className={`mt-1 ${secondaryClass[size]} text-muted-foreground`} numberOfLines={2}>
            {subtitleText}
          </Text>
        ) : null}

        {bioText ? (
          <Text className={`mt-1 ${secondaryClass[size]} text-muted-foreground`} numberOfLines={3}>
            {bioText}
          </Text>
        ) : null}

        {bottomSlot ? <View className="mt-2">{bottomSlot}</View> : null}
      </View>
    </View>
  );

  if (!shouldPress) return content;

  return (
    <Pressable
      accessibilityRole="link"
      className="active:bg-secondary/60"
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => pressedFeedbackStyle(pressed)}
    >
      {content}
    </Pressable>
  );
}
