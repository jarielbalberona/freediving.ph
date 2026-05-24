export const PRODUCT_EVENT_NAMES = [
  "session_started",
  "profile_completed",
  "dive_spot_saved",
  "dive_spot_submitted",
  "media_posted",
  "chika_thread_created",
  "event_joined",
  "event_interested",
  "course_booked",
  "message_sent",
  "group_joined",
  "instructor_application_submitted",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

type ProductEventParams = Record<string, string | number | boolean | null>;

const SENSITIVE_PARAM_PATTERN =
  /(id|email|username|name|content|body|message|metadata|slug|url)/i;

declare global {
  interface Window {
    gtag?: (
      command: "event",
      eventName: string,
      params?: Record<string, string | number | boolean>,
    ) => void;
  }
}

export function trackProductEvent(
  eventName: ProductEventName,
  params: ProductEventParams = {},
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  const safeParams = Object.fromEntries(
    Object.entries(params).filter(
      (entry): entry is [string, string | number | boolean] => {
        const [key, value] = entry;
        return (
          !SENSITIVE_PARAM_PATTERN.test(key) &&
          (typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean")
        );
      },
    ),
  );

  queueMicrotask(() => {
    try {
      window.gtag?.("event", eventName, {
        event_category: "product",
        ...safeParams,
      });
    } catch {
      // Analytics must never block the product path.
    }
  });
}
