import { View } from "react-native";

import { MobileAppShell } from "@/components/shell/mobile-app-shell";
import {
  NativeHeaderToolbar,
  USE_IOS_NATIVE_HEADER,
} from "@/components/shell/mobile-native-header";

type MobileScreenProps = {
  children: React.ReactNode;
  subtitle?: string;
  title: string;
};

export function MobileScreen({ children, subtitle, title }: MobileScreenProps) {
  if (USE_IOS_NATIVE_HEADER) {
    return (
      <>
        <View className="w-full max-w-phone flex-1 self-center bg-background px-4 py-4">
          {children}
        </View>
        <NativeHeaderToolbar />
      </>
    );
  }

  return (
    <MobileAppShell subtitle={subtitle} title={title}>
      <View className="flex-1 px-4 py-4">{children}</View>
    </MobileAppShell>
  );
}
