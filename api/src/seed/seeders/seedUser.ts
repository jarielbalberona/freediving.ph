import { faker } from "@faker-js/faker";

import db from "@/databases/drizzle/connection";
import { ROLE_LIST } from "@/databases/drizzle/lists";
import { RoleType } from "@/databases/drizzle/types";
import { users } from "@/models/drizzle/authentication.model";

interface SeedUser {
	name: string;
	username: string;
	email: string;
  image: string;
  alias: string;
	role: RoleType;
  bio?: string;
  location?: string;
  phone?: string;
  website?: string;
  isServiceProvider?: boolean;
}

const generateFakeUsers = (count: number): SeedUser[] => {
	return Array.from({ length: count }, () => ({
		name: faker.person.fullName(),
		username: faker.internet.username(),
		email: faker.internet.email(),
    image: faker.image.avatar(),
    alias: faker.internet.username(),
		role: faker.helpers.arrayElement(ROLE_LIST.enumValues) as RoleType,
    bio: faker.helpers.maybe(() => faker.lorem.sentence(20), { probability: 0.7 }),
    location: faker.helpers.maybe(() => faker.location.city() + ", " + faker.location.country(), { probability: 0.8 }),
    phone: faker.helpers.maybe(() => faker.phone.number(), { probability: 0.6 }),
    website: faker.helpers.maybe(() => faker.internet.url(), { probability: 0.3 }),
    isServiceProvider: faker.datatype.boolean({ probability: 0.2 })
	}));
};

const seedUsers = async () => {
  try {
    console.log("Seeding users started...");

    // Create some specific users for testing
    const specificUsers = [
      {
        name: "Alex Rodriguez",
        username: "alex_freediver",
        email: "alex@freediving.ph",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        alias: "alex_ph",
        role: ROLE_LIST.ADMINISTRATOR,
        bio: "Professional freediving instructor and safety diver. Certified AIDA and Molchanovs instructor.",
        location: "Manila, Philippines",
        phone: "+63 917 123 4567",
        website: "https://alexfreediving.com",
        isServiceProvider: true,
        clerkId: "clerk_alex_123456789",
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Maria Santos",
        username: "maria_diver",
        email: "maria@freediving.ph",
        image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
        alias: "maria_s",
        role: ROLE_LIST.USER,
        bio: "Passionate freediver exploring the beautiful waters of the Philippines.",
        location: "Cebu, Philippines",
        phone: "+63 917 234 5678",
        isServiceProvider: false,
        clerkId: "clerk_maria_123456789",
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "John Chen",
        username: "john_deep",
        email: "john@freediving.ph",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        alias: "john_c",
          role: ROLE_LIST.USER,
        bio: "Competitive freediver and depth training enthusiast.",
        location: "Dumaguete, Philippines",
        isServiceProvider: true,
        clerkId: "clerk_john_123456789",
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Generate additional fake users
    const additionalUsers = generateFakeUsers(47);

    // Prepare additional user data with Clerk IDs
    const additionalUserData = additionalUsers.map((user) => ({
      ...user,
      clerkId: `clerk_${faker.string.alphanumeric(24)}`,
      emailVerified: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Combine specific and generated users
    const allUsers = [...specificUsers, ...additionalUserData];

    // Insert users into database
    await db.insert(users).values(allUsers);
    console.log(`✅ ${allUsers.length} users seeded successfully!`);
	} catch (error) {
		console.error("Error seeding users:", error);
	}
};

export default seedUsers;
