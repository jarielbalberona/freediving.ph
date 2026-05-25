import assert from "node:assert/strict";
import test from "node:test";

import type {
  NotificationSettings,
  PushDevicePlatform,
  RegisterPushDeviceRequest,
  ThreadWithUserDto,
  UpdateNotificationSettingsRequest,
} from "../src/index.ts";

test("thread contract shape stays consistent", () => {
  const dto: ThreadWithUserDto = {
    thread: {
      id: 1,
      userId: 2,
      title: "Session update",
      content: "Weekend dive plan",
      createdAt: "2026-02-16T00:00:00.000Z",
      updatedAt: "2026-02-16T00:00:00.000Z",
    },
    user: {
      id: 2,
      username: "freediver",
      alias: "Blue Whale",
      email: null,
    },
    commentCount: 0,
    upvotes: 0,
    downvotes: 0,
  };

  assert.equal(dto.thread.title.length > 0, true);
  assert.equal(dto.user.username.length > 0, true);
});

test("notification contracts expose push device and dive alert preferences", () => {
  const platform: PushDevicePlatform = "ios";
  const device: RegisterPushDeviceRequest = {
    expoPushToken: "ExponentPushToken[test]",
    platform,
    deviceName: "iPhone",
  };
  const update: UpdateNotificationSettingsRequest = {
    buddyUpdates: true,
    diveConditionAlerts: true,
    diveConditionCoarseArea: "14.55, 121.02",
    diveConditionNearMe: true,
    diveConditionRegions: ["Batangas"],
    diveConditionSavedSites: true,
    profileSocialUpdates: true,
  };
  const settings: Pick<
    NotificationSettings,
    | "buddyUpdates"
    | "profileSocialUpdates"
    | "diveConditionAlerts"
    | "diveConditionRegions"
    | "diveConditionNearMe"
  > = {
    buddyUpdates: true,
    diveConditionAlerts: false,
    diveConditionNearMe: false,
    diveConditionRegions: [],
    profileSocialUpdates: true,
  };

  assert.equal(device.platform, "ios");
  assert.equal(update.diveConditionRegions?.[0], "Batangas");
  assert.equal(settings.profileSocialUpdates, true);
});
