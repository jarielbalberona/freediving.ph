import { Stack } from "expo-router";

import {
  IOS_NATIVE_STACK_SCREEN_OPTIONS,
  nativeLargeTitleOptions,
} from "@/components/shell/mobile-native-header";

export default function ChikaStackLayout() {
  return (
    <Stack screenOptions={IOS_NATIVE_STACK_SCREEN_OPTIONS}>
      <Stack.Screen
        name="index"
        options={nativeLargeTitleOptions("Chika")}
      />
      <Stack.Screen name="post" options={{ title: "Post Chika" }} />
      <Stack.Screen name="[slug]" options={{ title: "Chika" }} />
    </Stack>
  );
}
