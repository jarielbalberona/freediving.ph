import { ScrollView } from "react-native";

import { MobileAppShell } from "@/components/shell/mobile-app-shell";

type MobileScrollScreenProps = {
  children: React.ReactNode;
  subtitle?: string;
  title: string;
};

export function MobileScrollScreen({ children, subtitle, title }: MobileScrollScreenProps) {
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
