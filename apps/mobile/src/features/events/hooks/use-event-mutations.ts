import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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

export const useEventAttendanceMutation = (slug: string, eventId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (action: "join" | "leave") => {
      const token = await getRequiredToken();
      return action === "join" ? joinEvent(eventId, token) : leaveEvent(eventId, token);
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
      return interested
        ? setEventInterest(eventId, token)
        : removeEventInterest(eventId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.events.detail(slug) });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.events.lists() });
    },
  });
};

export const useCreateEventPostMutation = (slug: string, eventId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (bodyMarkdown: string) =>
      createEventPost(eventId, bodyMarkdown, await getRequiredToken()),
    onSuccess: () => {
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
      return payload.hasFish
        ? removeEventPostFish(eventId, payload.postId, token)
        : setEventPostFish(eventId, payload.postId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.events.detail(slug) });
    },
  });
};
