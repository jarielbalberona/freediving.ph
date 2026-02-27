"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ReportReasonCode, ReportTargetType } from "@freediving.ph/types";
import { useCreateReport } from "@/features/reports";

interface ReportActionProps {
  targetType: ReportTargetType | string;
  targetId: string;
}

const reasonOptions: ReportReasonCode[] = ["spam", "harassment", "impersonation", "unsafe", "other"];
const supportedTargetTypes = new Set<ReportTargetType>(["user", "message", "chika_thread", "chika_comment"]);

export function ReportAction({ targetType, targetId }: ReportActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<ReportReasonCode>("spam");
  const [details, setDetails] = useState("");
  const createReport = useCreateReport();
  const isSupported = supportedTargetTypes.has(targetType as ReportTargetType);

  if (!isOpen) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        Report
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="space-y-2">
        <Label htmlFor="report-reason">Reason</Label>
        <select
          id="report-reason"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={reasonCode}
          onChange={(event) => setReasonCode(event.target.value as ReportReasonCode)}
          disabled={createReport.isPending}
        >
          {reasonOptions.map((reason) => (
            <option value={reason} key={reason}>
              {reason}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="report-target">Target ID</Label>
        <Input id="report-target" value={targetId} readOnly />
      </div>

      <div className="space-y-2">
        <Label htmlFor="report-text">Details</Label>
        <Textarea
          id="report-text"
          placeholder="Describe the issue"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          disabled={createReport.isPending}
        />
      </div>
      {!isSupported && (
        <p className="text-xs text-destructive">
          This item type is not reportable in v1.
        </p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={createReport.isPending || !isSupported}
          onClick={() => {
            createReport.mutate(
              {
                targetType: targetType as ReportTargetType,
                targetId,
                reasonCode,
                details: details.trim() || undefined,
              },
              {
                onSuccess: () => {
                  setDetails("");
                  setIsOpen(false);
                },
              },
            );
          }}
        >
          Submit Report
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
