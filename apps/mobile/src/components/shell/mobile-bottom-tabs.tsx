import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";

type MobileBottomTabIconProps = {
  color: string;
  focused: boolean;
  icon: LucideIcon;
};

export function MobileBottomTabIcon({
  color,
  focused,
  icon: Icon,
}: MobileBottomTabIconProps) {
  return (
    <View
      className={
        focused
          ? "h-8 w-12 items-center justify-center rounded-full bg-secondary"
          : "h-8 w-12 items-center justify-center"
      }
    >
      <Icon color={color} size={20} strokeWidth={focused ? 2.6 : 2.1} />
    </View>
  );
}
