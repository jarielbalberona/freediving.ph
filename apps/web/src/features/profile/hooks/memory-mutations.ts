"use client";

import type {
  CreateDiveMemoryRequest,
  UpdateDiveMemoryRequest,
  UpdateDiveMemoryTagRequest,
} from "@freediving.ph/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { profileApi } from "@/features/profile/api/profileApi";
import { queryKeys } from "@/lib/query/query-keys";
import { normalizeUsername } from "@/lib/routes";

const invalidateMemoryReads = (
  queryClient: ReturnType<typeof useQueryClient>,
  username: string,
) => {
  const normalizedUsername = normalizeUsername(username);
  void queryClient.invalidateQueries({
    queryKey: queryKeys.profile.diveMemories(normalizedUsername),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.profile.diveMemoriesPages(normalizedUsername),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.profile.diveMap(normalizedUsername),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.profile.journey(normalizedUsername),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.profile.passport(normalizedUsername),
  });
};

export const useCreateDiveMemory = (username: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDiveMemoryRequest) =>
      profileApi.createDiveMemory(payload),
    onSuccess: () => {
      invalidateMemoryReads(queryClient, username);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.profile.myDiveMemories(),
      });
    },
  });
};

export const useUpdateDiveMemory = (username: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memoryId,
      payload,
    }: {
      memoryId: string;
      payload: UpdateDiveMemoryRequest;
    }) => profileApi.updateDiveMemory(memoryId, payload),
    onSuccess: () => {
      invalidateMemoryReads(queryClient, username);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.profile.myDiveMemories(),
      });
    },
  });
};

export const useDeleteDiveMemory = (username: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memoryId: string) => profileApi.deleteDiveMemory(memoryId),
    onSuccess: () => {
      invalidateMemoryReads(queryClient, username);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.profile.myDiveMemories(),
      });
    },
  });
};

export const useUpdateDiveMemoryTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memoryId,
      payload,
    }: {
      memoryId: string;
      payload: UpdateDiveMemoryTagRequest;
    }) => profileApi.updateDiveMemoryTag(memoryId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.profile.myDiveMemoryTags(),
      });
    },
  });
};
