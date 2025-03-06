import seedUsers from "@/seed/seeders/seedUser";
import seedTags from "@/seed/seeders/seedTag";
import seedThreads from "@/seed/seeders/seedThread";
import seedDiveLogBuddies from "@/seed/seeders/seedDiveLogBuddies";
import seedDiveLogs from "@/seed/seeders/seedDiveLogs";
import seedDiveSpots from "@/seed/seeders/seedDiveSpots";

async function runSeeders() {
	try {
		console.log("Seeding started...\n\n");

		const isRDS = process.env.DATABASE_URL?.includes("rds.amazonaws.com");

		await seedTags();

		if (!isRDS) {
      console.log("Seeding local data only");
      await seedDiveSpots();
      await seedDiveLogs();
      await seedDiveLogBuddies();
			await seedUsers();
      await seedThreads();
      console.log("Seeding local data only completed");
		} else {
			console.log("Skipping users and threads seeding (running on RDS)...");
		}
		console.log("\nSeeding completed successfully!");
		process.exit(0);
	} catch (error) {
		console.error("Error during seeding:", error);
		process.exit(1);
	}
}

runSeeders();
