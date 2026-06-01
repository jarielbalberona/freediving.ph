import type { Profile } from "@freediving.ph/types";

export type ProfileSetupStatus = {
  hasDisplayName: boolean;
  hasHomeArea: boolean;
  isComplete: boolean;
};

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

export function getProfileSetupStatus(
  profile: Pick<Profile, "displayName" | "homeArea" | "location"> | null | undefined,
): ProfileSetupStatus {
  const hasDisplayName = hasText(profile?.displayName);
  const hasHomeArea = hasText(profile?.homeArea) || hasText(profile?.location);

  return {
    hasDisplayName,
    hasHomeArea,
    isComplete: hasDisplayName && hasHomeArea,
  };
}
