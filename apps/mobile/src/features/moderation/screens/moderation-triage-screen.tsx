import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import type {
  ReportListItem,
  ReportStatus,
  ReportTargetType,
} from "@freediving.ph/types";

import { StatusPill } from "@/components/social";
import {
  MobileCard,
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import {
  useModerationReportQuery,
  useModerationReportsQuery,
  useModerationReportStatusMutation,
} from "@/features/moderation/hooks/use-moderation";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const titleCase = (value: string | undefined) =>
  (value ?? "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Unknown";

const statusOptions: Array<ReportStatus | ""> = [
  "",
  "open",
  "reviewing",
  "resolved",
  "rejected",
];

const targetTypeOptions: Array<ReportTargetType | ""> = [
  "",
  "user",
  "message",
  "chika_thread",
  "chika_comment",
  "dive_site_update",
];

const coerceReportStatus = (value: string | undefined): ReportStatus | "" =>
  statusOptions.includes((value ?? "") as ReportStatus | "")
    ? ((value ?? "") as ReportStatus | "")
    : "open";

const coerceTargetType = (value: string | undefined): ReportTargetType | "" =>
  targetTypeOptions.includes((value ?? "") as ReportTargetType | "")
    ? ((value ?? "") as ReportTargetType | "")
    : "";

const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  Alert.alert(title, message, [
    { style: "cancel", text: "Cancel" },
    { onPress: onConfirm, style: "destructive", text: "Confirm" },
  ]);
};

const reportSearchValue = (report: ReportListItem) =>
  [
    report.id,
    report.targetType,
    report.targetId,
    report.targetAppUserId,
    report.reporterUserId,
    report.reasonCode,
    report.details,
    report.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export function ModerationTriageScreen() {
  const params = useLocalSearchParams<{
    reportId?: string | string[];
    status?: ReportStatus | ReportStatus[];
    targetType?: ReportTargetType | ReportTargetType[];
  }>();
  const [status, setStatus] = useState<ReportStatus | "">(
    coerceReportStatus(firstParam(params.status)),
  );
  const [targetType, setTargetType] = useState<ReportTargetType | "">(
    coerceTargetType(firstParam(params.targetType)),
  );
  const [selectedReportId, setSelectedReportId] = useState(
    firstParam(params.reportId) ?? "",
  );
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const reportsQuery = useModerationReportsQuery({ status, targetType });
  const detailQuery = useModerationReportQuery(selectedReportId, Boolean(selectedReportId));
  const statusMutation = useModerationReportStatusMutation();
  const reports = reportsQuery.data?.items ?? [];
  const filteredReports = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return reports;
    return reports.filter((report) => reportSearchValue(report).includes(needle));
  }, [reports, search]);
  const selectedReport =
    detailQuery.data?.report ??
    reports.find((report) => report.id === selectedReportId);
  const reportEvents = detailQuery.data?.events ?? [];

  const updateStatus = (
    report: ReportListItem,
    nextStatus: Exclude<ReportStatus, "open">,
  ) => {
    const trimmedNote = note.trim();
    if (!trimmedNote) {
      setMessage("Add an audit note before changing report status.");
      return;
    }
    statusMutation.mutate(
      { note: trimmedNote, reportId: report.id, status: nextStatus },
      {
        onError: () => setMessage("Could not update report status."),
        onSuccess: () => {
          setMessage("Report status updated.");
          setNote("");
        },
      },
    );
  };

  return (
    <MobileScrollScreen subtitle="Reports" title="Moderation">
      <MobileSection title="Triage queue">
        <View className="gap-3">
          <TextInput
            autoCapitalize="none"
            className="min-h-11 rounded-2xl border border-border bg-card px-3 text-foreground"
            onChangeText={setSearch}
            placeholder="Search report, target, reporter"
            placeholderTextColor="#64748b"
            value={search}
          />
          <View className="flex-row flex-wrap gap-2">
            {statusOptions.map((option) => (
              <MobileButton
                key={option || "all"}
                variant={status === option ? "primary" : "secondary"}
                onPress={() => setStatus(option)}
              >
                {option ? titleCase(option) : "All"}
              </MobileButton>
            ))}
          </View>
          <View className="flex-row flex-wrap gap-2">
            {targetTypeOptions.map((option) => (
              <MobileButton
                key={option || "all-targets"}
                variant={targetType === option ? "primary" : "secondary"}
                onPress={() => setTargetType(option)}
              >
                {option ? titleCase(option) : "All targets"}
              </MobileButton>
            ))}
          </View>
          {reportsQuery.isLoading ? (
            <MobileLoadingState message="Loading report queue." />
          ) : null}
          {reportsQuery.error ? (
            <View className="gap-3">
              <MobileErrorState
                message="This account cannot open the moderation queue, or the queue is unavailable."
                title="Moderation unavailable"
              />
              <MobileButton
                variant="secondary"
                onPress={() => void reportsQuery.refetch()}
              >
                Try again
              </MobileButton>
            </View>
          ) : null}
          {!reportsQuery.isLoading &&
          !reportsQuery.error &&
          filteredReports.length === 0 ? (
            <MobileEmptyState
              description="No reports match the current filters."
              title="No reports"
            />
          ) : null}

          {filteredReports.map((report) => (
            <MobileCard key={report.id}>
              <View className="gap-3">
                <View className="gap-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {titleCase(report.targetType)} report
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    <StatusPill
                      tone={report.status === "open" ? "primary" : "neutral"}
                    >
                      {titleCase(report.status)}
                    </StatusPill>
                    <StatusPill>{titleCase(report.reasonCode)}</StatusPill>
                  </View>
                </View>
                <Text className="text-xs text-muted-foreground">
                  Target: {report.targetId}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Reporter: {report.reporterUserId}
                </Text>
                {report.details ? (
                  <Text className="text-sm leading-5 text-muted-foreground">
                    {report.details}
                  </Text>
                ) : null}
                <MobileButton
                  variant={selectedReportId === report.id ? "primary" : "secondary"}
                  onPress={() => {
                    setSelectedReportId(report.id);
                    setMessage(null);
                  }}
                >
                  {selectedReportId === report.id ? "Selected" : "Open report"}
                </MobileButton>
              </View>
            </MobileCard>
          ))}
        </View>
      </MobileSection>

      {selectedReportId ? (
        <MobileSection title="Report detail">
          {detailQuery.isLoading ? (
            <MobileLoadingState message="Loading report detail." />
          ) : null}
          {detailQuery.error ? (
            <MobileErrorState
              message="Report detail is unavailable for this account."
              title="Report unavailable"
            />
          ) : null}
          {selectedReport ? (
            <MobileCard>
              <View className="gap-3">
                <View className="flex-row flex-wrap gap-2">
                  <StatusPill tone="primary">
                    {titleCase(selectedReport.status)}
                  </StatusPill>
                  <StatusPill>{titleCase(selectedReport.targetType)}</StatusPill>
                  <StatusPill>{titleCase(selectedReport.reasonCode)}</StatusPill>
                </View>
                <Text className="text-xs text-muted-foreground">
                  Report ID: {selectedReport.id}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Target ID: {selectedReport.targetId}
                </Text>
                {selectedReport.targetAppUserId ? (
                  <Text className="text-xs text-muted-foreground">
                    Target user: {selectedReport.targetAppUserId}
                  </Text>
                ) : null}
                {message ? (
                  <Text className="text-sm text-muted-foreground">{message}</Text>
                ) : null}
                <TextInput
                  className="min-h-20 rounded-2xl border border-border bg-background p-3 text-foreground"
                  multiline
                  onChangeText={setNote}
                  placeholder="Audit note required before status changes"
                  placeholderTextColor="#64748b"
                  value={note}
                />
                <View className="flex-row flex-wrap gap-2">
                  <MobileButton
                    disabled={statusMutation.isPending}
                    variant="secondary"
                    onPress={() => updateStatus(selectedReport, "reviewing")}
                  >
                    Mark reviewing
                  </MobileButton>
                  <MobileButton
                    disabled={statusMutation.isPending}
                    onPress={() => updateStatus(selectedReport, "resolved")}
                  >
                    Resolve
                  </MobileButton>
                  <MobileButton
                    disabled={statusMutation.isPending}
                    variant="danger"
                    onPress={() =>
                      confirmAction(
                        "Reject report",
                        "Reject this report after recording the audit note?",
                        () => updateStatus(selectedReport, "rejected"),
                      )
                    }
                  >
                    Reject
                  </MobileButton>
                </View>
                <Text className="text-xs leading-5 text-muted-foreground">
                  Mobile moderation is triage-only here. User sanctions and
                  content hide/unhide actions stay on web until a stricter mobile
                  destructive-action policy is approved.
                </Text>
              </View>
            </MobileCard>
          ) : null}
          {reportEvents.length > 0 ? (
            <View className="mt-3 gap-2">
              {reportEvents.map((event) => (
                <Text className="text-xs text-muted-foreground" key={event.id}>
                  {titleCase(event.eventType)} ·{" "}
                  {event.toStatus ? titleCase(event.toStatus) : "No status"} ·{" "}
                  {event.note || "No note"}
                </Text>
              ))}
            </View>
          ) : null}
        </MobileSection>
      ) : null}
    </MobileScrollScreen>
  );
}
