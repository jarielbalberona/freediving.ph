import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExploreSiteLoading() {
  return (
    <div className="min-h-full bg-gradient-to-b from-background to-muted/20 px-3 py-3 text-foreground sm:px-4 sm:py-4">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-11 w-3/4 max-w-lg" />
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
        </div>

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-44" />
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <Skeleton className="h-7 w-48" />
          <div className="space-y-3">
            {Array.from({ length: 2 }, (_, index) => (
              <Card key={`site-update-loading-${index + 1}`} size="sm">
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-md" />
          <Card size="sm">
            <CardContent className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
