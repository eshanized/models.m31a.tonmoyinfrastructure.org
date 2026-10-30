import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let dbInstance: PostgresJsDatabase<typeof schema> | null = null;
let sqlClient: ReturnType<typeof postgres> | null = null;

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return Boolean(url && url.trim().length > 0 && !url.includes('placeholder'));
}

export function getDb(): PostgresJsDatabase<typeof schema> | null {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (dbInstance) {
    return dbInstance;
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!;
    sqlClient = postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 5,
      prepare: false,
    });
    dbInstance = drizzle(sqlClient, { schema });
    return dbInstance;
  } catch (err) {
    console.error('❌ Failed to initialize database client:', (err as Error).message);
    return null;
  }
}
