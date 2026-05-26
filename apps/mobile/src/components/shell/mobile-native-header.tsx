import { Link, useNavigation } from "expo-router";
import { Bell, Menu, UserRound } from "lucide-react-native";
import { Pressable, View } from "react-native";

function openParentDrawer(navigation: unknown) {
  let target = navigation;
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
    navigation != null &&
    "dispatch" in navigation &&
    typeof navigation.dispatch === "function"
  ) {
    navigation.dispatch({ type: "OPEN_DRAWER" });
  }
}

export function NativeHeaderMenuButton() {
  const navigation = useNavigation();

  return (
    <Pressable
      accessibilityLabel="Open menu"
      hitSlop={10}
      onPress={() => openParentDrawer(navigation)}
    >
      <Menu color="#0A1F2E" size={22} />
    </Pressable>
  );
}

export function NativeHeaderActions() {
  return (
    <View className="flex-row items-center gap-4">
      <Link href="/(app)/(tabs)/(home)/notifications" asChild>
        <Pressable accessibilityLabel="Open notifications" hitSlop={10}>
          <Bell color="#0A1F2E" size={21} />
        </Pressable>
      </Link>
      <Link href="/(app)/(tabs)/profile" asChild>
        <Pressable accessibilityLabel="Open profile" hitSlop={10}>
          <UserRound color="#0A1F2E" size={21} />
        </Pressable>
      </Link>
    </View>
  );
}

export const USE_IOS_NATIVE_HEADER = process.env.EXPO_OS === "ios";

export const IOS_NATIVE_STACK_SCREEN_OPTIONS = {
  headerLargeTitle: true,
  headerLeft: () => <NativeHeaderMenuButton />,
  headerRight: () => <NativeHeaderActions />,
  headerShadowVisible: false,
  headerShown: USE_IOS_NATIVE_HEADER,
};

export function nativeSearchOptions(placeholder: string) {
  if (!USE_IOS_NATIVE_HEADER) {
    return undefined;
  }
  return {
    autoCapitalize: "none" as const,
    hideWhenScrolling: false,
    placeholder,
  };
}
