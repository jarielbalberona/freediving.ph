import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import schema from "@/databases/drizzle/schema";

dotenv.config();

const dbUrl = process.env.DATABASE_URL || "postgres://fphbuddies:fphbuddiespw@localhost:5432/freedivingph";
const shouldProbeOnBoot =
	process.env.NODE_ENV !== "test" && process.env.DB_PROBE_ON_BOOT === "true";

interface QueryDetails {
  query: string;
  count: number;
  params?: any[];
  timestamp: Date;
}

export const queryTracker = {
  queries: new Map<string, QueryDetails>(),
  clear() {
    this.queries.clear();
  },
  add(query: string, params?: any) {
    const queryKey = `${query}`;
    const existing = this.queries.get(queryKey);

    this.queries.set(queryKey, {
      query,
      params,
      count: existing ? existing.count + 1 : 1,
      timestamp: new Date()
    });
  }
};

const logDatabaseConnection = async (sql: postgres.Sql, type: 'main' | 'pool') => {
  const safeDbUrl = dbUrl.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
  console.log(`DBURL: ${safeDbUrl}`);
  try {
    await sql`SELECT 1`;
    console.log(`✅ ${type === 'main' ? 'Main' : 'Pool'} database connection established successfully`);
    console.log(`🔌 Connected to: ${safeDbUrl}`);
    console.log(`📅 Connection time: ${new Date().toISOString()}`);
    console.log('--------------------------------------------------');
  } catch (error) {
    console.log(`❌🔌 Not connected to: ${safeDbUrl}`);
    console.error(`❌ ${type === 'main' ? 'Main' : 'Pool'} database connection failed:`, error);
    console.error('--------------------------------------------------');
    throw error;
  }
};

// Main connection
const sql = postgres(dbUrl, {
  debug: (query, params) => {
    queryTracker.add(String(query), params);
  },
  onnotice: (notice) => {
    console.log('📢 Database Notice:', notice.message);
  },
  onparameter: (key, value) => {
    console.log(`🔧 Parameter Set: ${key}=${value}`);
  }
});

const db = drizzle(sql, { schema });

// Connection pool
const pool = postgres(dbUrl, {
  max: 1,
  onnotice: (notice) => {
    console.log('📢 Pool Notice:', notice.message);
  }
});

if (shouldProbeOnBoot) {
	void logDatabaseConnection(sql, "main");
	void logDatabaseConnection(pool, "pool");
}

export const dbPool = drizzle(pool);

export default db;
