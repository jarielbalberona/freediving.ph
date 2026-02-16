import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateCompetitiveRecordRequest } from "@freediving.ph/types";

import { competitiveRecordsApi } from "../api/competitiveRecords";

export const useCompetitiveRecords = () =>
  useQuery({
    queryKey: ["competitive-records"],
    queryFn: competitiveRecordsApi.list,
  });

export const useCreateCompetitiveRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCompetitiveRecordRequest) => competitiveRecordsApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["competitive-records"] }),
  });
};
