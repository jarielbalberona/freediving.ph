import { View } from "react-native";

export function MobileCard({ children }: { children: React.ReactNode }) {
  return <View className="rounded-2xl border border-border bg-card p-4">{children}</View>;
}
