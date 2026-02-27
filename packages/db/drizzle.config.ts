import type { Config } from "drizzle-kit";

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://fphbuddies:fphbuddiespw@localhost:5432/freedivingph";

export default {
  dialect: "postgresql",
  schema: ["../../apps/api/src/models/drizzle"],
  out: "../../apps/api/.drizzle/migrations/",
  dbCredentials: { url: connectionString },
  verbose: true,
  strict: true,
} as Config;
