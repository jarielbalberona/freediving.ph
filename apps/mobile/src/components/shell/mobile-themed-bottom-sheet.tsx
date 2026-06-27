import { BottomSheet, RNHostView } from "@expo/ui";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import { useEffect } from "react";
import { View } from "react-native";

import { useMobileTheme } from "@/providers/mobile-theme-provider";
import { mobileSemanticTheme } from "@/theme/tokens";

type MobileBottomSheetSnapPoint =
  | "half"
  | "full"
  | { fraction: number }
  | { height: number };

type MobileThemedBottomSheetProps = {
  children: React.ReactNode;
  isPresented: boolean;
  onDismiss: () => void;
  showDragIndicator?: boolean;
  snapPoints?: MobileBottomSheetSnapPoint[];
  testID?: string;
};

export function MobileThemedBottomSheet({
  children,
  isPresented,
  onDismiss,
  showDragIndicator = true,
  snapPoints,
  testID,
}: MobileThemedBottomSheetProps) {
  const { resolvedTheme } = useMobileTheme();
  const theme = mobileSemanticTheme[resolvedTheme];
  const fitToContents = !snapPoints || snapPoints.length === 0;

  useEffect(() => {
    if (!isPresented) return;

    const applyThemeVariables = (element: HTMLElement) => {
      Object.entries(theme).forEach(([name, value]) => {
        element.style.setProperty(`--color-${name}`, value);
      });
    };

    const applyWebThemeSurface = () => {
      const document = globalThis.document;
      if (!document) return;

      document.querySelectorAll<HTMLElement>("[data-vaul-drawer]").forEach((drawer) => {
        applyThemeVariables(drawer);
        drawer.style.setProperty("background-color", theme.card, "important");
        drawer.style.setProperty("color", theme["card-foreground"], "important");
      });

      document.querySelectorAll<HTMLElement>("[data-vaul-handle]").forEach((handle) => {
        handle.style.setProperty("background", theme["muted-foreground"], "important");
      });
    };

    applyWebThemeSurface();

    const animationFrame = globalThis.requestAnimationFrame?.(applyWebThemeSurface);
    const timeout = globalThis.setTimeout(applyWebThemeSurface, 50);

    return () => {
      if (animationFrame) {
        globalThis.cancelAnimationFrame?.(animationFrame);
      }
      globalThis.clearTimeout(timeout);
    };
  }, [isPresented, theme]);

  return (
    <BottomSheet
      isPresented={isPresented}
      modifiers={[fillMaxWidth()]}
      onDismiss={onDismiss}
      showDragIndicator={showDragIndicator}
      snapPoints={snapPoints}
      testID={testID}
    >
      <RNHostView matchContents={fitToContents}>
        <View
          style={
            fitToContents
              ? { backgroundColor: theme.card, width: "100%" }
              : { backgroundColor: theme.card, flex: 1, width: "100%" }
          }
        >
          {children}
        </View>
      </RNHostView>
    </BottomSheet>
  );
}
