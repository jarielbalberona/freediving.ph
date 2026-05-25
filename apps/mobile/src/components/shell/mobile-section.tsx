import { Text, View } from "react-native";

type MobileSectionProps = {
  children: React.ReactNode;
  description?: string;
  title?: string;
};

export function MobileSection({ children, description, title }: MobileSectionProps) {
  return (
    <View className="gap-3">
      {title || description ? (
        <View className="gap-1">
          {title ? <Text className="text-base font-semibold text-foreground">{title}</Text> : null}
          {description ? (
            <Text className="text-sm leading-5 text-muted-foreground">{description}</Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}
