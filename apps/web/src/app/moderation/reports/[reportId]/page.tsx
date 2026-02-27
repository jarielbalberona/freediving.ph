"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import type { ApiErrorIssue, ReportStatus } from "@freediving.ph/types";
import { toast } from "sonner";

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

interface ActionDef {
  key: ActionKey;
  label: string;
  description: string;
  variant: "destructive" | "outline";
  group: "user" | "content";
}

const STATUS_OPTIONS: Array<{ value: Exclude<ReportStatus, "open">; label: string }> = [
  { value: "reviewing", label: "Reviewing" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

const ACTION_LABELS: Record<ActionKey, string> = {
  suspend: "User suspended",
  unsuspend: "User unsuspended",
  set_read_only: "User set to read-only",
  clear_read_only: "User read-only cleared",
  hide_thread: "Thread hidden",
  unhide_thread: "Thread restored",
  hide_comment: "Comment hidden",
  unhide_comment: "Comment restored",
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const toIssueText = (issues?: ApiErrorIssue[]): string[] => {
  if (!issues || issues.length === 0) return [];
  return issues.map((issue) => {
    const path = issue.path.join(".");
    return `${path || "field"}: ${issue.message}`;
  });
};

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = use(params);
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
    const isUserAction =
      action === "suspend" ||
      action === "unsuspend" ||
      action === "set_read_only" ||
      action === "clear_read_only";

    if (isUserAction) {
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

    try {
      await allActionMutations[selectedAction].mutateAsync({
        targetId,
        payload: {
          reason: actionReason.trim(),
          reportId: report.id,
        },
      });
      toast.success(ACTION_LABELS[selectedAction]);
      setActionReason("");
      setSelectedAction(null);
    } catch (error) {
      const parsed = getApiError(error);
      toast.error(`Action failed: ${parsed.message}`);
    }
  };

  const handleUpdateStatus = async () => {
    if (!report) return;
    try {
      await updateStatusMutation.mutateAsync({
        reportId: report.id,
        payload: {
          status: nextStatus,
          note: statusNote.trim() || undefined,
        },
      });
      toast.success(`Report status updated to "${nextStatus}"`);
      setConfirmStatusUpdate(false);
      setStatusNote("");
    } catch (error) {
      const parsed = getApiError(error);
      toast.error(`Status update failed: ${parsed.message}`);
    }
  };

  const hasUserTarget =
    report?.targetType === "user" || Boolean(report?.targetAppUserId);

  const availableActions: ActionDef[] = [];

  if (hasUserTarget) {
    availableActions.push(
      { key: "suspend", label: "Suspend user", description: "Set user account to suspended.", variant: "destructive", group: "user" },
      { key: "unsuspend", label: "Unsuspend user", description: "Restore user account from suspension.", variant: "outline", group: "user" },
      { key: "set_read_only", label: "Set read-only", description: "Prevent user write actions.", variant: "destructive", group: "user" },
      { key: "clear_read_only", label: "Clear read-only", description: "Restore full write access.", variant: "outline", group: "user" },
    );
  }
  if (report?.targetType === "chika_thread") {
    availableActions.push(
      { key: "hide_thread", label: "Hide thread", description: "Hide this chika thread from public view.", variant: "destructive", group: "content" },
      { key: "unhide_thread", label: "Unhide thread", description: "Restore this chika thread to public view.", variant: "outline", group: "content" },
    );
  }
  if (report?.targetType === "chika_comment") {
    availableActions.push(
      { key: "hide_comment", label: "Hide comment", description: "Hide this chika comment from public view.", variant: "destructive", group: "content" },
      { key: "unhide_comment", label: "Unhide comment", description: "Restore this chika comment to public view.", variant: "outline", group: "content" },
    );
  }

  const contentActions = availableActions.filter((a) => a.group === "content");
  const userActions = availableActions.filter((a) => a.group === "user");

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
              {/* Report summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Report #{report.id}
                    <ReportStatusBadge status={report.status} />
                    <Badge variant="secondary">{report.targetType}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Target ID:</span>{" "}
                    <span className="font-mono">{report.targetId}</span>
                  </p>
                  {report.targetAppUserId ? (
                    <p>
                      <span className="font-medium">Target user:</span>{" "}
                      <span className="font-mono">{report.targetAppUserId}</span>
                    </p>
                  ) : null}
                  <p>
                    <span className="font-medium">Reporter:</span>{" "}
                    <span className="font-mono">{report.reporterUserId}</span>
                  </p>
                  <p>
                    <span className="font-medium">Reason:</span> {report.reasonCode}
                  </p>
                  {report.details ? (
                    <p>
                      <span className="font-medium">Details:</span> {report.details}
                    </p>
                  ) : null}
                  {report.evidenceUrls && report.evidenceUrls.length > 0 ? (
                    <div>
                      <span className="font-medium">Evidence:</span>
                      <ul className="ml-4 mt-1 list-disc text-muted-foreground">
                        {report.evidenceUrls.map((url) => (
                          <li key={url} className="break-all">{url}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p>
                    <span className="font-medium">Created:</span> {formatDateTime(report.createdAt)}
                  </p>
                  <p>
                    <span className="font-medium">Updated:</span> {formatDateTime(report.updatedAt)}
                  </p>
                </CardContent>
              </Card>

              {/* Status update */}
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
                    <WarningBox>
                      Confirm updating status to <span className="font-medium">{nextStatus}</span>.
                      <div className="mt-3 flex gap-2">
                        <Button onClick={handleUpdateStatus} disabled={updateStatusMutation.isPending}>
                          {updateStatusMutation.isPending ? "Updating..." : "Confirm update"}
                        </Button>
                        <Button variant="outline" onClick={() => setConfirmStatusUpdate(false)} disabled={updateStatusMutation.isPending}>
                          Cancel
                        </Button>
                      </div>
                    </WarningBox>
                  ) : (
                    <Button onClick={() => setConfirmStatusUpdate(true)} disabled={updateStatusMutation.isPending}>
                      Update report status
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Moderation actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Moderation actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {availableActions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No moderation actions for this target type.</p>
                  ) : null}

                  {contentActions.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Content</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {contentActions.map((action) => (
                          <Button
                            key={action.key}
                            variant={selectedAction === action.key ? "default" : action.variant}
                            onClick={() => { setSelectedAction(action.key); setActionReason(""); }}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {userActions.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">User account</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {userActions.map((action) => (
                          <Button
                            key={action.key}
                            variant={selectedAction === action.key ? "default" : action.variant}
                            onClick={() => { setSelectedAction(action.key); setActionReason(""); }}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}

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

                      <WarningBox>
                        This action is destructive or access-altering. Confirm before sending.
                      </WarningBox>

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

              {/* Audit events */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Audit events
                    <Badge variant="outline">{events.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No events recorded yet.</p>
                  ) : (
                    events.map((eventItem) => (
                      <div key={eventItem.id} className="rounded-md border p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{eventItem.eventType}</Badge>
                          <span className="text-sm text-muted-foreground">{formatDateTime(eventItem.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm">
                          <span className="font-medium">Actor:</span>{" "}
                          <span className="font-mono">{eventItem.actorUserId}</span>
                        </p>
                        {eventItem.fromStatus || eventItem.toStatus ? (
                          <p className="text-sm">
                            <span className="font-medium">Status:</span> {eventItem.fromStatus || "–"} → {eventItem.toStatus || "–"}
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

function ReportStatusBadge({ status }: { status: string }) {
  const variant =
    status === "open" ? "default" :
    status === "reviewing" ? "secondary" :
    status === "resolved" ? "outline" :
    "destructive";

  return <Badge variant={variant}>{status}</Badge>;
}

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
      {children}
    </div>
  );
}
