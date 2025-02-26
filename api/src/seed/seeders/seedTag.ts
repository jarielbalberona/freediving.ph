import db from "@/databases/drizzle/connection";
import { tags } from "@/models/drizzle/tags.model";
import { eq } from "drizzle-orm";

// Freediving-inspired tag categories
const freedivingTags = [
  // 🏅 Experience Level
  { name: "Beginner", category: "Experience Level", emoji: "🐣" },
  { name: "Intermediate", category: "Experience Level", emoji: "🌱" },
  { name: "Advanced", category: "Experience Level", emoji: "🦈" },
  { name: "Instructor", category: "Experience Level", emoji: "📢" },

  // 🔥 Disciplines
  { name: "Static Apnea", category: "Disciplines", emoji: "🫁" },
  { name: "Dynamic Apnea", category: "Disciplines", emoji: "🏊‍♂️" },
  { name: "Constant Weight", category: "Disciplines", emoji: "⚓" },
  { name: "Free Immersion", category: "Disciplines", emoji: "🪢" },
  { name: "No Fins", category: "Disciplines", emoji: "🥾🚫" },

  // 🌊 General Freediving
  { name: "Depth Seeker", category: "General Freediving", emoji: "📉" },
  { name: "Ocean Nomad", category: "General Freediving", emoji: "🚤" },
  { name: "Breath-Hold Enthusiast", category: "General Freediving", emoji: "🫀" },
  { name: "Blue Lover", category: "General Freediving", emoji: "🔵" },
  { name: "Island Apnea", category: "General Freediving", emoji: "🏝️" },

  // 🏆 Competitive Freediving
  { name: "PB Chaser", category: "Competitive Freediving", emoji: "🎯" },
  { name: "Depth Hunter", category: "Competitive Freediving", emoji: "🔽" },
  { name: "No Fins, No Limits", category: "Competitive Freediving", emoji: "🚷" },
  { name: "Static Beast", category: "Competitive Freediving", emoji: "🔥" },

  // 🎓 Instructor / Safety Team
  { name: "Freedive Mentor", category: "Instructor / Safety Team", emoji: "📖" },
  { name: "Safety Diver", category: "Instructor / Safety Team", emoji: "🛟" },
  { name: "Depth Judge", category: "Instructor / Safety Team", emoji: "📏" },
  { name: "Molchanovs Instructor", category: "Instructor / Safety Team", emoji: "🔺" },

  // 🌞 Fun & Lifestyle
  { name: "Mermaid Mode", category: "Fun & Lifestyle", emoji: "🧜‍♀️" },
  { name: "Salt & Sun Diver", category: "Fun & Lifestyle", emoji: "☀️" },
  { name: "Whale Whisperer", category: "Fun & Lifestyle", emoji: "🐋" },
  { name: "Wave Rider", category: "Fun & Lifestyle", emoji: "🌊" },
  { name: "Deep State of Mind", category: "Fun & Lifestyle", emoji: "🤿" },
];

export default async function seedTags() {
  try {
  console.log("Seeding user tags started...");
  for (const tag of freedivingTags) {
    const existingTag = await db.select().from(tags).where(eq(tags.name, tag.name));
    if (existingTag.length === 0) {
      await db.insert(tags).values(tag);
    }
  }
  console.log("✅ User tags seeded!");
  } catch (error) {
    console.error("Error seeding user tags:", error);
  }
}
