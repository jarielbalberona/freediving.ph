"use client";

import type {
  BadgeCategory,
  BadgeTemplate,
  UpsertUserBadgeRequest,
  UserBadge,
} from "@freediving.ph/types";
import { Loader2, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AuthGuard } from "@/components/auth/guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUploadMedia } from "@/features/media";
import {
  useCreateBadge,
  useDeleteBadge,
  useUpdateBadge,
} from "@/features/profiles/hooks/mutations";
import { useMyBadges } from "@/features/profiles/hooks/queries";

const categoryLabels: Record<BadgeCategory, string> = {
  personal_best: "Personal Bests",
  certification: "Certifications",
  experience: "Experience / Community Roles",
  auto_stat: "Auto Stats",
};

type BadgeFormState = {
  badgeId: string | null;
  badgeTemplateId: string;
  valueNumber: string;
  valueMinutes: string;
  valueSeconds: string;
  valueText: string;
  referenceLabel: string;
  referenceValue: string;
  proofMediaId: string;
  visibility: "public" | "private";
};

const initialForm: BadgeFormState = {
  badgeId: null,
  badgeTemplateId: "",
  valueNumber: "",
  valueMinutes: "",
  valueSeconds: "",
  valueText: "",
  referenceLabel: "",
  referenceValue: "",
  proofMediaId: "",
  visibility: "public",
};

export default function BadgeManagementPage() {
  const badgesQuery = useMyBadges();
  const uploadMedia = useUploadMedia();
  const createBadge = useCreateBadge();
  const updateBadge = useUpdateBadge();
  const deleteBadge = useDeleteBadge();
  const [form, setForm] = useState<BadgeFormState>(initialForm);

  const templates =
    badgesQuery.data?.templates?.filter((item) => !item.isSystem) ?? [];
  const selectedTemplate = templates.find(
    (item) => item.id === form.badgeTemplateId,
  );
  const groupedTemplates = useMemo(
    () => groupTemplates(templates),
    [templates],
  );
  const isSaving =
    createBadge.isPending || updateBadge.isPending || uploadMedia.isPending;

  const resetForm = () => setForm(initialForm);

  const saveBadge = async () => {
    if (!selectedTemplate) {
      toast.error("Select a badge template.");
      return;
    }
    const payload = buildPayload(form, selectedTemplate);
    if (!payload) return;

    try {
      if (form.badgeId) {
        await updateBadge.mutateAsync({ badgeId: form.badgeId, payload });
        toast.success("Badge updated");
      } else {
        await createBadge.mutateAsync(payload);
        toast.success("Badge added");
      }
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save badge",
      );
    }
  };

  const uploadProof = async (file: File) => {
    try {
      const uploaded = await uploadMedia.mutateAsync({
        file,
        contextType: "badge_proof",
      });
      setForm((current) => ({ ...current, proofMediaId: uploaded.id }));
      toast.success("Proof photo uploaded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload proof",
      );
    }
  };

  return (
    <AuthGuard
      title="Sign in to manage badges"
      description="Please sign in to manage your badges and credentials."
    >
      <div className="container mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Badges & Credentials
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add personal bests, certifications, and community roles.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{form.badgeId ? "Edit Badge" : "Add Badge"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label>Badge type</Label>
              <Select
                value={form.badgeTemplateId}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    badgeTemplateId: value ?? "",
                    valueNumber: "",
                    valueMinutes: "",
                    valueSeconds: "",
                    valueText: "",
                  }))
                }
                items={templates.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select badge type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupedTemplates).map(([category, items]) => (
                    <SelectGroup key={category}>
                      <SelectLabel>
                        {categoryLabels[category as BadgeCategory]}
                      </SelectLabel>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate ? (
              <BadgeValueFields
                template={selectedTemplate}
                form={form}
                setForm={setForm}
              />
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="referenceLabel">Reference label</Label>
                <Input
                  id="referenceLabel"
                  value={form.referenceLabel}
                  placeholder="Certification Number"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      referenceLabel: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="referenceValue">Reference value</Label>
                <Input
                  id="referenceValue"
                  value={form.referenceValue}
                  placeholder="AIDA-12345"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      referenceValue: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Visibility</Label>
              <Select
                value={form.visibility}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    visibility: value === "private" ? "private" : "public",
                  }))
                }
                items={[
                  { value: "public", label: "Public" },
                  { value: "private", label: "Private" },
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="proof">Proof photo</Label>
              <Input
                id="proof"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void uploadProof(file);
                }}
              />
              {form.proofMediaId ? (
                <p className="text-xs text-muted-foreground">
                  Proof attached: {form.proofMediaId}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Clear
              </Button>
              <Button type="button" disabled={isSaving} onClick={saveBadge}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving
                  </>
                ) : form.badgeId ? (
                  "Update Badge"
                ) : (
                  "Add Badge"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Badges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {badgesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading badges...</p>
            ) : null}
            {(badgesQuery.data?.badges ?? []).map((badge) => (
              <BadgeRow
                key={badge.id}
                badge={badge}
                onEdit={() => setForm(formFromBadge(badge))}
                onDelete={() => {
                  void deleteBadge.mutateAsync(badge.id).catch((error) => {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Failed to delete badge",
                    );
                  });
                }}
                deleting={deleteBadge.isPending}
              />
            ))}
            {(badgesQuery.data?.autoStats ?? []).map((badge) => (
              <BadgeRow key={badge.id} badge={badge} system />
            ))}
            {!badgesQuery.isLoading &&
            (badgesQuery.data?.badges.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                No user-created badges yet.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}

function BadgeValueFields({
  template,
  form,
  setForm,
}: {
  template: BadgeTemplate;
  form: BadgeFormState;
  setForm: Dispatch<SetStateAction<BadgeFormState>>;
}) {
  if (template.valueType === "time") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="minutes">Minutes</Label>
          <Input
            id="minutes"
            inputMode="numeric"
            value={form.valueMinutes}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                valueMinutes: event.target.value,
              }))
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="seconds">Seconds</Label>
          <Input
            id="seconds"
            inputMode="numeric"
            value={form.valueSeconds}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                valueSeconds: event.target.value,
              }))
            }
          />
        </div>
      </div>
    );
  }

  if (template.valueType === "distance" || template.valueType === "number") {
    return (
      <div className="grid gap-2">
        <Label htmlFor="valueNumber">
          Value{template.unit ? ` (${template.unit})` : ""}
        </Label>
        <Input
          id="valueNumber"
          inputMode="decimal"
          value={form.valueNumber}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              valueNumber: event.target.value,
            }))
          }
        />
      </div>
    );
  }

  if (template.valueType === "text") {
    return (
      <div className="grid gap-2">
        <Label htmlFor="valueText">Value</Label>
        <Input
          id="valueText"
          value={form.valueText}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              valueText: event.target.value,
            }))
          }
        />
      </div>
    );
  }

  return null;
}

