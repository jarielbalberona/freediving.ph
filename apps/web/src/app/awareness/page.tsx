"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportAction } from "@/components/report/report-action";
import { useAwarenessPosts } from "@/features/awareness";

export default function AwarenessPage() {
  const { data: posts = [] } = useAwarenessPosts();

  return (
    <main className="container mx-auto space-y-6 p-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">Ocean Awareness Wall</h1>
        <p className="text-muted-foreground">Awareness reminders and advisories with visible sources for factual claims.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Awareness Feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {posts.map((post) => (
            <article key={post.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{post.title}</p>
                  <p className="text-sm text-muted-foreground">{post.topicType}</p>
                  {post.sourceUrl ? (
                    <a className="text-sm underline" href={post.sourceUrl} rel="noreferrer" target="_blank">
                      Source link
                    </a>
                  ) : null}
                </div>
                <ReportAction targetType="POST" targetId={String(post.id)} />
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
