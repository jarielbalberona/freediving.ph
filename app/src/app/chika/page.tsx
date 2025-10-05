import { http } from "@/lib/http";
import Threads from "./threads";
import CreateThreadButton from "./create-thread-button";

export default async function ChikaList() {
  let initialThreads = null;

  try {
    const response = await http.get<{ data: any[] }>("/threads");
    initialThreads = response.data;
  } catch (error) {
    console.error("Failed to fetch threads:", error);
  }

  return (
    <>
      <main className="">
        <div className="xl:pr-96">
          <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
            <div className="container max-w-screen-lg px-4 mx-auto sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Latest Chika</h1>
                <CreateThreadButton />
              </div>
              <Threads initialThreads={initialThreads} />
            </div>
          </div>
        </div>
      </main>

      {/* <aside className="fixed inset-y-0 right-0 hidden px-4 py-6 overflow-y-auto border-l border-gray-200 w-96 sm:px-6 lg:px-8 xl:block">

    </aside> */}
    </>
  );
}
