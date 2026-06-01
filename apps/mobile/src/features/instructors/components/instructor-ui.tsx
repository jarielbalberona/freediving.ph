import { Text, View } from "react-native";
import type {
  InstructorAgency,
  InstructorCertification,
  InstructorCertificationVerificationStatus,
  InstructorVerificationStatus,
} from "@freediving.ph/types";

import { StatusPill } from "@/components/social";

export const instructorStatusLabels: Record<
  InstructorVerificationStatus | "none",
  string
> = {
  draft: "Draft",
  none: "Not applied",
  pending: "Under review",
  rejected: "Needs changes",
  suspended: "Suspended",
  verified: "Verified",
};

export const certificationStatusLabels: Record<
  InstructorCertificationVerificationStatus,
  string
> = {
  pending: "Pending review",
  rejected: "Rejected",
  verified: "Verified",
};

export const instructorAgencyLabels: Record<InstructorAgency, string> = {
  aida: "AIDA",
  apnea_academy: "Apnea Academy",
  molchanovs: "Molchanovs",
  other: "Other",
  padi: "PADI",
  raid: "RAID",
  ssi: "SSI",
};

export const instructorAgencyOptions = Object.entries(
  instructorAgencyLabels,
) as Array<[InstructorAgency, string]>;

export const safeSegment = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed &&
    !trimmed.includes("/") &&
    !trimmed.includes("?") &&
    !trimmed.includes("#")
    ? trimmed
    : undefined;
};

export const hasStructuredLocation = (value: {
  barangayCode?: string;
  cityCode?: string;
  provinceCode?: string;
  regionCode?: string;
}) =>
  Boolean(
    value.regionCode?.trim() ||
      value.provinceCode?.trim() ||
      value.cityCode?.trim() ||
      value.barangayCode?.trim(),
  );

export function CertificationRow({
  certification,
}: {
  certification: InstructorCertification;
}) {
  return (
    <View className="gap-2 rounded-2xl border border-border bg-card p-3">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text className="font-semibold text-foreground">
          {certification.agency === "other"
            ? certification.agencyOtherName || "Other"
            : instructorAgencyLabels[certification.agency]}{" "}
          {certification.certificationLevel}
        </Text>
        <StatusPill>
          {certificationStatusLabels[certification.verificationStatus]}
        </StatusPill>
      </View>
      <Text className="text-sm text-muted-foreground">
        {certification.certificationNumber || "No certification number"}
      </Text>
      <Text className="text-sm text-muted-foreground">
        Issued {certification.issuedAt || "not provided"}
        {certification.expiresAt ? ` · Expires ${certification.expiresAt}` : ""}
      </Text>
      {certification.officialVerificationUrl ? (
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
          {certification.officialVerificationUrl}
        </Text>
      ) : null}
      {certification.proofMediaId ? (
        <Text className="text-sm text-muted-foreground">Proof uploaded</Text>
      ) : null}
    </View>
  );
}
