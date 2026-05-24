import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { getPool } from "./client";

export async function runMigrations(): Promise<void> {
  const pool = getPool();

  // Create migrations tracking table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Determine migrations directory (works for both src and dist)
  const migrationsDir = join(__dirname, "migrations");

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const { rows } = await pool.query(
      "SELECT filename FROM schema_migrations WHERE filename = $1",
      [file]
    );

    if (rows.length > 0) {
      console.log(`[migrate] Skipping already-applied migration: ${file}`);
      continue;
    }

    console.log(`[migrate] Applying migration: ${file}`);
    const sql = readFileSync(join(migrationsDir, file), "utf8");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [file]
      );
      await client.query("COMMIT");
      console.log(`[migrate] Successfully applied: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[migrate] Failed to apply ${file}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log("[migrate] All migrations up to date.");
}

// Allow running directly: tsx src/db/migrate.ts
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
