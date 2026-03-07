"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { ReportReasonCode, ReportTargetType } from "@freediving.ph/types";
import { useCreateReport } from "@/features/reports";
import { reportSchema, type ReportValues } from "@/features/reports/schemas/report.schema";
import { getRateLimitMessage, getApiErrorMessage } from "@/lib/http/api-error";

interface ReportActionProps {
  targetType: ReportTargetType | string;
  targetId: string;
}

const reasonOptions: ReportReasonCode[] = ["spam", "harassment", "impersonation", "unsafe", "other"];
const supportedTargetTypes = new Set<ReportTargetType>(["user", "message", "chika_thread", "chika_comment"]);

export function ReportAction({ targetType, targetId }: ReportActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createReport = useCreateReport();
  const isSupported = supportedTargetTypes.has(targetType as ReportTargetType);

  const form = useForm<ReportValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reasonCode: "spam",
      details: "",
    },
  });

  const onSubmit = (values: ReportValues) => {
    setSubmitError(null);
    createReport.mutate(
      {
        targetType: targetType as ReportTargetType,
        targetId,
        reasonCode: values.reasonCode,
        details: values.details?.trim() || undefined,
      },
      {
        onSuccess: () => {
          form.reset({ reasonCode: "spam", details: "" });
          setIsOpen(false);
        },
        onError: (error) => {
          setSubmitError(getRateLimitMessage(error, getApiErrorMessage(error, "Failed to submit report")));
        },
      },
    );
  };

  if (!isOpen) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        Report
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <FormField
            control={form.control}
            name="reasonCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={createReport.isPending}
                  items={reasonOptions.map((r) => ({ value: r, label: r }))}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectGroup>
                      {reasonOptions.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label htmlFor="report-target">Target ID</Label>
            <Input id="report-target" value={targetId} readOnly />
          </div>

          <FormField
            control={form.control}
            name="details"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Details</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the issue"
                    disabled={createReport.isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isSupported && (
            <p className="text-xs text-destructive">
              This item type is not reportable in v1.
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={form.formState.isSubmitting || createReport.isPending || !isSupported}
            >
              Submit Report
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
          {submitError ? <p className="text-xs text-destructive">{submitError}</p> : null}
        </form>
      </Form>
    </div>
  );
}
