import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.resolve(__dirname, "../.drizzle/migrations");
const journalPath = path.resolve(migrationsDir, "meta/_journal.json");

const MIGRATION_FILE_RE = /^(\d{4})_(.+)\.sql$/;

const fail = (message, items = []) => {
	console.error(`\n[migration-check] ${message}`);
	for (const item of items) {
		console.error(`  - ${item}`);
	}
	process.exitCode = 1;
};

try {
	const files = await readdir(migrationsDir, { withFileTypes: true });
	const migrationFiles = files
		.filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
		.map((entry) => entry.name)
		.sort();

	const malformedFiles = migrationFiles.filter((name) => !MIGRATION_FILE_RE.test(name));
	if (malformedFiles.length > 0) {
		fail("Migration filenames must follow ####_name.sql format.", malformedFiles);
	}

	const prefixToFiles = new Map();
	for (const file of migrationFiles) {
		const match = file.match(MIGRATION_FILE_RE);
		if (!match) continue;
		const prefix = match[1];
		const existing = prefixToFiles.get(prefix) ?? [];
		existing.push(file);
		prefixToFiles.set(prefix, existing);
	}

	const duplicatePrefixes = [...prefixToFiles.values()]
		.filter((group) => group.length > 1)
		.map((group) => group.join(", "));
	if (duplicatePrefixes.length > 0) {
		fail("Duplicate migration prefixes detected.", duplicatePrefixes);
	}

	const journalRaw = await readFile(journalPath, "utf8");
	const journal = JSON.parse(journalRaw);
	const journalTags = new Set((journal.entries ?? []).map((entry) => String(entry.tag)));
	const fileTags = new Set(migrationFiles.map((file) => file.replace(/\.sql$/, "")));

	const notInJournal = [...fileTags].filter((tag) => !journalTags.has(tag)).sort();
	const missingFiles = [...journalTags].filter((tag) => !fileTags.has(tag)).sort();

	if (notInJournal.length > 0) {
		fail(
			"Migration files found that are not present in meta/_journal.json. Move them to archive or generate properly.",
			notInJournal
		);
	}

	if (missingFiles.length > 0) {
		fail("Journal entries missing corresponding .sql migration files.", missingFiles);
	}

	if (process.exitCode && process.exitCode !== 0) {
		process.exit(process.exitCode);
	}

	console.log("[migration-check] OK");
} catch (error) {
	console.error("[migration-check] Failed to validate migrations.");
	console.error(error);
	process.exit(1);
}
