import db from "@/databases/drizzle/connection";
import { diveLogBuddies } from "@/models/drizzle/dives.model";

const diveLogBuddyData = [
  { diveLogId: 11, buddyId: 402 }, // User 2 was a buddy in dive log 1
  { diveLogId: 11, buddyId: 402 }, // User 1 was a buddy in dive log 2
  { diveLogId: 12, buddyId: 403 }, // Another buddy in the same dive log
];

export default async function seedDiveLogBuddies() {
  try {
    console.log("Seeding dive log buddies...");
    for (const buddy of diveLogBuddyData) {
      await db.insert(diveLogBuddies).values(buddy);
    }
    console.log("✅ Dive log buddies seeded!");
  } catch (error) {
    console.error("Error seeding dive log buddies:", error);
  }
}
