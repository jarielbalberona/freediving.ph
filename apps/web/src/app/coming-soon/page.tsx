import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ComingSoonPage() {
  return (
    <main className="container mx-auto min-h-[70vh] px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Coming Soon</h1>
          <p className="text-muted-foreground">
            This section is not live yet. We are shipping iteratively and keeping
            standards high before opening each module.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Open For Collaboration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              We are actively open for collaboration with divers, builders,
              moderators, and community partners.
            </p>
            <p>
              GitHub:{" "}
              <Link
                className="font-medium underline underline-offset-4"
                href="https://github.com/jarielbalberona/freediving.ph"
                target="_blank"
                rel="noreferrer"
              >
                github.com/jarielbalberona/freediving.ph
              </Link>
            </p>
            <p>
              We also manage:{" "}
              <Link
                className="font-medium underline underline-offset-4"
                href="https://reddit.com/r/freedivingph"
                target="_blank"
                rel="noreferrer"
              >
                reddit.com/r/freedivingph
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
