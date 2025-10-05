import { http } from '@/lib/http';
import type {
  Group,
  GroupMember,
  GroupPost,
  CreateGroupRequest,
  UpdateGroupRequest,
  JoinGroupRequest,
  CreateGroupPostRequest,
  GroupFilters
} from '../types';

export const groupsApi = {
  // Get all groups with pagination and filtering
  getGroups: (filters?: GroupFilters) => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = `/groups${queryString ? `?${queryString}` : ''}`;

    return http.get<{
      success: boolean;
      data: {
        groups: Group[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      };
    }>(url);
  },

  // Get group by ID
  getGroupById: (groupId: number) => {
    return http.get<{
      success: boolean;
      data: Group;
    }>(`/groups/${groupId}`);
  },

  // Create new group
  createGroup: (data: CreateGroupRequest & { userId: number }) => {
    return http.post<{
      success: boolean;
      data: Group;
    }>('/groups', data);
  },

  // Update group
  updateGroup: (groupId: number, data: UpdateGroupRequest & { userId: number }) => {
    return http.put<{
      success: boolean;
      data: Group;
    }>(`/groups/${groupId}`, data);
  },

  // Join group
  joinGroup: (data: JoinGroupRequest) => {
    return http.post<{
      success: boolean;
      data: GroupMember;
    }>('/groups/join', data);
  },

  // Leave group
  leaveGroup: (groupId: number, userId: number) => {
    return http.post<{
      success: boolean;
      message: string;
    }>(`/groups/${groupId}/leave`, { userId });
  },

  // Get group members
  getGroupMembers: (groupId: number, page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    const url = `/groups/${groupId}/members${queryString ? `?${queryString}` : ''}`;

    return http.get<{
      success: boolean;
      data: {
        members: GroupMember[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      };
    }>(url);
  },

  // Get group posts
  getGroupPosts: (groupId: number, page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    const url = `/groups/${groupId}/posts${queryString ? `?${queryString}` : ''}`;

    return http.get<{
      success: boolean;
      data: {
        posts: GroupPost[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      };
    }>(url);
  },

  // Create group post
  createGroupPost: (data: CreateGroupPostRequest) => {
    return http.post<{
      success: boolean;
      data: GroupPost;
    }>('/groups/posts', data);
  },

  // Get user's groups
  getUserGroups: (userId: number, page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    const url = `/groups/users/${userId}/groups${queryString ? `?${queryString}` : ''}`;

    return http.get<{
      success: boolean;
      data: {
        groups: Array<Group & { role: string; joinedAt: string }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      };
    }>(url);
  },
};
