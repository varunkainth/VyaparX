import pool from "../config/db";
import type { PoolClient } from "pg";
import { AppError } from "../utils/appError";
import { ERROR_CODES } from "../constants/errorCodes";

const getDb = (client?: PoolClient) => client ?? pool;

type InvoiceShareWindowRecord = {
  share_issued_at: string | null;
  share_expires_at: string | null;
};

type InvoicePdfStateRecord = {
  id: string;
  updated_at: string;
  pdf_url: string | null;
  pdf_object_key: string | null;
  pdf_generated_at: string | null;
  pdf_status: "pending" | "processing" | "ready" | "failed" | null;
  pdf_error: string | null;
  pdf_template_id: string | null;
};

type ResetNumbering = "never" | "yearly" | "monthly";

type InvoiceSequenceResult = {
  sequenceNo: number;
  invoiceNumber: string;
};

const sequenceConfig = {
  sales: {
    counterColumn: "next_invoice_number" as const,
    periodKeyColumn: "invoice_number_period_key" as const,
    formatColumn: "invoice_number_format" as const,
    defaultFormat: "INV-{YYYY}-{####}",
  },
  purchase: {
    counterColumn: "next_purchase_number" as const,
    periodKeyColumn: "purchase_number_period_key" as const,
    formatColumn: "purchase_number_format" as const,
    defaultFormat: "PUR-{YYYY}-{####}",
  },
} as const;

