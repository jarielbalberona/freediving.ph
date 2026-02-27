import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateReportRequest, ModerationActionRequest, UpdateReportStatusRequest } from "@freediving.ph/types";

import { reportsApi } from "../api/reports";

export const useCreateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReportRequest) => reportsApi.createReport(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports", "list"] });
    },
  });
};

export const useUpdateReportStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, payload }: { reportId: string; payload: UpdateReportStatusRequest }) =>
      reportsApi.updateReportStatus(reportId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reports", "list"] });
      queryClient.invalidateQueries({ queryKey: ["reports", "detail", variables.reportId] });
    },
  });
};

const useModerationAction = (
  mutationFn: (targetId: string, payload: ModerationActionRequest) => Promise<unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ targetId, payload }: { targetId: string; payload: ModerationActionRequest }) =>
      mutationFn(targetId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reports", "list"] });
      if (variables.payload.reportId) {
        queryClient.invalidateQueries({ queryKey: ["reports", "detail", variables.payload.reportId] });
      }
    },
  });
};

export const useSuspendUser = () => {
  return useModerationAction((targetId, payload) => reportsApi.suspendUser(targetId, payload));
};

export const useUnsuspendUser = () => {
  return useModerationAction((targetId, payload) => reportsApi.unsuspendUser(targetId, payload));
};

export const useSetUserReadOnly = () => {
  return useModerationAction((targetId, payload) => reportsApi.setUserReadOnly(targetId, payload));
};

export const useClearUserReadOnly = () => {
  return useModerationAction((targetId, payload) => reportsApi.clearUserReadOnly(targetId, payload));
};

export const useHideThread = () => {
  return useModerationAction((targetId, payload) => reportsApi.hideThread(targetId, payload));
};

export const useUnhideThread = () => {
  return useModerationAction((targetId, payload) => reportsApi.unhideThread(targetId, payload));
};

export const useHideComment = () => {
  return useModerationAction((targetId, payload) => reportsApi.hideComment(targetId, payload));
};

export const useUnhideComment = () => {
  return useModerationAction((targetId, payload) => reportsApi.unhideComment(targetId, payload));
};
