import { threadsApiServer } from "@/features/chika/api/threads.server";
import ChikaClient from "./threads";
import CreateThreadButton from "./create-thread-button";

export default async function ChikaList() {
  let threads = null;
  let error = null;

  try {
    threads = await threadsApiServer.getAll();
  } catch (err) {
    console.error("Failed to fetch threads:", err);
    error = "Failed to load threads";
  }

  return (
    <main className="">
      <div className="xl:pr-96">
        <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
          <div className="container max-w-screen-lg px-4 mx-auto sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-2xl font-bold text-foreground">Chika</h1>
              <CreateThreadButton />
            </div>
            <ChikaClient initialThreads={threads || null} error={error} />
          </div>
        </div>
      </div>
    </main>
  );
}
