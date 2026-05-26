import { type Href, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MOBILE_DRAWER_NAV_ITEMS } from "@/config/navigation";

type DrawerNavigationLike = {
  closeDrawer?: () => void;
  dispatch?: (action: { type: string }) => void;
};

type MobileDrawerContentProps = {
  navigation: DrawerNavigationLike;
};

export function MobileDrawerContent({ navigation }: MobileDrawerContentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={{
        gap: 8,
        paddingBottom: Math.max(insets.bottom, 24),
        paddingHorizontal: 12,
        paddingTop: Math.max(insets.top, 24),
      }}
    >
      {MOBILE_DRAWER_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="link"
            onPress={() => {
              router.push(`/(app)/(tabs)/(home)/${item.routeName}` as Href);
              navigation.closeDrawer?.();
              navigation.dispatch?.({ type: "CLOSE_DRAWER" });
            }}
          >
            <View className="flex-row items-center gap-4 rounded-2xl px-4 py-4">
              <Icon color="#0A1F2E" size={26} />
              <Text className="text-base font-semibold text-foreground">
                {item.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
