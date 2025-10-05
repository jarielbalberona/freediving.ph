import { faker } from "@faker-js/faker";
import db from "@/databases/drizzle/connection";
import { comments } from "@/models/drizzle/threads.model";
import { users } from "@/models/drizzle/authentication.model";
import { threads } from "@/models/drizzle/threads.model";

const commentTemplates = [
  "Great question! I've been diving there for years and can share some insights.",
  "I had the same issue when I started. Here's what worked for me...",
  "Thanks for sharing this! Very helpful information.",
  "I disagree with the previous comment. In my experience...",
  "This is exactly what I was looking for. Thanks!",
  "Has anyone tried this approach? I'm curious about the results.",
  "I've been using this technique for months now and it's been amazing.",
  "Be careful with this method - I had some issues with it.",
  "Great thread! This community is so helpful.",
  "I'm new to freediving and this is really helpful. Thanks everyone!",
  "I've been diving for 10+ years and this is solid advice.",
  "Anyone know where I can find more information about this?",
  "I had a similar experience last month. Here's what happened...",
  "This is a common issue. Here are some solutions that worked for me:",
  "I'm planning to try this next weekend. Will report back!",
  "Thanks for the detailed explanation. This makes so much sense now.",
  "I've been struggling with this for weeks. This thread is a lifesaver!",
  "Great discussion everyone. Learning a lot from this community.",
  "I'm not sure about this approach. Has anyone else tried it?",
  "This is exactly what I needed to hear. Thank you!"
];

export default async function seedComments() {
  try {
    console.log("Seeding comments started...");

    // Get all users and threads
    const allUsers = await db.select({ id: users.id }).from(users);
    const allThreads = await db.select({ id: threads.id }).from(threads);

    if (allUsers.length === 0 || allThreads.length === 0) {
      console.log("No users or threads found. Please seed users and threads first.");
      return;
    }

    const commentsData = [];

    // Create comments for each thread
    for (const thread of allThreads) {
      // Each thread gets 2-8 comments
      const commentCount = faker.number.int({ min: 2, max: 8 });

      for (let i = 0; i < commentCount; i++) {
        const isReply = faker.datatype.boolean({ probability: 0.3 }) && i > 0;
        const parentComment = isReply ? commentsData[commentsData.length - 1] : null;

        commentsData.push({
          threadId: thread.id,
          userId: faker.helpers.arrayElement(allUsers).id,
          parentId: parentComment ? parentComment.id : null,
          content: faker.helpers.arrayElement(commentTemplates) + " " + faker.lorem.sentence(),
          createdAt: faker.date.recent({ days: 20 }),
          updatedAt: new Date()
        });
      }
    }

    // Add some additional random comments
    const additionalComments = Array.from({ length: 50 }, () => ({
      threadId: faker.helpers.arrayElement(allThreads).id,
      userId: faker.helpers.arrayElement(allUsers).id,
      parentId: faker.datatype.boolean({ probability: 0.2 }) ?
        faker.helpers.arrayElement(commentsData)?.id : null,
      content: faker.lorem.paragraph(),
      createdAt: faker.date.recent({ days: 20 }),
      updatedAt: new Date()
    }));

    const allComments = [...commentsData, ...additionalComments];

    await db.insert(comments).values(allComments).onConflictDoNothing();
    console.log(`✅ ${allComments.length} comments seeded successfully!`);
  } catch (error) {
    console.error("Error seeding comments:", error);
  }
}
