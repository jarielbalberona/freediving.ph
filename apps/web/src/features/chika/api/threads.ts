import type {
  ChikaCategoryListResponse,
  ChikaCategoryResponse,
  ChikaCommentListResponse,
  ChikaCommentResponse,
  ChikaThreadListResponse,
  ChikaThreadResponse,
} from "@freediving.ph/types";

import { fphgoFetchClient } from "@/lib/api/fphgo-fetch-client";
import { routes } from "@/lib/api/fphgo-routes";

export type ChikaThreadView = ChikaThreadResponse;
export type ChikaCommentView = ChikaCommentResponse;

export interface CreateThreadPayload {
  title: string;
  content: string;
  categoryId: string;
}

export type ThreadReactionType = "upvote" | "downvote";
export type CommentReactionType = "upvote" | "downvote";

export const threadsApi = {
  getCategories: async (): Promise<ChikaCategoryResponse[]> => {
    const response = await fphgoFetchClient<ChikaCategoryListResponse>(
      routes.v1.chika.categories(),
    );
    return response.items ?? [];
  },

  getAll: async (category?: string): Promise<ChikaThreadView[]> => {
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    const response = await fphgoFetchClient<ChikaThreadListResponse>(
      `${routes.v1.chika.threads.list()}${query}`,
    );
    return response.items ?? [];
  },

  getById: async (id: string): Promise<ChikaThreadView> => {
    return fphgoFetchClient<ChikaThreadResponse>(routes.v1.chika.threads.byId(id));
  },

  create: async (payload: CreateThreadPayload): Promise<ChikaThreadView> => {
    return fphgoFetchClient<ChikaThreadResponse>(routes.v1.chika.threads.list(), {
      method: "POST",
      body: {
        title: payload.title,
        content: payload.content,
        categoryId: payload.categoryId,
      },
    });
  },

  getComments: async (threadId: string): Promise<ChikaCommentView[]> => {
    const response = await fphgoFetchClient<ChikaCommentListResponse>(
      routes.v1.chika.threads.comments(threadId),
    );
    return response.items ?? [];
  },

  createComment: async (
    threadId: string,
    content: string,
    parentCommentId?: string,
  ): Promise<ChikaCommentView> => {
    return fphgoFetchClient<ChikaCommentResponse>(routes.v1.chika.threads.comments(threadId), {
      method: "POST",
      body: { content, ...(parentCommentId ? { parentCommentId } : {}) },
    });
  },

  setReaction: async (threadId: string, type: ThreadReactionType): Promise<void> => {
    await fphgoFetchClient(routes.v1.chika.threads.reactions(threadId), {
      method: "POST",
      body: { type },
    });
  },

  removeReaction: async (threadId: string): Promise<void> => {
    await fphgoFetchClient(routes.v1.chika.threads.reactions(threadId), {
      method: "DELETE",
    });
  },

  setCommentReaction: async (commentId: string, type: CommentReactionType): Promise<void> => {
    await fphgoFetchClient(routes.v1.chika.comments.reactions(commentId), {
      method: "POST",
      body: { type },
    });
  },

  removeCommentReaction: async (commentId: string): Promise<void> => {
    await fphgoFetchClient(routes.v1.chika.comments.reactions(commentId), {
      method: "DELETE",
    });
  },
};
