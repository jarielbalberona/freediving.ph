"use client";

import { Award, ExternalLink, FileUp, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type {
  InstructorAgency,
  InstructorCertification,
} from "@freediving.ph/types";

import { certificationStatusLabels, instructorAgencyLabels } from "../constants";

const acceptedProofTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const maxProofSizeBytes = 10 * 1024 * 1024;

interface InstructorCertificationFormState {
  agency: InstructorAgency;
  agencyOtherName: string;
  certificationLevel: string;
  certificationNumber: string;
  issuedAt: string;
  expiresAt: string;
  officialVerificationUrl: string;
  proofMediaId: string;
}

export type { InstructorCertificationFormState };

export const emptyCertificationForm: InstructorCertificationFormState = {
  agency: "molchanovs",
  agencyOtherName: "",
  certificationLevel: "",
  certificationNumber: "",
  issuedAt: "",
  expiresAt: "",
  officialVerificationUrl: "",
  proofMediaId: "",
};

export function InstructorCertificationsFields({
  mode,
  certifications,
  readOnly = false,
  certificationForm,
  certificationFormOpen,
  proofFile,
  proofPreviewUrl,
  isLoading,
  onFormOpen,
  onFormFieldChange,
  onProofFileChange,
  onSaveDraftClear,
  onAddCertification,
  onDeleteCertification,
  onOpenProof,
}: {
  mode: "apply" | "edit";
  certifications: InstructorCertification[];
  readOnly?: boolean;
  certificationForm: InstructorCertificationFormState;
  certificationFormOpen: boolean;
  proofFile: File | null;
  proofPreviewUrl: string;
  isLoading: boolean;
  onFormOpen: (next: boolean) => void;
  onFormFieldChange: (next: InstructorCertificationFormState) => void;
  onProofFileChange: (file: File | null) => void;
  onSaveDraftClear: () => void;
  onAddCertification: () => Promise<void>;
  onDeleteCertification: (certificationId: string) => Promise<void>;
  onOpenProof: (certificationId: string) => Promise<unknown> | void;
}) {
  return (
    <div className="grid gap-4 border-t border-border/70 pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold tracking-normal">Certifications</h2>
          <p className="text-sm text-muted-foreground">
            Add one or more instructor-level certifications with proof or official links.
          </p>
        </div>
        {!readOnly && !certificationFormOpen ? (
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => onFormOpen(true)}
            disabled={isLoading}
          >
            <Plus />
            Add certification
          </Button>
        ) : null}
      </div>

      {certificationFormOpen ? (
        <div className="grid gap-3 rounded-lg border border-border/70 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Agency</Label>
              <Select
                value={certificationForm.agency}
                onValueChange={(agency) =>
                  onFormFieldChange({
                    ...certificationForm,
                    agency: agency as InstructorAgency,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select agency" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(instructorAgencyLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {certificationForm.agency === "other" ? (
              <InputField
                label="Agency name"
                value={certificationForm.agencyOtherName}
                onChange={(agencyOtherName) =>
                  onFormFieldChange({ ...certificationForm, agencyOtherName })
                }
                className="sm:col-span-2"
              />
            ) : null}

            <InputField
              label="Certification level"
              value={certificationForm.certificationLevel}
              onChange={(certificationLevel) =>
                onFormFieldChange({ ...certificationForm, certificationLevel })
              }
            />
            <InputField
              label="Certification number"
              value={certificationForm.certificationNumber}
              onChange={(certificationNumber) =>
                onFormFieldChange({ ...certificationForm, certificationNumber })
              }
            />
            <InputField
              label="Issued"
              value={certificationForm.issuedAt}
              onChange={(issuedAt) => onFormFieldChange({ ...certificationForm, issuedAt })}
            />
            <InputField
              label="Expires"
              value={certificationForm.expiresAt}
              onChange={(expiresAt) => onFormFieldChange({ ...certificationForm, expiresAt })}
            />
            <InputField
              label="Official verification link"
              value={certificationForm.officialVerificationUrl}
              onChange={(officialVerificationUrl) =>
                onFormFieldChange({ ...certificationForm, officialVerificationUrl })
              }
              className="sm:col-span-2"
            />

            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Certification proof</Label>
              <p className="text-sm text-muted-foreground">
                Upload a certificate or instructor card. JPG, PNG, WebP, or GIF up to 10 MB.
              </p>
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 p-3">
                <p className="text-sm font-medium">
                  {proofFile ? proofFile.name : "No proof selected"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  render={<label htmlFor="certification-proof-file" />}
                  disabled={isLoading}
                >
                  <FileUp />
                  {proofFile ? "Replace proof" : "Upload proof"}
                </Button>
                {proofFile ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onProofFileChange(null)}
                    disabled={isLoading}
                  >
                    <X />
                    Remove
                  </Button>
                ) : null}
                <input
                  id="certification-proof-file"
                  type="file"
                  accept={acceptedProofTypes.join(",")}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    event.target.value = "";
                    if (!file) return;
                    if (!acceptedProofTypes.includes(file.type)) {
                      toast.error("Upload an image file for certification proof.");
                      return;
                    }
                    if (file.size > maxProofSizeBytes) {
                      toast.error("Certification proof must be 10 MB or smaller.");
                      return;
                    }
                    onProofFileChange(file);
                  }}
                />
              </div>
              {proofPreviewUrl ? (
                <img
                  src={proofPreviewUrl}
                  alt="Selected certification proof preview"
                  className="max-h-56 w-fit rounded-md border border-border/70 object-contain sm:col-span-2"
                />
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void onAddCertification()}
              disabled={isLoading}
            >
              <Plus />
              Save certification
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onSaveDraftClear();
                onFormOpen(false);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {certifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {readOnly
            ? "No certifications yet. Add at least one certification to complete your instructor profile."
            : mode === "apply"
            ? "Add at least one certification to submit your instructor profile."
            : "No certifications yet."}
        </p>
      ) : (
        <div className="divide-y divide-border/70 border-y border-border/70">
          {certifications.map((certification) => (
            <div
              key={certification.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Award className="size-4 text-muted-foreground" />
                  <span className="font-medium">
                    {certification.agency === "other"
                      ? certification.agencyOtherName
                      : instructorAgencyLabels[certification.agency]}{" "}
                    {certification.certificationLevel}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {certification.certificationNumber || "No certification number"}
                </p>
                {certification.officialVerificationUrl ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {certification.officialVerificationUrl}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  <span>Issued {certification.issuedAt || "not provided"}</span>
                  {certification.expiresAt ? ` · Expires ${certification.expiresAt}` : ""}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {certification.proofMediaId ? <span>Proof uploaded</span> : null}
                  {certification.proofMediaId ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                      onClick={() => void onOpenProof(certification.id)}
                    >
                      <ExternalLink className="size-3" />
                      View proof
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-border/70 px-2 py-1 text-xs">
                  {certificationStatusLabels[certification.verificationStatus]}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (readOnly) return;
                    void onDeleteCertification(certification.id);
                  }}
                  disabled={isLoading}
                  className={readOnly ? "hidden" : ""}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {mode === "edit" && certifications.length > 0 ? (
        <div className="text-sm text-muted-foreground">
          At least one certification is required to keep your instructor profile complete.
        </div>
      ) : null}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
