import { faker } from "@faker-js/faker";
import db from "@/databases/drizzle/connection";
import { serviceAreas } from "@/models/drizzle/serviceAreas.model";
import { users } from "@/models/drizzle/authentication.model";
import { eq } from "drizzle-orm";

const philippineCities = [
  { name: "Metro Manila", lat: 14.5995, lng: 120.9842, radius: 50 },
  { name: "Cebu City", lat: 10.3157, lng: 123.8854, radius: 30 },
  { name: "Dumaguete City", lat: 9.3077, lng: 123.3054, radius: 25 },
  { name: "Panglao, Bohol", lat: 9.5782, lng: 123.7444, radius: 20 },
  { name: "Moalboal, Cebu", lat: 9.9431, lng: 123.3988, radius: 15 },
  { name: "Siquijor Island", lat: 9.1894, lng: 123.6128, radius: 20 },
  { name: "Puerto Princesa, Palawan", lat: 9.8349, lng: 118.7384, radius: 40 },
  { name: "El Nido, Palawan", lat: 11.1953, lng: 119.4049, radius: 25 },
  { name: "Coron, Palawan", lat: 12.0000, lng: 120.2000, radius: 30 },
  { name: "Boracay, Aklan", lat: 11.9686, lng: 121.9277, radius: 15 },
  { name: "Anilao, Batangas", lat: 13.7487, lng: 120.8875, radius: 20 },
  { name: "Puerto Galera, Mindoro", lat: 13.5004, lng: 120.9635, radius: 25 },
  { name: "Siargao Island", lat: 9.9133, lng: 126.0497, radius: 30 },
  { name: "Camiguin Island", lat: 9.2051, lng: 124.6851, radius: 20 },
  { name: "Davao City", lat: 7.1907, lng: 125.4553, radius: 35 }
];

export default async function seedServiceAreas() {
  try {
    console.log("Seeding service areas...");

    // Get all users
    const allUsers = await db.select({ id: users.id }).from(users);

    if (allUsers.length === 0) {
      console.log("No users found. Please seed users first.");
      return;
    }

    const serviceAreasData = [];

    // Create service areas for each user
    for (const user of allUsers) {
      // Each user gets 1-3 service areas
      const areaCount = faker.number.int({ min: 1, max: 3 });
      const selectedAreas = faker.helpers.arrayElements(philippineCities, areaCount);

      for (let i = 0; i < selectedAreas.length; i++) {
        const area = selectedAreas[i];
        const isPrimary = i === 0; // First area is primary

        serviceAreasData.push({
          userId: user.id,
          name: area.name,
          description: `Freediving services available in ${area.name} and surrounding areas`,
          centerLat: area.lat.toString(),
          centerLng: area.lng.toString(),
          radius: area.radius,
          isPrimary,
          travelFee: faker.helpers.maybe(() => faker.number.float({ min: 500, max: 2000, fractionDigits: 2 }), { probability: 0.3 }),
          currency: "PHP",
          isActive: faker.datatype.boolean({ probability: 0.9 }),
          createdAt: faker.date.recent({ days: 30 }),
          updatedAt: new Date()
        });
      }
    }

    // Insert service areas
    await db.insert(serviceAreas).values(serviceAreasData);
    console.log(`✅ ${serviceAreasData.length} service areas seeded!`);
  } catch (error) {
    console.error("Error seeding service areas:", error);
  }
}
