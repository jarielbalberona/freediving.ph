import type { Event, EventType } from "@freediving.ph/types";

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  certification_course: "Certification course",
  cleanup_dive: "Cleanup dive",
  competition: "Competition",
  depth_training: "Depth training",
  fun_dive: "Fun dive",
  intro_session: "Intro session",
  line_training: "Line training",
  pool_training: "Pool training",
  trip_retreat: "Trip/retreat",
  workshop: "Workshop",
};

export const safeEventSlug = (slug: string | undefined) => {
  const trimmed = slug?.trim();
  if (!trimmed || trimmed.includes("/") || trimmed.includes("?") || trimmed.includes("#")) {
    return undefined;
  }
  return trimmed;
};

export const titleCase = (value: string | undefined) =>
  (value ?? "")
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

export const eventTypeLabel = (type: Event["type"]) =>
  EVENT_TYPE_LABELS[type] ?? titleCase(type);

export const eventDifficultyLabel = (difficulty: Event["difficulty"] | undefined) =>
  titleCase(difficulty);

export const eventLocationLabel = (event: Event) => {
  if (event.diveSite) return `${event.diveSite.name} · ${event.diveSite.area}`;
  return (
    event.locationName?.trim() ||
    event.formattedAddress?.trim() ||
    event.location?.trim() ||
    "Location to be announced"
  );
};

export const eventPriceLabel = (event: Event) => {
  const mode = event.paymentMode ?? (event.isPaid ? "required" : "free");
  if (mode === "free") return "Free";
  if (event.priceAmount == null) {
    return mode === "optional" ? "Donation optional" : "Fee required";
  }
  const currency = event.currency || "PHP";
  let amount: string;
  try {
    amount = new Intl.NumberFormat("en-PH", {
      currency,
      maximumFractionDigits: 0,
      style: "currency",
    }).format(event.priceAmount);
  } catch {
    amount = `${currency} ${event.priceAmount}`;
  }
  return mode === "optional" ? `Donation ${amount}` : amount;
};

export const formatEventDate = (
  startsAt: string | undefined,
  endsAt: string | undefined,
  timezone: string | undefined,
) => {
  const start = startsAt ? new Date(startsAt) : null;
  const end = endsAt ? new Date(endsAt) : null;
  if (!start || Number.isNaN(start.getTime())) return "Schedule to be announced";

  const formatter = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone || "Asia/Manila",
  });

  if (!end || Number.isNaN(end.getTime())) return formatter.format(start);
  return `${formatter.format(start)} to ${formatter.format(end)}`;
};

export const stripMarkdownPreview = (value: string | undefined) =>
  (value ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const eventSummary = (event: Event) =>
  event.shortDescription?.trim() ||
  stripMarkdownPreview(event.descriptionMarkdown || event.description) ||
  "Event details will be shared by the organizer.";

export const safeImageUrl = (url: string | undefined) => {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return undefined;
  }
  return trimmed;
};
