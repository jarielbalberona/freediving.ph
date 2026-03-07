import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTrainingLogRequest } from "@freediving.ph/types";

import { trainingLogsApi } from "../api/trainingLogs";

export const useTrainingLogs = () =>
  useQuery({
    queryKey: ["training-logs"],
    queryFn: trainingLogsApi.list,
  });

export const useCreateTrainingLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTrainingLogRequest) => trainingLogsApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["training-logs"] }),
  });
};
