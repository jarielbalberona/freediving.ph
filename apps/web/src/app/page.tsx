import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { HomeFeedPage } from "@/features/home-feed";

export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeFeedPage />
    </Suspense>
  );
}

function HomeFallback() {
  return (
    <main className="min-h-full bg-gradient-to-b from-background to-muted/20 px-3 py-3 text-foreground sm:px-4 sm:py-4">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-5 w-32 rounded-full" />
              <Skeleton className="h-9 w-4/5 max-w-lg rounded-full" />
              <Skeleton className="h-4 w-full max-w-md rounded-full" />
              <Skeleton className="h-4 w-2/3 max-w-xs rounded-full" />
            </div>
            <Skeleton className="size-12 shrink-0 rounded-full" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton
                key={`home-action-skeleton-${index + 1}`}
                className="h-10 rounded-md"
              />
            ))}
          </div>
        </section>

        <Skeleton className="h-24 rounded-2xl" />

        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton
              key={`home-tab-skeleton-${index + 1}`}
              className="h-9 w-24 shrink-0 rounded-full"
            />
          ))}
        </div>

        <div className="divide-y divide-border/70">
          {Array.from({ length: 3 }, (_, index) => (
            <article key={`home-feed-skeleton-${index + 1}`} className="py-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-7 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-36 max-w-full" />
                  <Skeleton className="h-3 w-48 max-w-full" />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              {index === 1 ? (
                <Skeleton className="mt-3 aspect-[4/3] w-full rounded-2xl" />
              ) : null}
              <div className="mt-3 flex justify-end gap-2">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="size-8 rounded-full" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
