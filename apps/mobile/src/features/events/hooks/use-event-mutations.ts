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
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return async () => {
    if (!isLoaded) {
      throw new FphgoApiError(
        401,
        "Checking your session. Try again in a moment.",
        null,
      );
    }
    if (!isSignedIn) {
      throw new FphgoApiError(401, "Sign in to continue.", null);
    }
    const token = await getToken();
    if (!token) throw new FphgoApiError(401, "Sign in to continue.", null);
    return token;
  };
};

const requireEventId = (eventId: string) => {
  const trimmedEventId = eventId.trim();
  if (!trimmedEventId) throw new FphgoApiError(400, "Event unavailable.", null);
  return trimmedEventId;
};

const requireEventPostId = (postId: string) => {
  const trimmedPostId = postId.trim();
  if (!trimmedPostId) {
    throw new FphgoApiError(400, "Event update unavailable.", null);
  }
  return trimmedPostId;
};

const requireEventPostPayload = (
  payload: Pick<CreateEventPostRequest, "bodyMarkdown" | "title">,
): CreateEventPostRequest => {
  const bodyMarkdown = payload.bodyMarkdown.trim();
  if (!bodyMarkdown) {
    throw new FphgoApiError(400, "Write an update before posting.", null);
  }
  return {
    bodyMarkdown,
    postType: "general",
    title: payload.title?.trim() || undefined,
  };
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
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.events.detail(slug),
      });
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
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.events.detail(slug),
      });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.events.lists() });
    },
  });
};

export const useCreateEventPostMutation = (slug: string, eventId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (
      payload: Pick<CreateEventPostRequest, "bodyMarkdown" | "title">,
    ) =>
      createEventPost(
        requireEventId(eventId),
        requireEventPostPayload(payload),
        await getRequiredToken(),
      ),
    onSuccess: (response) => {
      queryClient.setQueryData<EventPostsResponse>(
        mobileQueryKeys.events.posts(eventId),
        (current) => ({
          posts: current?.posts
            ? [
                response.post,
                ...current.posts.filter((post) => post.id !== response.post.id),
              ]
            : [response.post],
        }),
      );
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.events.posts(eventId),
      });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.events.detail(slug),
      });
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
      const postId = requireEventPostId(payload.postId);
      return payload.hasFish
        ? removeEventPostFish(id, postId, token)
        : setEventPostFish(id, postId, token);
    },
    onSuccess: (response) => {
      queryClient.setQueryData<EventPostsResponse>(
        mobileQueryKeys.events.posts(eventId),
        (current) =>
          current
            ? {
                posts: current.posts.map((post) =>
                  post.id === response.postId
                    ? {
                        ...post,
                        fishReactionCount: response.fishReactionCount,
                        viewerHasFishReacted: response.viewerHasFishReacted,
                      }
                    : post,
                ),
              }
            : current,
      );
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.events.posts(eventId),
      });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.events.detail(slug),
      });
    },
  });
};
