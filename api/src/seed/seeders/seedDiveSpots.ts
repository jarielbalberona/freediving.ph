import db from "@/databases/drizzle/connection";
import { diveSpots } from "@/models/drizzle/diveSpots.model";
import { eq } from "drizzle-orm";
import { DIVE_DIFFICULTY } from "@/databases/drizzle/lists";

const diveSpotData = [
  {
    name: "Apo Island",
    location: "9.0519,123.2689",
    depth: 30,
    difficulty: DIVE_DIFFICULTY.BEGINNER,
    description: "A marine sanctuary with vibrant coral reefs and sea turtles.",
    bestSeason: "November - May",
    directions: "Take a boat from Dauin or Dumaguete City.",
    mainPhotoUrl: "https://example.com/apo-island.jpg",
  },
  {
    name: "Balicasag Island",
    location: "9.5289,123.7265",
    depth: 40,
    difficulty: DIVE_DIFFICULTY.ADVANCED,
    description: "Deep wall diving with pelagic fish and strong currents.",
    bestSeason: "March - June",
    directions: "Boat ride from Panglao, Bohol.",
    mainPhotoUrl: "https://example.com/balicasag.jpg",
  },
];

export default async function seedDiveSpots() {
  try {
    console.log("Seeding dive spots...");
    for (const spot of diveSpotData) {
      const existingSpot = await db.select().from(diveSpots).where(eq(diveSpots.name, spot.name));
      if (existingSpot.length === 0) {
        await db.insert(diveSpots).values(spot);
      }
    }
    console.log("✅ Dive spots seeded!");
  } catch (error) {
    console.error("Error seeding dive spots:", error);
  }
}
