"use client";

import { use as usePromise } from "react";

import { ThreadDetail } from "@/features/chika";
import { useThread } from "@/features/chika";
import { getApiErrorMessage } from "@/lib/http/api-error";

export default function Chika({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const { data: thread, isLoading, error } = useThread(Number(id));

  if (isLoading) {
    return (
      <main>
        <div className="xl:pr-96">
          <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
            <div className="container mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading thread...</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <div className="xl:pr-96">
          <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
            <div className="container mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8">
              <h1>{getApiErrorMessage(error, "Thread not found")}</h1>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="xl:pr-96">
        <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
          <div className="container mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8">
            {thread && <ThreadDetail thread={thread} />}
          </div>
        </div>
      </div>
    </main>
  );
}
