import { Thread } from "../types";

interface ThreadDetailProps {
  thread: Thread;
}

export default function ThreadDetail({ thread }: ThreadDetailProps) {
  if (!thread) {
    return <h1>Thread not found</h1>;
  }

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{thread.title}</h1>
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <span>By {thread.author.alias || thread.author.username}</span>
          <span className="mx-2">•</span>
          <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="prose max-w-none">
        <p className="text-gray-700 whitespace-pre-wrap">{thread.content}</p>
      </div>

      {thread.tags && thread.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {thread.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between border-t pt-4">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>{thread.likeCount} likes</span>
          <span>{thread.commentCount} comments</span>
        </div>
      </div>
    </div>
  );
}
