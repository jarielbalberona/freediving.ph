import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TrustCard } from "@/components/trust-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBuddyFinderSharePreviewServer } from "@/features/buddies/api/buddy-finder.server";

type PageProps = {
  params: Promise<{ intentId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { intentId } = await params;
  try {
    const data = await getBuddyFinderSharePreviewServer(intentId);
    const title = data.intent.diveSiteName
      ? `Buddy for ${data.intent.diveSiteName}`
      : `Buddy Finder in ${data.intent.area}`;
    const description = `${data.intent.area}. ${data.intent.intentType.replace("_", " ")} · ${data.intent.timeWindow.replace("_", " ")}. Safe preview only.`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
      },
    };
  } catch {
    return { title: "Buddy intent not found" };
  }
}

export default async function BuddySharePage({ params }: PageProps) {
  const { intentId } = await params;

  try {
    const data = await getBuddyFinderSharePreviewServer(intentId);
    return (
      <div className="min-h-full bg-gradient-to-b from-muted/30 to-background px-4 py-2">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-primary">Freediving Philippines</p>
            <h1 className="font-serif text-4xl text-foreground">
              {data.intent.diveSiteName ? `Looking for a buddy at ${data.intent.diveSiteName}` : "Buddy Finder preview"}
            </h1>
            <p className="text-muted-foreground">{data.intent.area}</p>
          </div>

          <Card className="border-border/80 bg-card">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge>{data.intent.intentType.replace("_", " ")}</Badge>
                <Badge variant="outline">{data.intent.timeWindow.replace("_", " ")}</Badge>
                {data.intent.dateStart ? <Badge variant="outline">From {data.intent.dateStart}</Badge> : null}
              </div>
              <CardTitle className="text-2xl text-foreground">Safe preview only</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-foreground/80">
              <p>{data.intent.notePreview || "Create an account to view the full note and message this diver."}</p>
              <TrustCard
                emailVerified={data.intent.emailVerified}
                phoneVerified={data.intent.phoneVerified}
                certLevel={data.intent.certLevel}
                buddyCount={data.intent.buddyCount}
                reportCount={data.intent.reportCount}
              />
              <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
                <p className="font-medium">Message and match</p>
                <p className="mt-1 text-sm text-primary-foreground/90">
                  Create an account to message this diver. Exact contact is shared only after request acceptance.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
