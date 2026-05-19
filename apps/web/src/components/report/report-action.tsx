"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  reportSchema,
  type ReportValues,
} from "@/features/reports/schemas/report.schema";
import { getRateLimitMessage, getApiErrorMessage } from "@/lib/http/api-error";

interface ReportActionProps {
  targetType: ReportTargetType | string;
  targetId: string;
}

const reasonOptions: Array<{ value: ReportReasonCode; label: string }> = [
  { value: "spam", label: "Spam or scam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "impersonation", label: "Pretending to be someone else" },
  { value: "unsafe", label: "Unsafe diving advice or behavior" },
  { value: "other", label: "Something else" },
];
const supportedTargetTypes = new Set<ReportTargetType>([
  "user",
  "message",
  "chika_thread",
  "chika_comment",
]);

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
          setSubmitError(
            getRateLimitMessage(
              error,
              getApiErrorMessage(error, "Could not send your report"),
            ),
          );
        },
      },
    );
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setSubmitError(null);
      }}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        Report
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a concern</DialogTitle>
          <DialogDescription>
            Tell us what feels unsafe, harmful, or out of place. Reports help
            keep Chika useful for the freediving community.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reasonCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What is the concern?</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={createReport.isPending}
                    items={reasonOptions}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        {reasonOptions.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value}>
                            {reason.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anything else we should know?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share enough detail for the team to understand the concern."
                      disabled={createReport.isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError ? (
              <p className="text-sm text-destructive">{submitError}</p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={createReport.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || createReport.isPending}
              >
                {createReport.isPending ? "Sending..." : "Send report"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
