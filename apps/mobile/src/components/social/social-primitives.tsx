import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

const pressedFeedbackStyle = (pressed: boolean) => ({
  opacity: pressed ? 0.95 : 1,
  transform: pressed ? [{ scale: 0.985 }] : [],
});

type SocialAvatarProps = {
  imageUrl?: string | null;
  label?: string;
  size?: "sm" | "md" | "lg";
};

const initialsFor = (label: string) =>
  label
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const avatarSizeClass = {
  lg: "size-12",
  md: "size-11",
  sm: "size-9",
};

const iconSize = {
  lg: 22,
  md: 20,
  sm: 16,
};

export function SocialAvatar({ imageUrl, label, size = "md" }: SocialAvatarProps) {
  const fallbackLabel = (label ?? "").trim();
  const sizeClass = avatarSizeClass[size];
  const avatarIconSize = iconSize[size];

  if (imageUrl) {
    return (
      <Image
        accessibilityLabel=""
        cachePolicy="memory-disk"
        className={`${sizeClass} rounded-full bg-secondary`}
        contentFit="cover"
        source={{ uri: imageUrl }}
        transition={120}
      />
    );
  }

  return (
    <View className={`${sizeClass} items-center justify-center rounded-full bg-primary/10`}>
      {fallbackLabel ? (
        <Text className="text-xs font-semibold text-primary">
          {initialsFor(fallbackLabel)}
        </Text>
      ) : (
        <Ionicons color="#fff" name="person" size={avatarIconSize} />
      )}
    </View>
  );
}

export function SocialMetadataLine({ values }: { values: Array<string | undefined | null> }) {
  const metadata = values.filter(Boolean);
  if (metadata.length === 0) return null;

  return (
    <Text className="text-xs text-muted-foreground" numberOfLines={1}>
      {metadata.join(" · ")}
    </Text>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "primary";
}) {
  return (
    <Text
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        tone === "primary"
          ? "bg-primary/10 text-primary"
          : "bg-secondary text-secondary-foreground"
      }`}
      numberOfLines={1}
    >
      {children}
    </Text>
  );
}

export function AvatarIdentityRow({
  avatarUrl,
  children,
  meta,
  name,
  trailing,
}: {
  avatarUrl?: string | null;
  children?: React.ReactNode;
  meta?: Array<string | undefined | null>;
  name: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <SocialAvatar imageUrl={avatarUrl} label={name} />
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
          {name}
        </Text>
        {meta ? <SocialMetadataLine values={meta} /> : null}
        {children}
      </View>
      {trailing}
    </View>
  );
}

export function SocialListRow({
  avatarUrl,
  body,
  children,
  meta,
  name,
  onPress,
  status,
  title,
}: {
  avatarUrl?: string | null;
  body?: string | null;
  children?: React.ReactNode;
  meta?: Array<string | undefined | null>;
  name: string;
  onPress?: () => void;
  status?: React.ReactNode;
  title?: string | null;
}) {
  const content = (
    <View className="border-b border-border/60 bg-background px-4 py-4">
      <AvatarIdentityRow
        avatarUrl={avatarUrl}
        meta={meta}
        name={name}
        trailing={status}
      />
      {title ? (
        <Text className="mt-3 text-base font-semibold leading-6 text-foreground">
          {title}
        </Text>
      ) : null}
      {body ? (
        <Text className="mt-2 text-sm leading-6 text-muted-foreground" numberOfLines={4}>
          {body}
        </Text>
      ) : null}
      {children ? <View className="mt-3">{children}</View> : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      className="active:bg-secondary/60"
      onPress={onPress}
      style={({ pressed }) => pressedFeedbackStyle(pressed)}
    >
      {content}
    </Pressable>
  );
}

type SocialAction = {
  accessibilityLabel: string;
  active?: boolean;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
};

export function SocialActionRow({ actions }: { actions: SocialAction[] }) {
  return (
    <View className="flex-row flex-wrap items-center gap-1">
      {actions.map((action) => (
        <Pressable
          accessibilityLabel={action.accessibilityLabel}
          accessibilityRole="button"
          className={`min-h-10 flex-row items-center gap-1.5 rounded-full px-3 active:bg-secondary ${
            action.disabled ? "opacity-45" : ""
          }`}
          disabled={action.disabled}
          key={action.accessibilityLabel}
          onPress={action.disabled ? undefined : action.onPress}
          style={({ pressed }) => pressedFeedbackStyle(pressed && !action.disabled)}
        >
          <Ionicons
            color={action.active ? "#0677A8" : "#475569"}
            name={action.icon}
            size={18}
          />
          <Text
            className={`text-sm font-medium ${
              action.active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function CompactOverflowAction({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      accessibilityLabel="More actions"
      accessibilityRole="button"
      className="size-10 items-center justify-center rounded-full active:bg-secondary"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => pressedFeedbackStyle(pressed)}
    >
      <Ionicons color="#64748b" name="ellipsis-horizontal" size={20} />
    </Pressable>
  );
}
