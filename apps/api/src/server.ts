import app from "./app.js";
import { getEnv } from "./config/env.js";
import { runMigrations } from "./db/migrate.js";
import { closePool } from "./db/pool.js";

const env = getEnv();

async function start(): Promise<void> {
    await runMigrations();

    const server = app.listen(env.PORT, () => {
        console.log(`Express server listening on http://localhost:${env.PORT}`);
    });

    const shutdown = (signal: string) => {
        console.log(`Received ${signal}, shutting down.`);
        server.close(async () => {
            await closePool();
            process.exit(0);
        });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((error) => {
    console.error("Failed to start API:", error);
    process.exit(1);
});
