import { useQuery } from "@tanstack/react-query";

import { safetyResourcesApi } from "../api/safetyResources";

export const useSafetyPages = () =>
  useQuery({
    queryKey: ["safety", "pages"],
    queryFn: safetyResourcesApi.listPages,
  });

export const useSafetyContacts = () =>
  useQuery({
    queryKey: ["safety", "contacts"],
    queryFn: safetyResourcesApi.listContacts,
  });
