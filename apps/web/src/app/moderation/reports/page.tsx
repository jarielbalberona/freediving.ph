"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReportStatus, ReportTargetType } from "@freediving.ph/types";

import { AuthGuard, RequirePermission } from "@/components/auth/guard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useReports } from "@/features/reports";
import { getApiError } from "@/lib/http/api-error";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

const STATUS_OPTIONS: Array<{ value: "all" | ReportStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Reviewing" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

const TARGET_OPTIONS: Array<{ value: "all" | ReportTargetType; label: string }> = [
  { value: "all", label: "All targets" },
  { value: "user", label: "User" },
  { value: "message", label: "Message" },
  { value: "chika_thread", label: "Chika thread" },
  { value: "chika_comment", label: "Chika comment" },
];

const toDateValue = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const inDateRange = (createdAt: string, fromDate: string, toDate: string): boolean => {
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return false;

  if (fromDate) {
    const fromTime = new Date(`${fromDate}T00:00:00.000Z`).getTime();
    if (!Number.isNaN(fromTime) && createdTime < fromTime) return false;
  }

  if (toDate) {
    const toTime = new Date(`${toDate}T23:59:59.999Z`).getTime();
    if (!Number.isNaN(toTime) && createdTime > toTime) return false;
  }

  return true;
};

const statusBadgeVariant = (status: string) =>
  status === "open" ? "default" as const :
  status === "reviewing" ? "secondary" as const :
  status === "resolved" ? "outline" as const :
  "destructive" as const;

export default function ModerationReportsPage() {
  const [status, setStatus] = useState<"all" | ReportStatus>("all");
  const [targetType, setTargetType] = useState<"all" | ReportTargetType>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const reportsQuery = useReports({
    status: status === "all" ? undefined : status,
    targetType: targetType === "all" ? undefined : targetType,
    createdFrom: fromDate || undefined,
    createdTo: toDate || undefined,
    limit: PAGE_SIZE,
  });

  const filteredItems = useMemo(() => {
    const items = reportsQuery.data?.items ?? [];
    if (!fromDate && !toDate) return items;
    return items.filter((item) => inDateRange(item.createdAt, fromDate, toDate));
  }, [reportsQuery.data?.items, fromDate, toDate]);

  const nextCursor = reportsQuery.data?.nextCursor;
  const queryError = reportsQuery.error ? getApiError(reportsQuery.error) : null;

  const handleClearFilters = () => {
    setStatus("all");
    setTargetType("all");
    setFromDate("");
    setToDate("");
  };

  const hasActiveFilters = status !== "all" || targetType !== "all" || fromDate || toDate;

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
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Moderation Triage</h1>
              <p className="text-muted-foreground">Review reports and move them to resolution.</p>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Filters</CardTitle>
                {hasActiveFilters ? (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="report-status-filter">Status</Label>
                  <select
                    id="report-status-filter"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={status}
                    onChange={(event) => setStatus(event.target.value as "all" | ReportStatus)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-target-filter">Target type</Label>
                  <select
                    id="report-target-filter"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={targetType}
                    onChange={(event) => setTargetType(event.target.value as "all" | ReportTargetType)}
                  >
                    {TARGET_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-date-from">From date</Label>
                  <Input
                    id="report-date-from"
                    type="date"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-date-to">To date</Label>
                  <Input
                    id="report-date-to"
                    type="date"
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Reports list */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Reports</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{filteredItems.length} shown</Badge>
                  {reportsQuery.isFetching && !reportsQuery.isPending ? (
                    <Badge variant="secondary">Refreshing…</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {reportsQuery.isPending ? (
                  <>
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </>
                ) : null}

                {queryError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Failed to load reports</AlertTitle>
                    <AlertDescription>
                      [{queryError.code}] {queryError.message}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {!reportsQuery.isPending && !queryError && filteredItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reports matched the current filters.</p>
                ) : null}

                {!reportsQuery.isPending && !queryError
                  ? filteredItems.map((report) => (
                      <div key={report.id} className="rounded-md border p-4 transition-colors hover:bg-muted/50">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Report #{report.id}</span>
                              <Badge variant={statusBadgeVariant(report.status)}>{report.status}</Badge>
                              <Badge variant="secondary">{report.targetType}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Target: <span className="font-mono">{report.targetId}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {toDateValue(report.createdAt)} · {report.reasonCode}
                            </p>
                          </div>
                          <Link
                            href={`/moderation/reports/${report.id}`}
                            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
                          >
                            Open report
                          </Link>
                        </div>
                      </div>
                    ))
                  : null}

                {!reportsQuery.isPending && !queryError && nextCursor ? (
                  <div className="pt-2 text-center">
                    <p className="mb-2 text-xs text-muted-foreground">
                      More reports available. Adjust filters or load the next page.
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </RequirePermission>
    </AuthGuard>
  );
}
