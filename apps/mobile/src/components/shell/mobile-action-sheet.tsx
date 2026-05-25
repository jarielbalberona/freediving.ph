import { Modal, Pressable, Text, View } from "react-native";

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
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View className="flex-1 justify-end bg-black/30">
        <View className="rounded-t-3xl bg-card p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-foreground">{title}</Text>
            <Pressable className="rounded-full bg-secondary px-3 py-2" onPress={onClose}>
              <Text className="text-sm font-semibold text-secondary-foreground">Close</Text>
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
