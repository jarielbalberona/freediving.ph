import { Image } from "expo-image";
import { Text, View } from "react-native";

import {
  profileInitials,
  safeImageUrl,
} from "@/features/profiles/lib/profile-format";

type ProfileAvatarProps = {
  displayName?: string;
  imageUrl?: string;
  size?: "md" | "lg";
};

const sizeClassName = {
  lg: "h-20 w-20 rounded-3xl",
  md: "h-14 w-14 rounded-2xl",
};

export function ProfileAvatar({
  displayName,
  imageUrl,
  size = "lg",
}: ProfileAvatarProps) {
  const url = safeImageUrl(imageUrl);

  if (url) {
    return (
      <Image
        accessibilityLabel=""
        className={`${sizeClassName[size]} bg-secondary`}
        contentFit="cover"
        source={{ uri: url }}
        transition={150}
      />
    );
  }

  return (
    <View className={`${sizeClassName[size]} items-center justify-center bg-secondary`}>
      <Text className="text-lg font-semibold text-secondary-foreground">
        {profileInitials(displayName)}
      </Text>
    </View>
  );
}
