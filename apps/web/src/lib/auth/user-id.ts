type UserLike = {
  id?: string | null;
  publicMetadata?: Record<string, unknown>;
  unsafeMetadata?: Record<string, unknown>;
} | null | undefined;

const parsePositiveInteger = (value: unknown): number | null => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const getNumericUserId = (user: UserLike): number | null => {
  if (!user) return null;

  return (
    parsePositiveInteger(user.publicMetadata?.userId) ??
    parsePositiveInteger(user.unsafeMetadata?.userId) ??
    parsePositiveInteger(user.id)
  );
};
