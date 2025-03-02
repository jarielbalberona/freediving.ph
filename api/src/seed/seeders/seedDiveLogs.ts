import db from "@/databases/drizzle/connection";
import { diveLogs } from "@/models/drizzle/dives.model";
import { DIVE_TYPE } from "@/databases/drizzle/lists"

const diveLogData = [
  {
    diveSpotId: 12,
    userId: 402,
    photoUrl: "https://example.com/dive1.jpg",
    caption: "Amazing dive with sea turtles!",
    maxDepth: 20,
    diveTime: 180, // 3 minutes
    diveDate: new Date("2024-02-20T10:00:00Z"),
    diveType: DIVE_TYPE.FUN,
    waterConditions: "Clear water, mild current",
    waterTemperature: "28.5",
    equipmentUsed: "Carbon fins, low-volume mask",
  },
  {
    diveSpotId: 13,
    userId: 402,
    photoUrl: "https://example.com/dive2.jpg",
    caption: "First deep dive at Balicasag!",
    maxDepth: 35,
    diveTime: 240,
    diveDate: new Date("2024-02-22T09:30:00Z"),
    diveType: DIVE_TYPE.TRAINING,
    waterConditions: "Choppy surface, thermocline at 20m",
    waterTemperature: "26.2",
    equipmentUsed: "Monofin, nose clip",
  },
];

export default async function seedDiveLogs() {
  try {
    console.log("Seeding dive logs...");
    for (const log of diveLogData) {
      await db.insert(diveLogs).values(log);
    }
    console.log("✅ Dive logs seeded!");
  } catch (error) {
    console.error("Error seeding dive logs:", error);
  }
}