const parseInvoiceDate = (invoiceDate: string): Date => {
  const parsed = new Date(`${invoiceDate}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("Invalid invoice_date", 400, ERROR_CODES.BAD_REQUEST);
  }

  return parsed;
};

const deriveResetPeriodKey = (
  resetNumbering: ResetNumbering,
  invoiceDate: string,
): string | null => {
  if (resetNumbering === "never") {
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

const ensureResetFriendlyFormat = (
  format: string,
  resetNumbering: ResetNumbering,
): string => {
  let resolved = format;

  if (resetNumbering !== "never" && !resolved.includes("{YYYY}")) {
    resolved = resolved.replace("{####}", "{YYYY}-{####}");
  }

  if (resetNumbering === "monthly" && !resolved.includes("{MM}")) {
    resolved = resolved.replace("{####}", "{MM}-{####}");
  }

  return resolved;
};

const formatInvoiceNumber = (
  format: string,
  invoiceDate: string,
  sequenceNo: number,
  resetNumbering: ResetNumbering,
): string => {
  const date = parseInvoiceDate(invoiceDate);
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const normalizedFormat = ensureResetFriendlyFormat(format, resetNumbering);

  return normalizedFormat
    .replaceAll("{YYYY}", year)
    .replaceAll("{YY}", year.slice(-2))
    .replaceAll("{MM}", month)
    .replaceAll("{M}", String(date.getUTCMonth() + 1))
    .replaceAll("{####}", String(sequenceNo).padStart(3, "0"))
    .replaceAll("{SEQ}", String(sequenceNo));
};

export const invoiceRepository = {
  async nextInvoiceSequence(params: {
    client: PoolClient,
    businessId: string,
    invoiceDate: string,
    invoiceType: "sales" | "purchase",
  }): Promise<InvoiceSequenceResult> {
    const { client, businessId, invoiceDate, invoiceType } = params;
    const config = sequenceConfig[invoiceType];

    const sequenceColumn =
      config.counterColumn;
    const periodKeyColumn = config.periodKeyColumn;

    await client.query(
      `
      INSERT INTO invoice_settings (business_id, invoice_prefix, purchase_prefix, reset_numbering)
      SELECT id, COALESCE(invoice_prefix, 'INV'), COALESCE(purchase_prefix, 'PUR'), COALESCE(reset_numbering, 'never')
      FROM businesses
      WHERE id = $1
      ON CONFLICT (business_id) DO NOTHING
      `,
      [businessId],
    );

    const settingsResult = await client.query<{
      next_invoice_number: number | null;
      next_purchase_number: number | null;
      invoice_number_period_key: string | null;
      purchase_number_period_key: string | null;
      reset_numbering: ResetNumbering;
      invoice_number_format: string;
      purchase_number_format: string;
    }>(
      `
      SELECT
        next_invoice_number,
        next_purchase_number,
        invoice_number_period_key,
        purchase_number_period_key,
        reset_numbering,
        invoice_number_format,
        purchase_number_format
      FROM invoice_settings
      WHERE business_id = $1
      FOR UPDATE
      `,
      [businessId],
    );

    const settings = settingsResult.rows[0];
    if (!settings) {
      throw new AppError(
        "Invoice settings not found for business",
        404,
        ERROR_CODES.NOT_FOUND,
      );
    }

    const currentSequence = Number(settings[sequenceColumn] ?? 1);
    const currentPeriodKey = deriveResetPeriodKey(settings.reset_numbering, invoiceDate);
    const storedPeriodKey = settings[periodKeyColumn];
    const shouldResetSequence =
      settings.reset_numbering !== "never" &&
      currentPeriodKey !== null &&
      currentPeriodKey !== storedPeriodKey;

    const sequenceNo = shouldResetSequence ? 1 : currentSequence;
    const nextSequence = sequenceNo + 1;
    const nextPeriodKey =
      settings.reset_numbering === "never" ? storedPeriodKey : currentPeriodKey;
    const format = settings[config.formatColumn] || config.defaultFormat;
    const invoiceNumber = formatInvoiceNumber(
      format,
      invoiceDate,
      sequenceNo,
      settings.reset_numbering,
    );

    await client.query(
      `
      UPDATE invoice_settings
      SET ${sequenceColumn} = $2,
          ${periodKeyColumn} = $3,
          updated_at = NOW()
      WHERE business_id = $1
      `,
      [businessId, nextSequence, nextPeriodKey],
    );

    return { sequenceNo, invoiceNumber };
  },

  async insertInvoice(
    client: PoolClient,
    values: {
      business_id: string;
      party_id: string;
      invoice_type: "sales" | "purchase";
      invoice_number: string;
      financial_year: string;
      invoice_date: string;
      place_of_supply: string;
      is_igst: boolean;
      subtotal: number;
      taxable_amount: number;
      cgst_amount: number;
      sgst_amount: number;
      igst_amount: number;
      total_tax: number;
      round_off?: number;
      grand_total: number;
      payment_status?: "unpaid" | "partial" | "paid" | "overdue";
      created_by: string;
      reference_invoice_id?: string | null;
      note_reason?: string | null;
    },
  ) {
    const paymentStatus = values.payment_status ?? "unpaid";
    const result = await client.query(
      `
            INSERT INTO invoices (
                business_id,party_id,invoice_type,invoice_number,financial_year,invoice_date,place_of_supply,is_igst,
                subtotal,taxable_amount,cgst_amount,sgst_amount,igst_amount,total_tax,round_off,grand_total,balance_due,payment_status,reference_invoice_id,note_reason,created_by
            )
            VALUES ($1,$2,$3::invoice_type,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::payment_status,$19,$20,$21)
            RETURNING id
            `,
      [
        values.business_id,
        values.party_id,
        values.invoice_type,
        values.invoice_number,
        values.financial_year,
        values.invoice_date,
        values.place_of_supply,
        values.is_igst,
        values.subtotal,
        values.taxable_amount,
        values.cgst_amount,
        values.sgst_amount,
        values.igst_amount,
        values.total_tax,
        values.round_off ?? 0,
        values.grand_total,
        values.grand_total,
        paymentStatus,
        values.reference_invoice_id ?? null,
        values.note_reason ?? null,
        values.created_by,
      ],
    );
    return result.rows[0].id as string;
  },

  async insertInvoiceItem(client: PoolClient, values: unknown[]) {
    await client.query(
      `
            INSERT INTO invoice_items (
                invoice_id,item_id,item_name,hsn_code,price_mode,unit,quantity,unit_price,discount_pct,discount_amount,
                taxable_value,gst_rate,cgst_rate,sgst_rate,igst_rate,cgst_amount,sgst_amount,igst_amount,total_amount
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
            )
            `,
      values,
    );
  },

  async lockItemStock(client: PoolClient, itemId: string) {
    const result = await client.query(
      `
            SELECT id, business_id, name, unit, current_stock, low_stock_threshold
            FROM inventory_items
            WHERE id = $1
            FOR UPDATE
            `,
      [itemId],
    );
    return result.rows[0] ?? null;
  },

  async decrementItemStock(
    client: PoolClient,
    itemId: string,
    quantity: number,
  ) {
    await client.query(
      `
            UPDATE inventory_items
            SET current_stock = current_stock - $1
            WHERE id = $2
            `,
      [quantity, itemId],
    );
  },

  async incrementItemStock(
    client: PoolClient,
    itemId: string,
    quantity: number,
  ) {
    await client.query(
      `
            UPDATE inventory_items
            SET current_stock = current_stock + $1
            WHERE id = $2
            `,
      [quantity, itemId],
    );
  },

  async insertStockMovement(client: PoolClient, values: unknown[]) {
    await client.query(
      `
            INSERT INTO stock_movements (
                business_id,item_id,movement_type,quantity,direction,reference_type,reference_id,created_by,notes
            )
            VALUES ($1,$2,$3::movement_type,$4,$5::direction,$6::reference_type,$7,$8,$9)
            `,
      values,
    );
  },

  async lockPartyBalance(client: PoolClient, partyId: string) {
    const result = await client.query(
      `SELECT current_balance FROM parties WHERE id = $1 FOR UPDATE`,
      [partyId],
    );
    return result.rows[0] ?? null;
  },

  async insertLedgerEntry(client: PoolClient, values: unknown[]) {
    await client.query(
      `
            INSERT INTO ledger_entries (
                business_id,party_id,entry_type,debit,credit,balance_after,reference_type,reference_id,description,entry_date,created_by
            )
            VALUES ($1,$2,$3::entry_type,$4,$5,$6,$7::reference_type,$8,$9,$10,$11)
            `,
      values,
    );
  },

  async updatePartyBalance(
    client: PoolClient,
    partyId: string,
    balance: number,
  ) {
    await client.query(
      `UPDATE parties SET current_balance = $1 WHERE id = $2`,
      [balance, partyId],
    );
  },

  async listInvoices(query: string, values: unknown[]) {
    return pool.query(query, values);
  },

  async getInvoiceById(businessId: string, invoiceId: string) {
    const result = await pool.query(
      `
            SELECT i.*, p.name AS party_name, p.email AS party_email
            FROM invoices i
            JOIN parties p ON p.id = i.party_id
            WHERE i.business_id = $1
              AND i.id = $2
            `,
      [businessId, invoiceId],
    );
    return result.rows[0] ?? null;
  },

  async getInvoiceShareWindow(businessId: string, invoiceId: string) {
    const result = await pool.query<InvoiceShareWindowRecord>(
      `
            SELECT share_issued_at, share_expires_at
            FROM invoices
            WHERE business_id = $1
              AND id = $2
            `,
      [businessId, invoiceId],
    );
    return result.rows[0] ?? null;
  },

  async updateInvoiceShareWindow(
    businessId: string,
    invoiceId: string,
    shareIssuedAt: string,
    shareExpiresAt: string,
  ) {
    await pool.query(
      `
            UPDATE invoices
            SET share_issued_at = $3,
                share_expires_at = $4,
                updated_at = now()
            WHERE business_id = $1
              AND id = $2
            `,
      [businessId, invoiceId, shareIssuedAt, shareExpiresAt],
    );
  },

  async getInvoicePdfState(businessId: string, invoiceId: string) {
    const result = await pool.query<InvoicePdfStateRecord>(
      `
            SELECT id, updated_at, pdf_url, pdf_object_key, pdf_generated_at, pdf_status, pdf_error, pdf_template_id
            FROM invoices
            WHERE business_id = $1
              AND id = $2
            `,
      [businessId, invoiceId],
    );
    return result.rows[0] ?? null;
  },

  async markInvoicePdfPending(
    businessId: string,
    invoiceId: string,
    client?: PoolClient,
  ) {
    await getDb(client).query(
      `
            UPDATE invoices
            SET pdf_status = 'pending',
                pdf_error = NULL,
                pdf_generated_at = NULL,
                pdf_url = NULL,
                pdf_object_key = NULL,
                pdf_template_id = NULL,
                updated_at = now()
            WHERE business_id = $1
              AND id = $2
            `,
      [businessId, invoiceId],
    );
  },

  async markInvoicePdfProcessing(
    businessId: string,
    invoiceId: string,
    templateId: string,
  ) {
    await pool.query(
      `
            UPDATE invoices
            SET pdf_status = 'processing',
                pdf_error = NULL,
                pdf_template_id = $3,
                updated_at = now()
            WHERE business_id = $1
              AND id = $2
            `,
      [businessId, invoiceId, templateId],
    );
  },

  async markInvoicePdfReady(
    businessId: string,
    invoiceId: string,
    values: {
      pdf_url: string | null;
      pdf_object_key: string;
      pdf_generated_at: string;
      pdf_template_id: string;
    },
  ) {
    await pool.query(
      `
            UPDATE invoices
            SET pdf_status = 'ready',
                pdf_error = NULL,
                pdf_url = $3,
                pdf_object_key = $4,
                pdf_generated_at = $5,
                pdf_template_id = $6,
                updated_at = now()
            WHERE business_id = $1
              AND id = $2
            `,
      [
        businessId,
        invoiceId,
        values.pdf_url,
        values.pdf_object_key,
        values.pdf_generated_at,
        values.pdf_template_id,
      ],
    );
  },

  async markInvoicePdfFailed(
    businessId: string,
    invoiceId: string,
    errorMessage: string,
  ) {
    await pool.query(
      `
            UPDATE invoices
            SET pdf_status = 'failed',
                pdf_error = $3,
                updated_at = now()
            WHERE business_id = $1
              AND id = $2
            `,
      [businessId, invoiceId, errorMessage],
    );
  },

  async getInvoiceItems(invoiceId: string) {
    const result = await pool.query(
      `
            SELECT *
            FROM invoice_items
            WHERE invoice_id = $1
            ORDER BY sort_order ASC, id ASC
            `,
      [invoiceId],
    );
    return result.rows;
  },

  async getInvoiceSummary(businessId: string, invoiceId: string) {
    const result = await pool.query(
      `
            SELECT id, invoice_number, invoice_type, is_cancelled
            FROM invoices
            WHERE business_id = $1
              AND id = $2
            `,
      [businessId, invoiceId],
    );
    return result.rows[0] ?? null;
  },

  async getFirstReferencingInvoice(
    businessId: string,
    referenceInvoiceId: string,
  ) {
    const result = await pool.query(
      `
            SELECT id, invoice_number, invoice_type, is_cancelled
            FROM invoices
            WHERE business_id = $1
              AND reference_invoice_id = $2
            ORDER BY created_at DESC
            LIMIT 1
            `,
      [businessId, referenceInvoiceId],
    );
    return result.rows[0] ?? null;
  },

  async getReferencingInvoices(businessId: string, referenceInvoiceId: string) {
    const result = await pool.query(
      `
            SELECT id, invoice_number, invoice_type, is_cancelled, created_at
            FROM invoices
            WHERE business_id = $1
              AND reference_invoice_id = $2
            ORDER BY created_at DESC
            `,
      [businessId, referenceInvoiceId],
    );
    return result.rows;
  },

  async getInvoicePayments(businessId: string, invoiceId: string) {
    const result = await pool.query(
      `
            SELECT
                p.id,
                p.payment_type,
                p.payment_mode,
                p.payment_date,
                p.bank_ref_no,
                p.is_reconciled,
                p.created_at,
                pa.allocated_amount,
                parties.name AS party_name
            FROM payment_allocations pa
            JOIN payments p ON p.id = pa.payment_id
            JOIN parties ON parties.id = p.party_id
            WHERE p.business_id = $1
              AND pa.invoice_id = $2
            ORDER BY p.payment_date DESC, p.created_at DESC
            `,
      [businessId, invoiceId],
    );
    return result.rows;
  },

  async lockInvoiceForCancel(
    client: PoolClient,
    businessId: string,
    invoiceId: string,
  ) {
    const result = await client.query(
      `
            SELECT *
            FROM invoices
            WHERE business_id = $1
              AND id = $2
            FOR UPDATE
            `,
      [businessId, invoiceId],
    );
    return result.rows[0] ?? null;
  },

  async getInvoiceItemsForCancel(client: PoolClient, invoiceId: string) {
    const result = await client.query(
      `
            SELECT item_id, item_name, quantity
            FROM invoice_items
            WHERE invoice_id = $1
            `,
      [invoiceId],
    );
    return result.rows;
  },

  async markCancelled(
    client: PoolClient,
    cancelledBy: string,
    cancelReason: string | null,
    invoiceId: string,
  ) {
    await client.query(
      `
            UPDATE invoices
            SET is_cancelled = true,
                cancelled_at = now(),
                cancelled_by = $1,
                cancel_reason = $2,
                updated_at = now()
            WHERE id = $3
            `,
      [cancelledBy, cancelReason, invoiceId],
    );
  },
};
