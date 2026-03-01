import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pool from "../config/db";

const migrationFilePattern = /^\d+_.+\.ts$/;

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
    const migrationDir = dirname(fileURLToPath(import.meta.url));
    const files = await readdir(migrationDir);

    return files
        .filter((file) => migrationFilePattern.test(file))
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

const runMigrationFile = async (fileName: string) => {
    const projectRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
    const migrationPath = join("src", "migration", fileName);

    const proc = Bun.spawn(["bun", "run", migrationPath], {
        cwd: projectRoot,
        stdout: "inherit",
        stderr: "inherit",
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
        throw new Error(`Migration failed: ${fileName} (exit code ${exitCode})`);
    }
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
