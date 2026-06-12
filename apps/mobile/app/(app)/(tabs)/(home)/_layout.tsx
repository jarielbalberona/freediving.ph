import { Stack } from "expo-router";

import {
  IOS_NATIVE_STACK_SCREEN_OPTIONS,
  homeNativeLargeTitleOptions,
  nativeDetailScreenOptions,
  nativeLargeTitleOptions,
} from "@/components/shell/mobile-native-header";

export default function HomeStackLayout() {
  return (
    <Stack screenOptions={IOS_NATIVE_STACK_SCREEN_OPTIONS}>
      <Stack.Screen
        name="index"
        options={homeNativeLargeTitleOptions()}
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
        name="events/[slug]/pass/[token]"
        options={{
          title: "Event pass",
        }}
      />
      <Stack.Screen
        name="events/[slug]/manage"
        options={{
          title: "Event management",
        }}
      />
      <Stack.Screen
        name="schools"
        options={nativeLargeTitleOptions("Schools")}
      />
      <Stack.Screen
        name="schools/[slug]"
        options={{
          title: "School",
        }}
      />
      <Stack.Screen
        name="schools/[slug]/courses/[courseSlug]"
        options={{
          title: "Course",
        }}
      />
      <Stack.Screen
        name="schools/bookings/index"
        options={{
          title: "My bookings",
        }}
      />
      <Stack.Screen
        name="manage-schools"
        options={{
          title: "Manage Schools",
        }}
      />
      <Stack.Screen
        name="moderation"
        options={{
          title: "Moderation",
        }}
      />
      <Stack.Screen
        name="instructor-application"
        options={{
          title: "Instructor Application",
        }}
      />
      <Stack.Screen
        name="instructors/[username]"
        options={{
          title: "Instructor",
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
        name="saved"
        options={{
          title: "Saved",
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
        name="media/[postId]"
        options={{
          title: "Media post",
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
        options={nativeDetailScreenOptions("Profile")}
      />
      <Stack.Screen
        name="dive-memories/[entrySlug]/[username]"
        options={nativeDetailScreenOptions("Dive Memories")}
      />
    </Stack>
  );
}
