import {
  Thread,
  CreateThreadData,
  UpdateThreadData,
  ThreadWithUser,
  ThreadComment,
} from "@freediving.ph/types";

import { fphgoFetchClient } from "@/lib/api/fphgo-fetch";
import { routes } from "@/lib/api/fphgo-routes";

type FphgoThread = {
  id: string;
  title: string;
  mode: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

type FphgoThreadsResponse = {
  items?: FphgoThread[];
};

type FphgoComment = {
  id: number;
  threadId: string;
  pseudonym: string;
  content: string;
  createdAt: string;
};

type FphgoCommentsResponse = {
  items?: FphgoComment[];
};

const toNumericId = (value: string, fallback = 0): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : fallback;
};

const toThreadWithUser = (item: FphgoThread): ThreadWithUser => ({
  thread: {
    id: toNumericId(item.id),
    userId: toNumericId(item.createdByUserId),
    title: item.title,
    content: "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  },
  user: {
    id: toNumericId(item.createdByUserId),
    username: `member-${item.createdByUserId.slice(0, 8)}`,
    alias: null,
    email: null,
  },
  commentCount: 0,
  upvotes: 0,
  downvotes: 0,
});

export const threadsApi = {
  getAll: async (): Promise<ThreadWithUser[]> => {
    const response = await fphgoFetchClient<FphgoThreadsResponse>(
      routes.v1.chika.threads.list(),
    );
    return (response.items ?? []).map(toThreadWithUser);
  },

  getById: async (id: number): Promise<ThreadWithUser> => {
    const response = await fphgoFetchClient<FphgoThread>(
      routes.v1.chika.threads.byId(id),
    );
    return toThreadWithUser(response);
  },

  create: async (data: CreateThreadData): Promise<Thread> => {
    const response = await fphgoFetchClient<FphgoThread>(
      routes.v1.chika.threads.list(),
      {
        method: "POST",
        body: {
          title: data.title,
          mode: "open",
        },
      },
    );
    return {
      id: toNumericId(response.id),
      title: response.title,
      content: data.content,
      author: {
        id: toNumericId(response.createdByUserId),
        username: null,
        alias: null,
      },
      tags: data.tags ?? [],
      likeCount: 0,
      commentCount: 0,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
    };
  },

  update: async (id: number, data: UpdateThreadData): Promise<Thread> => {
    const response = await fphgoFetchClient<FphgoThread>(
      routes.v1.chika.threads.byId(id),
      {
        method: "PATCH",
        body: {
          title: data.title ?? "Untitled",
        },
      },
    );
    return {
      id: toNumericId(response.id),
      title: response.title,
      content: data.content ?? "",
      author: {
        id: toNumericId(response.createdByUserId),
        username: null,
        alias: null,
      },
      tags: data.tags ?? [],
      likeCount: 0,
      commentCount: 0,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
    };
  },

  delete: async (id: number): Promise<void> => {
    await fphgoFetchClient(routes.v1.chika.threads.byId(id), {
      method: "DELETE",
    });
  },

  like: async (id: number): Promise<void> => {
    await fphgoFetchClient(routes.v1.chika.threads.reactions(id), {
      method: "POST",
      body: { type: "1" },
    });
  },

  unlike: async (id: number): Promise<void> => {
    await fphgoFetchClient(routes.v1.chika.threads.reactions(id), {
      method: "POST",
      body: { type: "0" },
    });
  },

  removeReaction: async (id: number): Promise<void> => {
    await fphgoFetchClient(routes.v1.chika.threads.reactions(id), {
      method: "DELETE",
    });
  },

  getComments: async (threadId: number): Promise<ThreadComment[]> => {
    const response = await fphgoFetchClient<FphgoCommentsResponse>(
      routes.v1.chika.threads.comments(threadId),
    );
    return (response.items ?? []).map((item) => ({
      comment: {
        id: item.id,
        threadId,
        userId: 0,
        parentId: null,
        content: item.content,
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
      },
      user: {
        id: 0,
        username: item.pseudonym,
        alias: item.pseudonym,
      },
    }));
  },

  createComment: async (threadId: number, content: string): Promise<void> => {
    await fphgoFetchClient(routes.v1.chika.threads.comments(threadId), {
      method: "POST",
      body: {
        content,
      },
    });
  },
};

