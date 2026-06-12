import { useAuth } from "@clerk/expo";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useNavigation } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";

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

export const USE_IOS_NATIVE_HEADER = process.env.EXPO_OS === "ios";
const USE_ANDROID_NATIVE_HEADER = process.env.EXPO_OS === "android";
const HOME_LOGO = require("../../../assets/images/fph-text-logo.png");

function HomeCompactHeaderLogo() {
  if (!USE_IOS_NATIVE_HEADER) {
    return null;
  }

  return (
    <View className="h-10 w-44 items-center justify-center">
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="Freediving Philippines"
        className="h-8 w-40"
        resizeMode="contain"
        source={HOME_LOGO}
      />
    </View>
  );
}

function IOSDrawerButton() {
  const navigation = useNavigation();

  if (!USE_IOS_NATIVE_HEADER) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel="Open menu"
      className="h-11 w-11 items-center justify-center rounded-full"
      hitSlop={12}
      onPress={() => openParentDrawer(navigation)}
    >
      <Ionicons color="#0A1F2E" name="menu-outline" size={25} />
    </Pressable>
  );
}

function IOSHeaderActions() {
  if (!USE_IOS_NATIVE_HEADER) {
    return null;
  }

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        accessibilityLabel="Open notifications"
        className="h-11 w-11 items-center justify-center rounded-full"
        hitSlop={12}
        onPress={() => router.push("/(app)/(tabs)/(home)/notifications")}
      >
        <Ionicons color="#0A1F2E" name="notifications-outline" size={23} />
      </Pressable>
      <Pressable
        accessibilityLabel="Open profile"
        className="h-11 w-11 items-center justify-center rounded-full"
        hitSlop={12}
        onPress={() => router.push("/(app)/(tabs)/(home)/profile")}
      >
        <Ionicons color="#0A1F2E" name="person-circle-outline" size={25} />
      </Pressable>
    </View>
  );
}

function AndroidDrawerButton() {
  const navigation = useNavigation();

  if (!USE_ANDROID_NATIVE_HEADER) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel="Open menu"
      className="h-11 w-11 items-center justify-center rounded-full"
      hitSlop={12}
      onPress={() => openParentDrawer(navigation)}
    >
      <Ionicons color="#0A1F2E" name="menu" size={25} />
    </Pressable>
  );
}

function AndroidHeaderTitle({ title }: { title?: string }) {
  if (!USE_ANDROID_NATIVE_HEADER) {
    return null;
  }

  if (title === "Home") {
    return (
      <View className="ml-2 flex-row items-center">
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel="Freediving Philippines"
          className="h-12 w-32"
          resizeMode="contain"
          source={HOME_LOGO}
        />
      </View>
    );
  }

  return (
    <View className="ml-2 min-w-0">
      <Text className="text-xl font-semibold text-foreground" numberOfLines={1}>
        {title ?? ""}
      </Text>
    </View>
  );
}

function AndroidHeaderActions() {
  const { isSignedIn } = useAuth();

  if (!USE_ANDROID_NATIVE_HEADER) {
    return null;
  }

  const notificationsHref = isSignedIn
    ? "/(app)/(tabs)/(home)/notifications"
    : "/sign-in";
  const profileHref = isSignedIn ? "/(app)/(tabs)/(home)/profile" : "/sign-in";

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        accessibilityLabel="Open notifications"
        className="h-11 w-11 items-center justify-center rounded-full"
        hitSlop={12}
        onPress={() => router.push(notificationsHref)}
      >
        <Ionicons color="#0A1F2E" name="notifications-outline" size={23} />
      </Pressable>
      <Pressable
        accessibilityLabel="Open profile"
        className="h-11 w-11 items-center justify-center rounded-full"
        hitSlop={12}
        onPress={() => router.push(profileHref)}
      >
        <Ionicons color="#0A1F2E" name="person-circle-outline" size={25} />
      </Pressable>
    </View>
  );
}

export const IOS_NATIVE_STACK_SCREEN_OPTIONS = {
  headerLargeTitle: false,
  headerLargeTitleShadowVisible: false,
  headerLargeTitleStyle: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  headerLeft: USE_IOS_NATIVE_HEADER
    ? () => <IOSDrawerButton />
    : USE_ANDROID_NATIVE_HEADER
      ? () => <AndroidDrawerButton />
      : undefined,
  headerRight: USE_IOS_NATIVE_HEADER
    ? () => <IOSHeaderActions />
    : USE_ANDROID_NATIVE_HEADER
      ? () => <AndroidHeaderActions />
      : undefined,
  headerShadowVisible: false,
  headerShown: true,
  headerStyle: USE_ANDROID_NATIVE_HEADER
    ? {
      backgroundColor: "#F7FCFF",
    }
    : undefined,
  headerTitle: USE_ANDROID_NATIVE_HEADER
    ? ({ children }: { children?: string }) => <AndroidHeaderTitle title={children} />
    : undefined,
  headerTitleAlign: "left" as const,
  headerTitleStyle: {
    fontSize: 17,
    fontWeight: "600" as const,
  },
};

export function nativeLargeTitleOptions(
  title: string,
  options?: { searchPlaceholder?: string },
) {
  return {
    ...IOS_NATIVE_STACK_SCREEN_OPTIONS,
    headerLargeTitle: USE_IOS_NATIVE_HEADER,
    headerSearchBarOptions:
      USE_IOS_NATIVE_HEADER && options?.searchPlaceholder
        ? {
          placeholder: options.searchPlaceholder,
        }
        : undefined,
    title,
  };
}

export function nativeDetailScreenOptions(title: string) {
  return {
    ...IOS_NATIVE_STACK_SCREEN_OPTIONS,
    headerBackButtonDisplayMode: "minimal" as const,
    headerBackTitleVisible: false,
    headerLeft: undefined,
    headerRight: undefined,
    title,
  };
}

export function homeNativeLargeTitleOptions() {
  return {
    ...nativeLargeTitleOptions("Home"),
    headerTitle: USE_IOS_NATIVE_HEADER
      ? () => <HomeCompactHeaderLogo />
      : IOS_NATIVE_STACK_SCREEN_OPTIONS.headerTitle,
  };
}
