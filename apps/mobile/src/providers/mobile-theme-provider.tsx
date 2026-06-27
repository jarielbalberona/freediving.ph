import { Ionicons } from "@expo/vector-icons";
import * as SystemUI from "expo-system-ui";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Pressable, View, useColorScheme } from "react-native";

import {
  mobileSemanticTheme,
  mobileThemeVars,
  type MobileThemeName,
} from "@/theme/tokens";

type ThemePreference = MobileThemeName | "system";

type MobileThemeContextValue = {
  resolvedTheme: MobileThemeName;
  statusBarStyle: "dark" | "light";
  themePreference: ThemePreference;
  setThemePreference: (value: ThemePreference) => void;
  toggleMode: () => void;
};

const MobileThemeContext = createContext<MobileThemeContextValue | null>(null);

export function useMobileTheme() {
  const context = useContext(MobileThemeContext);
  if (!context) {
    throw new Error("useMobileTheme must be used inside MobileThemeProvider");
  }
  return context;
}

function MobileThemeToggle() {
  const { resolvedTheme, toggleMode } = useMobileTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <View className="absolute right-4 top-12 z-50">
      <Pressable
        accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
        accessibilityRole="button"
        className="h-11 w-11 items-center justify-center rounded-full border border-border bg-card shadow-sm"
        hitSlop={10}
        onPress={toggleMode}
      >
        <Ionicons
          color={isDark ? "#F7FBFD" : "#0A1F2E"}
          name={isDark ? "sunny-outline" : "moon-outline"}
          size={22}
        />
      </Pressable>
    </View>
  );
}

export function MobileThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const systemTheme: MobileThemeName = colorScheme === "dark" ? "dark" : "light";
  const [themePreference, setThemePreference] =
    useState<ThemePreference>("light");
  const resolvedTheme: MobileThemeName =
    themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(
      mobileSemanticTheme[resolvedTheme].background,
    );
  }, [resolvedTheme]);

  const toggleMode = useCallback(() => {
    setThemePreference((currentValue) => {
      const currentTheme =
        currentValue === "system" ? systemTheme : currentValue;
      return currentTheme === "dark" ? "light" : "dark";
    });
  }, [systemTheme]);

  const value = useMemo<MobileThemeContextValue>(
    () => ({
      resolvedTheme,
      statusBarStyle: resolvedTheme === "dark" ? "light" : "dark",
      themePreference,
      setThemePreference,
      toggleMode,
    }),
    [resolvedTheme, themePreference, toggleMode],
  );

  return (
    <MobileThemeContext.Provider value={value}>
      <View
        className={
          resolvedTheme === "dark"
            ? "dark flex-1 bg-background"
            : "flex-1 bg-background"
        }
        style={[
          { flex: 1 },
          mobileThemeVars[resolvedTheme],
          { backgroundColor: mobileSemanticTheme[resolvedTheme].background },
        ]}
      >
        {children}
        <MobileThemeToggle />
      </View>
    </MobileThemeContext.Provider>
  );
}
