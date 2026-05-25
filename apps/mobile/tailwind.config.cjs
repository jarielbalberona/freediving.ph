/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
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
      },
      maxWidth: {
        phone: "460px",
      },
    },
  },
};
