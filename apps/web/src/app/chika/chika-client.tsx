"use client";

import { useState } from "react";
import { useThreads, CreateThreadModal, ThreadList } from "@/features/chika";
import { Thread } from "@/features/chika/types";

interface ChikaClientProps {
  initialThreads: Thread[] | null;
  error: string | null;
}

export default function ChikaClient({ initialThreads, error }: ChikaClientProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: threads, isLoading } = useThreads(initialThreads || undefined);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Latest Chika</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Thread
        </button>
      </div>

      {error && (
        <div className="text-center py-8">
          <div className="text-red-600 text-lg mb-2">{error}</div>
          <p className="text-gray-500">Please try again later.</p>
        </div>
      )}

      <ThreadList threads={threads || []} isLoading={isLoading} />

      <CreateThreadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
}
