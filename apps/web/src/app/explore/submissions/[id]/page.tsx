"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { AuthGuard } from "@/components/auth/guard";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
import { getApiErrorMessage } from "@/lib/http/api-error";

export default function ExploreSubmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id ?? "");

  const detailQuery = useQuery({
    queryKey: ["explore-submission", id],
    enabled: id.length > 0,
    queryFn: async () => (await exploreApi.getMySubmissionById(id)).submission,
  });

  const item = detailQuery.data;

  return (
    <AuthGuard title="Sign in to view your submission" description="Submission detail is restricted to the owner and moderators.">
      <div className="min-h-full bg-[linear-gradient(180deg,_#fafaf9_0%,_#ffffff_100%)] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <Link href="/explore/submissions" className={buttonVariants({ variant: "outline" })}>
              Back to submissions
            </Link>
            <Link href="/explore/submit" className={buttonVariants()}>
              Submit another site
            </Link>
          </div>

          {detailQuery.error ? (
            <p className="text-sm text-red-600">{getApiErrorMessage(detailQuery.error, "Failed to load submission")}</p>
          ) : null}

          {item ? (
            <Card className="rounded-[24px] bg-white/90">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl text-zinc-950">{item.name}</CardTitle>
                  <p className="text-sm text-zinc-600">{item.area}</p>
                </div>
                <Badge>{item.moderationState}</Badge>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-zinc-700">
                <p><span className="font-medium text-zinc-950">Description:</span> {item.description || "Not provided"}</p>
                <p><span className="font-medium text-zinc-950">Difficulty:</span> {item.difficulty}</p>
                <p><span className="font-medium text-zinc-950">Hazards:</span> {item.hazards.length > 0 ? item.hazards.join(", ") : "None listed"}</p>
                <p><span className="font-medium text-zinc-950">Best season:</span> {item.bestSeason || "Not provided"}</p>
                <p><span className="font-medium text-zinc-950">Typical conditions:</span> {item.typicalConditions || "Not provided"}</p>
                <p><span className="font-medium text-zinc-950">Access:</span> {item.access || "Not provided"}</p>
                <p><span className="font-medium text-zinc-950">Fees:</span> {item.fees || "Not provided"}</p>
                {item.moderationReason ? (
                  <p><span className="font-medium text-zinc-950">Moderator note:</span> {item.moderationReason}</p>
                ) : null}
                <div className="grid gap-2 rounded-2xl bg-zinc-50 p-4 text-xs text-zinc-500">
                  <p>Submitted: {new Date(item.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(item.updatedAt).toLocaleString()}</p>
                  {item.reviewedAt ? <p>Reviewed: {new Date(item.reviewedAt).toLocaleString()}</p> : null}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </AuthGuard>
  );
}
