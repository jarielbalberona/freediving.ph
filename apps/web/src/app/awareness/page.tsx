import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const awarenessPosts = [
  {
    title: "Avoid touching reef surfaces",
    type: "Reminder",
    source: "https://www.noaa.gov/",
  },
  {
    title: "Bring reusable water containers on trips",
    type: "Etiquette",
    source: "https://www.unep.org/",
  },
];

export default function AwarenessPage() {
  return (
    <main className="container mx-auto space-y-6 p-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">Ocean Awareness Wall</h1>
        <p className="text-muted-foreground">
          Awareness reminders and advisories with visible sources for factual claims.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Awareness Feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {awarenessPosts.map((post) => (
            <article key={post.title} className="rounded-md border p-3">
              <p className="font-semibold">{post.title}</p>
              <p className="text-sm text-muted-foreground">{post.type}</p>
              <a className="text-sm underline" href={post.source} rel="noreferrer" target="_blank">
                Source link
              </a>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
