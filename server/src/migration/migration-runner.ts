import { readdir } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import type { PoolClient, QueryResult } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient, "query">;
type MigrationExecutor = (db: MigrationDb) => Promise<void>;
type MigrationModule = {
    default?: MigrationExecutor;
    up?: MigrationExecutor;
};

const migrationFilePattern = /^\d+_.+\.(ts|js)$/;
const migrationDir = dirname(fileURLToPath(import.meta.url));

const ensureTrackingTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id BIGSERIAL PRIMARY KEY,
            migration_name VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `);
};

const getMigrationFiles = async (): Promise<string[]> => {
    const files = await readdir(migrationDir);

    return files
        .filter((file) => {
            if (!migrationFilePattern.test(file)) {
                return false;
            }

            const extension = extname(file);
            if (extension === ".js") {
                const sourceTypeScriptFile = file.slice(0, -3) + ".ts";
                return !files.includes(sourceTypeScriptFile);
            }

            return true;
        })
        .sort((a, b) => {
            const parseOrder = (name: string) => Number(name.split("_", 1)[0]) || 0;
            const orderA = parseOrder(a);
            const orderB = parseOrder(b);
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return a.localeCompare(b);
        });
};

const getAppliedMigrations = async (): Promise<Set<string>> => {
    const result = await pool.query<{ migration_name: string }>(
        "SELECT migration_name FROM schema_migrations"
    );
    return new Set(result.rows.map((row) => row.migration_name));
};

const loadMigrationExecutor = async (fileName: string): Promise<MigrationExecutor> => {
    const migrationUrl = pathToFileURL(join(migrationDir, fileName)).href;
    const migrationModule = (await import(migrationUrl)) as MigrationModule;
    const executor = migrationModule.up ?? migrationModule.default;

    if (typeof executor !== "function") {
        throw new Error(
            `Migration ${fileName} must export an async "up" function or default export`
        );
    }

    return executor;
};

const markMigrationApplied = async (fileName: string) => {
    await pool.query(
        `
        INSERT INTO schema_migrations (migration_name)
        VALUES ($1)
        ON CONFLICT (migration_name) DO NOTHING
        `,
        [fileName]
    );
};

const runMigrationFile = async (fileName: string) => {
    const migration = await loadMigrationExecutor(fileName);
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        await migration(client);
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(
            `Migration failed: ${fileName}${error instanceof Error ? `: ${error.message}` : ""}`
        );
    } finally {
        client.release();
    }
};

async function run() {
    try {
        await ensureTrackingTable();

        const [files, applied] = await Promise.all([getMigrationFiles(), getAppliedMigrations()]);
        const pending = files.filter((file) => !applied.has(file));

        if (pending.length === 0) {
            console.log("No pending migrations");
            return;
        }

        console.log(`Running ${pending.length} pending migration(s)...`);
        for (const file of pending) {
            console.log(`-> ${file}`);
            await runMigrationFile(file);
            await markMigrationApplied(file);
            console.log(`<- ${file} applied`);
        }

        console.log("All pending migrations applied successfully");
    } finally {
        await pool.end();
    }
}

run().catch((error) => {
    console.error("Migration runner failed:", error);
    process.exit(1);
});
