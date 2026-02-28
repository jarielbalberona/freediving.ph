"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AuthGuard, RequirePermission } from "@/components/auth/guard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
import { getApiErrorMessage } from "@/lib/http/api-error";

export default function ModerationExploreSiteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params.id ?? "");
  const [reason, setReason] = useState("");

  const detailQuery = useQuery({
    queryKey: ["moderation-explore-site", id],
    enabled: id.length > 0,
    queryFn: async () => (await exploreApi.getModerationSiteById(id)).submission,
  });

  const approveMutation = useMutation({
    mutationFn: () => exploreApi.approveSite(id, { reason: reason.trim() || undefined }),
    onSuccess: () => router.push("/moderation/explore-sites"),
  });

  const rejectMutation = useMutation({
    mutationFn: () => exploreApi.rejectSite(id, { reason: reason.trim() || undefined }),
    onSuccess: () => router.push("/moderation/explore-sites"),
  });

  const item = detailQuery.data;
  const actionError = approveMutation.error ?? rejectMutation.error;

  return (
    <AuthGuard requiredRole="MODERATOR" title="Moderator access required" description="Only moderators can review dive site submissions.">
      <RequirePermission perm="explore.moderate" title="Missing explore.moderate permission" description="Your account cannot review dive site submissions.">
        <div className="container mx-auto max-w-3xl p-6">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/moderation/explore-sites" className={buttonVariants({ variant: "outline" })}>
              Back to pending list
            </Link>
          </div>

          {detailQuery.error ? (
            <p className="text-sm text-red-600">{getApiErrorMessage(detailQuery.error, "Failed to load site submission")}</p>
          ) : null}

          {item ? (
            <Card>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{item.area}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm"><span className="font-medium">Difficulty:</span> {item.difficulty}</p>
                <p className="text-sm"><span className="font-medium">Hazards:</span> {item.hazards.length > 0 ? item.hazards.join(", ") : "None listed"}</p>
                <p className="text-sm"><span className="font-medium">Best season:</span> {item.bestSeason || "Not provided"}</p>
                <p className="text-sm"><span className="font-medium">Typical conditions:</span> {item.typicalConditions || "Not provided"}</p>
                <p className="text-sm"><span className="font-medium">Access:</span> {item.access || "Not provided"}</p>
                <p className="text-sm"><span className="font-medium">Fees:</span> {item.fees || "Not provided"}</p>
                <p className="text-sm"><span className="font-medium">Contact info:</span> {item.contactInfo || "Not provided"}</p>

                <div className="space-y-2">
                  <Label htmlFor="moderation-reason">Moderator note</Label>
                  <Textarea id="moderation-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
                </div>

                {actionError ? (
                  <p className="text-sm text-red-600">{getApiErrorMessage(actionError, "Failed to apply moderation action")}</p>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Button className="rounded-full" disabled={approveMutation.isPending || rejectMutation.isPending} onClick={() => approveMutation.mutate()}>
                    {approveMutation.isPending ? "Approving..." : "Approve site"}
                  </Button>
                  <Button variant="destructive" className="rounded-full" disabled={approveMutation.isPending || rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>
                    {rejectMutation.isPending ? "Rejecting..." : "Reject site"}
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
