import { vars } from "nativewind";

export type MobileThemeName = "light" | "dark";

export type SemanticColorName =
  | "background"
  | "foreground"
  | "muted"
  | "muted-foreground"
  | "border"
  | "card"
  | "card-foreground"
  | "primary"
  | "primary-foreground"
  | "secondary"
  | "secondary-foreground"
  | "accent"
  | "destructive";

type SemanticTheme = Record<SemanticColorName, string>;

const lightTheme: SemanticTheme = {
  background: "#F7FBFD",
  foreground: "#0A1F2E",
  muted: "#E7F0F5",
  "muted-foreground": "#5D7280",
  border: "#D8E7EE",
  card: "#FFFFFF",
  "card-foreground": "#0A1F2E",
  primary: "#0677A8",
  "primary-foreground": "#FFFFFF",
  secondary: "#EAF7FB",
  "secondary-foreground": "#0E5772",
  accent: "#0D9488",
  destructive: "#D14343",
};

const darkTheme: SemanticTheme = {
  background: "#06141D",
  foreground: "#F2FAFD",
  muted: "#102635",
  "muted-foreground": "#9DB4C2",
  border: "#234252",
  card: "#0D1D29",
  "card-foreground": "#F2FAFD",
  primary: "#38A7D4",
  "primary-foreground": "#031018",
  secondary: "#123247",
  "secondary-foreground": "#DDF4FB",
  accent: "#2DD4BF",
  destructive: "#F87171",
};

function toNativeWindVars(theme: SemanticTheme) {
  return vars({
    "--color-background": theme.background,
    "--color-foreground": theme.foreground,
    "--color-muted": theme.muted,
    "--color-muted-foreground": theme["muted-foreground"],
    "--color-border": theme.border,
    "--color-card": theme.card,
    "--color-card-foreground": theme["card-foreground"],
    "--color-primary": theme.primary,
    "--color-primary-foreground": theme["primary-foreground"],
    "--color-secondary": theme.secondary,
    "--color-secondary-foreground": theme["secondary-foreground"],
    "--color-accent": theme.accent,
    "--color-destructive": theme.destructive,
  });
}

export const mobileThemeVars = {
  light: toNativeWindVars(lightTheme),
  dark: toNativeWindVars(darkTheme),
} as const;

export const mobileSemanticTheme = {
  light: lightTheme,
  dark: darkTheme,
} as const;
