import ChikaClient from "./threads";
import CreateThreadButton from "./create-thread-button";
import { Badge } from "@/components/ui/badge";

export default function ChikaList() {
  return (
    <main className="min-h-full bg-gradient-to-b from-background to-muted/20 px-3 py-3 text-foreground sm:px-4 sm:py-4">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <header className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0 space-y-3">
            <Badge
              variant="outline"
              className="border-border/60 bg-background text-muted-foreground"
            >
              Community
            </Badge>
            <div>
              <h1 className="max-w-2xl text-lg font-medium tracking-tight text-foreground">
                Chika
              </h1>
            </div>
          </div>
          <div className="flex sm:justify-end">
            <CreateThreadButton />
          </div>
        </header>
        <ChikaClient />
      </div>
    </main>
  );
}
