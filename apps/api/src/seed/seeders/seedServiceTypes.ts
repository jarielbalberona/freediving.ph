import db from "@/databases/drizzle/connection";
import { serviceTypes } from "@/models/drizzle/serviceTypes.model";
import { eq } from "drizzle-orm";

const serviceTypesData = [
  {
    name: "Freediving Instruction",
    description: "Professional freediving training and certification courses",
    category: "Instruction",
    icon: "graduation-cap"
  },
  {
    name: "Underwater Photography",
    description: "Professional underwater photography services for freediving sessions",
    category: "Photography",
    icon: "camera"
  },
  {
    name: "Underwater Videography",
    description: "Professional underwater videography for freediving events and personal sessions",
    category: "Videography",
    icon: "video"
  },
  {
    name: "Freediving Buddy",
    description: "Experienced freediving buddy for safety and training sessions",
    category: "Safety",
    icon: "users"
  },
  {
    name: "Equipment Rental",
    description: "High-quality freediving equipment rental and sales",
    category: "Equipment",
    icon: "scuba-gear"
  },
  {
    name: "Equipment Maintenance",
    description: "Expert freediving equipment maintenance and repair services",
    category: "Equipment",
    icon: "wrench"
  },
  {
    name: "Transportation Services",
    description: "Reliable transportation services for freediving trips and competitions",
    category: "Transportation",
    icon: "truck"
  },
  {
    name: "Freediving Guide",
    description: "Local freediving guide with extensive knowledge of dive sites",
    category: "Guide",
    icon: "map"
  },
  {
    name: "Depth Training",
    description: "Specialized depth training for advanced freedivers and competition preparation",
    category: "Training",
    icon: "trending-down"
  },
  {
    name: "Safety Training",
    description: "Comprehensive freediving safety training and certification courses",
    category: "Safety",
    icon: "shield"
  },
  {
    name: "Competition Coaching",
    description: "Professional coaching for freediving competitions and performance optimization",
    category: "Coaching",
    icon: "trophy"
  },
  {
    name: "Freediving Yoga",
    description: "Yoga and breathing exercises specifically designed for freedivers",
    category: "Wellness",
    icon: "heart"
  }
];

export default async function seedServiceTypes() {
  try {
    console.log("Seeding service types...");
    for (const serviceType of serviceTypesData) {
      const existingServiceType = await db.select().from(serviceTypes).where(eq(serviceTypes.name, serviceType.name));
      if (existingServiceType.length === 0) {
        await db.insert(serviceTypes).values(serviceType);
      }
    }
    console.log("✅ Service types seeded!");
  } catch (error) {
    console.error("Error seeding service types:", error);
  }
}
