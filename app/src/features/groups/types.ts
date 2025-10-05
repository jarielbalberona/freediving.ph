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
