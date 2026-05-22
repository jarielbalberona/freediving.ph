"use client";

import type {
  CreateEventPaymentMethodRequest,
  CreateEventRequest,
  EventDifficulty,
  EventEntryType,
  EventPaymentMethodType,
  EventType,
  EventVisibility,
} from "@freediving.ph/types";
import { SignInButton } from "@clerk/nextjs";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

import {
  CommunityAccessNote,
  CommunityHeader,
  CommunityPageShell,
} from "@/components/community/community-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DiveSiteCombobox } from "@/features/diveSpots/components/DiveSiteCombobox";
import {
  difficultyOptions,
  entryTypeOptions,
  eventTypeOptions,
  useCreateEvent,
  visibilityOptions,
} from "@/features/events";
import { useSession } from "@/features/auth/session";
import { MarkdownEditor } from "@/features/chika/components/MarkdownEditor";
import { getApiErrorMessage } from "@/lib/http/api-error";

type PaymentMethodDraft = CreateEventPaymentMethodRequest & {
  key: string;
};

type CreateEventFormState = {
  title: string;
  shortDescription: string;
  descriptionMarkdown: string;
  type: EventType;
  diveSiteId: string;
  diveSiteLabel: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  capacity: string;
  visibility: EventVisibility;
  requiresApproval: boolean;
  isPaid: boolean;
  priceAmount: string;
  currency: string;
  meetingPoint: string;
  beginnerFriendly: boolean;
  maxDepthM: string;
  difficulty: EventDifficulty;
  entryType: EventEntryType | "";
  equipmentNotes: string;
  safetyNotes: string;
  cancellationPolicy: string;
  paymentInstructions: string;
};

const defaultForm: CreateEventFormState = {
  title: "",
  shortDescription: "",
  descriptionMarkdown: "",
  type: "fun_dive",
  diveSiteId: "",
  diveSiteLabel: "",
  startsAt: "",
  endsAt: "",
  timezone: "Asia/Manila",
  capacity: "8",
  visibility: "public",
  requiresApproval: true,
  isPaid: false,
  priceAmount: "",
  currency: "PHP",
  meetingPoint: "",
  beginnerFriendly: false,
  maxDepthM: "",
  difficulty: "beginner",
  entryType: "",
  equipmentNotes: "",
  safetyNotes: "",
  cancellationPolicy: "",
  paymentInstructions: "",
};

