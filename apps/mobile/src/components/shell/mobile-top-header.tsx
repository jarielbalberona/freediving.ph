import { Link } from "expo-router";
import { Bell, Menu, UserRound } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMobileShellStore } from "@/stores/mobile-shell-store";

type MobileTopHeaderProps = {
  subtitle?: string;
  title?: string;
};

export function MobileTopHeader({ subtitle, title }: MobileTopHeaderProps) {
  const insets = useSafeAreaInsets();
  const toggleMenu = useMobileShellStore((state) => state.toggleMenu);

  return (
    <View
      className="border-b border-border bg-card px-4 pb-3"
      style={{ paddingTop: Math.max(insets.top, 12) }}
    >
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityLabel="Open menu"
          className="h-10 w-10 items-center justify-center rounded-full bg-secondary"
          onPress={toggleMenu}
        >
          <Menu color="#0A1F2E" size={20} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-primary">
            Freediving Philippines
          </Text>
          <Text className="text-lg font-semibold text-foreground" numberOfLines={1}>
            {title ?? "Mobile"}
          </Text>
          {subtitle ? (
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Link href="/(app)/notifications" asChild>
          <Pressable
            accessibilityLabel="Open notifications"
            className="h-10 w-10 items-center justify-center rounded-full bg-secondary"
          >
            <Bell color="#0A1F2E" size={19} />
          </Pressable>
        </Link>
        <Link href="/(app)/(tabs)/profile" asChild>
          <Pressable
            accessibilityLabel="Open profile"
            className="h-10 w-10 items-center justify-center rounded-full bg-primary"
          >
            <UserRound color="#FFFFFF" size={18} />
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
