import { threadsApi } from "@/features/chika";
import ChikaClient from "./threads";

export default async function ChikaList() {
  let threads = null;
  let error = null;

  try {
    threads = await threadsApi.getAll();
  } catch (err) {
    console.error("Failed to fetch threads:", err);
    error = "Failed to load threads";
  }

  return (
    <main className="">
      <div className="xl:pr-96">
        <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
          <div className="container max-w-screen-lg px-4 mx-auto sm:px-6 lg:px-8">
            <ChikaClient initialThreads={threads || null} error={error} />
          </div>
        </div>
      </div>
    </main>
  );
}
