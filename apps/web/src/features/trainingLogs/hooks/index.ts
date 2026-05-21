import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTrainingLogRequest } from "@freediving.ph/types";

import { queryKeys } from "@/lib/query/query-keys";

import { trainingLogsApi } from "../api/trainingLogs";

export const useTrainingLogs = () =>
  useQuery({
    queryKey: queryKeys.trainingLogs.list(),
    queryFn: trainingLogsApi.list,
  });

export const useCreateTrainingLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTrainingLogRequest) =>
      trainingLogsApi.create(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.trainingLogs.all }),
  });
};
