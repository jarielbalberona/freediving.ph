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
  createdAt: string;
  updatedAt: string;
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
