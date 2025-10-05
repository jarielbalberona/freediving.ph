import { faker } from "@faker-js/faker";
import db from "@/databases/drizzle/connection";
import { reactions } from "@/models/drizzle/threads.model";
import { users } from "@/models/drizzle/authentication.model";
import { threads } from "@/models/drizzle/threads.model";
import { comments } from "@/models/drizzle/threads.model";

export default async function seedReactions() {
  try {
    console.log("Seeding reactions started...");

    // Get all users, threads, and comments
    const allUsers = await db.select({ id: users.id }).from(users);
    const allThreads = await db.select({ id: threads.id }).from(threads);
    const allComments = await db.select({ id: comments.id }).from(comments);

    if (allUsers.length === 0 || allThreads.length === 0) {
      console.log("No users or threads found. Please seed users and threads first.");
      return;
    }

    const reactionsData = [];

    // Create reactions for threads
    for (const thread of allThreads) {
      // Each thread gets 5-20 reactions
      const reactionCount = faker.number.int({ min: 5, max: 20 });

      for (let i = 0; i < reactionCount; i++) {
        reactionsData.push({
          userId: faker.helpers.arrayElement(allUsers).id,
          threadId: thread.id,
          commentId: null,
          type: faker.helpers.arrayElement(["1", "0"]) as "1" | "0", // 1 = like, 0 = dislike
          createdAt: faker.date.recent({ days: 25 }),
          updatedAt: new Date()
        });
      }
    }

    // Create reactions for comments (if we have comments)
    if (allComments.length > 0) {
      for (const comment of allComments) {
        // Each comment gets 0-5 reactions
        const reactionCount = faker.number.int({ min: 0, max: 5 });

        for (let i = 0; i < reactionCount; i++) {
          reactionsData.push({
            userId: faker.helpers.arrayElement(allUsers).id,
            threadId: null,
            commentId: comment.id,
            type: faker.helpers.arrayElement(["1", "0"]) as "1" | "0",
            createdAt: faker.date.recent({ days: 25 }),
            updatedAt: new Date()
          });
        }
      }
    }

    // Remove duplicate reactions (same user reacting to same item)
    const uniqueReactions = reactionsData.filter((reaction, index, self) =>
      index === self.findIndex(r =>
        r.userId === reaction.userId &&
        ((r.threadId === reaction.threadId && r.threadId !== null) ||
         (r.commentId === reaction.commentId && r.commentId !== null))
      )
    );

    await db.insert(reactions).values(uniqueReactions).onConflictDoNothing();
    console.log(`✅ ${uniqueReactions.length} reactions seeded successfully!`);
  } catch (error) {
    console.error("Error seeding reactions:", error);
  }
}
