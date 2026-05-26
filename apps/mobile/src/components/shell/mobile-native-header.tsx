import { router, Stack, useNavigation } from "expo-router";

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

export function NativeHeaderToolbar() {
  const navigation = useNavigation();

  if (!USE_IOS_NATIVE_HEADER) {
    return null;
  }

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Open menu"
          icon="line.3.horizontal"
          onPress={() => openParentDrawer(navigation)}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Open notifications"
          icon="bell"
          onPress={() => router.push("/(app)/(tabs)/(home)/notifications")}
        />
        <Stack.Toolbar.Button
          accessibilityLabel="Open profile"
          icon="person.crop.circle"
          onPress={() => router.push("/(app)/(tabs)/(home)/profile")}
        />
      </Stack.Toolbar>
    </>
  );
}

export const IOS_NATIVE_STACK_SCREEN_OPTIONS = {
  headerLargeTitle: true,
  headerLargeTitleStyle: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  headerShadowVisible: false,
  headerShown: USE_IOS_NATIVE_HEADER,
  headerTitleStyle: {
    fontSize: 17,
    fontWeight: "600" as const,
  },
};
