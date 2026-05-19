import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div className="space-y-6 md:space-y-8">
      <section className="space-y-6 px-4">
        <div className="grid gap-6 md:hidden">
          <div className="grid grid-cols-[auto_1fr] items-center gap-5">
            <Skeleton className="size-24 rounded-full" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={`profile-mobile-stat-skeleton-${index + 1}`}
                  className="flex flex-col items-center gap-1"
                >
                  <Skeleton className="h-5 w-8 rounded-full" />
                  <Skeleton className="h-3 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-32 rounded-full" />
                <Skeleton className="size-8 rounded-full" />
              </div>
              <Skeleton className="h-5 w-40 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-4 w-2/3 rounded-full" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </div>
        </div>

        <div className="hidden md:grid md:grid-cols-[220px_minmax(0,1fr)] md:items-start md:gap-10">
          <div className="flex justify-center">
            <Skeleton className="size-30 rounded-full" />
          </div>
          <div className="space-y-5 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-8 w-40 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-8">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={`profile-desktop-stat-skeleton-${index + 1}`}
                  className="flex items-center gap-1"
                >
                  <Skeleton className="h-5 w-8 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-36 rounded-full" />
              <Skeleton className="h-4 w-full rounded-full" />
              <Skeleton className="h-4 w-2/3 rounded-full" />
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-4 overflow-hidden px-4 py-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={`profile-highlight-skeleton-${index + 1}`}
            className="flex w-20 shrink-0 flex-col items-center gap-2"
          >
            <Skeleton className="size-20 rounded-full" />
            <Skeleton className="h-3 w-14 rounded-full" />
          </div>
        ))}
      </div>

      <Skeleton className="h-px w-full rounded-none" />

      <div className="grid grid-cols-3 gap-1 xl:grid-cols-4">
        {Array.from({ length: 12 }, (_, index) => (
          <Skeleton
            key={`profile-grid-skeleton-${index + 1}`}
            className="aspect-square rounded-none"
          />
        ))}
      </div>
    </div>
  );
}
