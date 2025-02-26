import seedUsers from "@/seed/seeders/seedUser";
import seedTags from "@/seed/seeders/seedTag";
import seedThreads from "@/seed/seeders/seedThread";

async function runSeeders() {
	try {
		console.log("Seeding started...\n\n");
		await seedUsers();
		await seedTags();
		await seedThreads();
		process.exit(0); // Exit with success status
	} catch (error) {
		console.error("Error during seeding:", error);
		process.exit(1); // Exit with error status
	}
}

runSeeders();
