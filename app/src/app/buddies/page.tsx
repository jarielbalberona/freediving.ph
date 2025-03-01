import Link from "next/link"
import { ArrowBigDown, ArrowBigUp, MessageSquare } from "lucide-react"
import { threads } from "./data"
export default function ChikaList() {
  return (
    <>
  <main className="">
          <div className="xl:pr-96">
          <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
            <div className="container max-w-screen-lg px-4 mx-auto sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">Latest Chika</h1>
      {threads?.map((thread) => (
        <Link
          key={thread.id}
          href={`/chika/${thread.id}`}
          className="block p-4 mb-2 transition-colors duration-200 rounded-lg bg-card hover:bg-accent"
        >
          <div className="flex items-start space-x-4">
            <div className="flex flex-col items-center space-y-1 text-muted-foreground">
              <button className="hover:text-primary" aria-label="Upvote">
                <ArrowBigUp className="w-6 h-6" />
              </button>
              <span className="text-sm font-medium">{thread.upvotes - thread.downvotes}</span>
              <button className="hover:text-primary" aria-label="Downvote">
                <ArrowBigDown className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1">
              <h2 className="mb-1 text-lg font-semibold text-foreground">{thread.title}</h2>
              <p className="mb-2 text-sm text-muted-foreground line-clamp-2">{thread.content}</p>
              <div className="flex items-center text-xs text-muted-foreground">
                <span>Posted by {thread.author}</span>
                <span className="mx-2">•</span>
                <span>{thread.postedAt}</span>
                <span className="mx-2">•</span>
                <span className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {thread.commentCount} comments
                </span>
              </div>
            </div>
          </div>
        </Link>
      ))}
      </div>
            </div>
          </div>
        </main>

        {/* <aside className="fixed inset-y-0 right-0 hidden px-4 py-6 overflow-y-auto border-l border-gray-200 w-96 sm:px-6 lg:px-8 xl:block">

        </aside> */}
    </>

  )
}

