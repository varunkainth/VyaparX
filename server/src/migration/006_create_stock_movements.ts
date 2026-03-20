import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,

      movement_type movement_type NOT NULL,
      quantity NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
      direction direction NOT NULL,

      reference_type reference_type,
      reference_id UUID,

      unit_price NUMERIC(15,2),
      notes TEXT,

      created_by UUID REFERENCES users(id),

      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  console.log("Stock movements table created successfully");}


if (import.meta.main) {
    up()
        .then(() => {
            console.log("Migration applied successfully");
        })
        .catch((error) => {
            console.error("Migration failed:", error);
            process.exitCode = 1;
        })
        .finally(async () => {
            await pool.end();
        });
}
