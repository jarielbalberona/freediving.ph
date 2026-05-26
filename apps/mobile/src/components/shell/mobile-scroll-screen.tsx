import { ScrollView } from "react-native";

import { MobileAppShell } from "@/components/shell/mobile-app-shell";
import {
  NativeHeaderToolbar,
  USE_IOS_NATIVE_HEADER,
} from "@/components/shell/mobile-native-header";

type MobileScrollScreenProps = {
  children: React.ReactNode;
  subtitle?: string;
  title: string;
};

export function MobileScrollScreen({ children, subtitle, title }: MobileScrollScreenProps) {
  if (USE_IOS_NATIVE_HEADER) {
    return (
      <>
        <ScrollView
          className="flex-1 bg-background"
          contentContainerClassName="w-full max-w-phone self-center gap-4 px-4 pb-8 pt-4"
          contentInsetAdjustmentBehavior="automatic"
        >
          {children}
        </ScrollView>
        <NativeHeaderToolbar />
      </>
    );
  }

  return (
    <MobileAppShell subtitle={subtitle} title={title}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 pb-8 pt-4"
        contentInsetAdjustmentBehavior="automatic"
      >
        {children}
      </ScrollView>
    </MobileAppShell>
  );
}
