import type { ReportReasonCode } from "./reports";

export * from "./api/authz";
export * from "./api/error";
export * from "./api/me";
export * from "./api/profile";
export * from "./api/public-profile";
export * from "./feed";
export * from "./media";
export * from "./reports";

export interface ApiEnvelope<T> {
  status: number;
  message: string;
  data: T;
}

export interface PaginationMeta {
  totalItems: number;
  limit: number;
  offset: number;
  currentPage: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export interface PaginatedApiEnvelope<T> extends ApiEnvelope<T> {
  pagination: PaginationMeta;
}

export interface ThreadDto {
  id: number;
  userId: number;
  title: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ThreadAuthorDto {
  id: number;
  username: string;
  email?: string | null;
  alias?: string | null;
}

export interface ThreadWithUserDto {
  thread: ThreadDto;
  user: ThreadAuthorDto;
  commentCount: number;
  upvotes: number;
  downvotes: number;
}

export interface ThreadCommentDto {
  comment: {
    id: number;
    threadId: number;
    userId: number;
    parentId: number | null;
    content: string;
    createdAt: string;
    updatedAt: string;
  };
  user: {
    id: number;
    username: string;
    alias?: string | null;
  };
}

export type ThreadWithUser = ThreadWithUserDto;
export type ThreadComment = ThreadCommentDto;

export interface ChikaThreadResponse {
  id: string;
  title: string;
  content: string;
  voteCount: number;
  commentCount: number;
  userReaction?: "upvote" | "downvote";
  mode: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  categoryPseudonymous: boolean;
  authorDisplayName: string;
  realAuthorUserId?: string;
  isHidden: boolean;
  hiddenAt?: string;
  hiddenReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChikaCommentResponse {
  id: string;
  threadId: string;
  parentCommentId?: string;
  voteCount: number;
  replyCount: number;
  userReaction?: "upvote" | "downvote";
  authorDisplayName: string;
  authorAvatarUrl?: string;
  realAuthorUserId?: string;
  content: string;
  isHidden: boolean;
  hiddenAt?: string;
  hiddenReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChikaCategoryResponse {
  id: string;
  slug: string;
  name: string;
  pseudonymous: boolean;
}

export interface ChikaThreadListResponse {
  items: ChikaThreadResponse[];
  pagination: { limit: number; offset: number };
  nextCursor?: string;
}

export interface ChikaCommentListResponse {
  items: ChikaCommentResponse[];
  pagination: { limit: number; offset: number };
  nextCursor?: string;
}

export interface ChikaCategoryListResponse {
  items: ChikaCategoryResponse[];
}

export interface Thread {
  id: number;
  title: string;
  content: string;
  author: {
    id: number;
    username: string | null;
    alias: string | null;
  };
  tags: string[];
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateThreadData {
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdateThreadData {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface ThreadFilters {
  search?: string;
  authorId?: number;
  sortBy?: "newest" | "oldest" | "most_liked" | "most_commented";
}

export interface DiveSpot {
  id: number;
  name: string;
  lat?: number;
  lng?: number;
  locationName?: string;
  depth?: number;
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  visibility?: "POOR" | "FAIR" | "GOOD" | "EXCELLENT";
  current?: "NONE" | "LIGHT" | "MODERATE" | "STRONG";
  isVerified?: boolean;
  description?: string;
  bestSeason?: string;
  imageUrl?: string;
  directions?: string;
  avgRating?: number;
  ratingCount?: number;
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiveSpotReview {
  id: number;
  diveSpotId: number;
  userId: number;
  userName?: string | null;
  userAlias?: string | null;
  userImage?: string | null;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiveSpotReviewSummary {
  diveSpotId: number;
  avgRating: number;
  ratingCount: number;
  commentCount: number;
}

export interface CreateDiveSpotRequest {
  name: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  depth: number;
  visibility: "POOR" | "FAIR" | "GOOD" | "EXCELLENT";
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  waterType: "FRESH" | "SALT" | "BRACKISH";
  temperature: number;
  current: "NONE" | "LIGHT" | "MODERATE" | "STRONG";
  entryType: "SHORE" | "BOAT" | "PLATFORM" | "LADDER";
  facilities: string[];
  restrictions: string[];
  bestTime: string;
  imageUrl?: string;
  isPublic: boolean;
}

export interface UpdateDiveSpotRequest {
  name?: string;
  description?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  depth?: number;
  visibility?: "POOR" | "FAIR" | "GOOD" | "EXCELLENT";
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  waterType?: "FRESH" | "SALT" | "BRACKISH";
  temperature?: number;
  current?: "NONE" | "LIGHT" | "MODERATE" | "STRONG";
  entryType?: "SHORE" | "BOAT" | "PLATFORM" | "LADDER";
  facilities?: string[];
  restrictions?: string[];
  bestTime?: string;
  imageUrl?: string;
  isPublic?: boolean;
}

export interface CreateDiveSpotReviewRequest {
  rating: number;
  comment?: string;
}

export interface DiveSpotFilters {
  page?: number;
  limit?: number;
  offset?: number;
  location?: string;
  minDepth?: number;
  maxDepth?: number;
  visibility?: "POOR" | "FAIR" | "GOOD" | "EXCELLENT";
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  waterType?: "FRESH" | "SALT" | "BRACKISH";
  current?: "NONE" | "LIGHT" | "MODERATE" | "STRONG";
  entryType?: "SHORE" | "BOAT" | "PLATFORM" | "LADDER";
  search?: string;
  isPublic?: boolean;
  isVerified?: boolean;
  latitude?: number;
  longitude?: number;
  radius?: number;
  north?: number;
  south?: number;
  east?: number;
  west?: number;
  shape?: "map" | "list";
  sort?: "newest" | "oldest" | "name";
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  locationName?: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  regionCode?: string;
  provinceCode?: string;
  cityCode?: string;
  barangayCode?: string;
  locationSource?: "manual" | "google_places" | "psgc_mapped" | "unmapped";
  startsAt?: string;
  endsAt?: string;
  maxAttendees?: number;
  currentAttendees: number;
  status: "draft" | "published" | "cancelled" | "completed";
  visibility: "public" | "group_members" | "invite_only";
  type: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  organizerUserId?: string;
  groupId?: string;
  viewerJoined: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventAttendee {
  eventId: string;
  userId: string;
  role: "attendee" | "staff" | "organizer";
  status: "active" | "invited" | "blocked";
  joinedAt?: string;
  notes?: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  location?: string;
  locationName?: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  regionCode?: string;
  provinceCode?: string;
  cityCode?: string;
  barangayCode?: string;
  locationSource?: "manual" | "google_places" | "psgc_mapped" | "unmapped";
  startsAt?: string;
  endsAt?: string;
  maxAttendees?: number;
  status?: "draft" | "published" | "cancelled" | "completed";
  visibility?: "public" | "group_members" | "invite_only";
  type?: string;
  difficulty?: "beginner" | "intermediate" | "advanced" | "expert";
  groupId?: string;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  location?: string;
  locationName?: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  regionCode?: string;
  provinceCode?: string;
  cityCode?: string;
  barangayCode?: string;
  locationSource?: "manual" | "google_places" | "psgc_mapped" | "unmapped";
  startsAt?: string;
  endsAt?: string;
  maxAttendees?: number;
  status?: "draft" | "published" | "cancelled" | "completed";
  visibility?: "public" | "group_members" | "invite_only";
  type?: string;
  difficulty?: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface JoinEventRequest {
  eventId: string;
  notes?: string;
}

export interface EventFilters {
  page?: number;
  limit?: number;
  status?: "draft" | "published" | "cancelled" | "completed";
  search?: string;
  groupId?: string;
}

export interface Group {
  id: string;
  name: string;
  slug: string;
  description?: string;
  visibility: "public" | "private" | "invite_only";
  status: "active" | "archived" | "deleted";
  joinPolicy: "open" | "approval" | "invite_only";
  memberCount: number;
  eventCount: number;
  postCount: number;
  location?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  role: "owner" | "moderator" | "member";
  status: "active" | "invited" | "blocked";
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface GroupPost {
  id: string;
  groupId: string;
  authorUserId: string;
  title?: string;
  content: string;
  status: "active" | "hidden" | "deleted";
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  authorName?: string;
  authorUsername?: string;
  authorAvatarUrl?: string;
}

export interface CreateGroupRequest {
  name: string;
  slug?: string;
  description?: string;
  visibility?: "public" | "private" | "invite_only";
  joinPolicy?: "open" | "approval" | "invite_only";
  location?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  visibility?: "public" | "private" | "invite_only";
  status?: "active" | "archived" | "deleted";
  joinPolicy?: "open" | "approval" | "invite_only";
  location?: string;
}

export interface JoinGroupRequest {
  groupId: string;
}

export interface CreateGroupPostRequest {
  groupId: string;
  title?: string;
  content: string;
}

export interface GroupFilters {
  page?: number;
  limit?: number;
  visibility?: "public" | "private" | "invite_only";
  search?: string;
  mine?: boolean;
}

export interface Media {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  caption?: string;
  tags?: string[];
  category: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO" | "OTHER";
  uploadedBy: number;
  uploadedByName: string;
  isPublic: boolean;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
    quality?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateMediaRequest {
  file: File;
  altText?: string;
  caption?: string;
  tags?: string[];
  category: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO" | "OTHER";
  isPublic: boolean;
}

export interface UpdateMediaRequest {
  altText?: string;
  caption?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface PresignedUrlRequest {
  username: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export interface MediaFilters {
  page?: number;
  limit?: number;
  category?: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO" | "OTHER";
  uploadedBy?: number;
  isPublic?: boolean;
  search?: string;
  tags?: string[];
}

export type MessagingThreadCategory = "primary" | "transactions" | "requests";
export type MessagingThreadType = "direct";
export type MessagingThreadMessageKind = "text" | "system";

export interface MessagingThreadParticipant {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export interface MessagingThreadMessage {
  id: string;
  threadId: string;
  senderUserId: string;
  kind: MessagingThreadMessageKind;
  body: string;
  createdAt: string;
  clientId?: string;
  isOwn: boolean;
  status?: "sent" | "pending" | "failed";
}

export interface MessagingThreadSummary {
  id: string;
  type: MessagingThreadType;
  category: MessagingThreadCategory;
  participant: MessagingThreadParticipant;
  lastMessage?: MessagingThreadMessage;
  lastMessageAt: string;
  unreadCount: number;
  hasUnread: boolean;
  activeRequest: boolean;
}

export interface MessagingThreadListResponse {
  items: MessagingThreadSummary[];
  nextCursor?: string;
}

export interface MessagingThreadDetailResponse {
  id: string;
  type: MessagingThreadType;
  participants: MessagingThreadParticipant[];
  category: MessagingThreadCategory;
  createdAt: string;
  lastReadMessageId?: string;
  canSend: boolean;
}

export interface MessagingThreadMessagesResponse {
  items: MessagingThreadMessage[];
  nextCursor?: string;
}

export interface MessagingOpenDirectThreadRequest {
  targetUserId: string;
}

export interface MessagingSendMessageRequest {
  body: string;
  clientId?: string;
}

export interface MessagingSendMessageResponse {
  message: MessagingThreadMessage;
}

export interface MessagingMarkReadRequest {
  lastReadMessageId: string;
}

export interface MessagingMarkReadResponse {
  threadId: string;
  marked: boolean;
}

export interface MessagingUpdateThreadCategoryRequest {
  category: "primary" | "transactions";
}

export interface MessagingUpdateThreadCategoryResponse {
  threadId: string;
  category: "primary" | "transactions";
  updated: boolean;
}

export type MessagingRealtimeEnvelope<T = unknown> = {
  v: 1;
  type: "message.created" | "thread.updated" | "thread.read";
  ts: string;
  eventId?: string;
  requestId?: string;
  payload: T;
};

export type ChikaRealtimeEventType =
  | "chika.thread.created"
  | "chika.thread.updated"
  | "chika.thread.deleted"
  | "chika.thread.reaction.updated"
  | "chika.comment.created"
  | "chika.comment.updated"
  | "chika.comment.deleted"
  | "chika.comment.reaction.updated";

export type ChikaRealtimeEnvelope<T = unknown> = {
  v: 1;
  type: ChikaRealtimeEventType;
  ts: string;
  eventId?: string;
  requestId?: string;
  payload: T;
};

export interface Notification {
  id: number;
  userId: string;
  type:
    | "SYSTEM"
    | "MESSAGE"
    | "EVENT"
    | "GROUP"
    | "SERVICE"
    | "BOOKING"
    | "REVIEW"
    | "MENTION"
    | "LIKE"
    | "COMMENT"
    | "FRIEND_REQUEST"
    | "GROUP_INVITE"
    | "EVENT_REMINDER"
    | "PAYMENT"
    | "SECURITY";
  title: string;
  message: string;
  status: "UNREAD" | "READ" | "ARCHIVED" | "DELETED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  relatedUserId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  imageUrl?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  isEmailSent: boolean;
  isPushSent: boolean;
  emailSentAt?: string;
  pushSentAt?: string;
  readAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  id: string;
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  systemNotifications: boolean;
  messageNotifications: boolean;
  eventNotifications: boolean;
  groupNotifications: boolean;
  serviceNotifications: boolean;
  bookingNotifications: boolean;
  reviewNotifications: boolean;
  mentionNotifications: boolean;
  likeNotifications: boolean;
  commentNotifications: boolean;
  friendRequestNotifications: boolean;
  groupInviteNotifications: boolean;
  eventReminderNotifications: boolean;
  paymentNotifications: boolean;
  securityNotifications: boolean;
  digestFrequency: "IMMEDIATE" | "DAILY" | "WEEKLY" | "NEVER";
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  archived: number;
}

export interface CreateNotificationRequest {
  userId: string;
  type: Notification["type"];
  title: string;
  message: string;
  priority?: Notification["priority"];
  relatedUserId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  imageUrl?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface UpdateNotificationRequest {
  status?: Notification["status"];
  readAt?: string;
  archivedAt?: string;
}

export interface UpdateNotificationSettingsRequest {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  systemNotifications?: boolean;
  messageNotifications?: boolean;
  eventNotifications?: boolean;
  groupNotifications?: boolean;
  serviceNotifications?: boolean;
  bookingNotifications?: boolean;
  reviewNotifications?: boolean;
  mentionNotifications?: boolean;
  likeNotifications?: boolean;
  commentNotifications?: boolean;
  friendRequestNotifications?: boolean;
  groupInviteNotifications?: boolean;
  eventReminderNotifications?: boolean;
  paymentNotifications?: boolean;
  securityNotifications?: boolean;
  digestFrequency?: NotificationSettings["digestFrequency"];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  offset?: number;
  status?: Notification["status"];
  type?: Notification["type"];
  priority?: Notification["priority"];
}

export type BuddyRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled";

export interface BuddyRequest {
  id: string;
  requesterUserId: string;
  targetUserId: string;
  status: BuddyRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BuddyProfile {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export interface IncomingBuddyRequest {
  request: BuddyRequest;
  requester: BuddyProfile;
}

export interface OutgoingBuddyRequest {
  request: BuddyRequest;
  target: BuddyProfile;
}

export interface BuddyRequestsResponse {
  items: IncomingBuddyRequest[] | OutgoingBuddyRequest[];
}

export interface IncomingBuddyRequestsResponse {
  items: IncomingBuddyRequest[];
}

export interface OutgoingBuddyRequestsResponse {
  items: OutgoingBuddyRequest[];
}

export interface BuddyListResponse {
  items: BuddyProfile[];
}

export interface BuddyPreviewResponse {
  count: number;
  items: BuddyProfile[];
}

export interface CompetitiveRecord {
  id: number;
  athleteName: string;
  discipline: string;
  resultValue: string;
  resultUnit: string;
  eventName: string;
  eventDate: string;
  sourceUrl?: string | null;
  verificationState: "UNVERIFIED" | "VERIFIED" | "REJECTED";
  verificationNote?: string | null;
}

export interface CreateCompetitiveRecordRequest {
  athleteName: string;
  discipline: string;
  resultValue: string;
  resultUnit: string;
  eventName: string;
  eventDate: string;
  sourceUrl?: string;
}

export interface CompetitiveRecordFilters {
  discipline?: string;
  athlete?: string;
  eventName?: string;
  limit?: number;
  offset?: number;
}

export interface TrainingLogSession {
  id: number;
  userId: number;
  title: string;
  notes?: string | null;
  sessionDate: string;
  visibility: "PRIVATE" | "BUDDIES_ONLY" | "PUBLIC";
}

export interface CreateTrainingLogRequest {
  title: string;
  notes?: string;
  sessionDate: string;
  visibility?: "PRIVATE" | "BUDDIES_ONLY" | "PUBLIC";
  metrics?: Array<{
    metricKey: string;
    metricValue: string;
    metricUnit?: string;
  }>;
}

export interface SafetyPage {
  id: number;
  slug: string;
  title: string;
  content: string;
  isPublished: number;
  lastReviewedAt?: string | null;
}

export interface SafetyContact {
  id: number;
  region: string;
  label: string;
  phone: string;
  source: string;
  isPublished: number;
}

export interface AwarenessPost {
  id: number;
  title: string;
  body: string;
  topicType: "REMINDER" | "ETIQUETTE" | "ADVISORY" | "TOURISM_NOTE";
  sourceUrl?: string | null;
  isPublished: number;
}

export interface MarketplaceListing {
  id: number;
  sellerUserId: number;
  item: string;
  condition: string;
  price: string;
  region: string;
  description?: string | null;
  photos?: string[] | null;
  state: "ACTIVE" | "FLAGGED" | "REMOVED";
}

export interface CollaborationPost {
  id: number;
  authorUserId: number;
  postType: "LOOKING_FOR" | "OFFERING";
  title: string;
  body: string;
  region?: string | null;
  specialty?: string | null;
  isActive: number;
}

export interface User {
  id: number;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  bio?: string;
  avatar?: string;
  location?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  experience: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  certifications: string[];
  specialties: string[];
  isActive: boolean;
  isVerified: boolean;
  role: "USER" | "EDITOR" | "ADMINISTRATOR";
  preferences: {
    notifications: boolean;
    emailUpdates: boolean;
    publicProfile: boolean;
    locationSharing: boolean;
  };
  stats: {
    totalDives: number;
    maxDepth: number;
    totalTime: number;
    favoriteSpots: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: number;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  bio?: string;
  avatar?: string;
  location?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  experience: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  certifications: string[];
  specialties: string[];
  isActive: boolean;
  isVerified: boolean;
  role: "USER" | "EDITOR" | "ADMINISTRATOR";
  preferences: {
    notifications: boolean;
    emailUpdates: boolean;
    publicProfile: boolean;
    locationSharing: boolean;
  };
  stats: {
    totalDives: number;
    maxDepth: number;
    totalTime: number;
    favoriteSpots: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string;
  avatar?: string;
  location?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  experience?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  certifications?: string[];
  specialties?: string[];
  preferences?: {
    notifications?: boolean;
    emailUpdates?: boolean;
    publicProfile?: boolean;
    locationSharing?: boolean;
  };
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  location?: string;
  experience?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  role?: "USER" | "EDITOR" | "ADMINISTRATOR";
  isActive?: boolean;
  isVerified?: boolean;
}

export interface UserService {
  id: number;
  title: string;
  description: string;
  category:
    | "INSTRUCTION"
    | "EQUIPMENT"
    | "GUIDE"
    | "PHOTOGRAPHY"
    | "TRANSPORT"
    | "OTHER";
  price: number;
  currency: string;
  location: string;
  availability: "AVAILABLE" | "BUSY" | "UNAVAILABLE";
  rating: number;
  reviewCount: number;
  providerId: number;
  providerName: string;
  providerEmail: string;
  providerPhone?: string;
  imageUrl?: string;
  tags?: string[];
  requirements?: string;
  duration?: string;
  maxParticipants?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceBooking {
  id: number;
  serviceId: number;
  userId: number;
  userName: string;
  userEmail: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  bookingDate: string;
  notes?: string;
  totalPrice: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceReview {
  id: number;
  serviceId: number;
  userId: number;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequest {
  title: string;
  description: string;
  category:
    | "INSTRUCTION"
    | "EQUIPMENT"
    | "GUIDE"
    | "PHOTOGRAPHY"
    | "TRANSPORT"
    | "OTHER";
  price: number;
  currency: string;
  location: string;
  imageUrl?: string;
  tags?: string[];
  requirements?: string;
  duration?: string;
  maxParticipants?: number;
}

export interface UpdateServiceRequest {
  title?: string;
  description?: string;
  category?:
    | "INSTRUCTION"
    | "EQUIPMENT"
    | "GUIDE"
    | "PHOTOGRAPHY"
    | "TRANSPORT"
    | "OTHER";
  price?: number;
  currency?: string;
  location?: string;
  availability?: "AVAILABLE" | "BUSY" | "UNAVAILABLE";
  imageUrl?: string;
  tags?: string[];
  requirements?: string;
  duration?: string;
  maxParticipants?: number;
  isActive?: boolean;
}

export interface CreateBookingRequest {
  serviceId: number;
  userId: number;
  bookingDate: string;
  notes?: string;
}

export interface UpdateBookingStatusRequest {
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
}

export interface CreateReviewRequest {
  serviceId: number;
  userId: number;
  rating: number;
  comment?: string;
}

export interface ServiceFilters {
  page?: number;
  limit?: number;
  category?:
    | "INSTRUCTION"
    | "EQUIPMENT"
    | "GUIDE"
    | "PHOTOGRAPHY"
    | "TRANSPORT"
    | "OTHER";
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: "AVAILABLE" | "BUSY" | "UNAVAILABLE";
  search?: string;
  providerId?: number;
  isActive?: boolean;
}

export type ExploreSiteCard = {
  id: string;
  slug: string;
  name: string;
  area: string;
  latitude?: number;
  longitude?: number;
  difficulty: "easy" | "moderate" | "hard";
  depthMinM?: number;
  depthMaxM?: number;
  hazards: string[];
  verificationStatus: "community" | "instructor" | "moderator" | "verified";
  lastUpdatedAt: string;
  recentUpdateCount: number;
  lastConditionSummary?: string;
  isSaved: boolean;
};

export type ExploreSiteUpdate = {
  id: string;
  diveSiteId: string;
  authorAppUserId: string;
  authorDisplayName: string;
  authorTrust: ExploreTrustCard;
  note: string;
  conditionVisibilityM?: number;
  conditionCurrent?: "none" | "mild" | "strong";
  conditionWaves?: "calm" | "moderate" | "rough";
  conditionTempC?: number;
  occurredAt: string;
  createdAt: string;
};

export type ExploreTrustCard = {
  emailVerified: boolean;
  phoneVerified: boolean;
  certLevel?: string;
  buddyCount: number;
  reportCount: number;
};

export type ExploreSiteDetail = {
  id: string;
  slug: string;
  name: string;
  area: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  difficulty: "easy" | "moderate" | "hard";
  depthMinM?: number;
  depthMaxM?: number;
  hazards: string[];
  bestSeason?: string;
  typicalConditions?: string;
  access?: string;
  fees?: string;
  contactInfo?: string;
  verificationStatus: "community" | "instructor" | "moderator" | "verified";
  verifiedByUserId?: string;
  verifiedByDisplayName?: string;
  lastUpdatedAt: string;
  createdAt: string;
  reportCount: number;
  lastConditionSummary?: string;
};

export type ExploreListResponse = {
  items: ExploreSiteCard[];
  nextCursor?: string;
};

export type ExploreSiteDetailResponse = {
  site: ExploreSiteDetail;
  updates: ExploreSiteUpdate[];
  nextUpdatesCursor?: string;
};

export type ExploreLatestUpdate = {
  id: string;
  diveSiteId: string;
  siteSlug: string;
  siteName: string;
  siteArea: string;
  authorAppUserId: string;
  authorDisplayName: string;
  authorTrust: ExploreTrustCard;
  note: string;
  conditionVisibilityM?: number;
  conditionCurrent?: "none" | "mild" | "strong";
  conditionWaves?: "calm" | "moderate" | "rough";
  conditionTempC?: number;
  occurredAt: string;
  createdAt: string;
};

export type ExploreLatestUpdatesResponse = {
  items: ExploreLatestUpdate[];
  nextCursor?: string;
};

export type CreateExploreSiteUpdateRequest = {
  note: string;
  conditionVisibilityM?: number;
  conditionCurrent?: "none" | "mild" | "strong";
  conditionWaves?: "calm" | "moderate" | "rough";
  conditionTempC?: number;
  occurredAt?: string;
};

export type ExploreSiteModerationState = "approved" | "pending" | "hidden";

export type CreateExploreSiteSubmissionRequest = {
  name: string;
  lat: number;
  lng: number;
  description: string;
  entryDifficulty: "easy" | "moderate" | "hard";
  depthMinM?: number;
  depthMaxM?: number;
  hazards?: string[];
  bestSeason?: string;
  typicalConditions?: string;
  access?: string;
  fees?: string;
};

export type ModerateExploreSiteRequest = {
  reason?: string;
};

export type ExploreSiteSubmission = {
  id: string;
  slug: string;
  name: string;
  area: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  difficulty: "easy" | "moderate" | "hard";
  depthMinM?: number;
  depthMaxM?: number;
  hazards: string[];
  bestSeason?: string;
  typicalConditions?: string;
  access?: string;
  fees?: string;
  verificationStatus: "community" | "instructor" | "moderator" | "verified";
  submittedByAppUserId?: string;
  submittedByDisplayName?: string;
  reviewedByAppUserId?: string;
  reviewedByDisplayName?: string;
  reviewedAt?: string;
  moderationReason?: string;
  moderationState: ExploreSiteModerationState;
  lastUpdatedAt: string;
  updatedAt: string;
  createdAt: string;
};

export type ExploreSiteSubmissionResponse = {
  submission: ExploreSiteSubmission;
};

export type ExploreSiteSubmissionListResponse = {
  items: ExploreSiteSubmission[];
  nextCursor?: string;
};

export type BuddyFinderPreviewIntent = {
  id: string;
  diveSiteId?: string;
  area: string;
  intentType: "training" | "fun_dive" | "depth" | "pool" | "line_training";
  timeWindow: "today" | "weekend" | "specific_date";
  dateStart?: string;
  dateEnd?: string;
  notePreview?: string;
  createdAt: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  certLevel?: string;
  buddyCount: number;
  reportCount: number;
  mutualBuddiesCount: number;
};

export type BuddyFinderPreviewResponse = {
  area: string;
  count: number;
  items: BuddyFinderPreviewIntent[];
};

export type BuddyFinderIntent = {
  id: string;
  authorAppUserId: string;
  diveSiteId?: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  homeArea: string;
  area: string;
  intentType: "training" | "fun_dive" | "depth" | "pool" | "line_training";
  timeWindow: "today" | "weekend" | "specific_date";
  dateStart?: string;
  dateEnd?: string;
  note?: string;
  createdAt: string;
  expiresAt: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  certLevel?: string;
  buddyCount: number;
  reportCount: number;
  mutualBuddiesCount: number;
};

export type BuddyFinderListResponse = {
  items: BuddyFinderIntent[];
  nextCursor?: string;
};

export type CreateBuddyFinderIntentRequest = {
  diveSiteId?: string;
  area?: string;
  intentType: "training" | "fun_dive" | "depth" | "pool" | "line_training";
  timeWindow: "today" | "weekend" | "specific_date";
  dateStart?: string;
  dateEnd?: string;
  note?: string;
};

export type BuddyFinderIntentResponse = {
  intent: {
    id: string;
    diveSiteId?: string;
    area: string;
    intentType: "training" | "fun_dive" | "depth" | "pool" | "line_training";
    timeWindow: "today" | "weekend" | "specific_date";
    dateStart?: string;
    dateEnd?: string;
    note?: string;
    createdAt: string;
    expiresAt: string;
  };
};

export type BuddyFinderMessageEntryResponse = {
  intentId: string;
  recipientUserId: string;
  requiresRequest: boolean;
};

export type BuddyFinderSharePreview = {
  id: string;
  diveSiteId?: string;
  diveSiteName?: string;
  area: string;
  intentType: "training" | "fun_dive" | "depth" | "pool" | "line_training";
  timeWindow: "today" | "weekend" | "specific_date";
  dateStart?: string;
  dateEnd?: string;
  notePreview?: string;
  createdAt: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  certLevel?: string;
  buddyCount: number;
  reportCount: number;
};

export type BuddyFinderSharePreviewResponse = {
  intent: BuddyFinderSharePreview;
};

export type ExploreSiteBuddySourceBreakdown = {
  siteLinkedCount: number;
  areaFallbackCount: number;
};

export type ExploreSiteBuddyPreviewResponse = {
  items: BuddyFinderPreviewIntent[];
  sourceBreakdown: ExploreSiteBuddySourceBreakdown;
};

export type ExploreSiteBuddyIntentsResponse = {
  items: BuddyFinderIntent[];
  nextCursor?: string;
  sourceBreakdown: ExploreSiteBuddySourceBreakdown;
};

export type SaveUserResponse = {
  saved: boolean;
};
