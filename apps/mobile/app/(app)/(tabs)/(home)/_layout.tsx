import { Stack } from "expo-router";

import {
  IOS_NATIVE_STACK_SCREEN_OPTIONS,
  nativeSearchOptions,
} from "@/components/shell/mobile-native-header";

export default function HomeStackLayout() {
  return (
    <Stack screenOptions={IOS_NATIVE_STACK_SCREEN_OPTIONS}>
      <Stack.Screen
        name="index"
        options={{
          headerSearchBarOptions: nativeSearchOptions("Search the community"),
          title: "Home",
        }}
      />
      <Stack.Screen
        name="explore"
        options={{
          headerSearchBarOptions: nativeSearchOptions("Search dive spots"),
          title: "Explore",
        }}
      />
      <Stack.Screen
        name="events"
        options={{
          headerSearchBarOptions: nativeSearchOptions("Search events"),
          title: "Events",
        }}
      />
      <Stack.Screen
        name="schools"
        options={{
          headerSearchBarOptions: nativeSearchOptions("Search schools"),
          title: "Schools",
        }}
      />
      <Stack.Screen
        name="groups/index"
        options={{
          headerSearchBarOptions: nativeSearchOptions("Search groups"),
          title: "Groups",
        }}
      />
    </Stack>
  );
}
