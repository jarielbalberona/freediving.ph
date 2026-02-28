import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div className="space-y-6 md:space-y-8">
      <section className="space-y-6">
        <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10">
          <div className="flex justify-center md:justify-start">
            <Skeleton className="size-28 rounded-full md:size-40" />
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-8 w-40 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-3 md:max-w-md">
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-36 rounded-full" />
              <Skeleton className="h-4 w-full rounded-full" />
              <Skeleton className="h-4 w-2/3 rounded-full" />
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-4 overflow-hidden py-2">
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
