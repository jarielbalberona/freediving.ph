import type { ActivityFeedItem } from "./feed";
import type { PaymentMethodType } from "./payment-methods";
import type { ReportReasonCode } from "./reports";

export * from "./api/authz";
export * from "./api/admin";
export * from "./api/error";
export * from "./api/me";
export * from "./api/profile";
export * from "./api/profile-view";
export * from "./feed";
export * from "./instructors";
export * from "./media";
export * from "./navigation";
export * from "./payment-methods";
export * from "./reports";
export * from "./schools";

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
  slug: string;
  title: string;
  content: string;
  voteCount: number;
  commentCount: number;
  userReaction?: ChikaReactionType;
  mode: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  categoryPseudonymous: boolean;
  authorDisplayName: string;
  authorUsername?: string;
  authorAvatarUrl?: string;
  realAuthorUserId?: string;
  isHidden: boolean;
  hiddenAt?: string;
  hiddenReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type ChikaReactionType = "upvote" | "downvote";

export interface CreateChikaThreadRequest {
  title: string;
  content: string;
  categoryId: string;
}

export interface CreateChikaCommentRequest {
  content: string;
  parentCommentId?: string;
}

export interface SetChikaReactionRequest {
  type: ChikaReactionType;
}

export interface ChikaThreadReactionResponse {
  threadId: string;
  userId: string;
  type: ChikaReactionType;
}

