import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { MobileActionSheet } from "@/components/shell/mobile-action-sheet";
import { useMobileShellStore } from "@/stores/mobile-shell-store";

const menuItems = [
  { href: "/(app)/notifications", label: "Notifications" },
  { href: "/(app)/settings", label: "Settings" },
  { href: "/(app)/(tabs)/profile", label: "Profile" },
] as const;

export function MobileMenuSheet() {
  const isMenuOpen = useMobileShellStore((state) => state.isMenuOpen);
  const closeMenu = useMobileShellStore((state) => state.closeMenu);

  return (
    <MobileActionSheet onClose={closeMenu} title="Menu" visible={isMenuOpen}>
      <View className="gap-2 pb-4">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href} asChild>
            <Pressable
              className="rounded-xl border border-border bg-secondary px-4 py-3"
              onPress={closeMenu}
            >
              <Text className="text-sm font-semibold text-secondary-foreground">
                {item.label}
              </Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </MobileActionSheet>
  );
}
