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
  FormMessage,
} from "@/components/ui/form";
import { ReportAction } from "@/components/report/report-action";
import { useCompetitiveRecordsFiltered, useCreateCompetitiveRecord } from "@/features/competitiveRecords";
import {
  createRecordSchema,
  recordFilterSchema,
  type CreateRecordValues,
  type RecordFilterValues,
} from "@/features/competitiveRecords/schemas/record.schema";

export default function CompetitiveRecordsPage() {
  const createRecord = useCreateCompetitiveRecord();

  const createForm = useForm<CreateRecordValues>({
    resolver: zodResolver(createRecordSchema),
    defaultValues: {
      athleteName: "",
      discipline: "CWT",
      resultValue: "",
      resultUnit: "m",
      eventName: "",
      eventDate: "",
    },
  });

  const filterForm = useForm<RecordFilterValues>({
    resolver: zodResolver(recordFilterSchema),
    defaultValues: {
      athlete: "",
      discipline: "",
      eventName: "",
    },
  });

  const { data: records = [] } = useCompetitiveRecordsFiltered({
    athlete: filterForm.watch("athlete") || undefined,
    discipline: filterForm.watch("discipline") || undefined,
    eventName: filterForm.watch("eventName") || undefined,
    limit: 50,
    offset: 0,
  });

  const onSubmitRecord = (values: CreateRecordValues) => {
    createRecord.mutate({
      athleteName: values.athleteName,
      discipline: values.discipline,
      resultValue: values.resultValue,
      resultUnit: values.resultUnit,
      eventName: values.eventName,
      eventDate: values.eventDate,
    });
    createForm.reset();
  };

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
        <CardContent>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onSubmitRecord)} className="grid gap-2 md:grid-cols-3">
              <FormField
                control={createForm.control}
                name="athleteName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Athlete name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="discipline"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Discipline" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="resultValue"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Result value" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="resultUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Result unit" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="eventName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Event name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-3">
                <Button
                  type="submit"
                  disabled={createForm.formState.isSubmitting || createRecord.isPending}
                >
                  Submit
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Form {...filterForm}>
            <form className="grid gap-2 md:grid-cols-3">
              <FormField
                control={filterForm.control}
                name="athlete"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Filter athlete" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={filterForm.control}
                name="discipline"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Filter discipline" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={filterForm.control}
                name="eventName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Filter event" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
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
