import { axiosInstance } from '@/lib/http/axios';
import type {
  Group,
  GroupMember,
  GroupPost,
  CreateGroupRequest,
  UpdateGroupRequest,
  JoinGroupRequest,
  CreateGroupPostRequest,
  GroupFilters,
} from '@freediving.ph/types';

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type ListGroupsPayload = {
  groups: Group[];
  pagination: Pagination;
};

type GroupDetailPayload = {
  group: Group;
};

type JoinGroupPayload = {
  membership: GroupMember;
};

type ListMembersPayload = {
  members: GroupMember[];
  pagination: Pagination;
};

type ListPostsPayload = {
  posts: GroupPost[];
  pagination: Pagination;
};

type CreateGroupPayload = {
  group: Group;
};

type CreatePostPayload = {
  post: GroupPost;
};

export const groupsApi = {
  getGroups: async (filters?: GroupFilters): Promise<ListGroupsPayload> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.visibility) params.append('visibility', filters.visibility);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = `/v1/groups${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get<ListGroupsPayload>(url);
    return response.data;
  },

  getGroupById: async (groupId: string): Promise<Group> => {
    const response = await axiosInstance.get<GroupDetailPayload>(`/v1/groups/${groupId}`);
    return response.data.group;
  },

  createGroup: async (data: CreateGroupRequest): Promise<Group> => {
    const response = await axiosInstance.post<CreateGroupPayload>('/v1/groups', data);
    return response.data.group;
  },

  updateGroup: async (groupId: string, data: UpdateGroupRequest): Promise<Group> => {
    const response = await axiosInstance.patch<CreateGroupPayload>(`/v1/groups/${groupId}`, data);
    return response.data.group;
  },

  joinGroup: async (data: JoinGroupRequest): Promise<GroupMember> => {
    const response = await axiosInstance.post<JoinGroupPayload>(`/v1/groups/${data.groupId}/join`);
    return response.data.membership;
  },

  leaveGroup: async (groupId: string): Promise<void> => {
    await axiosInstance.post(`/v1/groups/${groupId}/leave`);
  },

  getGroupMembers: async (groupId: string, page?: number, limit?: number): Promise<ListMembersPayload> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    const url = `/v1/groups/${groupId}/members${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get<ListMembersPayload>(url);
    return response.data;
  },

  getGroupPosts: async (groupId: string, page?: number, limit?: number): Promise<ListPostsPayload> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    const url = `/v1/groups/${groupId}/posts${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get<ListPostsPayload>(url);
    return response.data;
  },

  createGroupPost: async (data: CreateGroupPostRequest): Promise<GroupPost> => {
    const response = await axiosInstance.post<CreatePostPayload>(`/v1/groups/${data.groupId}/posts`, {
      title: data.title,
      content: data.content,
    });
    return response.data.post;
  },
};
