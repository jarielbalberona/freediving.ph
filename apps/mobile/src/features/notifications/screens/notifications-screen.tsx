import { useState } from "react";
import { Switch, Text, View } from "react-native";
import { useAuth } from "@clerk/expo";

import type { UpdateNotificationSettingsRequest } from "@freediving.ph/types";

import {
  MobileCard,
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { requestForegroundCoarseLocation } from "@/features/location/lib/foreground-location";
import { ManageableNotificationCard } from "@/features/notifications/components/notification-card";
import { useNotificationSettingsMutation } from "@/features/notifications/hooks/use-notification-settings-mutation";
import { useNotificationSettingsQuery } from "@/features/notifications/hooks/use-notification-settings-query";
import {
  useDeleteNotificationMutation,
  useMarkNotificationReadMutation,
} from "@/features/notifications/hooks/use-notification-mutations";
import { useNotificationsQuery } from "@/features/notifications/hooks/use-notifications-query";
import { useRegisterPushDeviceMutation } from "@/features/notifications/hooks/use-register-push-device-mutation";
import { buildPushDeviceRegistrationRequest } from "@/features/notifications/lib/push-notifications";

type PreferenceRowProps = {
  disabled?: boolean;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function PreferenceRow({
  disabled = false,
  label,
  onValueChange,
  value,
}: PreferenceRowProps) {
  return (
    <View className="flex-row items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
      <Text className="min-w-0 flex-1 text-sm font-medium text-foreground">
        {label}
      </Text>
      <Switch
        disabled={disabled}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
}

export function NotificationsScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const notificationsQuery = useNotificationsQuery();
  const settingsQuery = useNotificationSettingsQuery();
  const settingsMutation = useNotificationSettingsMutation();
  const markReadMutation = useMarkNotificationReadMutation();
  const deleteNotificationMutation = useDeleteNotificationMutation();
  const registerPushMutation = useRegisterPushDeviceMutation();
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const notifications = notificationsQuery.data?.items ?? [];
  const settings = settingsQuery.data;
  const unreadCount = notifications.filter(
    (notification) => notification.status === "UNREAD",
  ).length;
  const preferencesDisabled =
    !isLoaded ||
    !isSignedIn ||
    settingsQuery.isLoading ||
    settingsMutation.isPending ||
    registerPushMutation.isPending;

  const updatePreference = (
    key: keyof UpdateNotificationSettingsRequest,
    value: boolean,
  ) => {
    settingsMutation.mutate({ [key]: value } as UpdateNotificationSettingsRequest);
  };

  const enablePush = async () => {
    setPermissionMessage(null);
    if (!isLoaded) {
      setPermissionMessage("Checking your session. Try again in a moment.");
      return;
    }
    if (!isSignedIn) {
      setPermissionMessage("Sign in to enable notifications.");
      return;
    }
    const result = await buildPushDeviceRegistrationRequest();
    if (result.status !== "granted") {
      setPermissionMessage(result.message);
      return;
    }
    registerPushMutation.mutate(result.request, {
      onError: () => setPermissionMessage("Could not enable notifications. Try again."),
      onSuccess: () => setPermissionMessage("Notifications are enabled for this device."),
    });
  };

  const useCurrentArea = async () => {
    setLocationMessage(null);
    const result = await requestForegroundCoarseLocation();
    if (result.status !== "granted") {
      setLocationMessage(result.message);
      return;
    }
    settingsMutation.mutate(
      {
        diveConditionAlerts: true,
        diveConditionCoarseArea: result.location.label,
        diveConditionNearMe: true,
      },
      {
        onError: () => setLocationMessage("Could not save this area. Try again."),
        onSuccess: () =>
          setLocationMessage(`Using current area: ${result.location.label}`),
      },
    );
  };

  return (
    <MobileScrollScreen subtitle="Community updates" title="Notifications">
      <MobileSection
        description="Choose what can reach this phone. Dive condition alerts can be saved now; actual weather delivery is coming later."
        title="Notification settings"
      >
        <MobileCard>
          <View className="gap-4">
            <View className="gap-1">
              <Text className="text-base font-semibold text-foreground">
                Push notifications
              </Text>
              <Text className="text-sm leading-6 text-muted-foreground">
                Enable updates for this device. You can turn them off here anytime.
                Real iPhone push delivery still needs App Store setup before release.
              </Text>
            </View>
            <MobileButton
              disabled={!isLoaded || !isSignedIn || registerPushMutation.isPending}
              onPress={() => void enablePush()}
              variant={settings?.pushEnabled ? "secondary" : "primary"}
            >
              {settings?.pushEnabled ? "Refresh device token" : "Enable push"}
            </MobileButton>
            {permissionMessage ? (
              <Text className="text-sm leading-6 text-muted-foreground">
                {permissionMessage}
              </Text>
            ) : null}
          </View>
        </MobileCard>

        {settingsQuery.isLoading ? (
          <MobileLoadingState message="Loading notification settings." />
        ) : null}

        {settingsQuery.error ? (
          <MobileErrorState
            message="Notification settings are taking longer than expected to load."
            title="Settings unavailable"
          />
        ) : null}

        {settings ? (
          <View className="gap-3">
            <PreferenceRow
              disabled={preferencesDisabled}
              label="Chika replies"
              value={settings.chikaReplies}
              onValueChange={(value) => updatePreference("chikaReplies", value)}
            />
            <PreferenceRow
              disabled={preferencesDisabled}
              label="Event updates and reminders"
              value={settings.eventNotifications && settings.eventReminderNotifications}
              onValueChange={(value) => {
                settingsMutation.mutate({
                  eventNotifications: value,
                  eventReminderNotifications: value,
                });
              }}
            />
            <PreferenceRow
              disabled={preferencesDisabled}
              label="Buddy updates"
              value={settings.buddyUpdates}
              onValueChange={(value) => updatePreference("buddyUpdates", value)}
            />
            <PreferenceRow
              disabled={preferencesDisabled}
              label="Profile and social updates"
              value={settings.profileSocialUpdates}
              onValueChange={(value) =>
                updatePreference("profileSocialUpdates", value)
              }
            />
            <PreferenceRow
              disabled={preferencesDisabled}
              label="Dive condition alerts"
              value={settings.diveConditionAlerts}
              onValueChange={(value) =>
                updatePreference("diveConditionAlerts", value)
              }
            />

            <MobileCard>
              <View className="gap-3">
                <View className="gap-1">
                  <Text className="text-base font-semibold text-foreground">
                    Nearby dive alerts
                  </Text>
                  <Text className="text-sm leading-6 text-muted-foreground">
                    Use your current area once. The app does not track your location in the background.
                  </Text>
                </View>
                <MobileButton
                  disabled={preferencesDisabled}
                  onPress={() => void useCurrentArea()}
                  variant="secondary"
                >
                  Use my current area
                </MobileButton>
                {settings.diveConditionCoarseArea ? (
                  <Text className="text-sm text-muted-foreground">
                    Current alert area: {settings.diveConditionCoarseArea}
                  </Text>
                ) : null}
                {locationMessage ? (
                  <Text className="text-sm leading-6 text-muted-foreground">
                    {locationMessage}
                  </Text>
                ) : null}
              </View>
            </MobileCard>
          </View>
        ) : null}
      </MobileSection>

      <MobileSection
        description="Updates from events, Chika, buddies, and your profile appear here."
        title="Latest notifications"
      >
        {notificationsQuery.isLoading ? (
          <MobileLoadingState message="Loading notifications." />
        ) : null}

        {notificationsQuery.error ? (
          <View className="gap-3">
            <MobileErrorState
              message="Notifications are taking longer than expected to load."
              title="Notifications unavailable"
            />
            <MobileButton
              variant="secondary"
              onPress={() => void notificationsQuery.refetch()}
            >
              Try again
            </MobileButton>
          </View>
        ) : null}

        {!notificationsQuery.isLoading &&
        !notificationsQuery.error &&
        notifications.length === 0 ? (
          <MobileEmptyState
            description="No notifications yet. Updates from events, Chika, buddies, and your profile will appear here."
            title="No notifications yet"
          />
        ) : null}

        {!notificationsQuery.isLoading &&
        !notificationsQuery.error &&
        notifications.length > 0 ? (
          <View className="gap-3">
            {unreadCount > 0 ? (
              <View className="border-y border-border/60 bg-background px-4 py-4">
                <Text className="text-sm font-semibold text-foreground">
                  {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
                </Text>
                <Text className="mt-1 text-sm leading-6 text-muted-foreground">
                  Open each update or mark it read when you are ready.
                </Text>
              </View>
            ) : null}

            {notifications.map((notification) => (
              <ManageableNotificationCard
                isDeleting={deleteNotificationMutation.isPending}
                isMarkingRead={markReadMutation.isPending}
                notification={notification}
                key={notification.id}
                onDelete={(notificationId) =>
                  deleteNotificationMutation.mutate(notificationId)
                }
                onMarkRead={(notificationId) =>
                  markReadMutation.mutate(notificationId)
                }
              />
            ))}
          </View>
        ) : null}
      </MobileSection>
    </MobileScrollScreen>
  );
}
