import type { ReportReasonCode } from "./reports";

export * from "./api/authz";
export * from "./api/error";
export * from "./api/me";
export * from "./api/profile";
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
  authorDisplayName: string;
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
  sortBy?: 'newest' | 'oldest' | 'most_liked' | 'most_commented';
}

export interface DiveSpot {
  id: number;
  name: string;
  lat?: number;
  lng?: number;
  locationName?: string;
  depth?: number;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  visibility?: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  current?: 'NONE' | 'LIGHT' | 'MODERATE' | 'STRONG';
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
  visibility: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  waterType: 'FRESH' | 'SALT' | 'BRACKISH';
  temperature: number;
  current: 'NONE' | 'LIGHT' | 'MODERATE' | 'STRONG';
  entryType: 'SHORE' | 'BOAT' | 'PLATFORM' | 'LADDER';
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
  visibility?: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  waterType?: 'FRESH' | 'SALT' | 'BRACKISH';
  temperature?: number;
  current?: 'NONE' | 'LIGHT' | 'MODERATE' | 'STRONG';
  entryType?: 'SHORE' | 'BOAT' | 'PLATFORM' | 'LADDER';
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
  visibility?: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  waterType?: 'FRESH' | 'SALT' | 'BRACKISH';
  current?: 'NONE' | 'LIGHT' | 'MODERATE' | 'STRONG';
  entryType?: 'SHORE' | 'BOAT' | 'PLATFORM' | 'LADDER';
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
  shape?: 'map' | 'list';
  sort?: 'newest' | 'oldest' | 'name';
}

export interface Event {
  id: number;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  maxAttendees?: number;
  currentAttendees: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED' | 'POSTPONED' | 'REMOVED';
  type: 'DIVE_SESSION' | 'TRAINING' | 'COMPETITION' | 'SOCIAL' | 'WORKSHOP' | 'MEETUP' | 'TOURNAMENT' | 'FUNDRAISER';
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  price?: number;
  currency?: string;
  imageUrl?: string;
  organizerId: number;
  diveSpotId?: number;
  organizerName: string;
  organizerEmail: string;
  requirements?: string;
  equipment?: string;
  contactInfo?: string;
  tags?: string[];
  isPublic: boolean;
  allowWaitlist: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventAttendee {
  id: number;
  eventId: number;
  userId: number;
  userName: string;
  userEmail: string;
  status: 'registered' | 'attended' | 'cancelled' | 'no_show';
  joinedAt: string;
  notes?: string;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  maxAttendees?: number;
  type: 'DIVE_SESSION' | 'TRAINING' | 'COMPETITION' | 'SOCIAL' | 'WORKSHOP' | 'MEETUP' | 'TOURNAMENT' | 'FUNDRAISER';
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  price?: number;
  currency?: string;
  imageUrl?: string;
  requirements?: string;
  equipment?: string;
  contactInfo?: string;
  tags?: string[];
  diveSpotId?: number;
  isPublic: boolean;
  allowWaitlist: boolean;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  maxAttendees?: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED' | 'POSTPONED' | 'REMOVED';
  type?: 'DIVE_SESSION' | 'TRAINING' | 'COMPETITION' | 'SOCIAL' | 'WORKSHOP' | 'MEETUP' | 'TOURNAMENT' | 'FUNDRAISER';
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  price?: number;
  currency?: string;
  imageUrl?: string;
  requirements?: string;
  equipment?: string;
  contactInfo?: string;
  tags?: string[];
  diveSpotId?: number;
  isPublic?: boolean;
  allowWaitlist?: boolean;
}

export interface JoinEventRequest {
  eventId: number;
  userId: number;
  notes?: string;
}

export interface EventFilters {
  page?: number;
  limit?: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED' | 'POSTPONED' | 'REMOVED';
  type?: 'DIVE_SESSION' | 'TRAINING' | 'COMPETITION' | 'SOCIAL' | 'WORKSHOP' | 'MEETUP' | 'TOURNAMENT' | 'FUNDRAISER';
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  location?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  organizerId?: number;
  isPublic?: boolean;
}

export interface Group {
  id: number;
  name: string;
  slug: string;
  description?: string;
  type: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY' | 'CLOSED';
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  memberCount: number;
  eventCount: number;
  postCount: number;
  location?: string;
  lat?: number;
  lng?: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: number;
  groupId: number;
  userId: number;
  role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
  joinedAt: string;
  leftAt?: string;
  isActive: boolean;
  lastReadAt?: string;
  lastReadMessageId?: number;
  notificationSettings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    name: string;
    username: string;
    image: string;
  };
}

export interface GroupPost {
  id: number;
  groupId: number;
  authorId: number;
  title?: string;
  content: string;
  postType: 'text' | 'image' | 'video' | 'link';
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: number;
    name: string;
    username: string;
    image: string;
  };
}

export interface CreateGroupRequest {
  name: string;
  slug: string;
  description?: string;
  type?: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY' | 'CLOSED';
  location?: string;
  lat?: number;
  lng?: number;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  type?: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY' | 'CLOSED';
  status?: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  location?: string;
  lat?: number;
  lng?: number;
}

export interface JoinGroupRequest {
  groupId: number;
  userId: number;
  role?: 'MEMBER' | 'MODERATOR' | 'ADMIN';
}

export interface CreateGroupPostRequest {
  groupId: number;
  authorId: number;
  title?: string;
  content: string;
  postType?: 'text' | 'image' | 'video' | 'link';
}

