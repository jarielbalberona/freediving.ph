"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { AuthGuard } from "@/components/auth/guard";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
import { getApiErrorMessage } from "@/lib/http/api-error";

const badgeVariant = (state: string) =>
  state === "approved" ? "default" as const :
  state === "pending" ? "secondary" as const :
  "destructive" as const;

export default function ExploreSubmissionsPage() {
  const submissionsQuery = useQuery({
    queryKey: ["explore-submissions"],
    queryFn: () => exploreApi.listMySubmissions(),
  });

  const items = submissionsQuery.data?.items ?? [];

  return (
    <AuthGuard title="Sign in to view your submissions" description="Submission status is only visible to the owner and moderators.">
      <div className="min-h-full bg-gradient-to-b from-muted/30 to-background px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <section className="rounded-4xl border border-border bg-card/90 p-6 shadow-sm">
            <Badge className="rounded-full bg-primary text-primary-foreground">Explore workflow</Badge>
            <h1 className="mt-3 font-serif text-4xl tracking-tight text-zinc-950">My site submissions</h1>
            <p className="mt-2 text-sm text-zinc-600">Pending means waiting for review. Hidden means rejected or removed from public Explore.</p>
          </section>

          <div className="flex justify-end">
            <Link href="/explore/submit" className={buttonVariants()}>
              Submit another site
            </Link>
          </div>

          {submissionsQuery.error ? (
            <p className="text-sm text-red-600">{getApiErrorMessage(submissionsQuery.error, "Failed to load submissions")}</p>
          ) : null}

          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="bg-card/90">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl text-zinc-950">{item.name}</CardTitle>
                    <p className="text-sm text-zinc-600">{item.area}</p>
                  </div>
                  <Badge variant={badgeVariant(item.moderationState)}>{item.moderationState}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-zinc-700">{item.typicalConditions || "No conditions summary submitted."}</p>
                  {item.moderationReason ? (
                    <p className="text-sm text-zinc-600">Moderator note: {item.moderationReason}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                    <span>Submitted {new Date(item.createdAt).toLocaleString()}</span>
                    {item.reviewedAt ? <span>Reviewed {new Date(item.reviewedAt).toLocaleString()}</span> : null}
                  </div>
                  <Link href={`/explore/submissions/${item.id}`} className={buttonVariants({ variant: "outline" })}>
                    Open submission
                  </Link>
                </CardContent>
              </Card>
            ))}

            {!submissionsQuery.isLoading && items.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-sm text-zinc-600">No submissions yet. Start with a new dive site proposal.</CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
