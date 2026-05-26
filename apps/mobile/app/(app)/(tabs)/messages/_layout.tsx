import { Stack } from "expo-router";

import {
  IOS_NATIVE_STACK_SCREEN_OPTIONS,
  nativeLargeTitleOptions,
} from "@/components/shell/mobile-native-header";

export default function MessagesStackLayout() {
  return (
    <Stack screenOptions={IOS_NATIVE_STACK_SCREEN_OPTIONS}>
      <Stack.Screen
        name="index"
        options={nativeLargeTitleOptions("Messages")}
      />
      <Stack.Screen name="[threadId]" options={{ title: "Conversation" }} />
    </Stack>
  );
}
