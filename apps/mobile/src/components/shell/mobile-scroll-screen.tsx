import { ScrollView } from "react-native";

import { USE_IOS_NATIVE_HEADER } from "@/components/shell/mobile-native-header";

type MobileScrollScreenProps = {
  children: React.ReactNode;
  subtitle?: string;
  title: string;
};

export function MobileScrollScreen({ children, subtitle, title }: MobileScrollScreenProps) {
  const contentContainerClassName = USE_IOS_NATIVE_HEADER
    ? "w-full max-w-phone self-center gap-4 px-6 pb-8 pt-0"
    : "w-full max-w-phone self-center gap-4 px-4 pb-8 pt-4";

  return (
    <>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName={contentContainerClassName}
        contentInsetAdjustmentBehavior="automatic"
      >
        {children}
      </ScrollView>
    </>
  );
}
