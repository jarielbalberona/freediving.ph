import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sampleLogs = [
  { title: "Static Session", metric: "CO2 table, 8 rounds", visibility: "PRIVATE" },
  { title: "Pool Dynamics", metric: "4 x 50m DYN", visibility: "BUDDIES_ONLY" },
  { title: "Depth Day", metric: "3 x 30m CWT", visibility: "PUBLIC" },
];

export default function TrainingLogsPage() {
  return (
    <main className="container mx-auto space-y-6 p-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">Training Logs</h1>
        <p className="text-muted-foreground">
          Training sessions are private-first and can be shared with buddies or publicly.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sampleLogs.map((log) => (
            <article key={log.title} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-semibold">{log.title}</p>
                <p className="text-sm text-muted-foreground">{log.metric}</p>
              </div>
              <Badge variant={log.visibility === "PUBLIC" ? "default" : "outline"}>{log.visibility}</Badge>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
