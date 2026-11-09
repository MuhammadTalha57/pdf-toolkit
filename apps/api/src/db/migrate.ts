import { getPool } from "./pool.js";
import { migrations } from "./migrations/index.js";

const MIGRATION_LOCK_KEY = 727274;

export async function runMigrations(): Promise<void> {
    const client = await getPool().connect();

    try {
        await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);

        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id text PRIMARY KEY,
                applied_at timestamptz NOT NULL DEFAULT now()
            );
        `);

        for (const migration of migrations) {
            const existing = await client.query(
                "SELECT 1 FROM schema_migrations WHERE id = $1",
                [migration.id],
            );

            if ((existing.rowCount ?? 0) > 0) continue;

            try {
                await client.query("BEGIN");
                await client.query(migration.sql);
                await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [
                    migration.id,
                ]);
                await client.query("COMMIT");
                console.log(`Applied migration ${migration.id}`);
            } catch (error) {
                await client.query("ROLLBACK");
                throw error;
            }
        }
    } finally {
        await client
            .query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY])
            .catch(() => undefined);
        client.release();
    }
}
