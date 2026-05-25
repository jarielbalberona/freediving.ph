import { Drawer } from "expo-router/drawer";

import { MobileDrawerContent } from "@/components/shell/mobile-drawer-content";
import { PushNotificationRouteListener } from "@/features/notifications/components/push-notification-route-listener";

export default function AppLayout() {
  return (
    <>
      <PushNotificationRouteListener />
      <Drawer
        drawerContent={(props) => <MobileDrawerContent {...props} />}
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
      </Drawer>
    </>
  );
}
