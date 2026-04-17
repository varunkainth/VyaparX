import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;
type ResetNumbering = "never" | "yearly" | "monthly";

const sequenceTypes: Array<{
  invoiceTypes: Array<"sales" | "purchase" | "credit_note" | "debit_note">;
  counterColumn: "next_invoice_number" | "next_purchase_number";
  periodKeyColumn: "invoice_number_period_key" | "purchase_number_period_key";
}> = [
  {
    invoiceTypes: ["sales", "credit_note"],
    counterColumn: "next_invoice_number",
    periodKeyColumn: "invoice_number_period_key",
  },
  {
    invoiceTypes: ["purchase", "debit_note"],
    counterColumn: "next_purchase_number",
    periodKeyColumn: "purchase_number_period_key",
  },
];

const parseInvoiceDate = (invoiceDate: string): Date => {
  const parsed = new Date(`${invoiceDate}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid invoice date: ${invoiceDate}`);
  }

  return parsed;
};

const getPeriodKey = (
  resetNumbering: ResetNumbering,
  invoiceDate: string | null,
): string | null => {
  if (resetNumbering === "never" || !invoiceDate) {
    return null;
  }

  const date = parseInvoiceDate(invoiceDate);
  const year = date.getUTCFullYear();

  if (resetNumbering === "yearly") {
    return String(year);
  }

  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export async function up(db: MigrationDb = pool) {
  await db.query(`
    ALTER TABLE invoice_settings
      ADD COLUMN IF NOT EXISTS invoice_number_period_key VARCHAR(20),
      ADD COLUMN IF NOT EXISTS purchase_number_period_key VARCHAR(20);
  `);

  await db.query(`
    INSERT INTO invoice_settings (business_id, invoice_prefix, purchase_prefix, reset_numbering)
    SELECT
      b.id,
      COALESCE(b.invoice_prefix, 'INV'),
      COALESCE(b.purchase_prefix, 'PUR'),
      COALESCE(b.reset_numbering, 'never')
    FROM businesses b
    LEFT JOIN invoice_settings s ON s.business_id = b.id
    WHERE s.business_id IS NULL
    ON CONFLICT (business_id) DO NOTHING;
  `);

  const businesses = await db.query<{
    business_id: string;
    reset_numbering: ResetNumbering;
  }>(`
    SELECT
      b.id AS business_id,
      COALESCE(s.reset_numbering, b.reset_numbering, 'never') AS reset_numbering
    FROM businesses b
    LEFT JOIN invoice_settings s ON s.business_id = b.id
  `);

  for (const business of businesses.rows) {
    for (const config of sequenceTypes) {
      const latestResult = await db.query<{ latest_invoice_date: string | null }>(
        `
        SELECT MAX(invoice_date)::text AS latest_invoice_date
        FROM invoices
        WHERE business_id = $1
          AND invoice_type = ANY($2::invoice_type[])
        `,
        [business.business_id, config.invoiceTypes],
      );

      const latestInvoiceDate = latestResult.rows[0]?.latest_invoice_date ?? null;
      const periodKey = getPeriodKey(business.reset_numbering, latestInvoiceDate);

      let nextSequence = 1;

      if (latestInvoiceDate) {
        const date = parseInvoiceDate(latestInvoiceDate);
        let periodStart: Date | null = null;
        let periodEnd: Date | null = null;

        if (business.reset_numbering === "yearly") {
          periodStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
          periodEnd = new Date(Date.UTC(date.getUTCFullYear() + 1, 0, 1));
        } else if (business.reset_numbering === "monthly") {
          periodStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
          periodEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
        }

        const maxResult =
          periodStart && periodEnd
            ? await db.query<{ max_sequence_no: number | null }>(
                `
                SELECT COALESCE(MAX((substring(invoice_number FROM '([0-9]+)$'))::int), 0) AS max_sequence_no
                FROM invoices
                WHERE business_id = $1
                  AND invoice_type = ANY($2::invoice_type[])
                  AND invoice_date >= $3::date
                  AND invoice_date < $4::date
                `,
                [
                  business.business_id,
                  config.invoiceTypes,
                  periodStart.toISOString().slice(0, 10),
                  periodEnd.toISOString().slice(0, 10),
                ],
              )
            : await db.query<{ max_sequence_no: number | null }>(
                `
                SELECT COALESCE(MAX((substring(invoice_number FROM '([0-9]+)$'))::int), 0) AS max_sequence_no
                FROM invoices
                WHERE business_id = $1
                  AND invoice_type = ANY($2::invoice_type[])
                `,
                [business.business_id, config.invoiceTypes],
              );

        nextSequence = Number(maxResult.rows[0]?.max_sequence_no ?? 0) + 1;
      }

      await db.query(
        `
        UPDATE invoice_settings
        SET ${config.counterColumn} = $2,
            ${config.periodKeyColumn} = $3,
            updated_at = NOW()
        WHERE business_id = $1
        `,
        [business.business_id, nextSequence, periodKey],
      );
    }
  }

  console.log("Backfilled invoice settings counters and reset markers");
}

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