import { View } from "react-native";

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
  return (
    <>
      <View className="w-full max-w-phone flex-1 self-center bg-background px-4 py-4">
        {children}
      </View>
      {USE_IOS_NATIVE_HEADER ? <NativeHeaderToolbar /> : null}
    </>
  );
}
