import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { MOBILE_BOTTOM_NAV_ITEMS } from "@/config/navigation";

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0677A8",
        tabBarInactiveTintColor: "#64748b",
      }}
    >
      {MOBILE_BOTTOM_NAV_ITEMS.map((item) => (
        <Tabs.Screen
          key={item.id}
          name={item.routeName}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons color={color} name={item.icon} size={size} />
            ),
            title: item.label,
          }}
        />
      ))}
    </Tabs>
  );
}
