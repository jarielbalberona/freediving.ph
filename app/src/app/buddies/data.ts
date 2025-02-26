
export interface Thread {
  id: string
  title: string
  content: string
  author: string
  postedAt: string
  upvotes: number
  downvotes: number
  commentCount: number
}

export const threads: Thread[] = [
  {
    id: "1",
    title: "Just finished my first React project!",
    content:
      "After weeks of learning and hard work, I've finally completed my first React project. It's a simple todo app, but I'm really proud of it. I learned so much about components, state management, and...",
    author: "newbie_dev",
    postedAt: "2 hours ago",
    upvotes: 142,
    downvotes: 12,
    commentCount: 37,
  },
  {
    id: "2",
    title: "What's your favorite VS Code extension?",
    content:
      "I'm always looking to improve my development workflow. What VS Code extensions do you find indispensable? Personally, I love the GitLens extension for its powerful Git integration...",
    author: "coding_enthusiast",
    postedAt: "5 hours ago",
    upvotes: 89,
    downvotes: 3,
    commentCount: 52,
  },
  {
    id: "3",
    title: "Thoughts on the new JavaScript features?",
    content:
      "The latest ECMAScript proposal includes some interesting new features. I'm particularly excited about the Record and Tuple types. What do you think about these additions? Do you see them being useful in your day-to-day coding?",
    author: "js_lover",
    postedAt: "1 day ago",
    upvotes: 210,
    downvotes: 15,
    commentCount: 73,
  },
]
