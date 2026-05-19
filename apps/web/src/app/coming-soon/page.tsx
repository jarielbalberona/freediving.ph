import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ComingSoonPage() {
  return (
    <main className="container mx-auto min-h-[70vh] px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            This area is not open yet
          </h1>
          <p className="text-muted-foreground">
            We are keeping this part closed until it is useful enough for the
            freediving community. For now, use Explore, Buddies, Chika, Groups,
            and Events.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Where to go instead</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Looking for dive spots, buddies, local groups, or community
              conversations? Those areas are open now.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                className="font-medium underline underline-offset-4"
                href="/explore"
              >
                Explore dive spots
              </Link>
              <Link
                className="font-medium underline underline-offset-4"
                href="/buddies"
              >
                Find buddies
              </Link>
              <Link
                className="font-medium underline underline-offset-4"
                href="/chika"
              >
                Join Chika
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
