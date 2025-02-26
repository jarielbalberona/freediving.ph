import db from "@/databases/drizzle/connection";
import { threads } from "@/models/drizzle/threads.model";
import { eq } from "drizzle-orm";

const threadData = [
  { title: "Best Depth Training Spots in the Philippines?", content: "Looking for recommendations on the best spots to train for depth. Panglao, Moalboal, or Dumaguete?", userId: 251 },
  { title: "How to Improve Breath-Hold for Deep Dives?", content: "I've been stuck at a 3-minute static. Any tips for improving breath-hold?", userId: 252 },
  { title: "What’s Your Favorite No-Fins Drill?", content: "Trying to improve my CNF discipline. Share your best drills and techniques!", userId: 253 },
  { title: "Best Freediving Gear for Beginners?", content: "Looking for quality beginner gear that won’t break the bank. Any recommendations?", userId: 254 },
  { title: "Molchanovs Training – Is It Worth It?", content: "Thinking of enrolling in a Molchanovs Wave course. Was it worth it?", userId: 255 },
  { title: "Equalization Issues Below 20m – Help!", content: "Struggling to equalize past 20m. Any techniques or exercises to fix this?", userId: 256 },
  { title: "Freediving Safety – What’s the Most Important Rule?", content: "For those teaching beginners, what’s the #1 safety rule you emphasize?", userId: 257 },
  { title: "Sidemount Freediving – Pros & Cons?", content: "Thinking of switching to sidemount setup for depth training. Any thoughts?", userId: 258 },
  { title: "Best Time of the Year for Freediving in Siquijor?", content: "Want to plan a trip to Siquijor. What’s the best season for diving there?", userId: 259 },
  { title: "Nutrition for Freedivers – What Do You Eat?", content: "What are the best foods or supplements to enhance freediving performance?", userId: 260 },
  { title: "Deepest Freedive Without Fins?", content: "What’s the deepest you’ve gone CNF? What were the biggest challenges?", userId: 261 },
  { title: "Cold Water Freediving – Wetsuit Recommendations?", content: "Looking for wetsuit suggestions for cold water dives. Any brand favorites?", userId: 262 },
  { title: "Freediving and Meditation – Does It Help?", content: "Anyone use meditation to improve relaxation and breath control while diving?", userId: 263 },
  { title: "AIDA vs. Molchanovs – Which Certification is Better?", content: "Thinking of getting certified. Which system do you prefer and why?", userId: 264 },
  { title: "Freediving Travel Tips – Packing Essentials?", content: "What’s in your travel bag when you go on freediving trips?", userId: 265 },
  { title: "Dangers of Shallow Water Blackout?", content: "What are the best ways to prevent SWB, especially for new freedivers?", userId: 266 },
  { title: "How to Train for a 5-Minute Static?", content: "Stuck at 4 minutes. What training methods helped you break through?", userId: 267 },
  { title: "Freediving and Spearfishing – Best Gear?", content: "For those who spearfish, what’s your go-to setup?", userId: 268 },
  { title: "Depth Training Without a Buddy – Safe or Not?", content: "Is there any way to safely train for depth without a partner?", userId: 269 },
  { title: "Freediving in Apo Island – Must-Know Tips?", content: "Planning a freediving trip to Apo Island. What should I know before going?", userId: 270 },
];

export default async function seedThreads() {
  try {
  console.log("Seeding threads started...");
  await db.insert(threads).values(threadData).onConflictDoNothing();
  console.log("✅ Freediving threads seeded successfully!");
  } catch (error) {
		console.error("Error seeding threads:", error);
	}
}
