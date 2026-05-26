import type { Href } from "expo-router";

import type { Notification } from "@freediving.ph/types";

export const formatNotificationDate = (createdAt: string | undefined) => {
  const date = createdAt ? new Date(createdAt) : null;
  if (!date || Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const notificationTypeLabel = (type: Notification["type"]) => {
  const labels: Partial<Record<Notification["type"], string>> = {
    BOOKING_APPROVED: "Booking approved",
    BOOKING_CANCELLED_BY_SCHOOL: "Booking cancelled",
    BOOKING_CANCELLED_BY_STUDENT: "Booking cancelled",
    BOOKING_CREATED: "Booking request",
    BOOKING_REJECTED: "Booking rejected",
    BOOKING_RESCHEDULED: "Booking rescheduled",
    CHIKA_COMMENT_REPLIED: "Chika reply",
    CHIKA_THREAD_COMMENTED: "Chika comment",
    DIVE_SITE_SUBMITTED_FOR_REVIEW: "Dive site review",
    EVENT_ATTENDEE_JOINED: "Event attendee",
    EVENT_CANCELLED: "Event cancelled",
    EVENT_CREATED_FOR_GROUP: "Group event",
    EVENT_UPDATED: "Event update",
    GROUP_INVITE_RECEIVED: "Group invite",
    GROUP_POST_CREATED: "Group post",
    INSTRUCTOR_APPLICATION_APPROVED: "Instructor approved",
    INSTRUCTOR_APPLICATION_REJECTED: "Instructor update",
    INSTRUCTOR_APPLICATION_SUBMITTED: "Instructor application",
    NEW_DIVE_SITE_PUBLISHED: "Dive site",
    SESSION_CANCELLED: "Session cancelled",
    SESSION_UPDATED: "Session updated",
  };

  return (
    labels[type] ??
    type
      .replace(/^NEW_/, "")
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
};

export const priorityLabel = (priority: Notification["priority"]) =>
  priority.toLowerCase().replace(/^\w/, (match) => match.toUpperCase());

export const notificationsFallbackHref: Href =
  "/(app)/(tabs)/(home)/notifications";

const safeSegment = (value: string | undefined) => {
  const trimmed = value?.trim();
  if (
    !trimmed ||
    trimmed.includes("/") ||
    trimmed.includes("?") ||
    trimmed.includes("#")
  ) {
    return undefined;
  }
  return trimmed;
};

export const notificationHrefFromActionUrl = (
  rawActionUrl: string | undefined,
): Href | undefined => {
  const actionUrl = rawActionUrl?.trim();
  if (!actionUrl || !actionUrl.startsWith("/") || actionUrl.startsWith("//")) {
    return undefined;
  }

  const [path] = actionUrl.split("?");
  const parts = path.split("/").filter(Boolean);

  if (parts[0] === "events" && parts.length === 2) {
    const slug = safeSegment(parts[1]);
    return slug
      ? { pathname: "/(app)/(tabs)/(home)/events/[slug]", params: { slug } }
      : undefined;
  }

  if (parts[0] === "chika" && parts.length === 2) {
    const slug = safeSegment(parts[1]);
    return slug
      ? { pathname: "/(app)/(tabs)/chika/[slug]", params: { slug } }
      : undefined;
  }

  if (parts[0] === "explore" && parts[1] === "sites" && parts.length === 3) {
    const slug = safeSegment(parts[2]);
    return slug
      ? {
          pathname: "/(app)/(tabs)/(home)/explore/[slug]",
          params: { slug },
        }
      : undefined;
  }

  if (parts[0] === "profile" && parts.length === 2) {
    const username = safeSegment(parts[1]);
    return username
      ? {
          pathname: "/(app)/(tabs)/(home)/profile/[username]",
          params: { username },
        }
      : undefined;
  }

  if (parts[0] === "buddies" && parts.length === 1) {
    return "/(app)/(tabs)/(home)/buddies";
  }

  return undefined;
};

export const notificationHref = (
  notification: Notification,
): Href | undefined => notificationHrefFromActionUrl(notification.actionUrl);

export const notificationTitle = (notification: Notification) =>
  notification.title?.trim() || notificationTypeLabel(notification.type);

export const notificationMessage = (notification: Notification) =>
  notification.message?.trim() || "You have a new community update.";
