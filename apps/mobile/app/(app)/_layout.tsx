import { Drawer } from "expo-router/drawer";

import { MOBILE_DRAWER_NAV_ITEMS } from "@/config/navigation";

export default function AppLayout() {
  return (
    <Drawer
      screenOptions={{
        drawerActiveTintColor: "#0677A8",
        drawerInactiveTintColor: "#0A1F2E",
        drawerLabelStyle: {
          fontSize: 14,
          fontWeight: "600",
        },
        headerShown: false,
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerItemStyle: { display: "none" },
        }}
      />
      {MOBILE_DRAWER_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Drawer.Screen
            key={item.id}
            name={item.routeName}
            options={{
              drawerIcon: ({ color, size }) => (
                <Icon color={color} size={size} strokeWidth={2.1} />
              ),
              drawerLabel: item.label,
              title: item.label,
            }}
          />
        );
      })}
      {[
        "notifications",
        "settings",
        "explore/[slug]",
        "chika/[slug]",
        "events/[slug]",
        "profile/[username]",
      ].map((name) => (
        <Drawer.Screen
          key={name}
          name={name}
          options={{ drawerItemStyle: { display: "none" } }}
        />
      ))}
    </Drawer>
  );
}
