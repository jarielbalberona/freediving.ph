import { faker } from "@faker-js/faker";
import { hash } from "bcryptjs";

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
}

const generateFakeUsers = (count: number): SeedUser[] => {
	return Array.from({ length: count }, () => ({
		name: faker.person.fullName(),
		username: faker.internet.username(),
		email: faker.internet.email(),
    image: faker.image.avatar(),
    alias: faker.internet.username(),
		role: faker.helpers.arrayElement(ROLE_LIST.enumValues) as RoleType
	}));
};

const seedUsers = async () => {
  try {
    console.log("Seeding users started...");
		// Generate fake users
		const seedData: SeedUser[] = generateFakeUsers(50);

		// Hash the password
		const hashedPassword = await hash("Bang@123", 10);

		// Prepare user data
		const userData = seedData.map(user => ({
			...user,
			password: hashedPassword,
			emailVerified: new Date(),
			createdAt: new Date(),
			updatedAt: new Date()
		}));

		// Insert users into database
    await db.insert(users).values(userData);
    console.log("✅ Users seeded successfully!");
	} catch (error) {
		console.error("Error seeding users:", error);
	}
};

export default seedUsers;
