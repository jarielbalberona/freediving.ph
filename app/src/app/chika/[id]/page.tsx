import { MessageSquare } from "lucide-react"

export default async function Chika(params: any) {

  const res = await fetch(`${process.env.API_URL}/threads/${params.id}`, {
    cache: "no-store", // Ensures fresh data
  });

  if (!res.ok) {
    return <h1>Thread not found</h1>;
  }

  const thread = await res.json();

  return (
    <>

        <main className="">
      <div className="xl:pr-96">
      <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
        <div className="container max-w-screen-lg px-4 mx-auto sm:px-6 lg:px-8">
    <div className="flex items-start space-x-4">

        <div className="flex-1">
          <h2 className="mb-1 text-lg font-semibold text-foreground">{thread.data.title}</h2>
          <p className="mb-2 text-sm text-muted-foreground line-clamp-2">{thread.data.content}</p>
          <div className="flex items-center text-xs text-muted-foreground">
            <span>Posted by {thread.data.user.username}</span>
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
  </div>
        </div>
      </div>
    </main>

    {/* <aside className="fixed inset-y-0 right-0 hidden px-4 py-6 overflow-y-auto border-l border-gray-200 w-96 sm:px-6 lg:px-8 xl:block">

    </aside> */}
          </>
  );
}
