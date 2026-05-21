import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CompetitiveRecordFilters,
  CreateCompetitiveRecordRequest,
} from "@freediving.ph/types";

import { queryKeys } from "@/lib/query/query-keys";

import { competitiveRecordsApi } from "../api/competitiveRecords";

export const useCompetitiveRecords = () =>
  useQuery({
    queryKey: queryKeys.competitiveRecords.lists(),
    queryFn: competitiveRecordsApi.list,
  });

export const useCompetitiveRecordsFiltered = (
  filters: CompetitiveRecordFilters,
) =>
  useQuery({
    queryKey: queryKeys.competitiveRecords.list(
      filters as Record<string, unknown>,
    ),
    queryFn: () => competitiveRecordsApi.listWithFilters(filters),
  });

export const useCreateCompetitiveRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCompetitiveRecordRequest) =>
      competitiveRecordsApi.create(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.competitiveRecords.all,
      }),
  });
};
