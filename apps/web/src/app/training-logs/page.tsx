"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCreateTrainingLog, useTrainingLogs } from "@/features/trainingLogs";

export default function TrainingLogsPage() {
  const { data: logs = [] } = useTrainingLogs();
  const createLog = useCreateTrainingLog();
  const [title, setTitle] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "BUDDIES_ONLY" | "PUBLIC">("PRIVATE");

  return (
    <main className="container mx-auto space-y-6 p-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">Training Logs</h1>
        <p className="text-muted-foreground">Private-first sessions with optional sharing to buddies or public.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Create Session</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">
          <Input placeholder="Session title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as "PRIVATE" | "BUDDIES_ONLY" | "PUBLIC")}
          >
            <option value="PRIVATE">PRIVATE</option>
            <option value="BUDDIES_ONLY">BUDDIES_ONLY</option>
            <option value="PUBLIC">PUBLIC</option>
          </select>
          <div className="md:col-span-3">
            <Button
              onClick={() => {
                if (!title || !sessionDate) return;
                createLog.mutate({ title, sessionDate, visibility, metrics: [] });
              }}
            >
              Save Session
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs.map((log) => (
            <article key={log.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-semibold">{log.title}</p>
                <p className="text-sm text-muted-foreground">{new Date(log.sessionDate).toLocaleDateString()}</p>
              </div>
              <Badge variant={log.visibility === "PUBLIC" ? "default" : "outline"}>{log.visibility}</Badge>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
