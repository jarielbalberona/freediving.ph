import { Tabs } from "expo-router";
import {
  CalendarDays,
  Compass,
  Home,
  MessageCircle,
  UserRound,
  UsersRound,
} from "lucide-react-native";

import { MobileBottomTabIcon } from "@/components/shell/mobile-bottom-tabs";

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0677A8",
        tabBarInactiveTintColor: "#78909C",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarStyle: {
          borderTopColor: "#D8E7EE",
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <MobileBottomTabIcon color={String(color)} focused={focused} icon={Home} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, focused }) => (
            <MobileBottomTabIcon color={String(color)} focused={focused} icon={Compass} />
          ),
        }}
      />
      <Tabs.Screen
        name="chika"
        options={{
          title: "Chika",
          tabBarIcon: ({ color, focused }) => (
            <MobileBottomTabIcon color={String(color)} focused={focused} icon={MessageCircle} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color, focused }) => (
            <MobileBottomTabIcon color={String(color)} focused={focused} icon={CalendarDays} />
          ),
        }}
      />
      <Tabs.Screen
        name="buddies"
        options={{
          title: "Buddies",
          tabBarIcon: ({ color, focused }) => (
            <MobileBottomTabIcon color={String(color)} focused={focused} icon={UsersRound} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <MobileBottomTabIcon color={String(color)} focused={focused} icon={UserRound} />
          ),
        }}
      />
    </Tabs>
  );
}
