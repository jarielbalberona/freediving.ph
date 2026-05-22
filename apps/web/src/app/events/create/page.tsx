"use client";

import type {
  CreateEventRequest,
  EventType,
  EventVisibility,
} from "@freediving.ph/types";
import { SignInButton } from "@clerk/nextjs";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/session";
import { DiveSiteCombobox } from "@/features/diveSpots/components/DiveSiteCombobox";
import { eventTypeOptions, useCreateEvent } from "@/features/events";
import { getApiErrorMessage } from "@/lib/http/api-error";

const CREATE_EVENT_TIMEZONE = "Asia/Manila";

type CreateEventFormState = {
  title: string;
  shortDescription: string;
  type: EventType;
  diveSiteId: string;
  diveSiteLabel: string;
  startsAt: string;
  endsAt: string;
  visibility: EventVisibility;
  requiresApproval: boolean;
  isPaid: boolean;
};

const defaultForm: CreateEventFormState = {
  title: "",
  shortDescription: "",
  type: "fun_dive",
  diveSiteId: "",
  diveSiteLabel: "",
  startsAt: "",
  endsAt: "",
  visibility: "public",
  requiresApproval: true,
  isPaid: false,
};

const visibilityChoices: Array<{
  value: EventVisibility;
  label: string;
  description: string;
}> = [
  {
    value: "public",
    label: "Public",
    description: "Anyone can view the event.",
  },
  {
    value: "private",
    label: "Private",
    description: "Only limited details are shown publicly.",
  },
];

export default function CreateEventPage() {
  const router = useRouter();
  const session = useSession();
  const createEventMutation = useCreateEvent();
  const [form, setForm] = useState<CreateEventFormState>(defaultForm);

  const isSignedIn = session.status === "signed_in";

  const updateForm = <K extends keyof CreateEventFormState>(
    key: K,
    value: CreateEventFormState[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = buildPayload(form);
    if (!payload.ok) {
      toast.error(payload.message);
      return;
    }

    createEventMutation.mutate(payload.value, {
      onSuccess: (createdEvent) => {
        toast.success("Event created.");
        router.push(`/events/${createdEvent.slug}`);
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
          title="Create an event"
          subtitle="Share a freediving session, trip, course, or community activity."
          action={<BackToEventsButton />}
        />
        <Card className="py-0">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <p className="text-sm text-muted-foreground">
              Sign in before creating an event.
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
        title="Create an event"
        subtitle="Share a freediving session, trip, course, or community activity."
        action={<BackToEventsButton />}
      />

      <CommunityAccessNote>
        <span>
          Choose an approved dive site for this event. If it is not listed yet,
          add the dive site first.
        </span>
        <Button
          className="ml-2 h-7 px-2 text-xs"
          variant="outline"
          render={<Link href="/explore/submit" />}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add dive site
        </Button>
      </CommunityAccessNote>

      <form className="space-y-4 pb-24 sm:pb-10" onSubmit={submit}>
        <Card className="py-0">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Event details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            <Field label="Event name">
              <Input
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="Mabini line training"
              />
            </Field>
            <Field
              label="Short description"
              helper="A short summary shown on event cards."
            >
              <Textarea
                className="min-h-16 resize-none"
                value={form.shortDescription}
                onChange={(event) =>
                  updateForm("shortDescription", event.target.value)
                }
                placeholder="A relaxed line-training session for certified freedivers."
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
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
                  searchPlaceholder="Search approved dive sites"
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
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Starts">
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) =>
                    updateForm("startsAt", event.target.value)
                  }
                />
              </Field>
              <Field label="Ends">
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) => updateForm("endsAt", event.target.value)}
                />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              Times are saved in Philippine time.
            </p>
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            <div className="grid gap-2 sm:grid-cols-2">
              {visibilityChoices.map((choice) => (
                <label
                  key={choice.value}
                  className="flex cursor-pointer gap-3 rounded-lg border border-border/70 p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    className="mt-1"
                    type="radio"
                    name="visibility"
                    value={choice.value}
                    checked={form.visibility === choice.value}
                    onChange={() => updateForm("visibility", choice.value)}
                  />
                  <span>
                    <span className="block font-medium text-foreground">
                      {choice.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                      {choice.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <CheckboxRow
              checked={form.requiresApproval}
              label="Require approval to join"
              helper="Review requests before someone joins the event."
              onCheckedChange={(checked) =>
                updateForm("requiresApproval", checked)
              }
            />
            <CheckboxRow
              checked={form.isPaid}
              label="Paid event"
              helper="You can add payment instructions after creating the event."
              onCheckedChange={(checked) => updateForm("isPaid", checked)}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            render={<Link href="/events" />}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createEventMutation.isPending}>
            {createEventMutation.isPending ? "Creating..." : "Create event"}
          </Button>
        </div>
      </form>
    </CommunityPageShell>
  );
}

function BackToEventsButton() {
  return (
    <Button size="sm" variant="outline" render={<Link href="/events" />}>
      <ArrowLeft className="mr-1 h-4 w-4" />
      Back to events
    </Button>
  );
}

function CheckboxRow({
  checked,
  label,
  helper,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  helper: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 p-3 text-sm">
      <input
        className="mt-1"
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      <span>
        <span className="block font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
          {helper}
        </span>
      </span>
    </label>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {helper ? (
        <span className="text-xs leading-5 text-muted-foreground">
          {helper}
        </span>
      ) : null}
    </label>
  );
}

function buildPayload(
  form: CreateEventFormState,
): { ok: true; value: CreateEventRequest } | { ok: false; message: string } {
  const title = form.title.trim();
  const shortDescription = form.shortDescription.trim();
  const startsAt = toISO(form.startsAt, CREATE_EVENT_TIMEZONE);
  const endsAt = toISO(form.endsAt, CREATE_EVENT_TIMEZONE);

  if (!title) return { ok: false, message: "Event name is required." };
  if (!shortDescription) {
    return { ok: false, message: "Short description is required." };
  }
  if (!form.diveSiteId) {
    return { ok: false, message: "Select an approved dive site." };
  }
  if (!startsAt || !endsAt) {
    return { ok: false, message: "Start and end date/time are required." };
  }
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return { ok: false, message: "End time must be after start time." };
  }

  return {
    ok: true,
    value: {
      title,
      shortDescription,
      type: form.type,
      diveSiteId: form.diveSiteId,
      startsAt,
      endsAt,
      timezone: CREATE_EVENT_TIMEZONE,
      visibility: form.visibility,
      requiresApproval: form.requiresApproval,
      isPaid: form.isPaid,
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
