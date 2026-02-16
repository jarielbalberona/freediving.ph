import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportAction } from "@/components/report/report-action";

const sampleRecords = [
  {
    athlete: "J. Ramos",
    discipline: "CWT",
    value: "72m",
    event: "Anilao Depth Series",
    status: "VERIFIED",
  },
  {
    athlete: "M. Santos",
    discipline: "STA",
    value: "5:21",
    event: "Cebu Pool Championship",
    status: "UNVERIFIED",
  },
];

export default function CompetitiveRecordsPage() {
  return (
    <main className="container mx-auto space-y-6 p-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">Competitive Records</h1>
        <p className="text-muted-foreground">
          Community records with explicit verification states. Unverified entries are always labeled.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Latest Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sampleRecords.map((record) => (
            <article key={`${record.athlete}-${record.discipline}`} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{record.athlete}</p>
                  <p className="text-sm text-muted-foreground">
                    {record.discipline} • {record.value} • {record.event}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={record.status === "VERIFIED" ? "default" : "outline"}>{record.status}</Badge>
                  <ReportAction targetType="COMPETITIVE_RECORD" targetId={`${record.athlete}-${record.discipline}`} />
                </div>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
