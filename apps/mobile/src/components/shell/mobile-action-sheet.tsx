import { BottomSheet } from "@expo/ui";
import { Text, View } from "react-native";

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
  return (
    <BottomSheet isPresented={visible} onDismiss={onClose} snapPoints={["half"]}>
      <View className="gap-4 bg-card pb-4">
        <Text className="text-base font-semibold text-foreground">{title}</Text>
        {children}
      </View>
    </BottomSheet>
  );
}
