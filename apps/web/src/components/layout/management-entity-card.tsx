import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Camera,
  CircleUserRound,
  Clock3,
  FileText,
  Image as ImageIcon,
  Users,
  Eye,
} from "lucide-react";

type ManagementEntityCardStat = {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
};

type ManagementEntityCardProps = {
  title: string;
  href: string;
  description?: string;
  location?: string;
  status?: string;
  actionLabel?: string;
  stats?: ManagementEntityCardStat[];
  coverImage?: string | null;
  avatarUrl?: string | null;
  placeholderIcon?: React.ComponentType<{ className?: string }>;
  className?: string;
};

export function ManagementEntityCard({
  title,
  href,
  description,
  location,
  status,
  actionLabel = "Open",
  stats = [],
  coverImage,
  avatarUrl,
  placeholderIcon: PlaceholderIcon = ImageIcon,
  className,
}: ManagementEntityCardProps) {
  const hasCover = Boolean(coverImage);
  const hasAvatar = Boolean(avatarUrl);

  return (
    <Card className={cn("", className)}>
      <CardContent className="flex h-full flex-col p-0">
        <div className="relative h-32 overflow-hidden rounded-t-lg border-b border-border/70 bg-muted/40">
          {hasCover ? (
            <div className="h-full w-full bg-gradient-to-br from-muted to-muted/10" />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground/70">
              <Camera className="h-6 w-6" />
            </div>
          )}
          <div className="absolute -bottom-5 left-4">
            <div className="grid h-12 w-12 place-items-center rounded-lg border border-border/70 bg-background shadow-sm">
              {hasAvatar ? (
                <div className="h-full w-full bg-muted" />
              ) : (
                <PlaceholderIcon className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4 pt-6">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
              {location ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{location}</p>
              ) : null}
            </div>
            {status ? <Badge variant="secondary">{status}</Badge> : null}
          </div>
          {description ? (
            <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        {stats.length > 0 ? (
            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              {stats.map((item) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  {
                    (() => {
                      const Icon =
                        item.icon ?? getManagementStatIcon(item.label);
                      return <Icon className="h-4 w-4 text-muted-foreground" />;
                    })()
                  }
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="px-4 pb-4 pt-2">
          <Button
            className="w-full"
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={href} />}
          >
            {actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getManagementStatIcon(
  label: string,
): React.ComponentType<{ className?: string }> {
  const normalized = label.toLowerCase();

  if (normalized.includes("participant") || normalized.includes("member")) {
    return Users;
  }

  if (
    normalized.includes("date") ||
    normalized.includes("going") ||
    normalized.includes("end") ||
    normalized.includes("start")
  ) {
    return Calendar;
  }

  if (normalized.includes("course")) {
    return FileText;
  }

  if (normalized.includes("session")) {
    return Clock3;
  }

  if (normalized.includes("post")) {
    return FileText;
  }

  if (normalized.includes("booking") || normalized.includes("book")) {
    return CircleUserRound;
  }

  if (normalized.includes("status") || normalized.includes("visibility")) {
    return Eye;
  }

  return Calendar;
}
