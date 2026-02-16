import seedUsers from "./seeders/seedUser.js";
import seedTags from "./seeders/seedTag.js";
import seedThreads from "./seeders/seedThread.js";
import seedComments from "./seeders/seedComments.js";
import seedReactions from "./seeders/seedReactions.js";
import seedGroups from "./seeders/seedGroups.js";
import seedEvents from "./seeders/seedEvents.js";
import seedNotifications from "./seeders/seedNotifications.js";
import seedDiveLogBuddies from "./seeders/seedDiveLogBuddies.js";
import seedDiveLogs from "./seeders/seedDiveLogs.js";
import seedDiveSpots from "./seeders/seedDiveSpots.js";
import seedServiceTypes from "./seeders/seedServiceTypes.js";
import seedServiceAreas from "./seeders/seedServiceAreas.js";
import seedUserServices from "./seeders/seedUserServices.js";

async function runSeeders() {
	try {
		console.log("🌱 Seeding started...\n");

		// Check if DATABASE_URL is set, if not, use local development URL
		if (!process.env.DATABASE_URL) {
			process.env.DATABASE_URL = "postgres://fphbuddies:fphbuddiespw@localhost:5432/freedivingph";
			console.log("⚠️  DATABASE_URL not set, using local development database");
		}

		const isRDS = process.env.DATABASE_URL?.includes("rds.amazonaws.com");

		// Always seed basic data
		console.log("📋 Seeding basic data...");
		await seedTags();
		await seedDiveSpots();
		await seedServiceTypes();

		if (isRDS) {
			console.log("☁️ Skipping user and content seeding (running on RDS)...");
		} else {
			console.log("🏠 Seeding local development data...");

			// Core user and content data
			console.log("\n👥 Seeding users...");
			await seedUsers();

			console.log("\n🧵 Seeding threads...");
			await seedThreads();

			console.log("\n💬 Seeding comments...");
			await seedComments();

			console.log("\n👍 Seeding reactions...");
			await seedReactions();

			console.log("\n👥 Seeding groups...");
			await seedGroups();

			console.log("\n📅 Seeding events...");
			await seedEvents();

			console.log("\n🔔 Seeding notifications...");
			await seedNotifications();

			console.log("\n🏊 Seeding dive logs...");
			await seedDiveLogs();

			console.log("\n🤝 Seeding dive log buddies...");
			await seedDiveLogBuddies();

			console.log("\n📍 Seeding service areas...");
			await seedServiceAreas();

			console.log("\n🛠️ Seeding user services...");
			await seedUserServices();

			console.log("\n✅ Local development seeding completed!");
		}

		console.log("\n🎉 Seeding completed successfully!");
		process.exit(0);
	} catch (error) {
		console.error("❌ Error during seeding:", error);
		process.exit(1);
	}
}

runSeeders();
