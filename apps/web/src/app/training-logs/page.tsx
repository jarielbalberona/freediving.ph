"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTrainingLog, useTrainingLogs } from "@/features/trainingLogs";
import { createTrainingLogSchema, type CreateTrainingLogValues } from "@/features/trainingLogs/schemas/createLog.schema";

export default function TrainingLogsPage() {
  const { data: logs = [] } = useTrainingLogs();
  const createLog = useCreateTrainingLog();

  const form = useForm<CreateTrainingLogValues>({
    resolver: zodResolver(createTrainingLogSchema),
    defaultValues: {
      title: "",
      sessionDate: "",
      visibility: "PRIVATE",
    },
  });

  const onSubmit = (values: CreateTrainingLogValues) => {
    createLog.mutate({ title: values.title, sessionDate: values.sessionDate, visibility: values.visibility, metrics: [] });
    form.reset({ title: "", sessionDate: "", visibility: "PRIVATE" });
  };

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
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-2 md:grid-cols-3">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session title</FormLabel>
                    <FormControl>
                      <Input placeholder="Session title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sessionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      items={[
                        { value: "PRIVATE", label: "PRIVATE" },
                        { value: "BUDDIES_ONLY", label: "BUDDIES_ONLY" },
                        { value: "PUBLIC", label: "PUBLIC" },
                      ]}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="PRIVATE">PRIVATE</SelectItem>
                          <SelectItem value="BUDDIES_ONLY">BUDDIES_ONLY</SelectItem>
                          <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-3">
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || createLog.isPending}
                >
                  Save Session
                </Button>
              </div>
            </form>
          </Form>
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