export default function CreateEventPage() {
  const router = useRouter();
  const session = useSession();
  const createEventMutation = useCreateEvent();
  const [form, setForm] = useState<CreateEventFormState>(defaultForm);
  const [methods, setMethods] = useState<PaymentMethodDraft[]>([
    createPaymentMethodDraft(),
  ]);

  const isSignedIn = session.status === "signed_in";

  const updateForm = <K extends keyof CreateEventFormState>(
    key: K,
    value: CreateEventFormState[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const updateMethod = (
    key: string,
    patch: Partial<CreateEventPaymentMethodRequest>,
  ) => {
    setMethods((current) =>
      current.map((method) =>
        method.key === key ? { ...method, ...patch } : method,
      ),
    );
  };

  const removeMethod = (key: string) => {
    setMethods((current) =>
      current.length <= 1
        ? [createPaymentMethodDraft()]
        : current.filter((method) => method.key !== key),
    );
  };

  const submit = () => {
    const payload = buildPayload(form, methods);
    if (!payload.ok) {
      toast.error(payload.message);
      return;
    }

    createEventMutation.mutate(payload.value, {
      onSuccess: (event) => {
        toast.success("Event published.");
        router.push(`/events/${event.slug}`);
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, "Failed to create event"));
      },
    });
  };

  if (!isSignedIn) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          eyebrow="Events"
          title="Create event"
          subtitle="Sign in before publishing a freediving event."
          action={
            <Button size="sm" variant="outline" render={<Link href="/events" />}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Events
            </Button>
          }
        />
        <Card className="py-0">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <p className="text-sm text-muted-foreground">
              Event creation is only available to signed-in members.
            </p>
            <SignInButton mode="modal">
              <Button size="sm">Sign in</Button>
            </SignInButton>
          </CardContent>
        </Card>
      </CommunityPageShell>
    );
  }

  return (
    <CommunityPageShell>
      <CommunityHeader
        eyebrow="Events"
        title="Create event"
        subtitle="Publish a freediving event with a required approved dive site, explicit join rules, and manual payment instructions."
        action={
          <Button size="sm" variant="outline" render={<Link href="/events" />}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Events
          </Button>
        }
      />

      <CommunityAccessNote>
        Select an approved dive site first. If the site is missing, add it from
        the dive-site submission flow before creating the event.
        <Button
          className="ml-2 h-7 px-2 text-xs"
          variant="outline"
          render={<Link href="/explore/submit" />}
        >
          Add dive site
        </Button>
      </CommunityAccessNote>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-4">
          <Card className="py-0">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Core details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
              <Field label="Event name">
                <Input
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
                  placeholder="Mabini line training"
                />
              </Field>
              <Field label="Short description">
                <Textarea
                  className="min-h-20"
                  value={form.shortDescription}
                  onChange={(event) =>
                    updateForm("shortDescription", event.target.value)
                  }
                  placeholder="One or two lines shown on event cards"
                />
              </Field>
              <Field label="Full description (Markdown)">
                <MarkdownEditor
                  value={form.descriptionMarkdown}
                  onChange={(value) =>
                    updateForm("descriptionMarkdown", value)
                  }
                  placeholder="Schedule, inclusions, what to bring, and organizer notes"
                />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Event type">
                  <Select
                    value={form.type}
                    onValueChange={(value) =>
                      updateForm("type", value as EventType)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Dive site">
                  <DiveSiteCombobox
                    value={form.diveSiteId}
                    valueLabel={form.diveSiteLabel}
                    onValueChange={(value, site) => {
                      updateForm("diveSiteId", value);
                      updateForm(
                        "diveSiteLabel",
                        site ? `${site.name} · ${site.area}` : "",
                      );
                    }}
                  />
                </Field>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Start date and time">
                  <Input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(event) =>
                      updateForm("startsAt", event.target.value)
                    }
                  />
                </Field>
                <Field label="End date and time">
                  <Input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(event) =>
                      updateForm("endsAt", event.target.value)
                    }
                  />
                </Field>
                <Field label="Timezone">
                  <Input
                    value={form.timezone}
                    onChange={(event) =>
                      updateForm("timezone", event.target.value)
                    }
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Freediving specifics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Difficulty">
                  <Select
                    value={form.difficulty}
                    onValueChange={(value) =>
                      updateForm("difficulty", value as EventDifficulty)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Entry type">
                  <Select
                    value={form.entryType || "none"}
                    onValueChange={(value) =>
                      updateForm(
                        "entryType",
                        value === "none" ? "" : (value as EventEntryType),
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      {entryTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Max depth (m)">
                  <Input
                    type="number"
                    min={0}
                    value={form.maxDepthM}
                    onChange={(event) =>
                      updateForm("maxDepthM", event.target.value)
                    }
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.beginnerFriendly}
                  onChange={(event) =>
                    updateForm("beginnerFriendly", event.target.checked)
                  }
                />
                Beginner-friendly
              </label>
              <Field label="Meeting point">
                <Input
                  value={form.meetingPoint}
                  onChange={(event) =>
                    updateForm("meetingPoint", event.target.value)
                  }
                  placeholder="Resort lobby, pier, pool entrance, or map pin note"
                />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Equipment notes">
                  <Textarea
                    className="min-h-28"
                    value={form.equipmentNotes}
                    onChange={(event) =>
                      updateForm("equipmentNotes", event.target.value)
                    }
                  />
                </Field>
                <Field label="Safety notes">
                  <Textarea
                    className="min-h-28"
                    value={form.safetyNotes}
                    onChange={(event) =>
                      updateForm("safetyNotes", event.target.value)
                    }
                  />
                </Field>
              </div>
              <Field label="Cancellation policy">
                <Textarea
                  className="min-h-24"
                  value={form.cancellationPolicy}
                  onChange={(event) =>
                    updateForm("cancellationPolicy", event.target.value)
                  }
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="py-0">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Access and capacity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
              <Field label="Capacity">
                <Input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(event) =>
                    updateForm("capacity", event.target.value)
                  }
                />
              </Field>
              <Field label="Visibility">
                <Select
                  value={form.visibility}
                  onValueChange={(value) =>
                    updateForm("visibility", value as EventVisibility)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visibilityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.requiresApproval}
                  onChange={(event) =>
                    updateForm("requiresApproval", event.target.checked)
                  }
                />
                Require organizer approval
              </label>
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isPaid}
                  onChange={(event) => updateForm("isPaid", event.target.checked)}
                />
                Paid event
              </label>
              {form.isPaid ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Price">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.priceAmount}
                        onChange={(event) =>
                          updateForm("priceAmount", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Currency">
                      <Input
                        value={form.currency}
                        onChange={(event) =>
                          updateForm("currency", event.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Payment instructions">
                    <Textarea
                      className="min-h-24"
                      value={form.paymentInstructions}
                      onChange={(event) =>
                        updateForm("paymentInstructions", event.target.value)
                      }
                    />
                  </Field>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Payment methods</Label>
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setMethods((current) => [
                            ...current,
                            createPaymentMethodDraft(),
                          ])
                        }
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add
                      </Button>
                    </div>
                    {methods.map((method) => (
                      <PaymentMethodEditor
                        key={method.key}
                        method={method}
                        onChange={(patch) => updateMethod(method.key, patch)}
                        onRemove={() => removeMethod(method.key)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Free events skip payment proof and organizer payment review.
                </p>
              )}
            </CardContent>
          </Card>

          <Button
            className="w-full"
            size="lg"
            disabled={createEventMutation.isPending}
            onClick={submit}
          >
            {createEventMutation.isPending ? "Publishing..." : "Publish event"}
          </Button>
        </div>
      </div>
    </CommunityPageShell>
  );
}

function PaymentMethodEditor({
  method,
  onChange,
  onRemove,
}: {
  method: PaymentMethodDraft;
  onChange: (patch: Partial<CreateEventPaymentMethodRequest>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <Select
          value={method.type}
          onValueChange={(value) =>
            onChange({ type: value as EventPaymentMethodType })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MANUAL_QR">Manual QR</SelectItem>
            <SelectItem value="MANUAL_BANK_TRANSFER">
              Bank transfer
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={onRemove}
          aria-label="Remove payment method"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Field label="Name">
        <Input
          value={method.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder={method.type === "MANUAL_QR" ? "GCash QR" : "BPI"}
        />
      </Field>
      <Field label="Instructions">
        <Textarea
          className="min-h-20"
          value={method.instructions ?? ""}
          onChange={(event) => onChange({ instructions: event.target.value })}
        />
      </Field>
      {method.type === "MANUAL_QR" ? (
        <Field label="QR image URL">
          <Input
            value={method.qrImageUrl ?? ""}
            onChange={(event) => onChange({ qrImageUrl: event.target.value })}
            placeholder="Upload link or hosted QR image URL"
          />
        </Field>
      ) : (
        <div className="grid gap-3">
          <Field label="Bank name">
            <Input
              value={method.bankName ?? ""}
              onChange={(event) => onChange({ bankName: event.target.value })}
              placeholder="BPI, BDO, Metrobank"
            />
          </Field>
          <Field label="Account name">
            <Input
              value={method.accountName ?? ""}
              onChange={(event) =>
                onChange({ accountName: event.target.value })
              }
            />
          </Field>
          <Field label="Account number">
            <Input
              value={method.accountNumber ?? ""}
              onChange={(event) =>
                onChange({ accountNumber: event.target.value })
              }
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function createPaymentMethodDraft(): PaymentMethodDraft {
  return {
    key: crypto.randomUUID(),
    type: "MANUAL_QR",
    name: "",
    instructions: "",
    isActive: true,
  };
}

function buildPayload(
  form: CreateEventFormState,
  methods: PaymentMethodDraft[],
):
  | { ok: true; value: CreateEventRequest }
  | { ok: false; message: string } {
  const title = form.title.trim();
  const shortDescription = form.shortDescription.trim();
  const descriptionMarkdown = form.descriptionMarkdown.trim();
  const capacity = Number.parseInt(form.capacity, 10);
  const timezone = form.timezone.trim() || "Asia/Manila";
  if (!isValidTimeZone(timezone)) {
    return { ok: false, message: "Timezone must be a valid IANA timezone." };
  }
  const startsAt = toISO(form.startsAt, timezone);
  const endsAt = toISO(form.endsAt, timezone);

  if (!title) return { ok: false, message: "Event name is required." };
  if (!shortDescription)
    return { ok: false, message: "Short description is required." };
  if (!descriptionMarkdown)
    return { ok: false, message: "Full Markdown description is required." };
  if (!form.diveSiteId)
    return { ok: false, message: "Select an approved dive site." };
  if (!startsAt || !endsAt)
    return { ok: false, message: "Start and end date/time are required." };
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return { ok: false, message: "End time must be after start time." };
  }
  if (!Number.isFinite(capacity) || capacity < 1) {
    return { ok: false, message: "Capacity must be at least 1." };
  }

  const paymentMethods = methods
    .map(({ key: _key, ...method }) => ({
      ...method,
      name: method.name.trim(),
      instructions: method.instructions?.trim() || undefined,
      qrImageUrl: method.qrImageUrl?.trim() || undefined,
      accountName: method.accountName?.trim() || undefined,
      accountNumber: method.accountNumber?.trim() || undefined,
      bankName: method.bankName?.trim() || undefined,
    }))
    .filter((method) => method.name);

  const priceAmount = form.priceAmount
    ? Number.parseFloat(form.priceAmount)
    : undefined;
  if (form.isPaid) {
    if (priceAmount === undefined || !Number.isFinite(priceAmount)) {
      return { ok: false, message: "Paid events require a valid price." };
    }
    if (paymentMethods.length === 0) {
      return {
        ok: false,
        message: "Paid events require at least one payment method.",
      };
    }
  }

  return {
    ok: true,
    value: {
      title,
      shortDescription,
      descriptionMarkdown,
      type: form.type,
      diveSiteId: form.diveSiteId,
      startsAt,
      endsAt,
      timezone,
      capacity,
      visibility: form.visibility,
      requiresApproval: form.requiresApproval,
      isPaid: form.isPaid,
      priceAmount: form.isPaid ? priceAmount : undefined,
      currency: form.currency.trim().toUpperCase() || "PHP",
      paymentInstructions: form.isPaid
        ? form.paymentInstructions.trim() || undefined
        : undefined,
      paymentMethods: form.isPaid ? paymentMethods : undefined,
      meetingPoint: form.meetingPoint.trim() || undefined,
      beginnerFriendly: form.beginnerFriendly,
      maxDepthM: form.maxDepthM
        ? Number.parseInt(form.maxDepthM, 10)
        : undefined,
      difficulty: form.difficulty,
      entryType: form.entryType || undefined,
      equipmentNotes: form.equipmentNotes.trim() || undefined,
      safetyNotes: form.safetyNotes.trim() || undefined,
      cancellationPolicy: form.cancellationPolicy.trim() || undefined,
      status: "published",
    },
  };
}

function toISO(value: string, timeZone: string) {
  if (!value) return "";
  const parsed = parseDateTimeLocal(value);
  if (!parsed) return "";
  try {
    const wallClockUTC = Date.UTC(
      parsed.year,
      parsed.month - 1,
      parsed.day,
      parsed.hour,
      parsed.minute,
      parsed.second,
    );
    const firstOffset = getTimeZoneOffsetMs(new Date(wallClockUTC), timeZone);
    const correctedUTC = wallClockUTC - firstOffset;
    const secondOffset = getTimeZoneOffsetMs(new Date(correctedUTC), timeZone);
    const date = new Date(wallClockUTC - secondOffset);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString();
  } catch {
    return "";
  }
}

function parseDateTimeLocal(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value.trim(),
  );
  if (!match) return null;
  return {
    year: Number.parseInt(match[1] ?? "", 10),
    month: Number.parseInt(match[2] ?? "", 10),
    day: Number.parseInt(match[3] ?? "", 10),
    hour: Number.parseInt(match[4] ?? "", 10),
    minute: Number.parseInt(match[5] ?? "", 10),
    second: Number.parseInt(match[6] ?? "0", 10),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const zonedAsUTC = Date.UTC(
    Number.parseInt(values.year ?? "", 10),
    Number.parseInt(values.month ?? "", 10) - 1,
    Number.parseInt(values.day ?? "", 10),
    Number.parseInt(values.hour ?? "", 10),
    Number.parseInt(values.minute ?? "", 10),
    Number.parseInt(values.second ?? "", 10),
  );
  return zonedAsUTC - date.getTime();
}

function isValidTimeZone(timeZone: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
