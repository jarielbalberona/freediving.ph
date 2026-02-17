"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ReportAction } from "@/components/report/report-action";
import { useCompetitiveRecordsFiltered, useCreateCompetitiveRecord } from "@/features/competitiveRecords";

export default function CompetitiveRecordsPage() {
  const [queryAthlete, setQueryAthlete] = useState("");
  const [queryDiscipline, setQueryDiscipline] = useState("");
  const [queryEvent, setQueryEvent] = useState("");
  const [athleteName, setAthleteName] = useState("");
  const [discipline, setDiscipline] = useState("CWT");
  const [resultValue, setResultValue] = useState("");
  const [resultUnit, setResultUnit] = useState("m");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const { data: records = [] } = useCompetitiveRecordsFiltered({
    athlete: queryAthlete || undefined,
    discipline: queryDiscipline || undefined,
    eventName: queryEvent || undefined,
    limit: 50,
    offset: 0,
  });
  const createRecord = useCreateCompetitiveRecord();

  return (
    <main className="container mx-auto space-y-6 p-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">Competitive Records</h1>
        <p className="text-muted-foreground">Submit records as unverified, with moderator verification workflow.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Submit Record</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">
          <Input placeholder="Athlete name" value={athleteName} onChange={(e) => setAthleteName(e.target.value)} />
          <Input placeholder="Discipline" value={discipline} onChange={(e) => setDiscipline(e.target.value)} />
          <Input placeholder="Result value" value={resultValue} onChange={(e) => setResultValue(e.target.value)} />
          <Input placeholder="Result unit" value={resultUnit} onChange={(e) => setResultUnit(e.target.value)} />
          <Input placeholder="Event name" value={eventName} onChange={(e) => setEventName(e.target.value)} />
          <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          <div className="md:col-span-3">
            <Button
              onClick={() => {
                if (!athleteName || !resultValue || !eventName || !eventDate) return;
                createRecord.mutate({ athleteName, discipline, resultValue, resultUnit, eventName, eventDate });
              }}
            >
              Submit
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            <Input placeholder="Filter athlete" value={queryAthlete} onChange={(e) => setQueryAthlete(e.target.value)} />
            <Input placeholder="Filter discipline" value={queryDiscipline} onChange={(e) => setQueryDiscipline(e.target.value)} />
            <Input placeholder="Filter event" value={queryEvent} onChange={(e) => setQueryEvent(e.target.value)} />
          </div>
          {records.map((record) => (
            <article key={record.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{record.athleteName}</p>
                  <p className="text-sm text-muted-foreground">
                    {record.discipline} • {record.resultValue} {record.resultUnit} • {record.eventName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={record.verificationState === "VERIFIED" ? "default" : "outline"}>
                    {record.verificationState}
                  </Badge>
                  <ReportAction targetType="COMPETITIVE_RECORD" targetId={String(record.id)} />
                </div>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
