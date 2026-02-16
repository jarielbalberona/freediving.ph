import type { ApiEnvelope, SafetyContact, SafetyPage } from "@freediving.ph/types";

import { axiosInstance } from "@/lib/http/axios";

export const safetyResourcesApi = {
  listPages: async (): Promise<SafetyPage[]> => {
    const response = await axiosInstance.get<ApiEnvelope<SafetyPage[]>>("/safety-resources/pages");
    return response.data.data;
  },
  listContacts: async (): Promise<SafetyContact[]> => {
    const response = await axiosInstance.get<ApiEnvelope<SafetyContact[]>>("/safety-resources/contacts");
    return response.data.data;
  },
};
