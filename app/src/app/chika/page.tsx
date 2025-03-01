import { serverAPICall } from "@/lib/api";
import Threads from "./threads";

export default async function ChikaList() {
  const threads = await serverAPICall("/threads")

  return (
    <>
      <main className="">
        <div className="xl:pr-96">
          <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
            <div className="container max-w-screen-lg px-4 mx-auto sm:px-6 lg:px-8">
              <h1 className="mb-6 text-2xl font-bold">Latest Chika</h1>
              <Threads initialThread={threads} />
            </div>
          </div>
        </div>
      </main>

      {/* <aside className="fixed inset-y-0 right-0 hidden px-4 py-6 overflow-y-auto border-l border-gray-200 w-96 sm:px-6 lg:px-8 xl:block">

    </aside> */}
    </>
  );
}
