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

export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type BadgeSourceModule =
  | "profile"
  | "dive_map"
  | "courses"
  | "events"
  | "schools"
  | "system"
  | "admin";

export type UserBadgeSourceType =
  | "manual"
  | "profile"
  | "dive_map"
  | "course"
  | "event"
  | "school"
  | "system"
  | "admin";

export type UserBadgeVisibility = "public" | "private";

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
  displayOrder: number;
  rarity: BadgeRarity;
  isPublic: boolean;
  isRepeatable: boolean;
  sourceModule: BadgeSourceModule;
  metadataJson?: Record<string, unknown>;
};

export type UserBadge = {
  id: string;
  template: BadgeTemplate;
  templateSlug: string;
  name: string;
  category: BadgeCategory;
  valueType: BadgeValueType;
  valueText?: string;
  valueNumber?: number;
  valueMinutes?: number;
  valueSeconds?: number;
  displayValue?: string;
  formattedValue?: string;
  unit?: string;
  icon?: string;
  description?: string;
  referenceLabel?: string;
  referenceValue?: string;
  proofMediaId?: string;
  proofMediaObjectKey?: string;
  verificationStatus: BadgeVerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  isSystemVerified?: boolean;
  sourceType: UserBadgeSourceType;
  sourceId?: string;
  earnedAt?: string;
  visibility: UserBadgeVisibility;
  displayOrder: number;
  rarity: BadgeRarity;
  sourceModule: BadgeSourceModule;
  isAutoStat: boolean;
  metadataJson?: Record<string, unknown>;
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
  earnedAt?: string;
  visibility?: UserBadgeVisibility;
  displayOrder?: number;
  metadataJson?: Record<string, unknown>;
};
