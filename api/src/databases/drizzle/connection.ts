import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import schema from "@/databases/drizzle/schema";

const dbUrl = process.env.DATABASE_URL;

interface QueryDetails {
  query: string;
  count: number;
  params?: any[];
  timestamp: Date;
}

dotenv.config();

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
  console.log(`DBURL: ${dbUrl}`);
  try {
    await sql`SELECT 1`;
    console.log(`✅ ${type === 'main' ? 'Main' : 'Pool'} database connection established successfully`);
    console.log(`🔌 Connected to: ${dbUrl}`);
    console.log(`📅 Connection time: ${new Date().toISOString()}`);
    console.log('--------------------------------------------------');
  } catch (error) {
    console.log(`❌🔌 Not connected to: ${dbUrl}`);
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

// Test and log main connection
logDatabaseConnection(sql, 'main');

const db = drizzle(sql, { schema });

// Connection pool
const pool = postgres(dbUrl, {
  max: 1,
  onnotice: (notice) => {
    console.log('📢 Pool Notice:', notice.message);
  }
});

// Test and log pool connection
logDatabaseConnection(pool, 'pool');

export const dbPool = drizzle(pool);

export default db;
