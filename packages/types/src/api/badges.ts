export type BadgeCategory =
  | "personal_best"
  | "certification"
  | "experience"
  | "auto_stat";

export type BadgeValueType = "time" | "distance" | "number" | "text" | "none";

export type BadgeVerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

export type BadgeTemplate = {
  id: string;
  slug: string;
  name: string;
  category: BadgeCategory;
  valueType: BadgeValueType;
  unit?: string;
  icon?: string;
  description?: string;
  isSystem: boolean;
};

export type UserBadge = {
  id: string;
  template: BadgeTemplate;
  valueText?: string;
  valueNumber?: number;
  valueMinutes?: number;
  valueSeconds?: number;
  displayValue?: string;
  referenceLabel?: string;
  referenceValue?: string;
  proofMediaId?: string;
  proofMediaObjectKey?: string;
  verificationStatus: BadgeVerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  isSystemVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProfileBadgesResponse = {
  templates?: BadgeTemplate[];
  badges: UserBadge[];
  autoStats: UserBadge[];
};

export type UserBadgeResponse = {
  badge: UserBadge;
};

export type UpsertUserBadgeRequest = {
  badgeTemplateId: string;
  valueText?: string;
  valueNumber?: number;
  valueMinutes?: number;
  valueSeconds?: number;
  referenceLabel?: string;
  referenceValue?: string;
  proofMediaId?: string;
};
