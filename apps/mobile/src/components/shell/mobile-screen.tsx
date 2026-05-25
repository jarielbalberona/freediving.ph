import { View } from "react-native";

import { MobileAppShell } from "@/components/shell/mobile-app-shell";

type MobileScreenProps = {
  children: React.ReactNode;
  subtitle?: string;
  title: string;
};

export function MobileScreen({ children, subtitle, title }: MobileScreenProps) {
  return (
    <MobileAppShell subtitle={subtitle} title={title}>
      <View className="flex-1 px-4 py-4">{children}</View>
    </MobileAppShell>
  );
}
