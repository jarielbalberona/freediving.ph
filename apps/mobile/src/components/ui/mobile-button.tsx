import { Pressable, Text } from "react-native";

type MobileButtonProps = {
  children: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variantClassName = {
  danger: "border border-destructive bg-white",
  ghost: "border border-transparent bg-transparent",
  primary: "border border-primary bg-primary",
  secondary: "border border-border bg-secondary",
};

const textClassName = {
  danger: "text-destructive",
  ghost: "text-foreground",
  primary: "text-primary-foreground",
  secondary: "text-secondary-foreground",
};

export function MobileButton({
  children,
  disabled = false,
  onPress,
  variant = "primary",
}: MobileButtonProps) {
  return (
    <Pressable
      className={`min-h-11 items-center justify-center rounded-xl px-4 ${variantClassName[variant]} ${disabled ? "opacity-50" : ""}`}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
    >
      <Text className={`text-sm font-semibold ${textClassName[variant]}`}>{children}</Text>
    </Pressable>
  );
}
