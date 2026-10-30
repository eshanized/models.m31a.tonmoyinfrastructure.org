import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.trim().length === 0 || dbUrl.includes('placeholder')) {
    console.log('ℹ️ DATABASE_URL is not configured. Skipping SQL migration execution.');
    console.log('ℹ️ Application will run in static catalog-only fallback mode.');
    return;
  }

  console.log('🔄 Connecting to PostgreSQL database to execute migrations...');
  const sql = postgres(dbUrl, { max: 1 });

  const migrationsDir = path.resolve(process.cwd(), 'drizzle/migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    console.log(`  Applying migration: ${file}...`);
    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await sql.unsafe(sqlContent);
  }

  console.log('✅ All migrations applied successfully.');
  await sql.end();
}

runMigrations().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
