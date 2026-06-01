"use client";

import type {
  BadgeCategory,
  BadgeTemplate,
  UpsertUserBadgeRequest,
  UserBadge,
} from "@freediving.ph/types";
import { Award, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Dispatch, SetStateAction, SyntheticEvent } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AuthGuard } from "@/components/auth/guard";
import { CommunityHeader } from "@/components/community/community-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ManagementPageContainer } from "@/components/layout/management-page-container";
import { useCurrentProfileHref } from "@/features/profile/hooks/use-current-profile-href";
import {
  useCreateBadge,
  useDeleteBadge,
  useUpdateBadge,
} from "@/features/profiles/hooks/mutations";
import { useMyBadges } from "@/features/profiles/hooks/queries";

const categoryLabels: Record<BadgeCategory, string> = {
  personal_best: "Personal Bests",
  certification: "Certifications",
  experience: "Experience",
  community_role: "Community Roles",
  auto_stat: "Auto Stats",
};

type BadgeFormState = {
  badgeId: string | null;
  badgeCategory: BadgeCategory | "";
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
  badgeCategory: "",
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const currentProfileHref = useCurrentProfileHref();

  const templates =
    badgesQuery.data?.templates?.filter((item) => !item.isSystem) ?? [];
  const groupedTemplates = useMemo(
    () => groupTemplates(templates),
    [templates],
  );
  const selectedTemplates = form.badgeCategory
    ? (groupedTemplates[form.badgeCategory] ?? [])
    : [];
  const selectedTemplate = selectedTemplates.find(
    (item) => item.id === form.badgeTemplateId,
  );
  const isSaving =
    createBadge.isPending || updateBadge.isPending || uploadMedia.isPending;

  const resetForm = () => setForm(initialForm);
  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };
  const openEditDialog = (badge: UserBadge) => {
    setForm(formFromBadge(badge));
    setDialogOpen(true);
  };

  const saveBadge = async () => {
    if (!form.badgeCategory) {
      toast.error("Select a badge category.");
      return;
    }
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
      setDialogOpen(false);
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
      <ManagementPageContainer variant="wide">
        <CommunityHeader
          title="Badges & Credentials"
          subtitle="Add personal bests, certifications, experience, and community roles."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                render={<Link href={currentProfileHref} />}
              >
                Back to profile
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger
                  render={<Button type="button" onClick={openCreateDialog} />}
                >
                  Add
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl!">
                  <DialogHeader>
                    <DialogTitle>
                      {form.badgeId
                        ? "Edit Badge & Credentials"
                        : "Add Badge & Credentials"}
                    </DialogTitle>
                  </DialogHeader>
                  <BadgeFormFields
                    template={selectedTemplate}
                    form={form}
                    setForm={setForm}
                    groupedTemplates={groupedTemplates}
                    templates={selectedTemplates}
                    isSaving={isSaving}
                    onProofUpload={(file) => void uploadProof(file)}
                    onClear={resetForm}
                    onSave={saveBadge}
                    categoryLabels={categoryLabels}
                  />
                </DialogContent>
              </Dialog>
            </div>
          }
        />

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Your Badges
            </h2>
          </div>
          <div className="space-y-3">
            {badgesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading badges...</p>
            ) : null}
            {(badgesQuery.data?.badges ?? []).map((badge) => (
              <BadgeRow
                key={badge.id}
                badge={badge}
                onEdit={() => {
                  openEditDialog(badge);
                }}
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
          </div>
        </section>
      </ManagementPageContainer>
    </AuthGuard>
  );
}

function BadgeFormFields({
  template,
  form,
  setForm,
  groupedTemplates,
  templates,
  isSaving,
  onProofUpload,
  onClear,
  onSave,
  categoryLabels,
}: {
  template: BadgeTemplate | undefined;
  form: BadgeFormState;
  setForm: Dispatch<SetStateAction<BadgeFormState>>;
  groupedTemplates: Record<string, BadgeTemplate[]>;
  templates: BadgeTemplate[];
  isSaving: boolean;
  onProofUpload: (file: File) => void;
  onClear: () => void;
  onSave: () => void;
  categoryLabels: Record<BadgeCategory, string>;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Label>Badge category</Label>
        <Select
          value={form.badgeCategory}
          onValueChange={(value) =>
            setForm((current) => ({
              ...current,
              badgeCategory: (value as BadgeCategory) ?? "",
              badgeTemplateId: "",
              valueNumber: "",
              valueMinutes: "",
              valueSeconds: "",
              valueText: "",
              referenceLabel: "",
              referenceValue: "",
              visibility: "public",
            }))
          }
          items={Object.keys(groupedTemplates).map((category) => ({
            value: category,
            label: categoryLabels[category as BadgeCategory],
          }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select badge category" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(groupedTemplates).map((category) => (
              <SelectItem key={category} value={category}>
                {categoryLabels[category as BadgeCategory]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
          disabled={!form.badgeCategory}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                form.badgeCategory
                  ? "Select badge type"
                  : "Select a category first"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {templates.length ? (
              <SelectGroup>
                <SelectLabel>
                  {categoryLabels[form.badgeCategory as BadgeCategory]}
                </SelectLabel>
                {templates.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : null}
          </SelectContent>
        </Select>
      </div>

      {template ? (
        <BadgeValueFields template={template} form={form} setForm={setForm} />
      ) : null}

      {form.badgeCategory !== "personal_best" ? (
        <>
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
        </>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="proof">Proof photo (optional)</Label>
        <Input
          id="proof"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = "";
            if (file) onProofUpload(file);
          }}
        />
        {form.proofMediaId ? (
          <p className="text-xs text-muted-foreground">
            Proof attached: {form.proofMediaId}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClear}>
          Clear
        </Button>
        <Button type="button" disabled={isSaving} onClick={onSave}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving
            </>
          ) : form.badgeId ? (
            "Update Badge & Credentials"
          ) : (
            "Add Badge & Credentials"
          )}
        </Button>
      </div>
    </div>
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
  const [imageFailed, setImageFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const imageSrc = normalizeBadgeImageSrc(badge.template.badgeImageUrl);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 ">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center">
          {imageSrc && !imageFailed ? (
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogTrigger
                render={
                  <button
                    type="button"
                    className="cursor-zoom-in"
                    aria-label={`Open ${badge.template.name} badge image`}
                    title="Open image"
                  />
                }
              >
                <Image
                  src={imageSrc}
                  alt={`${badge.template.name} badge logo`}
                  width={60}
                  height={60}
                  sizes="60px"
                  className="h-16 w-16 object-contain"
                  onError={(event: SyntheticEvent<HTMLImageElement>) => {
                    event.currentTarget.style.display = "none";
                    setImageFailed(true);
                  }}
                />
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl!">
                <DialogHeader>
                  <DialogTitle className="sr-only">
                    {badge.template.name} badge image
                  </DialogTitle>
                </DialogHeader>
                <div className="flex items-center justify-center">
                  <Image
                    src={imageSrc}
                    alt={`${badge.template.name} badge logo full view`}
                    width={960}
                    height={960}
                    sizes="(max-width: 768px) 90vw, 60vw"
                    className="h-auto max-h-[80vh] w-auto max-w-full object-contain"
                  />
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Award className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{badge.template.name}</p>
            {badge.displayValue ? (
              <Badge variant="secondary" className="h-6 px-2">
                {badge.displayValue}
              </Badge>
            ) : null}
          </div>
          {badge.referenceLabel || badge.referenceValue ? (
            <p className="text-xs text-muted-foreground">
              {[badge.referenceLabel, badge.referenceValue]
                .filter(Boolean)
                .join(": ")}
            </p>
          ) : null}
        </div>
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
    visibility:
      template.category === "personal_best" ? "public" : form.visibility,
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
    const value = parseNumericBadgeValue(form.valueNumber, template.unit);
    if (value == null || value < 0) {
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

function parseNumericBadgeValue(input: string, unit?: string): number | null {
  const raw = input.trim();
  if (!raw) return null;

  const normalizedUnit = (unit ?? "").trim().toLowerCase();
  let candidate = raw.toLowerCase();
  if (normalizedUnit) {
    const suffixPattern = new RegExp(`\\s*${normalizedUnit}$`, "i");
    candidate = candidate.replace(suffixPattern, "");
  }

  candidate = candidate.replace(/,/g, "").trim();
  if (!candidate) return null;

  const value = Number(candidate);
  if (!Number.isFinite(value)) return null;
  return value;
}

function normalizeBadgeImageSrc(value?: string): string {
  const src = value?.trim() ?? "";
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return src.startsWith("/") ? src : `/${src}`;
}

function formFromBadge(badge: UserBadge): BadgeFormState {
  return {
    badgeId: badge.id,
    badgeCategory: badge.template.category,
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
