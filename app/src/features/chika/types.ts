export interface Thread {
  id: number;
  title: string;
  content: string;
  author: {
    id: number;
    username: string;
    alias: string;
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
  tags?: string[];
  authorId?: number;
  sortBy?: 'newest' | 'oldest' | 'most_liked' | 'most_commented';
}

export interface ThreadWithUser {
  thread: Thread;
  user: {
    id: number;
    username: string;
    alias: string;
  };
  commentCount: number;
  upvotes: number;
  downvotes: number;
}
