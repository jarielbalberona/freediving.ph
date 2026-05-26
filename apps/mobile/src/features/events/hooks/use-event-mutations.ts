import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateEventPostRequest,
  EventDetailResponse,
  EventPostsResponse,
} from "@freediving.ph/types";

import {
  createEventPost,
  joinEvent,
  leaveEvent,
  removeEventInterest,
  removeEventPostFish,
  setEventInterest,
  setEventPostFish,
} from "@/features/events/api/events-api";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

const useRequiredToken = () => {
  const { getToken } = useAuth();
  return async () => {
    const token = await getToken();
    if (!token) throw new FphgoApiError(401, "Sign in to continue.", null);
    return token;
  };
};

const requireEventId = (eventId: string) => {
  if (!eventId) throw new FphgoApiError(400, "Event unavailable.", null);
  return eventId;
};

export const useEventAttendanceMutation = (slug: string, eventId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (action: "join" | "leave") => {
      const token = await getRequiredToken();
      const id = requireEventId(eventId);
      return action === "join" ? joinEvent(id, token) : leaveEvent(id, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.events.detail(slug) });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.events.lists() });
    },
  });
};

export const useEventInterestMutation = (slug: string, eventId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (interested: boolean) => {
      const token = await getRequiredToken();
      const id = requireEventId(eventId);
      return interested
        ? setEventInterest(id, token)
        : removeEventInterest(id, token);
    },
    onSuccess: (response) => {
      queryClient.setQueryData<EventDetailResponse>(
        mobileQueryKeys.events.detail(slug),
        response,
      );
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.events.detail(slug) });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.events.lists() });
    },
  });
};

export const useCreateEventPostMutation = (slug: string, eventId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: Pick<CreateEventPostRequest, "bodyMarkdown" | "title">) =>
      createEventPost(
        requireEventId(eventId),
        { ...payload, postType: "general" },
        await getRequiredToken(),
      ),
    onSuccess: (response) => {
      queryClient.setQueryData<EventPostsResponse>(
        mobileQueryKeys.events.posts(eventId),
        (current) => ({
          posts: current?.posts
            ? [response.post, ...current.posts.filter((post) => post.id !== response.post.id)]
            : [response.post],
        }),
      );
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.events.posts(eventId) });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.events.detail(slug) });
    },
  });
};

export const useEventPostFishMutation = (slug: string, eventId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: { postId: string; hasFish: boolean }) => {
      const token = await getRequiredToken();
      const id = requireEventId(eventId);
      return payload.hasFish
        ? removeEventPostFish(id, payload.postId, token)
        : setEventPostFish(id, payload.postId, token);
    },
    onSuccess: (response) => {
      queryClient.setQueryData<EventPostsResponse>(
        mobileQueryKeys.events.posts(eventId),
        (current) => ({
          posts:
            current?.posts.map((post) =>
              post.id === response.postId
                ? {
                    ...post,
                    fishReactionCount: response.fishReactionCount,
                    viewerHasFishReacted: response.viewerHasFishReacted,
                  }
                : post,
            ) ?? [],
        }),
      );
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.events.posts(eventId) });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.events.detail(slug) });
    },
  });
};
