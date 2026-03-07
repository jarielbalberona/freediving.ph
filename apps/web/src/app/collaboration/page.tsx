"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportAction } from "@/components/report/report-action";
import { useCollaborationPosts } from "@/features/collaboration";

export default function CollaborationPage() {
  const { data: posts = [] } = useCollaborationPosts();

  return (
    <main className="container mx-auto space-y-6 p-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">Collaboration Hub</h1>
        <p className="text-muted-foreground">Creator/diver collaboration posts without contract/payment workflows.</p>
      </section>

      <Badge variant="outline">Controlled MVP: moderation-first collaboration board</Badge>

      <Card>
        <CardHeader>
          <CardTitle>Board Posts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {posts.map((post) => (
            <article key={post.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{post.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {post.postType} • {post.region || "No region"} • {post.specialty || "General"}
                  </p>
                </div>
                <ReportAction targetType="OTHER" targetId={`collaboration:${post.id}`} />
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
