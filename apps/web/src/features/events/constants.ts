import type {
  EventDifficulty,
  EventEntryType,
  EventType,
  EventVisibility,
} from "@freediving.ph/types";

export const eventTypeOptions: Array<{ value: EventType; label: string }> = [
  { value: "intro_session", label: "Intro session" },
  { value: "pool_training", label: "Pool training" },
  { value: "line_training", label: "Line training" },
  { value: "fun_dive", label: "Fun dive" },
  { value: "depth_training", label: "Depth training" },
  { value: "certification_course", label: "Certification course" },
  { value: "workshop", label: "Workshop" },
  { value: "competition", label: "Competition" },
  { value: "cleanup_dive", label: "Cleanup dive" },
  { value: "trip_retreat", label: "Trip/retreat" },
];

export const difficultyOptions: Array<{
  value: EventDifficulty;
  label: string;
}> = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

export const visibilityOptions: Array<{
  value: EventVisibility;
  label: string;
}> = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

export const entryTypeOptions: Array<{ value: EventEntryType; label: string }> =
  [
    { value: "shore", label: "Shore" },
    { value: "boat", label: "Boat" },
    { value: "pool", label: "Pool" },
    { value: "classroom_online", label: "Classroom/online" },
  ];

export function eventOptionLabel(value?: string) {
  const match = eventTypeOptions.find((option) => option.value === value);
  return match?.label ?? titleCase(value ?? "");
}

export function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
