import { Stack } from "expo-router";

import { IOS_NATIVE_STACK_SCREEN_OPTIONS } from "@/components/shell/mobile-native-header";

export default function CreateStackLayout() {
  return (
    <Stack screenOptions={IOS_NATIVE_STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="index" options={{ title: "Post" }} />
    </Stack>
  );
}
