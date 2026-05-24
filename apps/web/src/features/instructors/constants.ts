import type {
  InstructorAgency,
  InstructorCertificationVerificationStatus,
  InstructorVerificationStatus,
} from "@freediving.ph/types";

export const instructorStatusLabels: Record<
  InstructorVerificationStatus | "none",
  string
> = {
  none: "Not applied",
  draft: "Draft",
  pending: "Under review",
  verified: "Verified",
  rejected: "Needs changes",
  suspended: "Suspended",
};

export const certificationStatusLabels: Record<
  InstructorCertificationVerificationStatus,
  string
> = {
  pending: "Pending review",
  verified: "Verified",
  rejected: "Rejected",
};

export const instructorAgencyLabels: Record<InstructorAgency, string> = {
  molchanovs: "Molchanovs",
  padi: "PADI",
  aida: "AIDA",
  ssi: "SSI",
  raid: "RAID",
  apnea_academy: "Apnea Academy",
  other: "Other",
};

export const instructorAgencyOptions = Object.entries(
  instructorAgencyLabels,
).map(([value, label]) => ({ value, label }));
