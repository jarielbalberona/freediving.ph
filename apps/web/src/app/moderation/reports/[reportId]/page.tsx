"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ApiErrorIssue, ReportStatus } from "@freediving.ph/types";

import { AuthGuard, RequirePermission } from "@/components/auth/guard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useClearUserReadOnly,
  useHideComment,
  useHideThread,
  useReportDetail,
  useSetUserReadOnly,
  useSuspendUser,
  useUnhideComment,
  useUnhideThread,
  useUnsuspendUser,
  useUpdateReportStatus,
} from "@/features/reports";
import { getApiError } from "@/lib/http/api-error";
import { cn } from "@/lib/utils";

type ActionKey =
  | "suspend"
  | "unsuspend"
  | "set_read_only"
  | "clear_read_only"
  | "hide_thread"
  | "unhide_thread"
  | "hide_comment"
  | "unhide_comment";

const STATUS_OPTIONS: Array<{ value: Exclude<ReportStatus, "open">; label: string }> = [
  { value: "reviewing", label: "Reviewing" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const parseReportId = (reportId: string | string[] | undefined): string => {
  if (Array.isArray(reportId)) return reportId[0] || "";
  return reportId || "";
};

const toIssueText = (issues?: ApiErrorIssue[]): string[] => {
  if (!issues || issues.length === 0) return [];
  return issues.map((issue) => {
    const path = Array.isArray(issue.path) ? issue.path.join(".") : issue.path;
    return `${path || "field"}: ${issue.message}`;
  });
};

export default function ReportDetailPage({
  params,
}: {
  params: { reportId: string | string[] };
}) {
  const reportId = parseReportId(params.reportId);
  const reportDetailQuery = useReportDetail(reportId);

  const updateStatusMutation = useUpdateReportStatus();
  const suspendUserMutation = useSuspendUser();
  const unsuspendUserMutation = useUnsuspendUser();
  const setUserReadOnlyMutation = useSetUserReadOnly();
  const clearUserReadOnlyMutation = useClearUserReadOnly();
  const hideThreadMutation = useHideThread();
  const unhideThreadMutation = useUnhideThread();
  const hideCommentMutation = useHideComment();
  const unhideCommentMutation = useUnhideComment();

  const [nextStatus, setNextStatus] = useState<Exclude<ReportStatus, "open">>("reviewing");
  const [statusNote, setStatusNote] = useState("");
  const [confirmStatusUpdate, setConfirmStatusUpdate] = useState(false);

  const [selectedAction, setSelectedAction] = useState<ActionKey | null>(null);
  const [actionReason, setActionReason] = useState("");

  const report = reportDetailQuery.data?.report;
  const events = reportDetailQuery.data?.events ?? [];
  const reportDetailError = reportDetailQuery.error ? getApiError(reportDetailQuery.error) : null;
  const statusError = updateStatusMutation.error ? getApiError(updateStatusMutation.error) : null;

  const allActionMutations = useMemo(
    () => ({
      suspend: suspendUserMutation,
      unsuspend: unsuspendUserMutation,
      set_read_only: setUserReadOnlyMutation,
      clear_read_only: clearUserReadOnlyMutation,
      hide_thread: hideThreadMutation,
      unhide_thread: unhideThreadMutation,
      hide_comment: hideCommentMutation,
      unhide_comment: unhideCommentMutation,
    }),
    [
      suspendUserMutation,
      unsuspendUserMutation,
      setUserReadOnlyMutation,
      clearUserReadOnlyMutation,
      hideThreadMutation,
      unhideThreadMutation,
      hideCommentMutation,
      unhideCommentMutation,
    ],
  );

  const currentActionMutation = selectedAction ? allActionMutations[selectedAction] : null;
  const currentActionError = currentActionMutation?.error
    ? getApiError(currentActionMutation.error)
    : null;

  const resolveActionTarget = (action: ActionKey): string | null => {
    if (!report) return null;
    if (action === "suspend" || action === "unsuspend" || action === "set_read_only" || action === "clear_read_only") {
      return report.targetAppUserId || (report.targetType === "user" ? report.targetId : null);
    }
    if (action === "hide_thread" || action === "unhide_thread") {
      return report.targetType === "chika_thread" ? report.targetId : null;
    }
    if (action === "hide_comment" || action === "unhide_comment") {
      return report.targetType === "chika_comment" ? report.targetId : null;
    }
    return null;
  };

  const handleConfirmAction = async () => {
    if (!report || !selectedAction) return;
    const targetId = resolveActionTarget(selectedAction);
    if (!targetId) return;
    if (!actionReason.trim()) return;

    await allActionMutations[selectedAction].mutateAsync({
      targetId,
      payload: {
        reason: actionReason.trim(),
        reportId: report.id,
      },
    });

    setActionReason("");
    setSelectedAction(null);
  };

  const handleUpdateStatus = async () => {
    if (!report) return;
    await updateStatusMutation.mutateAsync({
      reportId: report.id,
      payload: {
        status: nextStatus,
        note: statusNote.trim() || undefined,
      },
    });
    setConfirmStatusUpdate(false);
  };

  const availableActions: Array<{ key: ActionKey; label: string; description: string }> = [];
  if (report?.targetType === "user") {
    availableActions.push(
      { key: "suspend", label: "Suspend user", description: "Set user account to suspended." },
      { key: "unsuspend", label: "Unsuspend user", description: "Restore user account from suspension." },
      { key: "set_read_only", label: "Set read-only", description: "Prevent user write actions." },
      { key: "clear_read_only", label: "Clear read-only", description: "Restore full write access." },
    );
  }
  if (report?.targetType === "chika_thread") {
    availableActions.push(
      { key: "hide_thread", label: "Hide thread", description: "Hide this chika thread." },
      { key: "unhide_thread", label: "Unhide thread", description: "Restore this chika thread." },
    );
  }
  if (report?.targetType === "chika_comment") {
    availableActions.push(
      { key: "hide_comment", label: "Hide comment", description: "Hide this chika comment." },
      { key: "unhide_comment", label: "Unhide comment", description: "Restore this chika comment." },
    );
  }

  return (
    <AuthGuard
      requiredRole="MODERATOR"
      title="Moderator access required"
      description="Only moderators can access triage reports."
    >
      <RequirePermission
        perm="reports.review"
        title="Missing reports.review permission"
        description="Your account does not have access to moderation triage."
      >
        <div className="container mx-auto p-6">
          <div className="mb-4">
            <Link href="/moderation/reports" className={cn(buttonVariants({ variant: "outline" }))}>
              Back to reports
            </Link>
          </div>

          {reportDetailQuery.isPending ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-52 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : null}

          {reportDetailError ? (
            <Alert variant="destructive">
              <AlertTitle>Failed to load report</AlertTitle>
              <AlertDescription>
                [{reportDetailError.code}] {reportDetailError.message}
              </AlertDescription>
            </Alert>
          ) : null}

          {!reportDetailQuery.isPending && !reportDetailError && !report ? (
            <Alert>
              <AlertTitle>Report not found</AlertTitle>
              <AlertDescription>No report data was returned for this id.</AlertDescription>
            </Alert>
          ) : null}

          {report ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Report #{report.id}
                    <Badge variant="outline">{report.status}</Badge>
                    <Badge variant="secondary">{report.targetType}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Target ID:</span> <span className="font-mono">{report.targetId}</span>
                  </p>
                  {report.targetAppUserId ? (
                    <p>
                      <span className="font-medium">Target App User ID:</span>{" "}
                      <span className="font-mono">{report.targetAppUserId}</span>
                    </p>
                  ) : null}
                  <p>
                    <span className="font-medium">Reason:</span> {report.reasonCode}
                  </p>
                  {report.details ? (
                    <p>
                      <span className="font-medium">Details:</span> {report.details}
                    </p>
                  ) : null}
                  <p>
                    <span className="font-medium">Created:</span> {formatDateTime(report.createdAt)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Report status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="next-status">Next status</Label>
                    <select
                      id="next-status"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-72"
                      value={nextStatus}
                      onChange={(event) => setNextStatus(event.target.value as Exclude<ReportStatus, "open">)}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status-note">Audit note (optional)</Label>
                    <Textarea
                      id="status-note"
                      placeholder="Why are you changing this status?"
                      value={statusNote}
                      onChange={(event) => setStatusNote(event.target.value)}
                    />
                  </div>
                  {statusError ? (
                    <Alert variant="destructive">
                      <AlertTitle>Status update failed</AlertTitle>
                      <AlertDescription>
                        <div>
                          [{statusError.code}] {statusError.message}
                        </div>
                        {toIssueText(statusError.issues).map((issueText) => (
                          <div key={issueText}>{issueText}</div>
                        ))}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  {confirmStatusUpdate ? (
                    <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm">
                      Confirm updating status to <span className="font-medium">{nextStatus}</span>.
                      <div className="mt-3 flex gap-2">
                        <Button onClick={handleUpdateStatus} disabled={updateStatusMutation.isPending}>
                          {updateStatusMutation.isPending ? "Updating..." : "Confirm update"}
                        </Button>
                        <Button variant="outline" onClick={() => setConfirmStatusUpdate(false)} disabled={updateStatusMutation.isPending}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button onClick={() => setConfirmStatusUpdate(true)} disabled={updateStatusMutation.isPending}>
                      Update report status
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Moderation actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {availableActions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No moderation actions for this target type.</p>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {availableActions.map((action) => (
                        <Button
                          key={action.key}
                          variant={selectedAction === action.key ? "default" : "outline"}
                          onClick={() => {
                            setSelectedAction(action.key);
                            setActionReason("");
                          }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}

                  {selectedAction ? (
                    <div className="space-y-3 rounded-md border p-3">
                      <p className="text-sm text-muted-foreground">
                        {availableActions.find((action) => action.key === selectedAction)?.description}
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="action-reason">Reason (required)</Label>
                        <Textarea
                          id="action-reason"
                          placeholder="State the moderation reason for audit trail."
                          value={actionReason}
                          onChange={(event) => setActionReason(event.target.value)}
                        />
                      </div>

                      {currentActionError ? (
                        <Alert variant="destructive">
                          <AlertTitle>Action failed</AlertTitle>
                          <AlertDescription>
                            <div>
                              [{currentActionError.code}] {currentActionError.message}
                            </div>
                            {toIssueText(currentActionError.issues).map((issueText) => (
                              <div key={issueText}>{issueText}</div>
                            ))}
                          </AlertDescription>
                        </Alert>
                      ) : null}

                      <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm">
                        This operation is destructive or access-altering. Confirm before sending.
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleConfirmAction}
                          disabled={!actionReason.trim() || Boolean(currentActionMutation?.isPending)}
                        >
                          {currentActionMutation?.isPending ? "Applying..." : "Confirm action"}
                        </Button>
                        <Button
                          variant="outline"
                          disabled={Boolean(currentActionMutation?.isPending)}
                          onClick={() => {
                            setSelectedAction(null);
                            setActionReason("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Audit events</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No events found.</p>
                  ) : (
                    events.map((eventItem) => (
                      <div key={eventItem.id} className="rounded-md border p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{eventItem.eventType}</Badge>
                          <span className="text-sm text-muted-foreground">{formatDateTime(eventItem.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm">
                          <span className="font-medium">Actor:</span> {eventItem.actorUserId}
                        </p>
                        {eventItem.fromStatus || eventItem.toStatus ? (
                          <p className="text-sm">
                            <span className="font-medium">Status:</span> {eventItem.fromStatus || "-"} {"->"} {eventItem.toStatus || "-"}
                          </p>
                        ) : null}
                        {eventItem.note ? (
                          <p className="text-sm">
                            <span className="font-medium">Note:</span> {eventItem.note}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </RequirePermission>
    </AuthGuard>
  );
}
