import { faker } from "@faker-js/faker";
import db from "@/databases/drizzle/connection";
import { threads } from "@/models/drizzle/threads.model";
import { users } from "@/models/drizzle/authentication.model";
import { eq } from "drizzle-orm";

const freedivingTopics = [
  "Best Depth Training Spots in the Philippines?",
  "How to Improve Breath-Hold for Deep Dives?",
  "What's Your Favorite No-Fins Drill?",
  "Best Freediving Gear for Beginners?",
  "Molchanovs Training – Is It Worth It?",
  "Equalization Issues Below 20m – Help!",
  "Freediving Safety – What's the Most Important Rule?",
  "Sidemount Freediving – Pros & Cons?",
  "Best Time of the Year for Freediving in Siquijor?",
  "Nutrition for Freedivers – What Do You Eat?",
  "Deepest Freedive Without Fins?",
  "Cold Water Freediving – Wetsuit Recommendations?",
  "Freediving and Meditation – Does It Help?",
  "AIDA vs. Molchanovs – Which Certification is Better?",
  "Freediving Travel Tips – Packing Essentials?",
  "Dangers of Shallow Water Blackout?",
  "How to Train for a 5-Minute Static?",
  "Freediving and Spearfishing – Best Gear?",
  "Depth Training Without a Buddy – Safe or Not?",
  "Freediving in Apo Island – Must-Know Tips?"
];

const freedivingContent = [
  "Looking for recommendations on the best spots to train for depth. Panglao, Moalboal, or Dumaguete?",
  "I've been stuck at a 3-minute static. Any tips for improving breath-hold?",
  "Trying to improve my CNF discipline. Share your best drills and techniques!",
  "Looking for quality beginner gear that won't break the bank. Any recommendations?",
  "Thinking of enrolling in a Molchanovs Wave course. Was it worth it?",
  "Struggling to equalize past 20m. Any techniques or exercises to fix this?",
  "For those teaching beginners, what's the #1 safety rule you emphasize?",
  "Thinking of switching to sidemount setup for depth training. Any thoughts?",
  "Want to plan a trip to Siquijor. What's the best season for diving there?",
  "What are the best foods or supplements to enhance freediving performance?",
  "What's the deepest you've gone CNF? What were the biggest challenges?",
  "Looking for wetsuit suggestions for cold water dives. Any brand favorites?",
  "Anyone use meditation to improve relaxation and breath control while diving?",
  "Thinking of getting certified. Which system do you prefer and why?",
  "What's in your travel bag when you go on freediving trips?",
  "What are the best ways to prevent SWB, especially for new freedivers?",
  "Stuck at 4 minutes. What training methods helped you break through?",
  "For those who spearfish, what's your go-to setup?",
  "Is there any way to safely train for depth without a partner?",
  "Planning a freediving trip to Apo Island. What should I know before going?"
];

export default async function seedThreads() {
  try {
    console.log("Seeding threads started...");

    // Get all users to assign random user IDs
    const allUsers = await db.select({ id: users.id }).from(users);

    if (allUsers.length === 0) {
      console.log("No users found. Please seed users first.");
      return;
    }

    // Create threads with proper user relationships
    const threadData = freedivingTopics.map((title, index) => ({
      title,
      content: freedivingContent[index] || faker.lorem.paragraphs(2),
      userId: faker.helpers.arrayElement(allUsers).id,
      createdAt: faker.date.recent({ days: 30 }),
      updatedAt: new Date()
    }));

    // Add some additional random threads
    const additionalThreads = Array.from({ length: 30 }, () => ({
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(3),
      userId: faker.helpers.arrayElement(allUsers).id,
      createdAt: faker.date.recent({ days: 30 }),
      updatedAt: new Date()
    }));

    const allThreads = [...threadData, ...additionalThreads];

    await db.insert(threads).values(allThreads).onConflictDoNothing();
    console.log(`✅ ${allThreads.length} threads seeded successfully!`);
  } catch (error) {
    console.error("Error seeding threads:", error);
  }
}
