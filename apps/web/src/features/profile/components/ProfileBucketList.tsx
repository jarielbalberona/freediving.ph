import Link from "next/link";
import { CheckCircle2, MapPin } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProfileBucketListItem } from "@/features/profile/types";

type ProfileBucketListProps = {
  items: ProfileBucketListItem[];
};

export function ProfileBucketList({ items }: ProfileBucketListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 px-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Bucketlist
        </h2>
      </div>
      <ScrollArea className="w-full">
        <div className="flex min-w-full gap-3 px-1 py-1">
          {items.map((item) => (
            <Link
              key={item.siteId}
              href={`/explore/sites/${item.siteSlug}`}
              className="flex min-w-44 shrink-0 flex-col gap-1 rounded-xl border border-border/70 bg-card/70 px-3 py-2 transition-colors hover:bg-card"
            >
              <span className="line-clamp-1 text-sm font-semibold text-foreground">
                {item.siteName}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5" />
                {item.siteArea}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                {item.hasDived ? (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    Dived and pinned
                  </>
                ) : (
                  "Pinned"
                )}
              </span>
            </Link>
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}
