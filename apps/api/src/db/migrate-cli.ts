import { runMigrations } from "./migrate.js";
import { closePool } from "./pool.js";

runMigrations()
    .then(() => closePool())
    .then(() => {
        console.log("Migrations complete.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Migration failed:", error);
        process.exit(1);
    });