function BadgeRow({
  badge,
  system = false,
  deleting = false,
  onEdit,
  onDelete,
}: {
  badge: UserBadge;
  system?: boolean;
  deleting?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">
            {badge.displayValue
              ? `${badge.template.name} • ${badge.displayValue}`
              : badge.template.name}
          </p>
          <Badge
            variant={
              badge.verificationStatus === "verified" ? "secondary" : "outline"
            }
          >
            {system ? "System Verified" : badge.verificationStatus}
          </Badge>
          {!system ? <Badge variant="outline">{badge.visibility}</Badge> : null}
        </div>
        {badge.referenceLabel || badge.referenceValue ? (
          <p className="text-xs text-muted-foreground">
            {[badge.referenceLabel, badge.referenceValue]
              .filter(Boolean)
              .join(": ")}
          </p>
        ) : null}
      </div>
      {!system ? (
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={deleting}
            onClick={onDelete}
            aria-label="Delete badge"
            title="Delete badge"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function groupTemplates(templates: BadgeTemplate[]) {
  return templates.reduce<Record<string, BadgeTemplate[]>>(
    (groups, template) => {
      groups[template.category] = groups[template.category] ?? [];
      groups[template.category].push(template);
      return groups;
    },
    {},
  );
}

function buildPayload(
  form: BadgeFormState,
  template: BadgeTemplate,
): UpsertUserBadgeRequest | null {
  const payload: UpsertUserBadgeRequest = {
    badgeTemplateId: form.badgeTemplateId,
    referenceLabel: form.referenceLabel.trim() || undefined,
    referenceValue: form.referenceValue.trim() || undefined,
    proofMediaId: form.proofMediaId || undefined,
    visibility: form.visibility,
  };

  if (template.valueType === "time") {
    const minutes = Number(form.valueMinutes || 0);
    const seconds = Number(form.valueSeconds || 0);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      toast.error("Enter a valid time.");
      return null;
    }
    payload.valueMinutes = minutes;
    payload.valueSeconds = seconds;
  }

  if (template.valueType === "distance" || template.valueType === "number") {
    const value = Number(form.valueNumber);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a valid value.");
      return null;
    }
    payload.valueNumber = value;
  }

  if (template.valueType === "text") {
    const value = form.valueText.trim();
    if (!value) {
      toast.error("Enter a value.");
      return null;
    }
    payload.valueText = value;
  }

  return payload;
}

function formFromBadge(badge: UserBadge): BadgeFormState {
  return {
    badgeId: badge.id,
    badgeTemplateId: badge.template.id,
    valueNumber: badge.valueNumber?.toString() ?? "",
    valueMinutes: badge.valueMinutes?.toString() ?? "",
    valueSeconds: badge.valueSeconds?.toString() ?? "",
    valueText: badge.valueText ?? "",
    referenceLabel: badge.referenceLabel ?? "",
    referenceValue: badge.referenceValue ?? "",
    proofMediaId: badge.proofMediaId ?? "",
    visibility: badge.visibility ?? "public",
  };
}