export interface ChikaCommentResponse {
  id: string;
  threadId: string;
  parentCommentId?: string;
  voteCount: number;
  replyCount: number;
  userReaction?: ChikaReactionType;
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

export interface ChikaCommentReactionResponse {
  commentId: string;
  threadId: string;
  voteCount: number;
  userReaction: ChikaReactionType | null;
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
  likeCount: number;
  viewerHasLiked: boolean;
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

export type EventVisibility = "public" | "private";
export type EventStatus =
  | "draft"
  | "published"
  | "full"
  | "cancelled"
  | "completed"
  | "archived";
export type EventType =
  | "intro_session"
  | "pool_training"
  | "line_training"
  | "fun_dive"
  | "depth_training"
  | "certification_course"
  | "workshop"
  | "competition"
  | "cleanup_dive"
  | "trip_retreat";
export type EventDifficulty =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert";
export type EventEntryType = "shore" | "boat" | "pool" | "classroom_online";
export type EventParticipantRole = "participant" | "staff" | "organizer";
export type EventParticipantStatus =
  | "pending_approval"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "left"
  | "attended"
  | "no_show";
export type EventPaymentMethodType = PaymentMethodType;
export type EventPaymentMode = "free" | "required" | "optional";
export type EventPaymentStatus =
  | "not_required"
  | "pending_upload"
  | "submitted"
  | "verified"
  | "rejected";
export type EventPostCreatePolicy = "organizers_only" | "participants";
export type EventPostType =
  | "announcement"
  | "schedule"
  | "logistics"
  | "payment"
  | "competition"
  | "results"
  | "general";
export type EventPrizePlacement =
  | "winner"
  | "champion"
  | "first_place"
  | "second_place"
  | "third_place"
  | "special_award"
  | "sponsor_award"
  | "custom";
export type EventPrizeType =
  | "cash"
  | "item"
  | "certificate"
  | "sponsor_gift"
  | "other";
export type EventSponsorTier =
  | "presenting"
  | "major"
  | "minor"
  | "partner"
  | "community"
  | "media"
  | "other";
export type EventPostStatus = "published" | "hidden" | "deleted";
export type EventModuleKey =
  | "payment"
  | "posts"
  | "awards"
  | "sponsors"
  | "program"
  | "interested";
export type EventJoinFormFieldType =
  | "short_text"
  | "long_text"
  | "select"
  | "checkbox"
  | "phone"
  | "email";
export type EventViewerEventState =
  | "anonymous"
  | "none"
  | "interested"
  | "pending_approval"
  | "going"
  | "rejected"
  | "left"
  | "cancelled";

export interface EventDiveSiteSummary {
  id: string;
  slug: string;
  name: string;
  area: string;
  latitude?: number;
  longitude?: number;
}

export interface EventPaymentMethod {
  id: string;
  eventId: string;
  type: EventPaymentMethodType;
  name: string;
  instructions?: string;
  qrMediaId?: string;
  qrImageUrl?: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventPaymentMethodRequest {
  type: EventPaymentMethodType;
  name?: string;
  instructions?: string;
  qrMediaId?: string;
  qrImageUrl?: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  isActive?: boolean;
}

export type UpdateEventPaymentMethodRequest =
  Partial<CreateEventPaymentMethodRequest>;

export interface EventParticipantPayment {
  id: string;
  eventId: string;
  eventParticipationId: string;
  userId: string;
  paymentMethodId?: string;
  amount?: number;
  currency: string;
  proofMediaId?: string;
  proofAttachmentUrl?: string;
  proofFileName?: string;
  proofContentType?: string;
  proofStatus?: EventPaymentStatus;
  referenceNumber?: string;
  status: EventPaymentStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventPaymentProofUrl {
  url: string;
  expiresAt: number;
  paymentId: string;
  proofMediaId: string;
  proofFileName?: string;
  proofContentType?: string;
}

export interface EventParticipant {
  id: string;
  eventId: string;
  userId: string;
  role: EventParticipantRole;
  status: EventParticipantStatus;
  participantNote?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  joinAnswers?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  cancelledAt?: string;
  leftAt?: string;
  qrToken?: string;
  qrIssuedAt?: string;
  qrRevokedAt?: string;
  checkedInAt?: string;
  checkedInBy?: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  payment?: EventParticipantPayment;
}

export type EventAttendee = EventParticipant;

export interface EventPass {
  valid: boolean;
  revoked: boolean;
  alreadyCheckedIn?: boolean;
  event: Event;
  participant: EventParticipant;
  role: EventParticipantRole;
  status: EventParticipantStatus;
  payment?: EventParticipantPayment;
  canManage: boolean;
  isOwner: boolean;
}

export interface EventCompetition {
  id: string;
  eventId: string;
  name: string;
  descriptionMarkdown?: string;
  rulesMarkdown?: string;
  coverPhotoUrl?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventPrize {
  id: string;
  eventId: string;
  competitionId?: string;
  title: string;
  descriptionMarkdown?: string;
  photoUrl?: string;
  placement: EventPrizePlacement;
  placementLabel?: string;
  prizeType?: EventPrizeType;
  amount?: number;
  currency: string;
  sponsorId?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventSponsor {
  id: string;
  eventId: string;
  name: string;
  tier?: EventSponsorTier;
  description?: string;
  logoMediaId?: string;
  logoUrl?: string;
  websiteUrl?: string;
  socialUrl?: string;
  contactName?: string;
  contactEmail?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventPost {
  id: string;
  eventId: string;
  authorUserId: string;
  postType: EventPostType;
  title?: string;
  bodyMarkdown: string;
  status: EventPostStatus;
  isPinned: boolean;
  fishReactionCount: number;
  viewerHasFishReacted: boolean;
  authorDisplayName?: string;
  authorUsername?: string;
  authorAvatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventProgramItem {
  id: string;
  eventId: string;
  title: string;
  descriptionMarkdown?: string;
  programDate?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  locationLabel?: string;
  competitionId?: string;
  competitionName?: string;
  sortOrder: number;
  isHighlighted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventProgramItemRequest {
  title: string;
  descriptionMarkdown?: string;
  programDate?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  locationLabel?: string;
  competitionId?: string;
  sortOrder?: number;
  isHighlighted?: boolean;
}

export type UpdateEventProgramItemRequest =
  Partial<CreateEventProgramItemRequest>;

export interface Event {
  id: string;
  slug: string;
  title: string;
  shortDescription?: string;
  description?: string;
  descriptionMarkdown?: string;
  logoMediaId?: string | null;
  logoUrl?: string | null;
  coverMediaId?: string | null;
  coverUrl?: string | null;
  coverPhotoUrl?: string | null;
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
  locationSource?:
    | "manual"
    | "psgc"
    | "google_places"
    | "psgc_mapped"
    | "unmapped";
  diveSiteId?: string;
  diveSite?: EventDiveSiteSummary;
  startsAt?: string;
  endsAt?: string;
  timezone: string;
  maxAttendees?: number;
  capacity?: number;
  currentAttendees: number;
  availableSlots?: number;
  interestedCount: number;
  goingCount: number;
  status: EventStatus;
  visibility: EventVisibility;
  type: EventType;
  difficulty: EventDifficulty;
  organizerUserId?: string;
  groupId?: string;
  requiresApproval: boolean;
  isPaid: boolean;
  paymentMode: EventPaymentMode;
  priceAmount?: number;
  currency: string;
  paymentInstructions?: string;
  meetingPoint?: string;
  beginnerFriendly: boolean;
  maxDepthM?: number;
  entryType?: EventEntryType;
  equipmentNotes?: string;
  safetyNotes?: string;
  cancellationPolicy?: string;
  paymentEnabled: boolean;
  postsEnabled: boolean;
  awardsEnabled: boolean;
  sponsorsEnabled: boolean;
  interestedEnabled: boolean;
  programEnabled: boolean;
  modules: Record<EventModuleKey, boolean>;
  postCreatePolicy: EventPostCreatePolicy;
  publishedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  viewerJoined: boolean;
  viewerInterested: boolean;
  viewerParticipationStatus?: EventParticipantStatus;
  viewerEventState: EventViewerEventState;
  viewerCanManage: boolean;
  viewerCanViewPrivateDetails: boolean;
  viewerParticipation?: EventParticipant;
  viewerPayment?: EventParticipantPayment;
  paymentMethods?: EventPaymentMethod[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  title: string;
  shortDescription: string;
  descriptionMarkdown?: string;
  type: EventType;
  diveSiteId: string;
  startsAt: string;
  endsAt: string;
  timezone?: string;
  capacity?: number;
  status?: EventStatus;
  visibility: EventVisibility;
  difficulty?: EventDifficulty;
  requiresApproval: boolean;
  isPaid: boolean;
  paymentMode?: EventPaymentMode;
  priceAmount?: number;
  currency?: string;
  paymentInstructions?: string;
  meetingPoint?: string;
  beginnerFriendly?: boolean;
  maxDepthM?: number;
  entryType?: EventEntryType;
  equipmentNotes?: string;
  safetyNotes?: string;
  cancellationPolicy?: string;
  paymentMethods?: CreateEventPaymentMethodRequest[];
  modules?: Partial<Record<EventModuleKey, boolean>>;
  groupId?: string;
}

export type UpdateEventRequest = Partial<CreateEventRequest> & {
  status?: EventStatus;
  paymentEnabled?: boolean;
  postsEnabled?: boolean;
  awardsEnabled?: boolean;
  sponsorsEnabled?: boolean;
  interestedEnabled?: boolean;
  programEnabled?: boolean;
  postCreatePolicy?: EventPostCreatePolicy;
  cancelReason?: string;
  coverPhotoUrl?: string;
};

export interface UpdateEventModulesRequest {
  modules: Record<EventModuleKey, boolean>;
}

export interface EventJoinFormField {
  id: string;
  eventId: string;
  fieldKey: string;
  label: string;
  fieldType: EventJoinFormFieldType;
  required: boolean;
  options: string[];
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateEventJoinFormFieldRequest {
  fieldKey: string;
  label: string;
  fieldType: EventJoinFormFieldType;
  required: boolean;
  options?: string[];
  sortOrder?: number;
  enabled: boolean;
}

export interface UpdateEventJoinFormFieldsRequest {
  fields: UpdateEventJoinFormFieldRequest[];
}

export interface DuplicateEventRequest {
  title?: string;
  startsAt: string;
  endsAt: string;
  copyPaymentSetup: boolean;
  copyAwards: boolean;
  copySponsors: boolean;
  copyPosts: boolean;
  copyProgram: boolean;
  copySafetyLogistics: boolean;
}

export interface CreateEventCompetitionRequest {
  name: string;
  descriptionMarkdown?: string;
  rulesMarkdown?: string;
  coverPhotoUrl?: string;
  sortOrder?: number;
}

export type UpdateEventCompetitionRequest =
  Partial<CreateEventCompetitionRequest>;

export interface CreateEventPrizeRequest {
  competitionId?: string;
  title: string;
  descriptionMarkdown?: string;
  photoUrl?: string;
  placement?: EventPrizePlacement;
  placementLabel?: string;
  prizeType?: EventPrizeType;
  amount?: number;
  currency?: string;
  sponsorId?: string;
  sortOrder?: number;
}

export interface UpdateEventPrizeRequest
  extends Partial<
    Omit<CreateEventPrizeRequest, "competitionId" | "prizeType" | "sponsorId">
  > {
  competitionId?: string;
  prizeType?: EventPrizeType | "";
  sponsorId?: string;
}

export interface CreateEventSponsorRequest {
  name: string;
  tier?: EventSponsorTier;
  description?: string;
  logoMediaId?: string;
  websiteUrl?: string;
  socialUrl?: string;
  contactName?: string;
  contactEmail?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateEventSponsorRequest
  extends Partial<Omit<CreateEventSponsorRequest, "tier">> {
  tier?: EventSponsorTier | "";
}

export interface CreateEventPostRequest {
  postType?: EventPostType;
  title?: string;
  bodyMarkdown: string;
  isPinned?: boolean;
}

export interface UpdateEventPostRequest {
  postType?: EventPostType;
  title?: string;
  bodyMarkdown?: string;
  status?: EventPostStatus;
  isPinned?: boolean;
}

export interface EventPostReactionResponse {
  postId: string;
  fishReactionCount: number;
  viewerHasFishReacted: boolean;
}

export interface EventPostsResponse {
  posts: EventPost[];
}

export interface EventPostResponse {
  post: EventPost;
}

export interface UpdateEventPostSettingsRequest {
  postsEnabled: boolean;
  postCreatePolicy: EventPostCreatePolicy;
}

export interface UpdateEventParticipantRoleRequest {
  role: Extract<EventParticipantRole, "participant" | "organizer">;
}

export interface JoinEventRequest {
  participantNote?: string;
  notes?: string;
  joinAnswers?: Record<string, unknown>;
}

export interface JoinEventResponse {
  attendee?: EventParticipant;
  participant?: EventParticipant;
}

export interface SubmitEventPaymentRequest {
  eventId: string;
  paymentMethodId: string;
  proofMediaId?: string;
  proofAttachmentUrl?: string;
  referenceNumber?: string;
}

export interface ReviewEventPaymentRequest {
  reviewNotes?: string;
}

export interface EventFilters {
  page?: number;
  limit?: number;
  status?: EventStatus;
  search?: string;
  groupId?: string;
  diveSiteId?: string;
  type?: EventType;
  difficulty?: EventDifficulty;
  beginnerFriendly?: boolean;
  price?: "free" | "paid";
}

export interface EventListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface EventListResponse {
  events: Event[];
  pagination: EventListPagination;
}

export interface EventDetailResponse {
  event: Event;
}

export interface Group {
  id: string;
  name: string;
  slug: string;
  bio?: string;
  description?: string;
  logoMediaId?: string | null;
  logoUrl?: string | null;
  coverMediaId?: string | null;
  coverUrl?: string | null;
  visibility: "public" | "private";
  status: "active" | "archived" | "deleted";
  joinPolicy: "open" | "invite_only";
  memberCount: number;
  eventCount: number;
  postCount: number;
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
  locationSource?:
    | "manual"
    | "psgc"
    | "google_places"
    | "psgc_mapped"
    | "unmapped";
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  viewerRole?: "owner" | "moderator" | "member";
  viewerMembershipStatus?:
    | "active"
    | "invited"
    | "left"
    | "declined"
    | "blocked";
  viewerMembershipJoinedAt?: string;
  viewerInviteCreatedAt?: string;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  role: "owner" | "moderator" | "member";
  status: "active" | "invited" | "left" | "declined" | "blocked";
  invitedBy?: string;
  invitedAt?: string;
  respondedAt?: string;
  joinedAt?: string;
  leftAt?: string;
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

export interface GroupPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface GroupListResponse {
  groups: Group[];
  pagination: GroupPagination;
}

export interface GroupDetailResponse {
  group: Group;
}

export interface GroupMembersResponse {
  members: GroupMember[];
  pagination: GroupPagination;
}

export interface GroupPostsResponse {
  posts: GroupPost[];
  pagination: GroupPagination;
}

export interface GroupMembershipResponse {
  membership: GroupMember;
}

export interface CreateGroupResponse {
  group: Group;
}

export interface CreateGroupPostResponse {
  post: GroupPost;
}

export interface CreateGroupRequest {
  name: string;
  slug?: string;
  bio?: string;
  description?: string;
  visibility?: "public" | "private";
  joinPolicy?: "open" | "invite_only";
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
  locationSource?:
    | "manual"
    | "psgc"
    | "google_places"
    | "psgc_mapped"
    | "unmapped";
}

export interface UpdateGroupRequest {
  name?: string;
  bio?: string;
  description?: string;
  visibility?: "public" | "private";
  status?: "active" | "archived" | "deleted";
  joinPolicy?: "open" | "invite_only";
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
  locationSource?:
    | "manual"
    | "psgc"
    | "google_places"
    | "psgc_mapped"
    | "unmapped";
}

export interface JoinGroupRequest {
  groupId: string;
}

export interface InviteGroupMemberRequest {
  groupId: string;
  userId: string;
}

export interface CreateGroupPostRequest {
  groupId: string;
  title?: string;
  content: string;
}

export interface GroupFilters {
  page?: number;
  limit?: number;
  visibility?: "public" | "private";
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

export interface MessagingUnreadCountResponse {
  unreadCount: number;
}

export interface MessagingThreadDetailResponse {
  id: string;
  type: MessagingThreadType;
  participants: MessagingThreadParticipant[];
  category: MessagingThreadCategory;
  createdAt: string;
  lastReadMessageId?: string;
  canSend: boolean;
  activeRequest: boolean;
  canResolveRequest: boolean;
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

export interface MessagingResolveThreadRequestResponse {
  threadId: string;
  action: "accepted" | "declined";
  resolved: boolean;
}

export type MessagingRealtimeEnvelope<T = unknown> = {
  v: 1;
  type: "message.created" | "thread.updated" | "thread.read";
  ts: string;
  eventId?: string;
  requestId?: string;
  payload: T;
};

export type NotificationRealtimeEnvelope<T = Notification> = {
  v: 1;
  type: "notification.created";
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
    | "SECURITY"
    | "NEW_DIVE_SITE_PUBLISHED"
    | "DIVE_SITE_SUBMITTED_FOR_REVIEW"
    | "INSTRUCTOR_APPLICATION_SUBMITTED"
    | "INSTRUCTOR_APPLICATION_APPROVED"
    | "INSTRUCTOR_APPLICATION_REJECTED"
    | "BOOKING_CREATED"
    | "BOOKING_APPROVED"
    | "BOOKING_REJECTED"
    | "BOOKING_CANCELLED_BY_STUDENT"
    | "BOOKING_CANCELLED_BY_SCHOOL"
    | "BOOKING_RESCHEDULED"
    | "SESSION_UPDATED"
    | "SESSION_CANCELLED"
    | "CHIKA_THREAD_COMMENTED"
    | "CHIKA_COMMENT_REPLIED"
    | "GROUP_INVITE_RECEIVED"
    | "GROUP_POST_CREATED"
    | "EVENT_CREATED_FOR_GROUP"
    | "EVENT_ATTENDEE_JOINED"
    | "EVENT_UPDATED"
    | "EVENT_CANCELLED";
  category: string;
  title: string;
  message: string;
  status: "UNREAD" | "READ" | "ARCHIVED" | "DELETED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  actorUserId?: string;
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
  seenAt?: string;
  archivedAt?: string;
  idempotencyKey?: string;
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
  sessionNotifications: boolean;
  reviewNotifications: boolean;
  mentionNotifications: boolean;
  likeNotifications: boolean;
  commentNotifications: boolean;
  friendRequestNotifications: boolean;
  groupInviteNotifications: boolean;
  eventReminderNotifications: boolean;
  paymentNotifications: boolean;
  securityNotifications: boolean;
  newDiveSitePublished: boolean;
  chikaReplies: boolean;
  instructorApplicationNotifications: boolean;
  instructorStatusNotifications: boolean;
  buddyUpdates: boolean;
  profileSocialUpdates: boolean;
  diveConditionAlerts: boolean;
  diveConditionSavedSites: boolean;
  diveConditionRegions: string[];
  diveConditionNearMe: boolean;
  diveConditionCoarseArea?: string;
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
  category?: string;
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
  sessionNotifications?: boolean;
  reviewNotifications?: boolean;
  mentionNotifications?: boolean;
  likeNotifications?: boolean;
  commentNotifications?: boolean;
  friendRequestNotifications?: boolean;
  groupInviteNotifications?: boolean;
  eventReminderNotifications?: boolean;
  paymentNotifications?: boolean;
  securityNotifications?: boolean;
  newDiveSitePublished?: boolean;
  chikaReplies?: boolean;
  instructorApplicationNotifications?: boolean;
  instructorStatusNotifications?: boolean;
  buddyUpdates?: boolean;
  profileSocialUpdates?: boolean;
  diveConditionAlerts?: boolean;
  diveConditionSavedSites?: boolean;
  diveConditionRegions?: string[];
  diveConditionNearMe?: boolean;
  diveConditionCoarseArea?: string;
  digestFrequency?: NotificationSettings["digestFrequency"];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

export type PushDevicePlatform = "ios" | "android" | "web" | "unknown";

export interface RegisterPushDeviceRequest {
  expoPushToken: string;
  platform: PushDevicePlatform;
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
}

export interface PushDeviceToken {
  id: string;
  userId: string;
  expoPushToken: string;
  platform: PushDevicePlatform;
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
  enabled: boolean;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  offset?: number;
  status?: Notification["status"];
  type?: Notification["type"];
  priority?: Notification["priority"];
}

export interface ListNotificationsResponse {
  items: Notification[];
  pagination: {
    limit: number;
    offset: number;
  };
}

export interface UnreadNotificationCountResponse {
  unreadCount: number;
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
  currency?: string;
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
  currency?: string;
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
  likeCount: number;
  viewerHasLiked: boolean;
  buddySignal?: ExploreBuddySignal;
  coverMedia?: ExploreCoverMedia;
};

export type ExploreCoverMedia = {
  mediaPostId: string;
  mediaItemId: string;
  mediaObjectId: string;
  displayUrl: string;
  width: number;
  height: number;
  likeCount: number;
  createdAt: string;
};

export type ExploreBuddySignal = {
  siteIntentCount: number;
  areaIntentCount: number;
  hasSiteActivity: boolean;
  hasAreaActivity: boolean;
  label: string;
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
  likeCount: number;
  viewerHasLiked: boolean;
  coverMedia?: ExploreCoverMedia;
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

export type ExploreSiteSaveResponse = {
  saved: boolean;
};

export type ExploreSiteLikeResponse = {
  targetId: string;
  likeCount: number;
  viewerHasLiked: boolean;
};

export type ExploreSiteRelatedCounts = {
  buddies?: number;
  availableBuddyCount: number;
  localRegularCount: number;
  communityPostCount: number;
  reviewCount?: number;
  averageRating?: number;
  communityPosts: number;
  recentConditions: number;
};

export type ExploreSiteRelatedPreviews = {
  buddies?: DivePresenceItem[];
  availableBuddies: DivePresenceItem[];
  localRegulars: DiveSiteAffinityItem[];
  communityPosts: ActivityFeedItem[];
  reviews?: DiveSiteReviewItem[];
};

export type ExploreSiteRelatedResponse = {
  counts: ExploreSiteRelatedCounts;
  previews: ExploreSiteRelatedPreviews;
  sourceBreakdown: ExploreSiteBuddySourceBreakdown;
};

export type ExploreSiteCommunityPostsResponse = {
  items: ActivityFeedItem[];
  nextCursor?: string;
};

export type DivePresenceType =
  | "available"
  | "planning"
  | "training"
  | "fun_dive";

export type DivePresenceVisibility = "public" | "members" | "private";

export type DivePresenceItem = {
  id: string;
  userId: string;
  diveSiteId: string;
  diveSiteSlug?: string;
  diveSiteName?: string;
  diveSiteArea?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  presenceType: DivePresenceType;
  startAt?: string;
  endAt?: string;
  visibility: DivePresenceVisibility;
  contactEnabled: boolean;
  contactAllowed: boolean;
  note?: string;
  status: "active" | "cancelled" | "expired";
  createdAt: string;
  updatedAt: string;
};

export type DivePresenceListResponse = {
  items: DivePresenceItem[];
};

export type DivePresenceResponse = {
  presence: DivePresenceItem;
};

export type CreateDivePresenceRequest = {
  presenceType: DivePresenceType;
  flexible: boolean;
  startAt?: string;
  endAt?: string;
  visibility: DivePresenceVisibility;
  contactEnabled: boolean;
  note?: string;
};

export type DiveSiteAffinityRelationship =
  | "local"
  | "regular"
  | "instructor"
  | "operator"
  | "interested";

export type DiveSiteAffinityItem = {
  id: string;
  userId: string;
  diveSiteId: string;
  diveSiteSlug?: string;
  diveSiteName?: string;
  diveSiteArea?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  relationship: DiveSiteAffinityRelationship;
  visibility: DivePresenceVisibility;
  contactEnabled: boolean;
  contactAllowed: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type DiveSiteAffinityListResponse = {
  items: DiveSiteAffinityItem[];
};

export type DiveSiteAffinityResponse = {
  affinity: DiveSiteAffinityItem;
};

export type CreateDiveSiteAffinityRequest = {
  relationship: DiveSiteAffinityRelationship;
  visibility: DivePresenceVisibility;
  contactEnabled: boolean;
  note?: string;
};

export type DiveSiteReviewItem = {
  id: string;
  userId: string;
  diveSiteId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  rating: number;
  comment?: string;
  visibility: DivePresenceVisibility;
  status: "active" | "hidden" | "deleted";
  createdAt: string;
  updatedAt: string;
};

export type DiveSiteReviewListResponse = {
  items: DiveSiteReviewItem[];
  averageRating: number;
  reviewCount: number;
};

export type DiveSiteReviewResponse = {
  review: DiveSiteReviewItem;
};

export type CreateDiveSiteReviewRequest = {
  rating: number;
  comment?: string;
  visibility: DivePresenceVisibility;
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
  area?: string;
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

export type CreateExploreSiteEditProposalRequest = {
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

export type ExploreSiteEditProposalState = "pending" | "applied" | "rejected";

export type ExploreSiteEditValues = {
  name: string;
  area: string;
  latitude?: number;
  longitude?: number;
  description: string;
  difficulty: "easy" | "moderate" | "hard";
  depthMinM?: number;
  depthMaxM?: number;
  hazards: string[];
  bestSeason?: string;
  typicalConditions?: string;
  access?: string;
  fees?: string;
};

export type ExploreSiteEditProposal = {
  id: string;
  diveSiteId: string;
  siteSlug: string;
  siteArea: string;
  submittedByAppUserId?: string;
  submittedByDisplayName?: string;
  reviewedByAppUserId?: string;
  reviewedByDisplayName?: string;
  reviewedAt?: string;
  moderationReason?: string;
  state: ExploreSiteEditProposalState;
  baseSiteUpdatedAt?: string;
  currentSiteUpdatedAt?: string;
  siteChangedSinceProposal: boolean;
  current: ExploreSiteEditValues;
  proposed: ExploreSiteEditValues;
  createdAt: string;
  updatedAt: string;
};

export type ExploreSiteEditProposalResponse = {
  proposal: ExploreSiteEditProposal;
  appliedImmediately?: boolean;
};

export type ExploreSiteEditProposalListResponse = {
  items: ExploreSiteEditProposal[];
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
