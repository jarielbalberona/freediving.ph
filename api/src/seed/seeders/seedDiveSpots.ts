import db from "@/databases/drizzle/connection";
import { diveSpots } from "@/models/drizzle/diveSpots.model";
import { eq } from "drizzle-orm";
import { DIVE_DIFFICULTY } from "@/databases/drizzle/lists";

const diveSpotData = [
  {
    name: "Apo Island",
    latitude: "9.0519",
    longitude: "123.2689",
    locationName: "Apo Island, Negros Oriental",
    depth: 30,
    difficulty: DIVE_DIFFICULTY.BEGINNER,
    description: "A marine sanctuary with vibrant coral reefs and sea turtles.",
    bestSeason: "November - May",
    directions: "Take a boat from Dauin or Dumaguete City.",
    imageUrl: "https://images.unsplash.com/photo-1516741539888-96b4c96adf0c",
  },
  {
    name: "Balicasag Island",
    latitude: "9.5289",
    longitude: "123.7265",
    locationName: "Balicasag Island, Bohol",
    depth: 40,
    difficulty: DIVE_DIFFICULTY.ADVANCED,
    description: "Deep wall diving with pelagic fish and strong currents.",
    bestSeason: "March - June",
    directions: "Boat ride from Panglao, Bohol.",
    imageUrl: "https://images.unsplash.com/photo-1516741539888-96b4c96adf0c",
  },
  {
    name: "Tubbataha Reefs",
    latitude: "8.9521",
    longitude: "119.8147",
    locationName: "Tubbataha Reefs, Palawan",
    depth: 100,
    difficulty: DIVE_DIFFICULTY.ADVANCED,
    description: "A UNESCO World Heritage site with pristine reefs and diverse marine life.",
    bestSeason: "March - June",
    directions: "Liveaboard from Puerto Princesa, Palawan.",
    imageUrl: "https://images.unsplash.com/photo-1516741539888-96b4c96adf0c",
  },
  {
    name: "Monad Shoal",
    latitude: "11.3273",
    longitude: "124.1182",
    locationName: "Monad Shoal, Malapascua, Cebu",
    depth: 30,
    difficulty: DIVE_DIFFICULTY.INTERMEDIATE,
    description: "Famous for thresher sharks that visit early in the morning.",
    bestSeason: "October - May",
    directions: "Boat ride from Malapascua Island, Cebu.",
    imageUrl: "https://images.unsplash.com/photo-1516741539888-96b4c96adf0c",
  },
  {
    name: "Puerto Galera Canyons",
    latitude: "13.5004",
    longitude: "120.9635",
    locationName: "Puerto Galera, Mindoro",
    depth: 40,
    difficulty: DIVE_DIFFICULTY.ADVANCED,
    description: "Strong currents, rich marine life, and exciting drift diving.",
    bestSeason: "November - May",
    directions: "Boat ride from Sabang, Puerto Galera.",
    imageUrl: "https://images.unsplash.com/photo-1516741539888-96b4c96adf0c",
  },
  {
    name: "Secret Bay (Anilao)",
    latitude: "13.7487",
    longitude: "120.8875",
    locationName: "Anilao, Batangas",
    depth: 25,
    difficulty: DIVE_DIFFICULTY.BEGINNER,
    description: "Popular muck diving site with rare critters and macro photography opportunities.",
    bestSeason: "November - May",
    directions: "Drive from Manila to Anilao, Batangas, then take a boat.",
    imageUrl: "https://images.unsplash.com/photo-1516741539888-96b4c96adf0c",
  },
  {
    name: "Camiguin Sunken Cemetery",
    latitude: "9.2051",
    longitude: "124.6851",
    locationName: "Camiguin Island",
    depth: 20,
    difficulty: DIVE_DIFFICULTY.BEGINNER,
    description: "Historic dive site with coral-covered tombstones from a sunken cemetery.",
    bestSeason: "March - June",
    directions: "Boat ride from Camiguin Island.",
    imageUrl: "https://images.unsplash.com/photo-1516741539888-96b4c96adf0c",
  },
  {
    name: "Moalboal Sardine Run",
    latitude: "9.9431",
    longitude: "123.3988",
    locationName: "Moalboal, Cebu",
    depth: 15,
    difficulty: DIVE_DIFFICULTY.BEGINNER,
    description: "A massive school of sardines forming mesmerizing bait balls.",
    bestSeason: "Year-round",
    directions: "Boat ride from Panagsama Beach, Moalboal, Cebu.",
    imageUrl: "https://images.unsplash.com/photo-1516741539888-96b4c96adf0c",
  },
  {
    name: "Honda Bay",
    latitude: "10.2267",
    longitude: "118.8794",
    locationName: "Honda Bay, Palawan",
    depth: 20,
    difficulty: DIVE_DIFFICULTY.BEGINNER,
    description: "Beautiful coral gardens and vibrant marine life.",
    bestSeason: "December - May",
    directions: "Boat ride from Puerto Princesa, Palawan.",
    imageUrl: "https://images.unsplash.com/photo-1516741539888-96b4c96adf0c",
  },
  {
    name: "Coron Barracuda Lake",
    latitude: "11.9951",
    longitude: "120.1992",
    locationName: "Barracuda Lake, Coron, Palawan",
    depth: 40,
    difficulty: DIVE_DIFFICULTY.INTERMEDIATE,
    description: "Unique thermocline experience in a lake surrounded by limestone cliffs.",
    bestSeason: "November - May",
    directions: "Boat ride from Coron, Palawan.",
    imageUrl: "https://images.unsplash.com/photo-1516741539888-96b4c96adf0c",
  },
  {
    name: "Yapak Wall (Boracay)",
    latitude: "11.9686",
    longitude: "121.9277",
    locationName: "Boracay, Aklan",
    depth: 50,
    difficulty: DIVE_DIFFICULTY.ADVANCED,
    description: "Steep drop-off with sharks, rays, and strong currents.",
    bestSeason: "November - May",
    directions: "Boat ride from Boracay White Beach.",
    imageUrl: "https://images.unsplash.com/photo-1516741539888-96b4c96adf0c",
  }
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
