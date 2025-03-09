import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import schema from "@/databases/drizzle/schema";

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
  try {
    await sql`SELECT 1`;
    console.log(`✅ ${type === 'main' ? 'Main' : 'Pool'} database connection established successfully`);
    console.log(`🔌 Connected to: ${process.env.DATABASE_URL || 'database'}`);
    console.log(`📅 Connection time: ${new Date().toISOString()}`);
    console.log('--------------------------------------------------');
  } catch (error) {
    console.log(`❌🔌 Not connected to: ${process.env.DATABASE_URL || 'database'}`);
    console.error(`❌ ${type === 'main' ? 'Main' : 'Pool'} database connection failed:`, error);
    console.error('--------------------------------------------------');
    throw error;
  }
};

// Main connection
const sql = postgres(process.env.DATABASE_URL, {
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
const pool = postgres(process.env.DATABASE_URL, {
  max: 1,
  onnotice: (notice) => {
    console.log('📢 Pool Notice:', notice.message);
  }
});

// Test and log pool connection
logDatabaseConnection(pool, 'pool');

export const dbPool = drizzle(pool);

export default db;