export interface GroupFilters {
  page?: number;
  limit?: number;
  type?: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY' | 'CLOSED';
  status?: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  search?: string;
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
  category: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | 'OTHER';
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
  category: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | 'OTHER';
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
  category?: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | 'OTHER';
  uploadedBy?: number;
  isPublic?: boolean;
  search?: string;
  tags?: string[];
}

export type ConversationStatus = "pending" | "active" | "rejected";

export interface MessageParticipant {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export interface MessageItem {
  conversationId: string;
  messageId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface ConversationListItem {
  conversationId: string;
  status: ConversationStatus;
  initiatorUserId: string;
  updatedAt: string;
  participant: MessageParticipant;
  lastMessage: MessageItem;
  requestPreview?: MessageItem;
  unreadCount: number;
  pendingCount: number;
}

export interface ConversationListResponse {
  items: ConversationListItem[];
  nextCursor?: string;
}

export interface ConversationMessagesResponse {
  items: MessageItem[];
  nextCursor?: string;
}

export interface MessageRequestActionResponse {
  requestId: string;
  conversationId: string;
  status: ConversationStatus;
}

export interface SendMessageRequest {
  content: string;
}

export interface SendMessageResponse {
  message: MessageItem;
}

export interface MarkReadRequest {
  conversationId: string;
  messageId?: string;
}

export interface MarkReadResponse {
  conversationId: string;
  marked: boolean;
}

export interface MessageWebSocketEnvelope<T = unknown> {
  v: 1;
  type: "message.created" | "conversation.updated" | "request.created" | "request.accepted" | "request.declined";
  ts: string;
  eventId?: string;
  requestId?: string;
  payload: T;
}

export interface MessageCreatedPayload {
  conversationId: string;
  messageId: string;
  senderId: string;
  content: string;
  createdAt: string;
  status: ConversationStatus;
}

export interface Notification {
  id: number;
  userId: number;
  type:
    | 'SYSTEM'
    | 'MESSAGE'
    | 'EVENT'
    | 'GROUP'
    | 'SERVICE'
    | 'BOOKING'
    | 'REVIEW'
    | 'MENTION'
    | 'LIKE'
    | 'COMMENT'
    | 'FRIEND_REQUEST'
    | 'GROUP_INVITE'
    | 'EVENT_REMINDER'
    | 'PAYMENT'
    | 'SECURITY';
  title: string;
  message: string;
  status: 'UNREAD' | 'READ' | 'ARCHIVED' | 'DELETED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  relatedUserId?: number;
  relatedEntityType?: string;
  relatedEntityId?: number;
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
  id: number;
  userId: number;
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
  digestFrequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY' | 'NEVER';
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
  userId: number;
  type: Notification['type'];
  title: string;
  message: string;
  priority?: Notification['priority'];
  relatedUserId?: number;
  relatedEntityType?: string;
  relatedEntityId?: number;
  imageUrl?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface UpdateNotificationRequest {
  status?: Notification['status'];
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
  digestFrequency?: NotificationSettings['digestFrequency'];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  status?: Notification['status'];
  type?: Notification['type'];
  priority?: Notification['priority'];
}

export type BuddyRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

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
  verificationState: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';
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
  visibility: 'PRIVATE' | 'BUDDIES_ONLY' | 'PUBLIC';
}

export interface CreateTrainingLogRequest {
  title: string;
  notes?: string;
  sessionDate: string;
  visibility?: 'PRIVATE' | 'BUDDIES_ONLY' | 'PUBLIC';
  metrics?: Array<{ metricKey: string; metricValue: string; metricUnit?: string }>;
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
  topicType: 'REMINDER' | 'ETIQUETTE' | 'ADVISORY' | 'TOURISM_NOTE';
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
  state: 'ACTIVE' | 'FLAGGED' | 'REMOVED';
}

export interface CollaborationPost {
  id: number;
  authorUserId: number;
  postType: 'LOOKING_FOR' | 'OFFERING';
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
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  experience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  certifications: string[];
  specialties: string[];
  isActive: boolean;
  isVerified: boolean;
  role: 'USER' | 'EDITOR' | 'ADMINISTRATOR';
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
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  experience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  certifications: string[];
  specialties: string[];
  isActive: boolean;
  isVerified: boolean;
  role: 'USER' | 'EDITOR' | 'ADMINISTRATOR';
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
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  experience?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
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
  experience?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  role?: 'USER' | 'EDITOR' | 'ADMINISTRATOR';
  isActive?: boolean;
  isVerified?: boolean;
}

export interface UserService {
  id: number;
  title: string;
  description: string;
  category: 'INSTRUCTION' | 'EQUIPMENT' | 'GUIDE' | 'PHOTOGRAPHY' | 'TRANSPORT' | 'OTHER';
  price: number;
  currency: string;
  location: string;
  availability: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
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
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
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
  category: 'INSTRUCTION' | 'EQUIPMENT' | 'GUIDE' | 'PHOTOGRAPHY' | 'TRANSPORT' | 'OTHER';
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
  category?: 'INSTRUCTION' | 'EQUIPMENT' | 'GUIDE' | 'PHOTOGRAPHY' | 'TRANSPORT' | 'OTHER';
  price?: number;
  currency?: string;
  location?: string;
  availability?: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
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
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
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
  category?: 'INSTRUCTION' | 'EQUIPMENT' | 'GUIDE' | 'PHOTOGRAPHY' | 'TRANSPORT' | 'OTHER';
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
  search?: string;
  providerId?: number;
  isActive?: boolean;
}
