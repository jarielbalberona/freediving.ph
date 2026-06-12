import { useAuth } from "@clerk/expo";
import type {
  CreateDiveMemoryRequest,
  CreateManualJourneyEntryRequest,
  UpdateDiveMemoryRequest,
  UpdateDiveMemoryTagRequest,
  UpdateManualJourneyEntryRequest,
  UpdatePassportSettingsRequest,
} from "@freediving.ph/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createDiveMemory,
  createJourneyEntry,
  deleteDiveMemory,
  deleteJourneyEntry,
  getMyDiveMemoryTags,
  getMyDiveMemories,
  getMyPassportSettings,
  updateDiveMemory,
  updateDiveMemoryTag,
  updateJourneyEntry,
  updateMyPassportSettings,
} from "@/features/profiles/api/profiles-api";
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

const invalidateProfileExperience = (
  queryClient: ReturnType<typeof useQueryClient>,
  username: string,
) => {
  void queryClient.invalidateQueries({
    queryKey: mobileQueryKeys.profile.diveMemories(username),
  });
  void queryClient.invalidateQueries({
    queryKey: mobileQueryKeys.profile.diveMemoriesPages(username),
  });
  void queryClient.invalidateQueries({
    queryKey: mobileQueryKeys.profile.diveMap(username),
  });
  void queryClient.invalidateQueries({
    queryKey: mobileQueryKeys.profile.journey(username),
  });
  void queryClient.invalidateQueries({
    queryKey: mobileQueryKeys.profile.passport(username),
  });
};

export const useGetMyDiveMemoriesMutation = () => {
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async () => getMyDiveMemories(await getRequiredToken()),
  });
};

export const useGetMyDiveMemoryTagsMutation = () => {
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async () => getMyDiveMemoryTags(await getRequiredToken()),
  });
};

export const useGetMyPassportSettingsMutation = () => {
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async () => getMyPassportSettings(await getRequiredToken()),
  });
};

export const useCreateDiveMemoryMutation = (username: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: CreateDiveMemoryRequest) =>
      createDiveMemory(payload, await getRequiredToken()),
    onSuccess: () => {
      invalidateProfileExperience(queryClient, username);
      void queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.profile.myDiveMemories(),
      });
    },
  });
};

export const useUpdateDiveMemoryMutation = (username: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async ({
      memoryId,
      payload,
    }: {
      memoryId: string;
      payload: UpdateDiveMemoryRequest;
    }) => updateDiveMemory(memoryId, payload, await getRequiredToken()),
    onSuccess: () => {
      invalidateProfileExperience(queryClient, username);
      void queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.profile.myDiveMemories(),
      });
    },
  });
};

export const useDeleteDiveMemoryMutation = (username: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (memoryId: string) =>
      deleteDiveMemory(memoryId, await getRequiredToken()),
    onSuccess: () => {
      invalidateProfileExperience(queryClient, username);
      void queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.profile.myDiveMemories(),
      });
    },
  });
};

export const useUpdateDiveMemoryTagMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async ({
      memoryId,
      payload,
    }: {
      memoryId: string;
      payload: UpdateDiveMemoryTagRequest;
    }) => updateDiveMemoryTag(memoryId, payload, await getRequiredToken()),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.profile.myDiveMemoryTags(),
      });
    },
  });
};

export const useCreateJourneyEntryMutation = (username: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: CreateManualJourneyEntryRequest) =>
      createJourneyEntry(payload, await getRequiredToken()),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.profile.journey(username),
      });
      void queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.profile.passport(username),
      });
    },
  });
};

export const useUpdateJourneyEntryMutation = (username: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async ({
      entryId,
      payload,
    }: {
      entryId: string;
      payload: UpdateManualJourneyEntryRequest;
    }) => updateJourneyEntry(entryId, payload, await getRequiredToken()),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.profile.journey(username),
      });
      void queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.profile.passport(username),
      });
    },
  });
};

export const useDeleteJourneyEntryMutation = (username: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (entryId: string) =>
      deleteJourneyEntry(entryId, await getRequiredToken()),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.profile.journey(username),
      });
      void queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.profile.passport(username),
      });
    },
  });
};

export const useUpdatePassportSettingsMutation = (username: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: UpdatePassportSettingsRequest) =>
      updateMyPassportSettings(payload, await getRequiredToken()),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.profile.passport(username),
      });
      void queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.profile.myPassportSettings(),
      });
    },
  });
};
