import { useAuth } from "@clerk/expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReportStatus, ReportTargetType } from "@freediving.ph/types";

import {
  getModerationReport,
  listModerationReports,
  updateModerationReportStatus,
} from "@/features/moderation/api/moderation-api";
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
      throw new FphgoApiError(401, "Sign in to review moderation reports.", null);
    }
    const token = await getToken();
    if (!token) {
      throw new FphgoApiError(401, "Sign in to review moderation reports.", null);
    }
    return token;
  };
};

const requireValue = (value: string, message: string) => {
  const trimmed = value.trim();
  if (!trimmed) throw new FphgoApiError(400, message, null);
  return trimmed;
};

export const useModerationReportsQuery = (
  filters: {
    status?: ReportStatus | "";
    targetType?: ReportTargetType | "";
  },
  enabled = true,
) => {
  const getRequiredToken = useRequiredToken();

  return useQuery({
    enabled,
    queryFn: async () =>
      listModerationReports(
        {
          limit: 50,
          status: filters.status || undefined,
          targetType: filters.targetType || undefined,
        },
        await getRequiredToken(),
      ),
    queryKey: mobileQueryKeys.moderation.reports(filters),
    retry: false,
    staleTime: 30 * 1000,
  });
};

export const useModerationReportQuery = (
  reportId: string | undefined,
  enabled = true,
) => {
  const getRequiredToken = useRequiredToken();

  return useQuery({
    enabled: enabled && Boolean(reportId),
    queryFn: async () =>
      getModerationReport(
        requireValue(reportId ?? "", "Report unavailable."),
        await getRequiredToken(),
      ),
    queryKey: mobileQueryKeys.moderation.report(reportId ?? ""),
    retry: false,
    staleTime: 30 * 1000,
  });
};

export const useModerationReportStatusMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: {
      note?: string;
      reportId: string;
      status: Exclude<ReportStatus, "open">;
    }) =>
      updateModerationReportStatus(
        requireValue(payload.reportId, "Report unavailable."),
        payload.status,
        payload.note,
        await getRequiredToken(),
      ),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.moderation.all,
      });
      queryClient.setQueryData(
        mobileQueryKeys.moderation.report(response.report.id),
        (current: unknown) =>
          current && typeof current === "object"
            ? { ...(current as object), report: response.report }
            : current,
      );
    },
  });
};
