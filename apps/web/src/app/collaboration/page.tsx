import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const posts = [
  { type: "Looking For", title: "Safety diver for shoot", region: "Anilao" },
  { type: "Offering", title: "Underwater photo package", region: "Cebu" },
];

export default function CollaborationPage() {
  return (
    <main className="container mx-auto space-y-6 p-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">Collaboration Hub</h1>
        <p className="text-muted-foreground">
          Collaboration posts for creators and divers. Contracts and payments stay outside the platform in this phase.
        </p>
      </section>

      <Badge variant="outline">Controlled MVP: no contracting or payment workflows</Badge>

      <Card>
        <CardHeader>
          <CardTitle>Board Posts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {posts.map((post) => (
            <article key={post.title} className="rounded-md border p-3">
              <p className="font-semibold">{post.title}</p>
              <p className="text-sm text-muted-foreground">
                {post.type} • {post.region}
              </p>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
