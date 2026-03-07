const REMOVED_PATTERNS = [
  "removed by moderator",
  "deleted user content",
  "deleted by sender",
];

export const isRemovedContent = (value: string | null | undefined) => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return REMOVED_PATTERNS.some((pattern) => normalized.includes(pattern));
};

export const getRemovedContentLabel = (value: string | null | undefined) => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized.includes("removed by moderator")) return "Removed by moderator";
  if (normalized.includes("deleted by sender")) return "Deleted by sender";
  if (normalized.includes("deleted user content")) return "Deleted user content";
  return null;
};
