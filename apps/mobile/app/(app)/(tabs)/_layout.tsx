import {
  NativeTabs,
  type NativeTabsTriggerIconProps,
} from "expo-router/unstable-native-tabs";

import { MOBILE_BOTTOM_NAV_ITEMS } from "@/config/navigation";

export default function AppTabsLayout() {
  return (
    <NativeTabs tintColor="#0677A8">
      {MOBILE_BOTTOM_NAV_ITEMS.map((item) => {
        const iconProps = {
          md: item.md,
          sf: item.sf,
        } as NativeTabsTriggerIconProps;
        return (
          <NativeTabs.Trigger key={item.id} name={item.routeName}>
            <NativeTabs.Trigger.Icon {...iconProps} />
            <NativeTabs.Trigger.Label>{item.label}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        );
      })}
    </NativeTabs>
  );
}
