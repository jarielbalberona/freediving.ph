"use client";

import type {
  InstructorApplication,
  InstructorVerificationStatus,
} from "@freediving.ph/types";
import { Check, Eye, ShieldOff, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AdminAccess,
  AdminPageShell,
  AdminPager,
  AdminTable,
  AdminTableRow,
  DateCell,
  SmallMuted,
  useAdminListParams,
} from "@/app/admin/_components/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  instructorsApi,
  instructorAgencyLabels,
  certificationStatusLabels,
  instructorStatusLabels,
  useAdminInstructors,
  useRejectInstructor,
  useSuspendInstructor,
  useVerifyInstructor,
} from "@/features/instructors";
import { getApiErrorMessage } from "@/lib/http/api-error";

const GRID = "grid-cols-[minmax(240px,2fr)_140px_180px_160px_120px_150px]";

const statusOptions: Array<{
  value: InstructorVerificationStatus | "all";
  label: string;
}> = [
  { value: "pending", label: "Under review" },
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Needs changes" },
  { value: "suspended", label: "Suspended" },
];

export default function AdminInstructorsPage() {
  return (
    <AdminAccess>
      <AdminInstructorsContent />
    </AdminAccess>
  );
}

function AdminInstructorsContent() {
  const [statusFilter, setStatusFilter] =
    useState<InstructorVerificationStatus | "all">("pending");
  const params = { ...useAdminListParams(), status: statusFilter };
  const query = useAdminInstructors(params);
  const items = query.data?.items ?? [];
  const pagination = query.data?.pagination;
  const verifyMutation = useVerifyInstructor();
  const rejectMutation = useRejectInstructor();
  const suspendMutation = useSuspendInstructor();
  const [selected, setSelected] = useState<InstructorApplication | null>(null);
  const [reason, setReason] = useState("");

  const onVerify = async (application: InstructorApplication) => {
    if (!application.profile) return;
    try {
      await verifyMutation.mutateAsync(application.profile.id);
      toast.success("Instructor verified.");
      setSelected(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to verify instructor"));
    }
  };

  const onReject = async () => {
    if (!selected?.profile) return;
    try {
      await rejectMutation.mutateAsync({
        instructorId: selected.profile.id,
        data: { reason },
      });
      toast.success("Instructor application rejected.");
      setSelected(null);
      setReason("");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to reject instructor"));
    }
  };

  const onSuspend = async (application: InstructorApplication) => {
    if (!application.profile) return;
    try {
      await suspendMutation.mutateAsync({
        instructorId: application.profile.id,
        data: { reason: "Admin suspended instructor privileges." },
      });
      toast.success("Instructor suspended.");
      setSelected(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to suspend instructor"));
    }
  };

  const onViewProof = async (
    application: InstructorApplication,
    certificationId: string,
  ) => {
    if (!application.profile) return;
    try {
      const response = await instructorsApi.getAdminCertificationProofUrl(
        application.profile.id,
        certificationId,
      );
      window.open(response.proof.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not open certification proof"));
    }
  };

  return (
    <AdminPageShell
      title="Admin Instructors"
      description="Review instructor applications and control school creation privileges."
      total={pagination?.total}
    >
      <div className="mb-4 max-w-xs">
        <Label>Status</Label>
        <Select
          items={statusOptions}
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as InstructorVerificationStatus | "all")
          }
        >
          <SelectTrigger className="mt-1 w-full">
            <SelectValue>
              {(selected) => selected?.label ?? "Choose status"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <AdminTable
        columns={[
          "Instructor",
          "Status",
          "Certifications",
          "Location",
          "Updated",
          "Actions",
        ]}
        gridClassName={GRID}
        isLoading={query.isLoading}
        error={query.error}
        emptyLabel="No instructor applications found."
      >
        {items.length > 0
          ? items.map((application) => {
              const profile = application.profile;
              if (!profile) return null;
              return (
                <AdminTableRow key={profile.id} gridClassName={GRID}>
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {profile.displayName || profile.username}
                    </div>
                    <SmallMuted>@{profile.username}</SmallMuted>
                  </div>
                  <Badge variant="outline">
                    {instructorStatusLabels[profile.verificationStatus]}
                  </Badge>
                  <div>
                    <span>{application.certifications.length} credentials</span>
                    <SmallMuted>
                      {application.certifications[0]
                        ? ` / ${agencyLabel(application.certifications[0])}`
                        : ""}
                    </SmallMuted>
                  </div>
                  <SmallMuted>{locationLabel(profile)}</SmallMuted>
                  <DateCell value={profile.updatedAt} />
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Review ${profile.displayName}`}
                      tooltip="Review instructor"
                      onClick={() => setSelected(application)}
                    >
                      <Eye />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Verify ${profile.displayName}`}
                      tooltip="Verify instructor"
                      onClick={() => void onVerify(application)}
                    >
                      <Check />
                    </Button>
                  </div>
                </AdminTableRow>
              );
            })
          : null}
      </AdminTable>
      <AdminPager pagination={pagination} />
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl!">
          <DialogHeader>
            <DialogTitle>Instructor application</DialogTitle>
          </DialogHeader>
          {selected?.profile ? (
            <div className="grid gap-4">
              <div>
                <h2 className="text-base font-semibold tracking-normal">
                  {selected.profile.displayName || selected.profile.username}
                </h2>
                <SmallMuted>@{selected.profile.username}</SmallMuted>
                  <SmallMuted>
                    Base/home location: {locationLabel(selected.profile)}
                  </SmallMuted>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selected.profile.bio || "No bio provided."}
                </p>
              </div>
              <div className="rounded-md border border-border/70 p-3 text-sm">
                <div className="font-medium">Review checklist</div>
                <ul className="mt-2 grid gap-1 text-muted-foreground">
                  <li>The certification appears to be instructor-level.</li>
                  <li>The proof is readable.</li>
                  <li>
                    The name/details reasonably match the applicant.
                  </li>
                  <li>The credential is not obviously expired.</li>
                  <li>The verification link works, if provided.</li>
                  <li>Nothing appears misleading or suspicious.</li>
                </ul>
              </div>
              <div className="rounded-md border border-border/70 p-3 text-sm">
                <div className="font-medium">Attestation</div>
                <SmallMuted>
                  {selected.profile.attestationAcceptedAt
                    ? "Applicant accepted the credential attestation."
                    : "Attestation has not been submitted yet."}
                </SmallMuted>
              </div>
              <div className="divide-y divide-border/70 border-y border-border/70">
                {selected.certifications.map((certification) => (
                  <div key={certification.id} className="py-3 text-sm">
                    <div className="font-medium">
                      {agencyLabel(certification)}{" "}
                      {certification.certificationLevel}
                    </div>
                    <SmallMuted>
                      {certification.certificationNumber ||
                        "No certification number"}{" "}
                      / {certificationStatusLabels[certification.verificationStatus]}
                    </SmallMuted>
                    {certification.officialVerificationUrl ? (
                      <SmallMuted>
                        Verification URL:{" "}
                        <a
                          className="underline underline-offset-2"
                          href={certification.officialVerificationUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {certification.officialVerificationUrl}
                        </a>
                      </SmallMuted>
                    ) : null}
                    {certification.proofMediaId ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() =>
                          void onViewProof(selected, certification.id)
                        }
                      >
                        <Eye />
                        View proof
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="grid gap-1.5">
                <Label>Reason for changes</Label>
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => selected && void onSuspend(selected)}
              disabled={suspendMutation.isPending}
            >
              <ShieldOff />
              Suspend
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void onReject()}
                disabled={rejectMutation.isPending}
              >
                <X />
                Reject
              </Button>
              <Button
                type="button"
                onClick={() => selected && void onVerify(selected)}
                disabled={verifyMutation.isPending}
              >
                <Check />
                Verify
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}

function agencyLabel(
  certification: InstructorApplication["certifications"][number],
) {
  const agency =
    certification.agency === "other"
      ? certification.agencyOtherName
      : instructorAgencyLabels[certification.agency];
  return `${agency} ${certification.certificationLevel}`.trim();
}

function locationLabel(profile: NonNullable<InstructorApplication["profile"]>) {
  return (
    profile.homeLocationLabel ||
    profile.formattedAddress ||
    profile.cityName ||
    profile.provinceName ||
    profile.regionName ||
    "-"
  );
}
