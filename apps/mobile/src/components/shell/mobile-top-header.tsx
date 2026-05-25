import { useAuth } from "@clerk/expo";
import { Link, useNavigation } from "expo-router";
import { Bell, Menu, UserRound } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MobileTopHeaderProps = {
  subtitle?: string;
  title?: string;
};

export function MobileTopHeader({ subtitle, title }: MobileTopHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isSignedIn } = useAuth();
  const openDrawer = () => {
    let target: unknown = navigation;
    for (let depth = 0; depth < 5 && target != null; depth += 1) {
      if (
        typeof target === "object" &&
        "openDrawer" in target &&
        typeof target.openDrawer === "function"
      ) {
        target.openDrawer();
        return;
      }
      if (
        typeof target !== "object" ||
        !("getParent" in target) ||
        typeof target.getParent !== "function"
      ) {
        break;
      }
      target = target.getParent();
    }
    if (
      typeof navigation === "object" &&
      "dispatch" in navigation &&
      typeof navigation.dispatch === "function"
    ) {
      navigation.dispatch({ type: "OPEN_DRAWER" });
    }
  };

  return (
    <View
      className="border-b border-border bg-card px-4 pb-3"
      style={{ paddingTop: Math.max(insets.top, 12) }}
    >
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityLabel="Open menu"
          className="h-10 w-10 items-center justify-center rounded-full bg-secondary"
          onPress={openDrawer}
        >
          <Menu color="#0A1F2E" size={20} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-primary">
            Freediving Philippines
          </Text>
          <Text
            className="text-lg font-semibold text-foreground"
            numberOfLines={1}
          >
            {title ?? "Mobile"}
          </Text>
          {subtitle ? (
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Link
          href={isSignedIn ? "/(app)/(tabs)/(home)/notifications" : "/sign-in"}
          asChild
        >
          <Pressable
            accessibilityLabel="Open notifications"
            className="h-10 w-10 items-center justify-center rounded-full bg-secondary"
          >
            <Bell color="#0A1F2E" size={19} />
          </Pressable>
        </Link>
        <Link href={isSignedIn ? "/(app)/(tabs)/profile" : "/sign-in"} asChild>
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
