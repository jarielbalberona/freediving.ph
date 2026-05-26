import { View } from "react-native";

import { USE_IOS_NATIVE_HEADER } from "@/components/shell/mobile-native-header";
import { MobileTopHeader } from "@/components/shell/mobile-top-header";

type MobileAppShellProps = {
  children: React.ReactNode;
  subtitle?: string;
  title?: string;
};

export function MobileAppShell({
  children,
  subtitle,
  title,
}: MobileAppShellProps) {
  return (
    <View className="flex-1 items-center bg-background">
      <View className="w-full max-w-phone flex-1 bg-background">
        {USE_IOS_NATIVE_HEADER ? null : (
          <MobileTopHeader subtitle={subtitle} title={title} />
        )}
        {children}
      </View>
    </View>
  );
}
