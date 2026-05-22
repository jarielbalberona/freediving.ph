"use client";

import type { Event } from "@freediving.ph/types";
import { CalendarClock, Lock, MapPin, Star, Ticket, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { eventOptionLabel } from "@/features/events/constants";

type EventCardProps = {
  event: Event;
  onJoin?: (eventId: string) => void;
  onLeave?: (eventId: string) => void;
  onMarkInterested?: (eventId: string) => void;
  onMarkUninterested?: (eventId: string) => void;
  isInterestPending?: boolean;
  showActions?: boolean;
};

export function EventCard({
  event,
  onJoin,
  onLeave,
  onMarkInterested,
  onMarkUninterested,
  isInterestPending = false,
  showActions = true,
}: EventCardProps) {
  const privateLocked =
    event.visibility === "private" && !event.viewerCanViewPrivateDetails;
  const viewerState = event.viewerEventState ?? "none";
  const stateLabel = getViewerStateLabel(viewerState);
  const canToggleInterest =
    showActions &&
    event.status === "published" &&
    ["none", "interested", "rejected", "left", "cancelled"].includes(
      viewerState,
    );
  const statusLabel =
    stateLabel ?? (event.requiresApproval ? "Approval required" : "Open join");
  const canJoin = !event.viewerParticipation;

  return (
    <Card className="rounded-xl border-border/70 bg-background/80 py-0 shadow-none">
      <CardContent className="space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="h-5 rounded-full px-2 text-[11px]">
            {eventOptionLabel(event.type)}
          </Badge>
          <Badge variant="outline" className="h-5 px-2 text-[11px]">
            {event.visibility === "private" ? "Private" : "Public"}
          </Badge>
          {event.isPaid ? (
            <Badge variant="secondary" className="h-5 px-2 text-[11px]">
              {event.priceAmount == null
                ? "Paid"
                : `${event.currency} ${event.priceAmount}`}
            </Badge>
          ) : (
            <Badge variant="secondary" className="h-5 px-2 text-[11px]">
              Free
            </Badge>
          )}
        </div>

        <div className="space-y-1">
          <Link
            href={`/events/${event.slug}`}
            className="block text-base font-semibold leading-tight text-foreground hover:underline"
          >
            {event.title}
          </Link>
          <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
            {privateLocked
              ? event.shortDescription || "Private event details are limited."
              : event.shortDescription ||
                event.description ||
                "No summary has been added yet."}
          </p>
        </div>

        <div className="grid gap-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            {formatEventDate(event.startsAt, event.endsAt, event.timezone)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {event.diveSite
              ? `${event.diveSite.name} · ${event.diveSite.area}`
              : event.location || "Dive site not shown"}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {event.goingCount ?? event.currentAttendees}
            {event.capacity ? ` / ${event.capacity}` : ""} confirmed
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" />
            {event.interestedCount ?? 0} interested
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {event.visibility === "private" ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <Ticket className="h-3.5 w-3.5" />
            )}
            {statusLabel}
          </span>
          {showActions ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {canToggleInterest ? (
                viewerState === "interested" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isInterestPending}
                    onClick={() => onMarkUninterested?.(event.id)}
                  >
                    Uninterested
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isInterestPending}
                    onClick={() => onMarkInterested?.(event.id)}
                  >
                    Interested
                  </Button>
                )
              ) : null}
              {event.viewerJoined ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onLeave?.(event.id)}
                >
                  Leave
                </Button>
              ) : canJoin ? (
                <Button
                  size="sm"
                  onClick={() => onJoin?.(event.id)}
                  disabled={event.status !== "published"}
                >
                  {event.requiresApproval ? "Request" : "Join"}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function getViewerStateLabel(state: Event["viewerEventState"]) {
  switch (state) {
    case "interested":
      return "Interested";
    case "going":
      return "Going";
    case "pending_approval":
      return "Request pending";
    case "rejected":
      return "Rejected";
    case "left":
      return "Left";
    case "cancelled":
      return "Cancelled";
    default:
      return null;
  }
}

function formatEventDate(start?: string, end?: string, timezone?: string) {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) {
    return "Schedule not set";
  }
  const formatter = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone || "Asia/Manila",
  });
  if (!endDate || Number.isNaN(endDate.getTime())) {
    return formatter.format(startDate);
  }
  return `${formatter.format(startDate)} to ${formatter.format(endDate)}`;
}
