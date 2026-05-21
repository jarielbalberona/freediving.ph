import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { safetyResourcesApi } from "../api/safetyResources";

export const useSafetyPages = () =>
  useQuery({
    queryKey: queryKeys.safety.pages(),
    queryFn: safetyResourcesApi.listPages,
  });

export const useSafetyContacts = () =>
  useQuery({
    queryKey: queryKeys.safety.contacts(),
    queryFn: safetyResourcesApi.listContacts,
  });
