"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AuthGuard, RequirePermission } from "@/components/auth/guard";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
import type { ExploreSiteEditValues } from "@freediving.ph/types";
import { getApiErrorMessage } from "@/lib/http/api-error";

const formatValue = (
  value: string | number | string[] | undefined,
): string => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "Not provided";
  }
  if (value === undefined || value === "") {
    return "Not provided";
  }
  return String(value);
};

const fieldRows: Array<{
  key: keyof ExploreSiteEditValues;
  label: string;
}> = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
  { key: "difficulty", label: "Difficulty" },
  { key: "depthMinM", label: "Min depth" },
  { key: "depthMaxM", label: "Max depth" },
  { key: "hazards", label: "Hazards" },
  { key: "bestSeason", label: "Best season" },
  { key: "typicalConditions", label: "Typical conditions" },
  { key: "access", label: "Access" },
  { key: "fees", label: "Fees" },
];

export default function ModerationExploreSiteEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params.id ?? "");
  const [reason, setReason] = useState("");

  const detailQuery = useQuery({
    queryKey: ["moderation-explore-site-edit", id],
    enabled: id.length > 0,
    queryFn: async () =>
      (await exploreApi.getModerationSiteEditById(id)).proposal,
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      exploreApi.approveSiteEdit(id, { reason: reason.trim() || undefined }),
    onSuccess: () => router.push("/moderation/explore-sites"),
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      exploreApi.rejectSiteEdit(id, { reason: reason.trim() || undefined }),
    onSuccess: () => router.push("/moderation/explore-sites"),
  });

  const item = detailQuery.data;
  const actionError = approveMutation.error ?? rejectMutation.error;

  return (
    <AuthGuard
      requiredRole="MODERATOR"
      title="Moderator access required"
      description="Only moderators can review dive site edits."
    >
      <RequirePermission
        perm="explore.moderate"
        title="Missing explore.moderate permission"
        description="Your account cannot review dive site edits."
      >
        <div className="container mx-auto max-w-4xl p-6">
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/moderation/explore-sites"
              className={buttonVariants({ variant: "outline" })}
            >
              Back to pending list
            </Link>
          </div>

          {detailQuery.error ? (
            <p className="text-sm text-destructive">
              {getApiErrorMessage(
                detailQuery.error,
                "Failed to load site edit",
              )}
            </p>
          ) : null}

          {item ? (
            <Card>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{item.current.name}</CardTitle>
                  <Badge variant="secondary">{item.state}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.siteArea} / suggested by{" "}
                  {item.submittedByDisplayName ||
                    item.submittedByAppUserId ||
                    "member"}
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="grid grid-cols-[9rem_1fr_1fr] border-b border-border bg-muted/50 px-4 py-3 text-sm font-medium">
                    <span>Field</span>
                    <span>Current</span>
                    <span>Proposed</span>
                  </div>
                  {fieldRows.map((row) => {
                    const current = item.current[row.key];
                    const proposed = item.proposed[row.key];
                    const changed =
                      formatValue(current) !== formatValue(proposed);
                    return (
                      <div
                        key={row.key}
                        className="grid grid-cols-[9rem_1fr_1fr] gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0"
                      >
                        <span className="font-medium">{row.label}</span>
                        <span className="text-muted-foreground">
                          {formatValue(current)}
                        </span>
                        <span
                          className={
                            changed ? "font-medium text-foreground" : ""
                          }
                        >
                          {formatValue(proposed)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="moderation-reason">Moderator note</Label>
                  <Textarea
                    id="moderation-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </div>

                {actionError ? (
                  <p className="text-sm text-destructive">
                    {getApiErrorMessage(
                      actionError,
                      "Failed to apply moderation action",
                    )}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={
                      approveMutation.isPending || rejectMutation.isPending
                    }
                    onClick={() => approveMutation.mutate()}
                  >
                    {approveMutation.isPending ? "Applying..." : "Apply edit"}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={
                      approveMutation.isPending || rejectMutation.isPending
                    }
                    onClick={() => rejectMutation.mutate()}
                  >
                    {rejectMutation.isPending ? "Rejecting..." : "Reject edit"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </RequirePermission>
    </AuthGuard>
  );
}
