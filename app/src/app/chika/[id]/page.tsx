"use client";

import { ThreadDetail } from "@/features/chika";
import { useThread } from "@/features/chika";

export default function Chika({ params }: { params: { id: string } }) {
  const { data: thread, isLoading, error } = useThread(Number(params.id));

  if (isLoading) {
    return (
      <main className="">
        <div className="xl:pr-96">
          <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
            <div className="container max-w-screen-lg px-4 mx-auto sm:px-6 lg:px-8">
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading thread...</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="">
        <div className="xl:pr-96">
          <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
            <div className="container max-w-screen-lg px-4 mx-auto sm:px-6 lg:px-8">
              <h1>Thread not found</h1>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="">
        <div className="xl:pr-96">
          <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
            <div className="container max-w-screen-lg px-4 mx-auto sm:px-6 lg:px-8">
              {thread && <ThreadDetail thread={thread} />}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
