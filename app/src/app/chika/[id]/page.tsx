import { http } from "@/lib/http";
import ThreadDetail from "./thread-detail";

export default async function Chika({ params }: { params: { id: string } }) {
  let thread = null;

  try {
    const response = await http.get(`/threads/${params.id}`);
    thread = response.data;
  } catch (error) {
    console.error("Failed to fetch thread:", error);
    return <h1>Thread not found</h1>;
  }

  return (
    <>
      <main className="">
        <div className="xl:pr-96">
          <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
            <div className="container max-w-screen-lg px-4 mx-auto sm:px-6 lg:px-8">
              <ThreadDetail thread={thread} />
            </div>
          </div>
        </div>
      </main>

      {/* <aside className="fixed inset-y-0 right-0 hidden px-4 py-6 overflow-y-auto border-l border-gray-200 w-96 sm:px-6 lg:px-8 xl:block">

      </aside> */}
    </>
  );
}
