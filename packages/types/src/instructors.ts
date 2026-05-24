import type { AdminPagination } from "./api/admin";

export type InstructorVerificationStatus =
  | "draft"
  | "pending"
  | "verified"
  | "rejected"
  | "suspended";

export type InstructorCertificationVerificationStatus =
  | "pending"
  | "verified"
  | "rejected";

export type InstructorAgency =
  | "molchanovs"
  | "padi"
  | "aida"
  | "ssi"
  | "raid"
  | "apnea_academy"
  | "other";

export interface InstructorProfile {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  teachingSince: string;
  homeLocationLabel: string;
  formattedAddress: string;
  regionCode: string;
  regionName: string;
  provinceCode: string;
  provinceName: string;
  cityCode: string;
  cityName: string;
  barangayCode: string;
  barangayName: string;
  locationSource: string;
  specialties: string;
  schoolAffiliation: string;
  websiteUrl: string;
  socialLinks: string;
  safetyCredentials: string;
  verificationStatus: InstructorVerificationStatus;
  verifiedAt: string;
  verifiedBy?: string;
  rejectionReason?: string;
  attestationAcceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstructorCertification {
  id: string;
  instructorProfileId: string;
  agency: InstructorAgency;
  agencyOtherName: string;
  certificationLevel: string;
  certificationNumber: string;
  issuedAt: string;
  expiresAt: string;
  proofMediaId?: string;
  officialVerificationUrl?: string;
  verificationStatus: InstructorCertificationVerificationStatus;
  verifiedAt: string;
  verifiedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ViewerInstructorStatus {
  status: InstructorVerificationStatus | "none";
  canCreateSchool: boolean;
  message: string;
  rejectionReason: string;
}

export interface InstructorApplication {
  profile: InstructorProfile | null;
  certifications: InstructorCertification[];
  viewerInstructorStatus: ViewerInstructorStatus;
}

export interface InstructorApplicationPayload {
  displayName: string;
  bio: string;
  teachingSince: string;
  homeLocationLabel: string;
  formattedAddress: string;
  regionCode: string;
  regionName: string;
  provinceCode: string;
  provinceName: string;
  cityCode: string;
  cityName: string;
  barangayCode: string;
  barangayName: string;
  locationSource: string;
  specialties: string;
  schoolAffiliation: string;
  websiteUrl: string;
  socialLinks: string;
  safetyCredentials: string;
}

export interface InstructorCertificationPayload {
  agency: InstructorAgency;
  agencyOtherName: string;
  certificationLevel: string;
  certificationNumber: string;
  issuedAt: string;
  expiresAt: string;
  proofMediaId: string;
  officialVerificationUrl: string;
}

export interface InstructorSubmitPayload {
  attestationAccepted: boolean;
}

export interface InstructorAdminReviewPayload {
  reason?: string;
}

export interface InstructorApplicationResponse {
  application: InstructorApplication;
}

export interface InstructorCertificationResponse {
  certification: InstructorCertification;
}

export interface InstructorCertificationProofUrlResponse {
  proof: {
    certificationId: string;
    proofMediaId: string;
    proofFileName: string;
    proofContentType: string;
    url: string;
    expiresAt: number;
  };
}

export interface AdminInstructorsResponse {
  items: InstructorApplication[];
  pagination: AdminPagination;
}
