import {
  NativeTabs,
  type NativeTabsTriggerIconProps,
} from "expo-router/unstable-native-tabs";
import { Ionicons } from "@expo/vector-icons";
import { DynamicColorIOS } from "react-native";

import { MOBILE_BOTTOM_NAV_ITEMS } from "@/config/navigation";

const adaptiveTabTintColor =
  process.env.EXPO_OS === "ios"
    ? DynamicColorIOS({
        dark: "white",
        light: "black",
      })
    : "#0677A8";

const nativeTabProps =
  process.env.EXPO_OS === "ios"
    ? {
        labelStyle: {
          color: DynamicColorIOS({
            dark: "white",
            light: "black",
          }),
        },
        minimizeBehavior: "onScrollDown" as const,
        tintColor: adaptiveTabTintColor,
      }
    : {
        backgroundColor: "#FFFFFF",
        tintColor: adaptiveTabTintColor,
      };

export default function AppTabsLayout() {
  return (
    <NativeTabs {...nativeTabProps}>
      {MOBILE_BOTTOM_NAV_ITEMS.map((item) => {
        const iconProps = {
          renderingMode: "template",
          src: (
            <NativeTabs.Trigger.VectorIcon family={Ionicons} name={item.icon} />
          ),
        } as NativeTabsTriggerIconProps;
        return (
          <NativeTabs.Trigger
            key={item.id}
            name={item.routeName}
            role={item.role}
          >
            <NativeTabs.Trigger.Icon {...iconProps} />
            <NativeTabs.Trigger.Label>{item.label}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        );
      })}
    </NativeTabs>
  );
}
