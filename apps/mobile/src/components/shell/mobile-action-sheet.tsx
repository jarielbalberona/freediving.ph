import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { MobileThemedBottomSheet } from "@/components/shell/mobile-themed-bottom-sheet";

type MobileActionSheetProps = {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  visible: boolean;
};

export function MobileActionSheet({
  children,
  onClose,
  title,
  visible,
}: MobileActionSheetProps) {
  const { width } = useWindowDimensions();
  const sheetWidth = Math.min(width - 28, 430);

  return (
    <MobileThemedBottomSheet
      isPresented={visible}
      onDismiss={onClose}
      snapPoints={[{ fraction: 0.6 }, "full"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
      >
        <View className="max-w-full bg-card pt-3" style={{ flex: 1, width: sheetWidth }}>
          <View className="w-full border-b border-border/40 px-4 pb-3">
            <Text className="w-full text-center text-base font-bold text-foreground">
              {title}
            </Text>
          </View>

          <ScrollView
            className="w-full"
            contentContainerClassName="w-full pb-5 pt-4"
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
          >
            <View className="w-full gap-3 px-4">{children}</View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </MobileThemedBottomSheet>
  );
}
