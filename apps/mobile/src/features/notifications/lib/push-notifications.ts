import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type {
  PushDevicePlatform,
  RegisterPushDeviceRequest,
} from "@freediving.ph/types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushPermissionResult =
  | { status: "granted"; request: RegisterPushDeviceRequest }
  | { status: "denied"; message: string }
  | { status: "unavailable"; message: string };

const expoProjectId = () =>
  Constants.easConfig?.projectId ??
  Constants.expoConfig?.extra?.eas?.projectId ??
  Constants.manifest2?.extra?.expoClient?.extra?.eas?.projectId;

const platform = (): PushDevicePlatform => {
  if (Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web") {
    return Platform.OS;
  }
  return "unknown";
};

export async function buildPushDeviceRegistrationRequest(): Promise<PushPermissionResult> {
  if (!Device.isDevice) {
    return {
      status: "unavailable",
      message: "Push notifications need a real phone.",
    };
  }

  const existing = await Notifications.getPermissionsAsync();
  const finalStatus =
    existing.status === "granted"
      ? existing.status
      : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== "granted") {
    return {
      status: "denied",
      message: "Notifications are off for this device. Turn them on in system settings to receive updates.",
    };
  }

  const projectId = expoProjectId();
  if (!projectId) {
    return {
      status: "unavailable",
      message: "Push notifications need an Expo project ID.",
    };
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return {
    status: "granted",
    request: {
      appVersion: Constants.expoConfig?.version,
      deviceId: Device.osBuildId ?? undefined,
      deviceName: Device.deviceName ?? Device.modelName ?? undefined,
      expoPushToken: token.data,
      platform: platform(),
    },
  };
}

export { Notifications };
