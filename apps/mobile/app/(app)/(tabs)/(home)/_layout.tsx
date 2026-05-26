import { Stack } from "expo-router";

import {
  IOS_NATIVE_STACK_SCREEN_OPTIONS,
  nativeLargeTitleOptions,
} from "@/components/shell/mobile-native-header";

export default function HomeStackLayout() {
  return (
    <Stack screenOptions={IOS_NATIVE_STACK_SCREEN_OPTIONS}>
      <Stack.Screen
        name="index"
        options={nativeLargeTitleOptions("Home")}
      />
      <Stack.Screen
        name="explore"
        options={nativeLargeTitleOptions("Explore")}
      />
      <Stack.Screen
        name="explore/[slug]"
        options={{
          title: "Dive Spot",
        }}
      />
      <Stack.Screen
        name="buddies"
        options={nativeLargeTitleOptions("Buddies")}
      />
      <Stack.Screen
        name="events"
        options={nativeLargeTitleOptions("Events")}
      />
      <Stack.Screen
        name="events/[slug]"
        options={{
          title: "Event",
        }}
      />
      <Stack.Screen
        name="schools"
        options={nativeLargeTitleOptions("Schools")}
      />
      <Stack.Screen
        name="manage-schools"
        options={{
          title: "Manage Schools",
        }}
      />
      <Stack.Screen
        name="instructor-application"
        options={{
          title: "Instructor Application",
        }}
      />
      <Stack.Screen
        name="groups/index"
        options={nativeLargeTitleOptions("Groups")}
      />
      <Stack.Screen
        name="groups/[slug]"
        options={{
          title: "Group",
        }}
      />
      <Stack.Screen
        name="learn"
        options={{
          title: "Learn",
        }}
      />
      <Stack.Screen
        name="founders-note"
        options={{
          title: "Founder’s Note",
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: "Notifications",
        }}
      />
      <Stack.Screen
        name="profile/index"
        options={nativeLargeTitleOptions("Profile")}
      />
      <Stack.Screen
        name="profile/settings"
        options={{
          title: "Settings",
        }}
      />
      <Stack.Screen
        name="profile/[username]"
        options={{
          title: "Profile",
        }}
      />
    </Stack>
  );
}
