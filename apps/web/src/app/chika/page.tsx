import ChikaClient from "./threads";
import CreateThreadButton from "./create-thread-button";

export default function ChikaList() {
  return (
    <main className="min-h-full bg-gradient-to-b from-background to-muted/20 px-3 py-3 text-foreground sm:px-4 sm:py-4">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <header className="flex min-w-0 flex-col gap-3">
          <div className="min-w-0 space-y-3">
            <div>
              <h1 className="max-w-2xl text-lg font-medium tracking-tight text-foreground">
                Chika
              </h1>
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <CreateThreadButton />
          </div>
        </header>
        <ChikaClient />
      </div>
    </main>
  );
}
